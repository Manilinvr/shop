/* ==========================================================================
   MANILI — WEBHOOK ПЛАТЁЖНОЙ СИСТЕМЫ (ТЗ §15, §32, §37)

   Единственное место, где заказ становится оплаченным.

   Защита:
   • подлинность — подпись провайдера или обратный запрос к его API;
   • подмена суммы — сверяем сумму платежа с суммой заказа в базе;
   • повторный webhook — идемпотентность по providerPaymentId + статусу;
   • подмена заказа — orderId берём из данных, подтверждённых провайдером.

   Фронтенд не может перевести заказ в PAID никаким способом.
   ========================================================================== */

import { DB_ID, ID, Query, db } from '../../shared/appwrite.js'
import { COLLECTIONS, ORDER_EVENTS, ORDER_STATUS, PAYMENT_STATUS } from '../../shared/constants.js'
import { PublicError, parseBody } from '../../shared/errors.js'
import { commitStock, releaseStock } from '../../shared/stock.js'
import { getPaymentProvider } from '../../shared/payments/index.js'
import { dispatchOrderEvent } from '../../shared/notifications/index.js'

export default async ({ req, res, log, error }) => {
  try {
    const body = parseBody(req)
    const provider = getPaymentProvider()

    // 1. Подтверждаем подлинность у провайдера.
    const verified = await provider.verifyWebhook({ body, headers: req.headers })
    log(`webhook: payment=${verified.providerPaymentId} status=${verified.status}`)

    // 2. Находим наш платёж по id провайдера.
    const paymentsRes = await db().listDocuments(DB_ID, COLLECTIONS.payments, [
      Query.equal('providerPaymentId', String(verified.providerPaymentId)),
      Query.limit(1),
    ])
    const payment = paymentsRes.documents[0]
    if (!payment) {
      // Платёж не наш — отвечаем 200, чтобы провайдер не долбил повторами.
      log(`Неизвестный платёж ${verified.providerPaymentId} — игнорируем`)
      return res.json({ ok: true, data: { ignored: true } })
    }

    // 3. Идемпотентность: тот же статус второй раз ничего не меняет.
    if (payment.status === verified.status) {
      log(`Повторный webhook для ${payment.$id} со статусом ${verified.status} — пропускаем`)
      return res.json({ ok: true, data: { duplicate: true } })
    }

    const order = await db().getDocument(DB_ID, COLLECTIONS.orders, payment.orderId)

    // 4. Защита от подмены суммы: платим ровно столько, сколько в заказе.
    if (verified.status === 'PAID' && verified.paidAmount !== order.total) {
      await db().updateDocument(DB_ID, COLLECTIONS.orders, order.$id, {
        orderStatus: ORDER_STATUS.PROBLEM,
      })
      await writeHistory(order.$id, 'orderStatus', order.orderStatus, ORDER_STATUS.PROBLEM,
        `Сумма платежа ${verified.paidAmount} не совпала с суммой заказа ${order.total}`)
      error(`Расхождение суммы: заказ ${order.$id}, ожидали ${order.total}, получили ${verified.paidAmount}`)
      return res.json({ ok: true, data: { mismatch: true } })
    }

    await db().updateDocument(DB_ID, COLLECTIONS.payments, payment.$id, {
      status: verified.status,
      paidAt: verified.status === 'PAID' ? new Date().toISOString() : null,
    })

    if (verified.status === 'PAID') {
      await handlePaid(order, log)
    } else if (verified.status === 'FAILED' || verified.status === 'CANCELLED') {
      await handleFailed(order, verified.status, log)
    }

    return res.json({ ok: true, data: { processed: true } })
  } catch (e) {
    error(String(e?.stack || e))
    // Провайдеру отвечаем 500 только на неожиданной ошибке — он повторит.
    if (e instanceof PublicError && e.code === 'BAD_WEBHOOK') {
      return res.json({ ok: false, code: e.code, message: e.userMessage }, 400)
    }
    return res.json({ ok: false, code: 'INTERNAL' }, 500)
  }
}

async function loadItems(orderId) {
  const res = await db().listDocuments(DB_ID, COLLECTIONS.orderItems, [
    Query.equal('orderId', orderId),
    Query.limit(100),
  ])
  return res.documents
}

async function handlePaid(order, log) {
  const items = await loadItems(order.$id)

  // Резерв превращается в списание со склада (ТЗ §35).
  await commitStock(items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })), log)

  await db().updateDocument(DB_ID, COLLECTIONS.orders, order.$id, {
    paymentStatus: PAYMENT_STATUS.PAID,
    orderStatus: ORDER_STATUS.PAID,
  })
  await writeHistory(order.$id, 'paymentStatus', order.paymentStatus, PAYMENT_STATUS.PAID, 'Оплата получена')
  await writeHistory(order.$id, 'orderStatus', order.orderStatus, ORDER_STATUS.PAID, null)

  await dispatchOrderEvent(
    ORDER_EVENTS.PAID,
    { ...toPlainOrder(order), items: items.map(toPlainItem), paymentStatus: 'PAID', orderStatus: 'PAID' },
    { status: 'PAID' },
    log,
  )
}

async function handleFailed(order, status, log) {
  const items = await loadItems(order.$id)

  // Оплата не прошла — держать чужие размеры в резерве нельзя.
  await releaseStock(items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })), log)

  await db().updateDocument(DB_ID, COLLECTIONS.orders, order.$id, {
    paymentStatus: status === 'CANCELLED' ? PAYMENT_STATUS.CANCELLED : PAYMENT_STATUS.FAILED,
    orderStatus: ORDER_STATUS.CANCELLED,
  })
  await writeHistory(order.$id, 'orderStatus', order.orderStatus, ORDER_STATUS.CANCELLED, 'Оплата не прошла')

  await dispatchOrderEvent(
    ORDER_EVENTS.CANCELLED,
    { ...toPlainOrder(order), items: items.map(toPlainItem) },
    { status: 'CANCELLED' },
    log,
  )
}

async function writeHistory(orderId, field, oldValue, newValue, comment) {
  await db().createDocument(DB_ID, COLLECTIONS.orderStatusHistory, ID.unique(), {
    orderId,
    field,
    oldValue: oldValue ?? null,
    newValue: String(newValue),
    changedBy: 'system',
    changedByName: 'Платёжная система',
    comment: comment ?? null,
  })
}

const toPlainItem = (doc) => ({
  id: doc.$id, productTitle: doc.productTitle, size: doc.size,
  quantity: doc.quantity, price: doc.price, total: doc.total, sku: doc.sku,
})

function toPlainOrder(doc) {
  const parse = (v) => { try { return v ? JSON.parse(v) : null } catch { return null } }
  return {
    id: doc.$id,
    $id: doc.$id,
    publicOrderNumber: doc.publicOrderNumber,
    customerName: doc.customerName,
    phone: doc.phone,
    email: doc.email ?? null,
    subtotal: doc.subtotal,
    discount: doc.discount,
    promocode: doc.promocode ?? null,
    deliveryPrice: doc.deliveryPrice,
    total: doc.total,
    trackingNumber: doc.trackingNumber ?? null,
    shippingAddress: parse(doc.shippingAddress),
    pickupPoint: parse(doc.pickupPoint),
    comment: doc.comment ?? null,
  }
}
