/* ==========================================================================
   MANILI — ЕДИНАЯ СИСТЕМА СОБЫТИЙ ЗАКАЗА (ТЗ §38)

   Одно событие может запускать Telegram, email, SMS и внутреннее уведомление.
   Подключение нового канала = добавление подписчика, без правок в заказах.

   ВАЖНО: реальная отправка выполняется ТОЛЬКО на сервере — у фронта нет
   ни Telegram Bot Token, ни SMTP-ключей (ТЗ §32).
   ========================================================================== */

import type { Order, OrderEvent, OrderEventName } from '@/domain/types'
import { isServerApiConfigured } from '@/api/config'
import { apiRequest } from '@/api/client'

export type OrderEventHandler = (event: OrderEvent, order: Order) => void | Promise<void>

const subscribers = new Map<OrderEventName | '*', Set<OrderEventHandler>>()

export function onOrderEvent(name: OrderEventName | '*', handler: OrderEventHandler): () => void {
  const set = subscribers.get(name) ?? new Set()
  set.add(handler)
  subscribers.set(name, set)
  return () => set.delete(handler)
}

/**
 * Публикация события.
 * Сервер — основной получатель: он решает, кому и через какой канал слать.
 * Локальные подписчики нужны для UI (тосты, обновление счётчиков).
 */
export async function emitOrderEvent(
  name: OrderEventName,
  order: Order,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const event: OrderEvent = {
    name,
    orderId: order.id,
    payload,
    createdAt: new Date().toISOString(),
  }

  if (isServerApiConfigured()) {
    // Сервер сам разошлёт Telegram владельцу, email и уведомления покупателю.
    await apiRequest('/events/order', { method: 'POST', body: event }).catch(() => {
      // Уведомление — не критичный путь: заказ не должен падать из-за Telegram.
    })
  }

  const handlers = [
    ...(subscribers.get(name) ?? []),
    ...(subscribers.get('*') ?? []),
  ]
  await Promise.allSettled(handlers.map((handler) => handler(event, order)))
}
