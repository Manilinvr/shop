/* ==========================================================================
   MANILI — TELEGRAM WEBHOOK (ТЗ §21)

   Оживляет кнопки под сообщением о заказе: владелец меняет статус прямо
   из чата, не открывая админку.

   Безопасность:
   • Telegram шлёт секрет в заголовке X-Telegram-Bot-Api-Secret-Token —
     проверяем его, иначе webhook сможет дёрнуть кто угодно.
   • Действие принимается только от TELEGRAM_OWNER_CHAT_ID: даже если
     кто-то узнает адрес функции, чужой чат ничего не изменит.
   • Переходы статусов проверяются теми же правилами, что и в админке.
   ========================================================================== */

import { DB_ID, ID, Query, db } from '../../shared/appwrite.js'
import {
  COLLECTIONS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TRANSITIONS,
  PAYMENT_STATUS,
  STATUS_EVENT_MAP,
  STOCK_RELEASING_STATUSES,
} from '../../shared/constants.js'
import { parseBody } from '../../shared/errors.js'
import { commitStock, releaseStock, restoreStock } from '../../shared/stock.js'
import { dispatchOrderEvent } from '../../shared/notifications/index.js'

const API = 'https://api.telegram.org'

export default async ({ req, res, log, error }) => {
  try {
    // Telegram не должен получать ошибок: иначе он повторяет доставку.
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (secret && req.headers?.['x-telegram-bot-api-secret-token'] !== secret) {
      log('Неверный секрет webhook — игнорируем')
      return res.json({ ok: true })
    }

    const update = parseBody(req)
    const callback = update.callback_query
    if (!callback) return res.json({ ok: true })

    const ownerChatId = String(process.env.TELEGRAM_OWNER_CHAT_ID || '')
    const fromChatId = String(callback.message?.chat?.id ?? '')

    if (!ownerChatId || fromChatId !== ownerChatId) {
      await answerCallback(callback.id, 'Недостаточно прав.')
      log(`Действие из чужого чата ${fromChatId} — отклонено`)
      return res.json({ ok: true })
    }

    const [action, orderId, status] = String(callback.data || '').split(':')
    if (action !== 'status' || !orderId || !status) {
      await answerCallback(callback.id, 'Непонятное действие.')
      return res.json({ ok: true })
    }

    const result = await applyStatus(orderId, status, log)
    await answerCallback(callback.id, result.message)

    if (result.ok) {
      await sendMessage(
        ownerChatId,
        `<b>${escapeHtml(result.orderNumber)}</b>\nСтатус: <b>${escapeHtml(ORDER_STATUS_LABELS[status])}</b>\nИзменено из Telegram`,
      )
    }

    return res.json({ ok: true })
  } catch (e) {
    error(String(e?.stack || e))
    // Всегда 200: иначе Telegram будет слать этот же update бесконечно.
    return res.json({ ok: true })
  }
}

/* --- Смена статуса (та же логика, что в админке) -------------------------- */

async function applyStatus(orderId, status, log) {
  let order
  try {
    order = await db().getDocument(DB_ID, COLLECTIONS.orders, orderId)
  } catch {
    return { ok: false, message: 'Заказ не найден.' }
  }

  if (order.orderStatus === status) {
    return { ok: false, message: `Уже «${ORDER_STATUS_LABELS[status]}».` }
  }

  const allowed = ORDER_STATUS_TRANSITIONS[order.orderStatus] ?? []
  if (!allowed.includes(status)) {
    return {
      ok: false,
      message: `Нельзя: «${ORDER_STATUS_LABELS[order.orderStatus]}» → «${ORDER_STATUS_LABELS[status]}».`,
    }
  }

  const itemsRes = await db().listDocuments(DB_ID, COLLECTIONS.orderItems, [
    Query.equal('orderId', orderId),
    Query.limit(100),
  ])
  const items = itemsRes.documents.map((i) => ({ variantId: i.variantId, quantity: i.quantity }))

  const patch = { orderStatus: status }

  if (status === 'PAID' && order.paymentStatus !== PAYMENT_STATUS.PAID) {
    patch.paymentStatus = PAYMENT_STATUS.PAID
    await commitStock(items, log)
  }
  if (STOCK_RELEASING_STATUSES.includes(status)) {
    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      await restoreStock(items, log)
      patch.paymentStatus = PAYMENT_STATUS.REFUNDED
    } else {
      await releaseStock(items, log)
    }
  }
  if (status === 'READY_TO_SHIP') patch.deliveryStatus = 'READY'
  if (status === 'SHIPPED') patch.deliveryStatus = 'HANDED_OVER'
  if (status === 'IN_TRANSIT') patch.deliveryStatus = 'IN_TRANSIT'
  if (status === 'DELIVERED') patch.deliveryStatus = 'DELIVERED'

  const updated = await db().updateDocument(DB_ID, COLLECTIONS.orders, orderId, patch)

  await db().createDocument(DB_ID, COLLECTIONS.orderStatusHistory, ID.unique(), {
    orderId,
    field: 'orderStatus',
    oldValue: order.orderStatus,
    newValue: status,
    changedBy: 'telegram',
    changedByName: 'Владелец (Telegram)',
    comment: null,
  })

  await db().createDocument(DB_ID, COLLECTIONS.auditLogs, ID.unique(), {
    actorId: 'telegram',
    actorName: 'Владелец (Telegram)',
    action: 'order.status',
    entity: 'order',
    entityId: orderId,
  }).catch(() => {})

  // Покупателю уходит то же уведомление, что и при смене статуса в админке.
  const event = STATUS_EVENT_MAP[status]
  if (event) {
    await dispatchOrderEvent(
      event,
      {
        id: updated.$id,
        $id: updated.$id,
        publicOrderNumber: updated.publicOrderNumber,
        customerName: updated.customerName,
        phone: updated.phone,
        email: updated.email ?? null,
        total: updated.total,
        trackingNumber: updated.trackingNumber ?? null,
        items: itemsRes.documents.map((i) => ({
          productTitle: i.productTitle, size: i.size, quantity: i.quantity,
          price: i.price, total: i.total,
        })),
      },
      { status },
      log,
    )
  }

  return {
    ok: true,
    orderNumber: updated.publicOrderNumber,
    message: ORDER_STATUS_LABELS[status],
  }
}

/* --- Ответы в Telegram ---------------------------------------------------- */

async function answerCallback(callbackQueryId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  await fetch(`${API}/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text: text.slice(0, 200) }),
  }).catch(() => {})
}

async function sendMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  await fetch(`${API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch(() => {})
}

const escapeHtml = (value) =>
  String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
