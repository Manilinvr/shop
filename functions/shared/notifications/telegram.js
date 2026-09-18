/* ==========================================================================
   MANILI — TELEGRAM-УВЕДОМЛЕНИЯ ВЛАДЕЛЬЦУ (ТЗ §21)

   TELEGRAM_BOT_TOKEN живёт только здесь, в переменных окружения функции.
   Во фронтенд он не передаётся никогда.
   ========================================================================== */

import { ORDER_STATUS_LABELS } from '../constants.js'

const API = 'https://api.telegram.org'

function config() {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_OWNER_CHAT_ID,
    siteUrl: process.env.SITE_URL || 'https://manili-event.ru',
  }
}

export function isTelegramConfigured() {
  const { token, chatId } = config()
  return Boolean(token && chatId)
}

const formatPrice = (kopecks) =>
  new Intl.NumberFormat('ru-RU').format(Math.round(kopecks / 100)) + ' ₽'

/** Экранирование под parse_mode=HTML. */
const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

function buildNewOrderMessage(order) {
  const lines = [
    '<b>НОВЫЙ ЗАКАЗ MANILI</b>',
    `<b>${esc(order.publicOrderNumber)}</b>`,
    '',
    esc(order.customerName),
    esc(order.phone),
  ]
  if (order.email) lines.push(esc(order.email))
  lines.push('')

  for (const item of order.items) {
    lines.push(`• ${esc(item.productTitle)} — ${esc(item.size)} × ${item.quantity}`)
  }

  lines.push('')
  if (order.discount > 0) {
    lines.push(`Товары: ${formatPrice(order.subtotal)}`)
    lines.push(`Скидка${order.promocode ? ` (${esc(order.promocode)})` : ''}: −${formatPrice(order.discount)}`)
  }
  lines.push(`Доставка: ${order.deliveryPrice === 0 ? 'бесплатно' : formatPrice(order.deliveryPrice)}`)
  lines.push(`<b>Итого: ${formatPrice(order.total)}</b>`)
  lines.push('')
  lines.push(`Оплата: ${order.paymentStatus === 'PAID' ? 'оплачено' : 'ожидает оплаты'}`)

  const address = order.pickupPoint
    ? `${order.pickupPoint.name}, ${order.pickupPoint.address}`
    : order.shippingAddress
      ? `${order.shippingAddress.city}, ${order.shippingAddress.street}, д. ${order.shippingAddress.house}`
      : '—'
  lines.push(`Доставка: ${esc(address)}`)

  if (order.comment) {
    lines.push('')
    lines.push(`Комментарий: ${esc(order.comment)}`)
  }

  return lines.join('\n')
}

/** Кнопки быстрых действий из ТЗ §21. */
function buildKeyboard(order) {
  const { siteUrl } = config()
  return {
    inline_keyboard: [
      [{ text: 'ОТКРЫТЬ ЗАКАЗ', url: `${siteUrl}/admin/orders/${order.$id || order.id}` }],
      [
        { text: 'В РАБОТУ', callback_data: `status:${order.$id || order.id}:PROCESSING` },
        { text: 'ГОТОВ К ОТПРАВКЕ', callback_data: `status:${order.$id || order.id}:READY_TO_SHIP` },
      ],
      [{ text: 'ЗАКАЗ ВЫПОЛНЕН', callback_data: `status:${order.$id || order.id}:COMPLETED` }],
    ],
  }
}

async function send(text, replyMarkup) {
  const { token, chatId } = config()
  if (!token || !chatId) return { sent: false, reason: 'not_configured' }

  const response = await fetch(`${API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  })

  const data = await response.json().catch(() => ({}))
  return { sent: Boolean(data.ok), reason: data.description ?? null }
}

export async function notifyNewOrder(order) {
  return send(buildNewOrderMessage(order), buildKeyboard(order))
}

export async function notifyOrderPaid(order) {
  return send(
    [
      '<b>ОПЛАЧЕН ЗАКАЗ</b>',
      `<b>${esc(order.publicOrderNumber)}</b>`,
      '',
      `${esc(order.customerName)} — ${formatPrice(order.total)}`,
    ].join('\n'),
    buildKeyboard(order),
  )
}

export async function notifyStatusChange(order, status) {
  return send(
    [
      `<b>${esc(order.publicOrderNumber)}</b>`,
      `Статус: <b>${esc(ORDER_STATUS_LABELS[status] ?? status)}</b>`,
    ].join('\n'),
  )
}
