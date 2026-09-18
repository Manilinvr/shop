/* ==========================================================================
   MANILI — MAPPERS APPWRITE → ДОМЕН
   Документы Appwrite плоские, домен — нет. Всё преобразование живёт здесь,
   чтобы смена backend не задела ни одного компонента.
   ========================================================================== */

import type { Models } from 'appwrite'
import type {
  Category,
  Collection,
  HomepageBlock,
  Order,
  OrderItem,
  OrderStatusHistoryEntry,
  Product,
  ProductVariant,
  Promocode,
  User,
} from '@/domain/types'
import { fileUrl } from './client'

type Doc = Models.Document & Record<string, unknown>

function str(doc: Doc, key: string, fallback = ''): string {
  const value = doc[key]
  return typeof value === 'string' ? value : fallback
}
function num(doc: Doc, key: string, fallback = 0): number {
  const value = doc[key]
  return typeof value === 'number' ? value : fallback
}
function bool(doc: Doc, key: string, fallback = false): boolean {
  const value = doc[key]
  return typeof value === 'boolean' ? value : fallback
}
function strList(doc: Doc, key: string): string[] {
  const value = doc[key]
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}
function nullableStr(doc: Doc, key: string): string | null {
  const value = doc[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

/** Ссылка на медиа: либо fileId из Storage, либо готовый URL. */
function media(value: string | null): string | null {
  if (!value) return null
  return value.startsWith('http') || value.startsWith('placeholder:') ? value : fileUrl(value)
}

export function toCategory(doc: Doc): Category {
  return {
    id: doc.$id,
    slug: str(doc, 'slug'),
    title: str(doc, 'title'),
    description: nullableStr(doc, 'description'),
    image: media(nullableStr(doc, 'image')),
    sortOrder: num(doc, 'sortOrder'),
    isActive: bool(doc, 'isActive', true),
  }
}

export function toCollection(doc: Doc): Collection {
  return {
    id: doc.$id,
    slug: str(doc, 'slug'),
    title: str(doc, 'title'),
    description: nullableStr(doc, 'description'),
    cover: media(nullableStr(doc, 'cover')),
    banner: media(nullableStr(doc, 'banner')),
    releaseDate: nullableStr(doc, 'releaseDate'),
    status: (str(doc, 'status', 'PUBLISHED') as Collection['status']),
    sortOrder: num(doc, 'sortOrder'),
  }
}

export function toVariant(doc: Doc): ProductVariant {
  return {
    id: doc.$id,
    productId: str(doc, 'productId'),
    size: (str(doc, 'size', 'ONE_SIZE') as ProductVariant['size']),
    sku: str(doc, 'sku'),
    stock: num(doc, 'stock'),
    reserved: num(doc, 'reserved'),
    priceModifier: num(doc, 'priceModifier'),
    isActive: bool(doc, 'isActive', true),
  }
}

export function toProduct(doc: Doc, variants: ProductVariant[]): Product {
  const images = strList(doc, 'images')
  return {
    id: doc.$id,
    slug: str(doc, 'slug'),
    title: str(doc, 'title'),
    subtitle: nullableStr(doc, 'subtitle'),
    description: str(doc, 'description'),
    composition: nullableStr(doc, 'composition'),
    price: num(doc, 'price'),
    oldPrice: typeof doc.oldPrice === 'number' ? doc.oldPrice : null,
    sku: str(doc, 'sku'),
    categoryId: str(doc, 'categoryId'),
    collectionId: nullableStr(doc, 'collectionId'),
    color: {
      code: str(doc, 'colorCode', 'black'),
      title: str(doc, 'colorTitle', 'Чёрный'),
      hex: str(doc, 'colorHex', '#14120f'),
    },
    images: images.map((value, index) => ({
      id: `${doc.$id}-img-${index}`,
      url: media(value) ?? '',
      alt: null,
      sortOrder: index,
      isPrimary: index === 0,
    })),
    videoUrl: media(nullableStr(doc, 'videoUrl')),
    variants,
    tags: strList(doc, 'tags'),
    status: (str(doc, 'status', 'PUBLISHED') as Product['status']),
    isNew: bool(doc, 'isNew'),
    isLimited: bool(doc, 'isLimited'),
    popularity: num(doc, 'popularity'),
    seoTitle: nullableStr(doc, 'seoTitle'),
    seoDescription: nullableStr(doc, 'seoDescription'),
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  }
}

export function toUser(doc: Doc): User {
  return {
    id: doc.$id,
    firstName: str(doc, 'firstName'),
    lastName: str(doc, 'lastName'),
    phone: nullableStr(doc, 'phone'),
    email: nullableStr(doc, 'email'),
    role: (str(doc, 'role', 'CUSTOMER') as User['role']),
    createdAt: doc.$createdAt,
    notificationSettings: {
      email: bool(doc, 'notifyEmail', true),
      sms: bool(doc, 'notifySms', true),
      telegram: bool(doc, 'notifyTelegram', false),
      marketing: bool(doc, 'notifyMarketing', false),
    },
  }
}

export function toOrderItem(doc: Doc): OrderItem {
  return {
    id: doc.$id,
    orderId: str(doc, 'orderId'),
    productId: str(doc, 'productId'),
    variantId: str(doc, 'variantId'),
    productTitle: str(doc, 'productTitle'),
    productSlug: str(doc, 'productSlug'),
    productImage: media(nullableStr(doc, 'productImage')),
    size: (str(doc, 'size', 'ONE_SIZE') as OrderItem['size']),
    sku: str(doc, 'sku'),
    quantity: num(doc, 'quantity'),
    price: num(doc, 'price'),
    total: num(doc, 'total'),
  }
}

export function toOrder(doc: Doc, items: OrderItem[]): Order {
  const parse = <T>(key: string): T | null => {
    const raw = nullableStr(doc, key)
    if (!raw) return null
    try { return JSON.parse(raw) as T } catch { return null }
  }
  return {
    id: doc.$id,
    publicOrderNumber: str(doc, 'publicOrderNumber'),
    userId: nullableStr(doc, 'userId'),
    customerName: str(doc, 'customerName'),
    phone: str(doc, 'phone'),
    email: nullableStr(doc, 'email'),
    items,
    subtotal: num(doc, 'subtotal'),
    discount: num(doc, 'discount'),
    promocode: nullableStr(doc, 'promocode'),
    deliveryPrice: num(doc, 'deliveryPrice'),
    total: num(doc, 'total'),
    paymentMethod: (str(doc, 'paymentMethod', 'CARD') as Order['paymentMethod']),
    paymentStatus: (str(doc, 'paymentStatus', 'PENDING') as Order['paymentStatus']),
    deliveryStatus: (str(doc, 'deliveryStatus', 'NOT_SHIPPED') as Order['deliveryStatus']),
    orderStatus: (str(doc, 'orderStatus', 'NEW') as Order['orderStatus']),
    deliveryMethod: (str(doc, 'deliveryMethod', 'PICKUP_POINT') as Order['deliveryMethod']),
    deliveryProvider: nullableStr(doc, 'deliveryProvider'),
    shippingAddress: parse<Order['shippingAddress']>('shippingAddress'),
    pickupPoint: parse<Order['pickupPoint']>('pickupPoint'),
    trackingNumber: nullableStr(doc, 'trackingNumber'),
    paymentId: nullableStr(doc, 'paymentId'),
    deliveryId: nullableStr(doc, 'deliveryId'),
    comment: nullableStr(doc, 'comment'),
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  }
}

export function toOrderHistory(doc: Doc): OrderStatusHistoryEntry {
  return {
    id: doc.$id,
    orderId: str(doc, 'orderId'),
    field: str(doc, 'field'),
    oldValue: nullableStr(doc, 'oldValue'),
    newValue: str(doc, 'newValue'),
    changedBy: str(doc, 'changedBy', 'system'),
    changedByName: str(doc, 'changedByName', 'Система'),
    comment: nullableStr(doc, 'comment'),
    createdAt: doc.$createdAt,
  }
}

export function toPromocode(doc: Doc): Promocode {
  return {
    id: doc.$id,
    code: str(doc, 'code'),
    discountType: (str(doc, 'discountType', 'PERCENT') as Promocode['discountType']),
    discountValue: num(doc, 'discountValue'),
    minOrderTotal: typeof doc.minOrderTotal === 'number' ? doc.minOrderTotal : null,
    startsAt: nullableStr(doc, 'startsAt'),
    expiresAt: nullableStr(doc, 'expiresAt'),
    usageLimit: typeof doc.usageLimit === 'number' ? doc.usageLimit : null,
    usageCount: num(doc, 'usageCount'),
    isActive: bool(doc, 'isActive', true),
  }
}

export function toHomepageBlock(doc: Doc): HomepageBlock {
  let data: HomepageBlock['data'] = {}
  const raw = nullableStr(doc, 'data')
  if (raw) {
    try { data = JSON.parse(raw) as HomepageBlock['data'] } catch { data = {} }
  }
  // Медиа внутри блока тоже может быть fileId
  if (typeof data.image === 'string') data.image = media(data.image) ?? undefined
  if (Array.isArray(data.images)) {
    data.images = data.images.map((v) => media(v) ?? v)
  }
  return {
    id: doc.$id,
    type: (str(doc, 'type', 'HERO') as HomepageBlock['type']),
    sortOrder: num(doc, 'sortOrder'),
    isEnabled: bool(doc, 'isEnabled', true),
    data,
  }
}
