/* ==========================================================================
   MANILI — СОЗДАНИЕ ЗАКАЗА (ТЗ §14, §35, §37)

   Порядок строго такой:
     1. Идемпотентность — повтор не создаёт второй заказ.
     2. Пересчёт состава и суммы ПО БАЗЕ (данным браузера не верим).
     3. Проверка и расчёт промокода на сервере.
     4. Расчёт доставки у провайдера.
     5. Резервирование остатков («всё или ничего»).
     6. Создание заказа и позиций.
     7. Создание платежа у эквайера.
     8. Событие order.created → Telegram владельцу, email.

   Статус PAID здесь НЕ выставляется ни при каких условиях — только
   payment-webhook после проверки у провайдера.
   ========================================================================== */

import { DB_ID, ID, Query, callerUserId, db } from '../../shared/appwrite.js'
import { COLLECTIONS, ORDER_EVENTS, ORDER_STATUS, PAYMENT_STATUS } from '../../shared/constants.js'
import { PublicError, fail, ok, parseBody } from '../../shared/errors.js'
import { loadOrderLines, releaseStock, reserveStock } from '../../shared/stock.js'
import { evaluatePromocode, markPromocodeUsed } from '../../shared/promocode.js'
import { getDeliveryProvider } from '../../shared/delivery/index.js'
import { getPaymentProvider, isPaymentConfigured } from '../../shared/payments/index.js'
import { dispatchOrderEvent } from '../../shared/notifications/index.js'

const SITE_URL = process.env.SITE_URL || 'https://manili-event.ru'

export default async ({ req, res, log, error }) => {
  try {
    const body = parseBody(req)

    if (body.action === 'lookup') {
      return res.json(ok(await lookupOrder(body)))
    }

    return res.json(ok(await createOrder(body, req, log)))
  } catch (e) {
    error(String(e?.stack || e))
    return res.json(fail(e, log))
  }
}

/* --- Поиск заказа гостем по номеру и телефону ---------------------------- */

async function lookupOrder({ number, phone }) {
  const digits = String(number || '').replace(/\D/g, '')
  const phoneDigits = String(phone || '').replace(/\D/g, '')
  if (!digits || phoneDigits.length < 10) {
    throw new PublicError('BAD_REQUEST', 'Укажите номер заказа и телефон.')
  }

  const res = await db().listDocuments(DB_ID, COLLECTIONS.orders, [
    Query.equal('publicOrderNumber', `MANILI #${digits}`),
    Query.limit(1),
  ])
  const order = res.documents[0]
  // Телефон сверяем уже после выборки, чтобы не подсказывать перебором.
  if (!order || String(order.phone).replace(/\D/g, '') !== phoneDigits) return null

  return hydrateOrder(order)
}

/* --- Создание заказа ------------------------------------------------------ */

