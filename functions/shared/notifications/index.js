/* ==========================================================================
   MANILI — ДИСПЕТЧЕР СОБЫТИЙ ЗАКАЗА (ТЗ §38)

   Одно событие → несколько каналов. Добавление канала (SMS, push, Telegram
   покупателю) — это новый обработчик в таблице ниже, без правок в заказах.

   Уведомления никогда не роняют основную операцию: ошибка канала пишется
   в notification_logs, но не прерывает оформление заказа (ТЗ §37).
   ========================================================================== */

import { DB_ID, ID, db } from '../appwrite.js'
import { COLLECTIONS, ORDER_EVENTS } from '../constants.js'
import {
  emailOrderCreated,
  emailOrderStatus,
  emailOwnerNewOrder,
  isEmailConfigured,
} from './email.js'
import {
  isTelegramConfigured,
  notifyNewOrder,
  notifyOrderPaid,
  notifyStatusChange,
} from './telegram.js'

async function logNotification(channel, event, recipient, result) {
  try {
    await db().createDocument(DB_ID, COLLECTIONS.notificationLogs, ID.unique(), {
      channel,
      event,
      recipient: String(recipient || '').slice(0, 120),
      status: result?.sent ? 'SENT' : 'FAILED',
      // В лог не пишем содержимое письма и персональные данные (ТЗ §42).
      error: result?.sent ? null : String(result?.reason || 'unknown').slice(0, 240),
    })
  } catch {
    // Журнал уведомлений — вспомогательный, его сбой ничего не ломает.
  }
}

/** Таблица обработчиков: событие → что отправляем. */
const HANDLERS = {
  [ORDER_EVENTS.CREATED]: [
    {
      channel: 'TELEGRAM',
      enabled: isTelegramConfigured,
      recipient: () => 'owner',
      run: (order) => notifyNewOrder(order),
    },
    {
      channel: 'EMAIL',
      enabled: isEmailConfigured,
      recipient: (order) => order.email,
      run: (order) => emailOrderCreated(order),
    },
    {
      channel: 'EMAIL',
      enabled: () => Boolean(process.env.EMAIL_OWNER) && isEmailConfigured(),
      recipient: () => process.env.EMAIL_OWNER,
      run: (order) => emailOwnerNewOrder(order),
    },
  ],
  [ORDER_EVENTS.PAID]: [
    {
      channel: 'TELEGRAM',
      enabled: isTelegramConfigured,
      recipient: () => 'owner',
      run: (order) => notifyOrderPaid(order),
    },
    {
      channel: 'EMAIL',
      enabled: isEmailConfigured,
      recipient: (order) => order.email,
      run: (order) => emailOrderStatus(order, 'PAID'),
    },
  ],
}

/** Статусные события покупателю — один общий обработчик. */
const STATUS_EVENTS = [
  ORDER_EVENTS.PROCESSING,
  ORDER_EVENTS.READY,
  ORDER_EVENTS.SHIPPED,
  ORDER_EVENTS.IN_TRANSIT,
  ORDER_EVENTS.DELIVERED,
  ORDER_EVENTS.COMPLETED,
  ORDER_EVENTS.CANCELLED,
  ORDER_EVENTS.REFUNDED,
]

for (const event of STATUS_EVENTS) {
  HANDLERS[event] = [
    {
      channel: 'EMAIL',
      enabled: isEmailConfigured,
      recipient: (order) => order.email,
      run: (order, ctx) => emailOrderStatus(order, ctx.status),
    },
    {
      channel: 'TELEGRAM',
      enabled: isTelegramConfigured,
      recipient: () => 'owner',
      run: (order, ctx) => notifyStatusChange(order, ctx.status),
    },
  ]
}

export async function dispatchOrderEvent(event, order, ctx = {}, log) {
  const handlers = HANDLERS[event] ?? []

  await Promise.allSettled(
    handlers.map(async (handler) => {
      if (!handler.enabled()) return
      const recipient = handler.recipient(order)
      if (!recipient) return
      try {
        const result = await handler.run(order, ctx)
        await logNotification(handler.channel, event, recipient, result)
      } catch (error) {
        log?.(`Канал ${handler.channel} не сработал для ${event}: ${error}`)
        await logNotification(handler.channel, event, recipient, { sent: false, reason: String(error) })
      }
    }),
  )
}
