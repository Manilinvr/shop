/* ==========================================================================
   MANILI — СТАТУСЫ ЗАКАЗА (ТЗ §18, §19)
   Русские названия, допустимые переходы и группировка для админки.
   ========================================================================== */

import type { DeliveryStatus, OrderStatus, PaymentStatus } from './types'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'Новый',
  AWAITING_PAYMENT: 'Ожидает оплаты',
  PAID: 'Оплачен',
  PROCESSING: 'Собирается',
  READY_TO_SHIP: 'Готов к отправке',
  SHIPPED: 'Передан в доставку',
  IN_TRANSIT: 'В пути',
  DELIVERED: 'Доставлен',
  COMPLETED: 'Заказ выполнен',
  CANCELLED: 'Отменён',
  REFUND: 'Возврат',
  PROBLEM: 'Проблема',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Ожидает оплаты',
  WAITING_FOR_CAPTURE: 'Ожидает подтверждения',
  PAID: 'Оплачено',
  FAILED: 'Ошибка оплаты',
  REFUNDED: 'Возвращено',
  CANCELLED: 'Отменено',
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  NOT_SHIPPED: 'Не отправлен',
  READY: 'Готов к отправке',
  HANDED_OVER: 'Передан в доставку',
  IN_TRANSIT: 'В пути',
  AT_PICKUP_POINT: 'В пункте выдачи',
  DELIVERED: 'Доставлен',
  RETURNED: 'Возвращён',
}

/** Цветовой тон статуса для бейджей. */
export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export const ORDER_STATUS_TONE: Record<OrderStatus, StatusTone> = {
  NEW: 'info',
  AWAITING_PAYMENT: 'warning',
  PAID: 'success',
  PROCESSING: 'info',
  READY_TO_SHIP: 'info',
  SHIPPED: 'info',
  IN_TRANSIT: 'info',
  DELIVERED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
  REFUND: 'warning',
  PROBLEM: 'danger',
}

/**
 * Допустимые переходы статусов.
 * Проверяется и на клиенте (для UX), и обязательно на сервере (ТЗ §32).
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['AWAITING_PAYMENT', 'PAID', 'PROCESSING', 'CANCELLED', 'PROBLEM'],
  AWAITING_PAYMENT: ['PAID', 'CANCELLED', 'PROBLEM'],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUND', 'PROBLEM'],
  PROCESSING: ['READY_TO_SHIP', 'CANCELLED', 'REFUND', 'PROBLEM'],
  READY_TO_SHIP: ['SHIPPED', 'PROCESSING', 'CANCELLED', 'PROBLEM'],
  SHIPPED: ['IN_TRANSIT', 'DELIVERED', 'PROBLEM'],
  IN_TRANSIT: ['DELIVERED', 'PROBLEM'],
  DELIVERED: ['COMPLETED', 'REFUND', 'PROBLEM'],
  COMPLETED: ['REFUND', 'PROBLEM'],
  CANCELLED: ['PROBLEM'],
  REFUND: ['COMPLETED', 'PROBLEM'],
  PROBLEM: [
    'NEW',
    'AWAITING_PAYMENT',
    'PAID',
    'PROCESSING',
    'READY_TO_SHIP',
    'SHIPPED',
    'IN_TRANSIT',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    'REFUND',
  ],
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false
  return ORDER_STATUS_TRANSITIONS[from].includes(to)
}

/** Кнопки быстрого действия в карточке заказа (ТЗ §19). */
export const QUICK_ACTION_STATUSES: OrderStatus[] = [
  'AWAITING_PAYMENT',
  'PAID',
  'PROCESSING',
  'READY_TO_SHIP',
  'SHIPPED',
  'COMPLETED',
]

/** Отдельная группа «опасных» действий. */
export const CRITICAL_ACTION_STATUSES: OrderStatus[] = ['CANCELLED', 'REFUND', 'PROBLEM']

/** Статусы, при которых резерв остатков должен быть снят. */
export const STOCK_RELEASING_STATUSES: OrderStatus[] = ['CANCELLED', 'REFUND']

/** Заказ ещё «в работе» — показывать владельцу в «требуют внимания». */
export function isActiveOrder(status: OrderStatus): boolean {
  return !['COMPLETED', 'CANCELLED', 'REFUND'].includes(status)
}