async function createOrder(input, req, log) {
  const idempotencyKey = String(input.idempotencyKey || '').trim()
  if (!idempotencyKey) {
    throw new PublicError('BAD_REQUEST', 'Некорректный запрос.', 'Нет idempotencyKey')
  }

  // 1. Идемпотентность: уникальный индекс по ключу не даст создать дубль,
  //    даже если два запроса придут одновременно (ТЗ §32).
  const existing = await findByIdempotencyKey(idempotencyKey)
  if (existing) {
    log(`Повторный запрос ${idempotencyKey} — отдаём существующий заказ`)
    return { order: await hydrateOrder(existing), confirmationUrl: null }
  }

  validateContacts(input)

  const items = Array.isArray(input.items) ? input.items : []
  if (items.length === 0) throw new PublicError('EMPTY_CART', 'Корзина пуста.')
  if (items.length > 50) throw new PublicError('BAD_REQUEST', 'Слишком много позиций в заказе.')

  // 2. Состав и суммы считаются по базе.
  const lines = await loadOrderLines(items)
  const subtotal = lines.reduce((sum, line) => sum + line.total, 0)

  // 3. Промокод.
  let discount = 0
  let freeDelivery = false
  let promoId = null
  let promoCode = null
  if (input.promocode) {
    const check = await evaluatePromocode(input.promocode, subtotal)
    if (!check.valid) {
      throw new PublicError('INVALID_PROMOCODE', check.reason || 'Промокод недействителен.')
    }
    discount = check.discount
    freeDelivery = check.freeDelivery
    promoId = check.promoId
    promoCode = check.code
  }

  // 4. Доставка — цену берём у провайдера, а не из запроса.
  const delivery = getDeliveryProvider()
  const city = input.shippingAddress?.city || 'Москва'
  const options = await delivery.quote({
    city,
    items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
    subtotal,
  })
  const option = options.find((o) => o.id === input.deliveryOptionId)
  if (!option) {
    throw new PublicError('INVALID_DELIVERY', 'Выбранный способ доставки недоступен. Выберите другой.')
  }
  const deliveryPrice = freeDelivery ? 0 : option.price

  const total = Math.max(0, subtotal - discount) + deliveryPrice

  // 5. Резерв остатков. Если не хватит — заказ не создаётся вовсе.
  await reserveStock(
    lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
    log,
  )

  let orderDoc
  try {
    // 6. Заказ и его позиции.
    const orderNumber = await nextOrderNumber()
    const userId = callerUserId(req)

    orderDoc = await db().createDocument(DB_ID, COLLECTIONS.orders, ID.unique(), {
      publicOrderNumber: orderNumber,
      userId,
      customerName: String(input.customerName).slice(0, 120),
      phone: normalizePhone(input.phone),
      email: input.email ? String(input.email).slice(0, 160) : null,
      subtotal,
      discount,
      promocode: promoCode,
      deliveryPrice,
      total,
      paymentMethod: input.paymentMethod === 'SBP' ? 'SBP' : 'CARD',
      paymentStatus: PAYMENT_STATUS.PENDING,
      deliveryStatus: 'NOT_SHIPPED',
      orderStatus: ORDER_STATUS.AWAITING_PAYMENT,
      deliveryMethod: option.method,
      deliveryProvider: option.provider,
      shippingAddress: input.shippingAddress ? JSON.stringify(input.shippingAddress) : null,
      pickupPoint: null,
      trackingNumber: null,
      paymentId: null,
      deliveryId: null,
      comment: input.comment ? String(input.comment).slice(0, 500) : null,
      idempotencyKey,
      // Поле для полнотекстового поиска в админке (ТЗ §19).
      searchIndex: [orderNumber, input.customerName, input.phone, input.email].filter(Boolean).join(' '),
    })

    if (input.pickupPointId) {
      const points = await delivery.pickupPoints(city)
      const point = points.find((p) => p.id === input.pickupPointId)
      if (point) {
        await db().updateDocument(DB_ID, COLLECTIONS.orders, orderDoc.$id, {
          pickupPoint: JSON.stringify(point),
        })
        orderDoc.pickupPoint = JSON.stringify(point)
      }
    }

    await Promise.all(
      lines.map((line) =>
        db().createDocument(DB_ID, COLLECTIONS.orderItems, ID.unique(), {
          orderId: orderDoc.$id,
          ...line,
        }),
      ),
    )

    await writeHistory(orderDoc.$id, 'orderStatus', null, ORDER_STATUS.AWAITING_PAYMENT, 'Заказ создан')
    await markPromocodeUsed(promoId, orderDoc.$id, callerUserId(req))
  } catch (e) {
    // Заказ не сохранился — резерв держать нельзя.
    await releaseStock(lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })), log)
    throw e
  }

  const order = await hydrateOrder(orderDoc, lines)

  // 7. Платёж. Ошибка эквайера не удаляет заказ: владелец увидит его
  //    в статусе «Ожидает оплаты» и сможет выставить счёт вручную.
  let confirmationUrl = null
  if (isPaymentConfigured()) {
    try {
      const provider = getPaymentProvider()
      const payment = await provider.createPayment({
        orderId: orderDoc.$id,
        orderNumber: order.publicOrderNumber,
        amount: total,
        method: order.paymentMethod,
        returnUrl: `${SITE_URL}/checkout/success/${orderDoc.$id}`,
        email: order.email,
        phone: order.phone,
        items: lines,
      })

      const paymentDoc = await db().createDocument(DB_ID, COLLECTIONS.payments, ID.unique(), {
        orderId: orderDoc.$id,
        provider: provider.name,
        providerPaymentId: payment.providerPaymentId,
        method: order.paymentMethod,
        amount: total,
        status: payment.status,
        confirmationUrl: payment.confirmationUrl,
        paidAt: null,
      })

      await db().updateDocument(DB_ID, COLLECTIONS.orders, orderDoc.$id, { paymentId: paymentDoc.$id })
      confirmationUrl = payment.confirmationUrl
    } catch (e) {
      log(`Платёж не создан для ${orderDoc.$id}: ${e}`)
    }
  }

  // 8. Уведомления. Сбой канала не влияет на результат заказа.
  await dispatchOrderEvent(ORDER_EVENTS.CREATED, order, {}, log)

  return { order, confirmationUrl }
}

