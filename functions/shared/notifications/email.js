/* ==========================================================================
   MANILI — EMAIL-УВЕДОМЛЕНИЯ (ТЗ §22, §23)

   Почта подключается позже, но архитектура готова: система событий уже
   вызывает этот модуль. Когда появится EMAIL_API_KEY, письма начнут уходить
   без переписывания заказов и статусов.
   ========================================================================== */

import { ORDER_STATUS_LABELS } from '../constants.js'

export function isEmailConfigured() {
  return Boolean(process.env.EMAIL_API_KEY && process.env.EMAIL_FROM)
}

const formatPrice = (kopecks) =>
  new Intl.NumberFormat('ru-RU').format(Math.round(kopecks / 100)) + ' ₽'

/**
 * Отправка письма. Реализована под HTTP API транзакционной почты
 * (Unisender Go / SendGrid-совместимый формат) — меняется один fetch.
 */
async function send({ to, subject, html }) {
  if (!isEmailConfigured()) return { sent: false, reason: 'not_configured' }

  const endpoint = process.env.EMAIL_API_URL || 'https://go1.unisender.ru/ru/transactional/api/v1/email/send.json'

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': process.env.EMAIL_API_KEY,
    },
    body: JSON.stringify({
      message: {
        recipients: [{ email: to }],
        body: { html },
        subject,
        from_email: process.env.EMAIL_FROM,
        from_name: process.env.EMAIL_FROM_NAME || 'MANILI',
      },
    }),
  })

  const data = await response.json().catch(() => ({}))
  return { sent: response.ok, reason: response.ok ? null : JSON.stringify(data).slice(0, 200) }
}

function layout(title, bodyHtml) {
  // Инлайновые стили: почтовые клиенты не поддерживают внешний CSS.
  return `<!doctype html><html lang="ru"><body style="margin:0;background:#111010;font-family:Helvetica,Arial,sans-serif;color:#e6dcc8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111010;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#171614;border-radius:28px;padding:32px;">
        <tr><td style="font-size:22px;font-weight:bold;letter-spacing:2px;padding-bottom:24px;">MANILI</td></tr>
        <tr><td style="font-size:20px;font-weight:bold;padding-bottom:16px;">${title}</td></tr>
        <tr><td style="font-size:15px;line-height:1.7;color:#d3c6ac;">${bodyHtml}</td></tr>
      </table>
    </td></tr>
  </table></body></html>`
}

function itemsTable(order) {
  return order.items
    .map(
      (item) =>
        `<tr><td style="padding:6px 0;">${item.productTitle} — ${item.size} × ${item.quantity}</td>
         <td align="right" style="padding:6px 0;white-space:nowrap;">${formatPrice(item.total)}</td></tr>`,
    )
    .join('')
}

export async function emailOrderCreated(order) {
  if (!order.email) return { sent: false, reason: 'no_email' }
  return send({
    to: order.email,
    subject: `Заказ ${order.publicOrderNumber} принят — MANILI`,
    html: layout(
      `Заказ ${order.publicOrderNumber} принят`,
      `<p>Спасибо за заказ. Мы начнём собирать его сразу после оплаты.</p>
       <table width="100%">${itemsTable(order)}
       <tr><td style="padding-top:12px;font-weight:bold;">Итого</td>
       <td align="right" style="padding-top:12px;font-weight:bold;">${formatPrice(order.total)}</td></tr></table>`,
    ),
  })
}

export async function emailOrderStatus(order, status) {
  if (!order.email) return { sent: false, reason: 'no_email' }
  return send({
    to: order.email,
    subject: `${order.publicOrderNumber}: ${ORDER_STATUS_LABELS[status] ?? status} — MANILI`,
    html: layout(
      `Заказ ${order.publicOrderNumber}`,
      `<p>Статус заказа изменился: <b>${ORDER_STATUS_LABELS[status] ?? status}</b>.</p>
       ${order.trackingNumber ? `<p>Трек-номер: <b>${order.trackingNumber}</b></p>` : ''}`,
    ),
  })
}

/** Копия владельцу — включается, когда задан EMAIL_OWNER (ТЗ §22). */
export async function emailOwnerNewOrder(order) {
  const owner = process.env.EMAIL_OWNER
  if (!owner) return { sent: false, reason: 'no_owner_email' }
  return send({
    to: owner,
    subject: `Новый заказ ${order.publicOrderNumber} — ${formatPrice(order.total)}`,
    html: layout(
      `Новый заказ ${order.publicOrderNumber}`,
      `<p>${order.customerName}, ${order.phone}</p>
       <table width="100%">${itemsTable(order)}
       <tr><td style="padding-top:12px;font-weight:bold;">Итого</td>
       <td align="right" style="padding-top:12px;font-weight:bold;">${formatPrice(order.total)}</td></tr></table>`,
    ),
  })
}
