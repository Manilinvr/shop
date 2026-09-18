/* ==========================================================================
   MANILI — ОБЩИЕ КОНСТАНТЫ СЕРВЕРНЫХ ФУНКЦИЙ
   Дублируют доменную модель фронтенда. Источник истины для расчётов — здесь:
   клиенту нельзя доверять ни цену, ни скидку, ни остатки (ТЗ §15, §35).
   ========================================================================== */

export const COLLECTIONS = {
  profiles: 'profiles',
  addresses: 'addresses',
  products: 'products',
  productVariants: 'product_variants',
  categories: 'categories',
  collections: 'collections',
  favorites: 'favorites',
  orders: 'orders',
  orderItems: 'order_items',
  payments: 'payments',
  deliveries: 'deliveries',
  promocodes: 'promocodes',
  promocodeUsages: 'promocode_usages',
  notificationLogs: 'notification_logs',
  orderStatusHistory: 'order_status_history',
  auditLogs: 'audit_logs',
  homepageBlocks: 'homepage_blocks',
  idempotencyKeys: 'idempotency_keys',
}

export const ORDER_STATUS = {
  NEW: 'NEW',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  PAID: 'PAID',
  PROCESSING: 'PROCESSING',
  READY_TO_SHIP: 'READY_TO_SHIP',
  SHIPPED: 'SHIPPED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REFUND: 'REFUND',
  PROBLEM: 'PROBLEM',
}

export const ORDER_STATUS_LABELS = {
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

/** Допустимые переходы. Проверяются на сервере, а не только в интерфейсе. */
export const ORDER_STATUS_TRANSITIONS = {
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
  PROBLEM: Object.keys(ORDER_STATUS).filter((s) => s !== 'PROBLEM'),
}

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  WAITING_FOR_CAPTURE: 'WAITING_FOR_CAPTURE',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED',
}

export const ORDER_EVENTS = {
  CREATED: 'order.created',
  PAID: 'payment.paid',
  FAILED: 'payment.failed',
  PROCESSING: 'order.processing',
  READY: 'order.ready',
  SHIPPED: 'order.shipped',
  IN_TRANSIT: 'order.in_transit',
  DELIVERED: 'order.delivered',
  COMPLETED: 'order.completed',
  CANCELLED: 'order.cancelled',
  REFUNDED: 'order.refunded',
  PROBLEM: 'order.problem',
}

export const STATUS_EVENT_MAP = {
  PAID: ORDER_EVENTS.PAID,
  PROCESSING: ORDER_EVENTS.PROCESSING,
  READY_TO_SHIP: ORDER_EVENTS.READY,
  SHIPPED: ORDER_EVENTS.SHIPPED,
  IN_TRANSIT: ORDER_EVENTS.IN_TRANSIT,
  DELIVERED: ORDER_EVENTS.DELIVERED,
  COMPLETED: ORDER_EVENTS.COMPLETED,
  CANCELLED: ORDER_EVENTS.CANCELLED,
  REFUND: ORDER_EVENTS.REFUNDED,
  PROBLEM: ORDER_EVENTS.PROBLEM,
}

/** Статусы, при которых резерв остатков снимается. */
export const STOCK_RELEASING_STATUSES = ['CANCELLED', 'REFUND']

export const ROLES = { CUSTOMER: 'CUSTOMER', MANAGER: 'MANAGER', ADMIN: 'ADMIN' }

export const FREE_DELIVERY_THRESHOLD = Number(process.env.FREE_DELIVERY_THRESHOLD || 1000000)

/** Максимум одной позиции в заказе — защита от абьюза. */
export const MAX_QTY_PER_ITEM = 10
