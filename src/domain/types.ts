/* ==========================================================================
   MANILI — ДОМЕННАЯ МОДЕЛЬ
   Чистые типы предметной области. Здесь нет ни UI, ни знания о том,
   какой backend используется (ТЗ §4: не смешивать бизнес-логику с UI).
   ========================================================================== */

/** Деньги храним в копейках — никогда во float. */
export type Kopecks = number

export type ID = string
export type ISODate = string

/* --- Пользователи и роли (ТЗ §6, §25) ---------------------------------- */

export const ROLES = ['CUSTOMER', 'MANAGER', 'ADMIN'] as const
export type Role = (typeof ROLES)[number]

export interface User {
  id: ID
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  /** Роль — источник истины на сервере. Клиенту доверять нельзя (ТЗ §25). */
  role: Role
  createdAt: ISODate
  notificationSettings: NotificationSettings
}

export interface NotificationSettings {
  email: boolean
  sms: boolean
  telegram: boolean
  marketing: boolean
}

export interface Address {
  id: ID
  userId: ID
  label: string | null
  city: string
  street: string
  house: string
  apartment: string | null
  postalCode: string | null
  comment: string | null
  isDefault: boolean
}

/* --- Каталог (ТЗ §9, §10, §26, §27) ------------------------------------ */

export interface Category {
  id: ID
  slug: string
  title: string
  description: string | null
  image: string | null
  sortOrder: number
  isActive: boolean
}

export interface Collection {
  id: ID
  slug: string
  title: string
  description: string | null
  cover: string | null
  banner: string | null
  releaseDate: ISODate | null
  status: PublishStatus
  sortOrder: number
}

export const PUBLISH_STATUSES = ['DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED'] as const
export type PublishStatus = (typeof PUBLISH_STATUSES)[number]

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ONE_SIZE'] as const
export type Size = (typeof SIZES)[number]

export interface ProductColor {
  /** Машинное имя: black, cream, graphite */
  code: string
  /** Человеческое имя: «Чёрный» */
  title: string
  /** HEX для свотча */
  hex: string
}

/**
 * Вариант товара = конкретный размер (и цвет).
 * Остатки живут ТОЛЬКО здесь и только на сервере (ТЗ §35).
 */
export interface ProductVariant {
  id: ID
  productId: ID
  size: Size
  sku: string
  /** Физический остаток на складе. */
  stock: number
  /** Зарезервировано под неоплаченные заказы. */
  reserved: number
  /** Надбавка к цене товара, если размер дороже. Обычно 0. */
  priceModifier: Kopecks
  isActive: boolean
}

export interface ProductImage {
  id: ID
  url: string
  alt: string | null
  sortOrder: number
  /** Основное изображение карточки. */
  isPrimary: boolean
}

export interface Product {
  id: ID
  slug: string
  title: string
  subtitle: string | null
  description: string
  /** Состав, уход — раскрывающийся блок в карточке. */
  composition: string | null
  price: Kopecks
  /** Старая цена для зачёркивания. */
  oldPrice: Kopecks | null
  sku: string
  categoryId: ID
  collectionId: ID | null
  color: ProductColor
  images: ProductImage[]
  videoUrl: string | null
  variants: ProductVariant[]
  tags: string[]
  status: PublishStatus
  isNew: boolean
  isLimited: boolean
  /** Для сортировки «популярные». */
  popularity: number
  seoTitle: string | null
  seoDescription: string | null
  createdAt: ISODate
  updatedAt: ISODate
}

/** Доступность варианта, вычисляется из stock/reserved (ТЗ §10). */
export const AVAILABILITY = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const
export type Availability = (typeof AVAILABILITY)[number]

/* --- Корзина и избранное (ТЗ §11, §12) --------------------------------- */

export interface CartItem {
  productId: ID
  variantId: ID
  size: Size
  quantity: number
  /** Цена на момент добавления — перед оформлением сверяем с сервером. */
  priceSnapshot: Kopecks
}

export interface CartTotals {
  subtotal: Kopecks
  discount: Kopecks
  deliveryPrice: Kopecks
  total: Kopecks
}

export interface FavoriteItem {
  productId: ID
  addedAt: ISODate
}

/* --- Промокоды (ТЗ §13) ------------------------------------------------ */

export const DISCOUNT_TYPES = ['PERCENT', 'FIXED', 'FREE_DELIVERY'] as const
export type DiscountType = (typeof DISCOUNT_TYPES)[number]

export interface Promocode {
  id: ID
  code: string
  discountType: DiscountType
  /** Процент (1–100) для PERCENT, сумма в копейках для FIXED. */
  discountValue: number
  minOrderTotal: Kopecks | null
  startsAt: ISODate | null
  expiresAt: ISODate | null
  usageLimit: number | null
  usageCount: number
  isActive: boolean
}

/** Результат проверки промокода. Считает ТОЛЬКО сервер (ТЗ §13). */
export interface PromocodeCheck {
  valid: boolean
  code: string
  discount: Kopecks
  freeDelivery: boolean
  reason?: string
}

/* --- Доставка (ТЗ §16) -------------------------------------------------- */

export const DELIVERY_METHODS = ['PICKUP_POINT', 'COURIER', 'POST', 'SELF_PICKUP'] as const
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number]

export interface DeliveryOption {
  id: string
  provider: string
  method: DeliveryMethod
  title: string
  description: string | null
  price: Kopecks
  minDays: number
  maxDays: number
}