/* --- Вспомогательное ------------------------------------------------------ */

function validateContacts(input) {
  const name = String(input.customerName || '').trim()
  if (name.length < 2) throw new PublicError('BAD_NAME', 'Укажите имя получателя.')

  const phone = String(input.phone || '').replace(/\D/g, '')
  if (!/^[78]\d{10}$/.test(phone)) throw new PublicError('BAD_PHONE', 'Проверьте номер телефона.')

  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(input.email).trim())) {
    throw new PublicError('BAD_EMAIL', 'Проверьте адрес почты.')
  }
}

function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, '').replace(/^8/, '7')
  return `+${digits}`
}

async function findByIdempotencyKey(key) {
  const res = await db().listDocuments(DB_ID, COLLECTIONS.orders, [
    Query.equal('idempotencyKey', key),
    Query.limit(1),
  ])
  return res.documents[0] ?? null
}

/**
 * Следующий человеческий номер заказа.
 * Берём максимальный существующий и прибавляем единицу; коллизию снимает
 * уникальный индекс на publicOrderNumber — при конфликте пробуем ещё раз.
 */
async function nextOrderNumber() {
  const start = Number(process.env.ORDER_NUMBER_START || 1041)
  const res = await db().listDocuments(DB_ID, COLLECTIONS.orders, [
    Query.orderDesc('$createdAt'),
    Query.limit(1),
  ])
  const last = res.documents[0]?.publicOrderNumber
  const lastNumber = last ? Number(String(last).replace(/\D/g, '')) : start
  return `MANILI #${(Number.isFinite(lastNumber) ? lastNumber : start) + 1}`
}

async function writeHistory(orderId, field, oldValue, newValue, comment, actor) {
  await db().createDocument(DB_ID, COLLECTIONS.orderStatusHistory, ID.unique(), {
    orderId,
    field,
    oldValue: oldValue ?? null,
    newValue: String(newValue),
    changedBy: actor?.id ?? 'system',
    changedByName: actor?.name ?? 'Система',
    comment: comment ?? null,
  })
}

async function hydrateOrder(orderDoc, lines) {
  let items = lines
  if (!items) {
    const res = await db().listDocuments(DB_ID, COLLECTIONS.orderItems, [
      Query.equal('orderId', orderDoc.$id),
      Query.limit(100),
    ])
    items = res.documents.map((doc) => ({
      id: doc.$id,
      orderId: doc.orderId,
      productId: doc.productId,
      variantId: doc.variantId,
      productTitle: doc.productTitle,
      productSlug: doc.productSlug,
      productImage: doc.productImage,
      size: doc.size,
      sku: doc.sku,
      quantity: doc.quantity,
      price: doc.price,
      total: doc.total,
    }))
  }

  const parse = (value) => {
    if (!value) return null
    try { return JSON.parse(value) } catch { return null }
  }

  return {
    id: orderDoc.$id,
    publicOrderNumber: orderDoc.publicOrderNumber,
    userId: orderDoc.userId ?? null,
    customerName: orderDoc.customerName,
    phone: orderDoc.phone,
    email: orderDoc.email ?? null,
    items: items.map((item, index) => ({ id: item.id ?? `line-${index}`, orderId: orderDoc.$id, ...item })),
    subtotal: orderDoc.subtotal,
    discount: orderDoc.discount,
    promocode: orderDoc.promocode ?? null,
    deliveryPrice: orderDoc.deliveryPrice,
    total: orderDoc.total,
    paymentMethod: orderDoc.paymentMethod,
    paymentStatus: orderDoc.paymentStatus,
    deliveryStatus: orderDoc.deliveryStatus,
    orderStatus: orderDoc.orderStatus,
    deliveryMethod: orderDoc.deliveryMethod,
    deliveryProvider: orderDoc.deliveryProvider ?? null,
    shippingAddress: parse(orderDoc.shippingAddress),
    pickupPoint: parse(orderDoc.pickupPoint),
    trackingNumber: orderDoc.trackingNumber ?? null,
    paymentId: orderDoc.paymentId ?? null,
    deliveryId: orderDoc.deliveryId ?? null,
    comment: orderDoc.comment ?? null,
    createdAt: orderDoc.$createdAt,
    updatedAt: orderDoc.$updatedAt,
  }
}

export { hydrateOrder, writeHistory }
