/* ==========================================================================
   MANILI — APPWRITE CLIENT (ТЗ §5)

   Публичные параметры (endpoint, projectId) допустимо держать в браузере —
   это идентификаторы, а не секреты. APPWRITE_API_KEY сюда попадать НЕ ДОЛЖЕН:
   он живёт только в серверных функциях.
   ========================================================================== */

import { Account, Client, Databases, Functions, Permission, Role, Storage } from 'appwrite'
import { config } from '@/api/config'

let client: Client | null = null

export function getClient(): Client {
  if (!client) {
    client = new Client()
      .setEndpoint(config.appwrite.endpoint)
      .setProject(config.appwrite.projectId)
  }
  return client
}

export const account = () => new Account(getClient())
export const databases = () => new Databases(getClient())
export const storage = () => new Storage(getClient())
export const functions = () => new Functions(getClient())

/**
 * Права личной записи: её заводит сам пользователь, и видеть её должен
 * только он. На уровне коллекции разрешено лишь создание — кто получит
 * доступ к конкретному документу, решается здесь, в момент создания.
 * Без этого человек не смог бы прочитать даже собственный профиль.
 *
 * Администратор читает такие записи по метке `admin` — она задана
 * в правах коллекции и сюда не дублируется.
 */
export function ownerPermissions(userId: string): string[] {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ]
}

export const DB_ID = config.appwrite.databaseId
export const BUCKET_ID = config.appwrite.bucketId

/** Имена коллекций Appwrite — соответствуют схеме из ТЗ §34. */
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
} as const

/** Серверные функции Appwrite (ТЗ §36). */
export const FUNCTION_IDS = {
  createOrder: 'create-order',
  checkPromocode: 'check-promocode',
  quoteDelivery: 'quote-delivery',
  setOrderStatus: 'set-order-status',
  paymentWebhook: 'payment-webhook',
  notifyOrderEvent: 'notify-order-event',
} as const

/** Ссылка на файл в Storage. */
export function fileUrl(fileId: string): string {
  return `${config.appwrite.endpoint}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${config.appwrite.projectId}`
}