export interface PickupPoint {
  id: string
  provider: string
  code: string
  name: string
  address: string
  city: string
  workHours: string | null
  lat: number
  lng: number
}

export interface ShippingAddress {
  city: string
  street: string
  house: string
  apartment: string | null
  postalCode: string | null
  comment: string | null
}

/* --- Оплата (ТЗ §15) ---------------------------------------------------- */

export const PAYMENT_METHODS = ['CARD', 'SBP', 'CASH_ON_DELIVERY'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_STATUSES = [
  'PENDING',
  'WAITING_FOR_CAPTURE',
  'PAID',
  'FAILED',
  'REFUNDED',
  'CANCELLED',
] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export interface Payment {
  id: ID
  orderId: ID
  provider: string
  providerPaymentId: string | null
  method: PaymentMethod
  amount: Kopecks
  status: PaymentStatus
  confirmationUrl: string | null
  createdAt: ISODate
  paidAt: ISODate | null
}

/* --- Заказ (ТЗ §17, §18) ------------------------------------------------ */

export const ORDER_STATUSES = [
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
  'PROBLEM',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const DELIVERY_STATUSES = [
  'NOT_SHIPPED',
  'READY',
  'HANDED_OVER',
  'IN_TRANSIT',
  'AT_PICKUP_POINT',
  'DELIVERED',
  'RETURNED',
] as const
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]

export interface OrderItem {
  id: ID
  orderId: ID
  productId: ID
  variantId: ID
  /** Снимок данных товара — товар может измениться позже. */
  productTitle: string
  productSlug: string
  productImage: string | null
  size: Size
  sku: string
  quantity: number
  price: Kopecks
  total: Kopecks
}

export interface Order {
  id: ID
  /** Человеческий номер: MANILI #1042. */
  publicOrderNumber: string
  userId: ID | null
  customerName: string
  phone: string
  email: string | null
  items: OrderItem[]
  subtotal: Kopecks
  discount: Kopecks
  promocode: string | null
  deliveryPrice: Kopecks
  total: Kopecks
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  deliveryStatus: DeliveryStatus
  orderStatus: OrderStatus
  deliveryMethod: DeliveryMethod
  deliveryProvider: string | null
  shippingAddress: ShippingAddress | null
  pickupPoint: PickupPoint | null
  trackingNumber: string | null
  paymentId: ID | null
  deliveryId: ID | null
  comment: string | null
  createdAt: ISODate
  updatedAt: ISODate
}

/** История изменений заказа (ТЗ §20). */
export interface OrderStatusHistoryEntry {
  id: ID
  orderId: ID
  /** Что менялось: orderStatus, paymentStatus, trackingNumber… */
  field: string
  oldValue: string | null
  newValue: string
  /** Кто изменил: userId админа или 'system'. */
  changedBy: string
  changedByName: string
  comment: string | null
  createdAt: ISODate
}

/* --- События заказа (ТЗ §38) -------------------------------------------- */

export const ORDER_EVENTS = [
  'order.created',
  'payment.paid',
  'payment.failed',
  'order.processing',
  'order.ready',
  'order.shipped',
  'order.in_transit',
  'order.delivered',
  'order.completed',
  'order.cancelled',
  'order.refunded',
  'order.problem',
] as const
export type OrderEventName = (typeof ORDER_EVENTS)[number]

export interface OrderEvent {
  name: OrderEventName
  orderId: ID
  payload: Record<string, unknown>
  createdAt: ISODate
}

/* --- Уведомления (ТЗ §23) ----------------------------------------------- */

export const NOTIFICATION_CHANNELS = ['EMAIL', 'SMS', 'TELEGRAM', 'INTERNAL'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

export interface NotificationLog {
  id: ID
  channel: NotificationChannel
  event: OrderEventName
  recipient: string
  status: 'QUEUED' | 'SENT' | 'FAILED'
  error: string | null
  createdAt: ISODate
}

/* --- CMS главной (ТЗ §8) ------------------------------------------------ */

export const HOMEPAGE_BLOCK_TYPES = [
  'HERO',
  'NEW_COLLECTION',
  'CATEGORIES',
  'FEATURED_PRODUCTS',
  'EDITORIAL',
  'MEDIA',
  'STORY',
  'NEW_ARRIVALS',
  'COLLECTIONS',
  'CTA',
  'MARQUEE',
] as const
export type HomepageBlockType = (typeof HOMEPAGE_BLOCK_TYPES)[number]

export interface HomepageBlock {
  id: ID
  type: HomepageBlockType
  sortOrder: number
  isEnabled: boolean
  /** Контент блока — форма зависит от типа, редактируется в админке. */
  data: HomepageBlockData
}

export interface HomepageBlockData {
  eyebrow?: string
  title?: string
  subtitle?: string
  text?: string
  ctaLabel?: string
  ctaHref?: string
  image?: string
  images?: string[]
  video?: string
  /** Ссылки на сущности — блок сам подтягивает актуальные данные. */
  productIds?: ID[]
  collectionId?: ID
  categoryIds?: ID[]
  items?: string[]
  [key: string]: unknown
}

/* --- Аудит (ТЗ §32) ----------------------------------------------------- */

export interface AuditLogEntry {
  id: ID
  actorId: string
  actorName: string
  action: string
  entity: string
  entityId: string
  diff: Record<string, { from: unknown; to: unknown }> | null
  createdAt: ISODate
}

/* --- Служебное ---------------------------------------------------------- */

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
