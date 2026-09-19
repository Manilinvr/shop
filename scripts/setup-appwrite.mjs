#!/usr/bin/env node
/* ==========================================================================
   MANILI — РАЗВЁРТЫВАНИЕ СХЕМЫ APPWRITE (ТЗ §5, §34)

   Создаёт базу, коллекции, атрибуты и индексы. Запускать один раз при
   настройке проекта, потом — при изменении схемы (скрипт идемпотентен:
   существующее пропускается).

   Запуск:
     APPWRITE_ENDPOINT=... APPWRITE_PROJECT_ID=... APPWRITE_API_KEY=... \
     node scripts/setup-appwrite.mjs

   API-ключ нужен только здесь и в серверных функциях. Во фронтенд он
   не попадает никогда.
   ========================================================================== */

import { Client, Databases, Permission, Role, Storage, ID } from 'node-appwrite'

const endpoint = process.env.APPWRITE_ENDPOINT
const projectId = process.env.APPWRITE_PROJECT_ID
const apiKey = process.env.APPWRITE_API_KEY
const dbId = process.env.APPWRITE_DATABASE_ID || 'manili'
const bucketId = process.env.APPWRITE_BUCKET_ID || 'media'

if (!endpoint || !projectId || !apiKey) {
  console.error('Нужны APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID и APPWRITE_API_KEY.')
  process.exit(1)
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
const databases = new Databases(client)
const storage = new Storage(client)

const S = (key, size = 255, required = false, def = null) => ({ type: 'string', key, size, required, def })
const I = (key, required = false, def = null) => ({ type: 'integer', key, required, def })
const B = (key, required = false, def = null) => ({ type: 'boolean', key, required, def })
const D = (key, required = false) => ({ type: 'datetime', key, required })
const E = (key, elements, required = false, def = null) => ({ type: 'enum', key, elements, required, def })
const SA = (key, size = 64) => ({ type: 'string', key, size, required: false, array: true })

/*
   МОДЕЛЬ ДОСТУПА

   Кто такой администратор, решает не поле role в базе, а метка `admin`
   у пользователя Appwrite. Поле подделать можно — свой профиль человек
   правит сам; метку ставит только владелец проекта из консоли или сервер
   по API-ключу. Поэтому права опираются на метку (ТЗ §25, §32).

   Личные коллекции открыты на создание всем вошедшим, но не на чтение:
   кто увидит конкретную запись, решают права самого документа, которые
   проставляются при создании. Иначе любой покупатель читал бы чужие
   профили, адреса и заказы.
*/

/** Каталог и контент витрины: читают все, правит администратор. */
const CATALOG = [
  Permission.read(Role.any()),
  Permission.create(Role.label('admin')),
  Permission.update(Role.label('admin')),
  Permission.delete(Role.label('admin')),
]

/** Личное: вошедший заводит свою запись, видит её только он и админ. */
const USER_OWNED = [
  Permission.create(Role.users()),
  Permission.read(Role.label('admin')),
  Permission.update(Role.label('admin')),
  Permission.delete(Role.label('admin')),
]

/** Пишет сервер, читает владелец записи (по правам документа) и админ. */
const SERVER_WRITES = [
  Permission.read(Role.label('admin')),
  Permission.update(Role.label('admin')),
]

/** Только админ: содержимое не для покупателей. */
const ADMIN_ONLY = [
  Permission.read(Role.label('admin')),
  Permission.create(Role.label('admin')),
  Permission.update(Role.label('admin')),
  Permission.delete(Role.label('admin')),
]

/** Только сервер: пишет и читает функция с API-ключом, прав не нужно. */
const SERVER_ONLY = []

const SCHEMA = [
  {
    id: 'profiles',
    name: 'Профили',
    permissions: USER_OWNED,
    documentSecurity: true,
    attributes: [
      S('firstName', 120), S('lastName', 120), S('phone', 20), S('email', 160),
      E('role', ['CUSTOMER', 'MANAGER', 'ADMIN'], true, 'CUSTOMER'),
      B('notifyEmail', false, true), B('notifySms', false, true),
      B('notifyTelegram', false, false), B('notifyMarketing', false, false),
      S('searchIndex', 400),
    ],
    indexes: [
      { key: 'idx_phone', type: 'key', attributes: ['phone'] },
      { key: 'idx_email', type: 'key', attributes: ['email'] },
      { key: 'idx_search', type: 'fulltext', attributes: ['searchIndex'] },
    ],
  },
  {
    id: 'addresses',
    name: 'Адреса',
    permissions: USER_OWNED,
    documentSecurity: true,
    attributes: [
      S('userId', 64, true), S('label', 80), S('city', 120, true), S('street', 200, true),
      S('house', 40, true), S('apartment', 40), S('postalCode', 20), S('comment', 400),
      B('isDefault', false, false),
    ],
    indexes: [{ key: 'idx_user', type: 'key', attributes: ['userId'] }],
  },
  {
    id: 'categories',
    name: 'Категории',
    permissions: CATALOG,
    attributes: [
      S('slug', 120, true), S('title', 160, true), S('description', 600), S('image', 400),
      I('sortOrder', false, 0), B('isActive', false, true),
    ],
    indexes: [
      { key: 'idx_slug', type: 'unique', attributes: ['slug'] },
      { key: 'idx_sort', type: 'key', attributes: ['sortOrder'] },
    ],
  },
  {
    id: 'collections',
    name: 'Коллекции',
    permissions: CATALOG,
    attributes: [
      S('slug', 120, true), S('title', 160, true), S('description', 1200),
      S('cover', 400), S('banner', 400), D('releaseDate'),
      E('status', ['DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED'], false, 'DRAFT'),
      I('sortOrder', false, 0),
    ],
    indexes: [
      { key: 'idx_slug', type: 'unique', attributes: ['slug'] },
      { key: 'idx_status', type: 'key', attributes: ['status'] },
    ],
  },
  {
    id: 'products',
    name: 'Товары',
    permissions: CATALOG,
    attributes: [
      S('slug', 160, true), S('title', 200, true), S('subtitle', 300),
      S('description', 4000), S('composition', 1200),
      I('price', true), I('oldPrice'), S('sku', 64, true),
      S('categoryId', 64, true), S('collectionId', 64),
      S('colorCode', 40), S('colorTitle', 80), S('colorHex', 12),
      SA('images', 400), S('videoUrl', 400), SA('tags', 60),
      E('status', ['DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED'], false, 'DRAFT'),
      B('isNew', false, false), B('isLimited', false, false),
      I('popularity', false, 0),
      S('seoTitle', 200), S('seoDescription', 400),
    ],
    indexes: [
      { key: 'idx_slug', type: 'unique', attributes: ['slug'] },
      { key: 'idx_status', type: 'key', attributes: ['status'] },
      { key: 'idx_category', type: 'key', attributes: ['categoryId'] },
      { key: 'idx_collection', type: 'key', attributes: ['collectionId'] },
      { key: 'idx_price', type: 'key', attributes: ['price'] },
      { key: 'idx_popularity', type: 'key', attributes: ['popularity'] },
      { key: 'idx_title_search', type: 'fulltext', attributes: ['title'] },
    ],
  },
  {
    id: 'product_variants',
    name: 'Размеры товаров',
    permissions: CATALOG,
    attributes: [
      S('productId', 64, true),
      E('size', ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ONE_SIZE'], true),
      S('sku', 80, true),
      I('stock', false, 0), I('reserved', false, 0), I('priceModifier', false, 0),
      B('isActive', false, true),
      // version — оптимистическая блокировка при резервировании (ТЗ §35)
      I('version', false, 0),
    ],
    indexes: [
      { key: 'idx_product', type: 'key', attributes: ['productId'] },
      { key: 'idx_sku', type: 'unique', attributes: ['sku'] },
    ],
  },
  {
    id: 'favorites',
    name: 'Избранное',
    permissions: USER_OWNED,
    documentSecurity: true,
    attributes: [S('userId', 64, true), S('productId', 64, true)],
    indexes: [
      { key: 'idx_user', type: 'key', attributes: ['userId'] },
      { key: 'idx_user_product', type: 'unique', attributes: ['userId', 'productId'] },
    ],
  },
  {
    id: 'promocodes',
    name: 'Промокоды',
    // Покупателю список кодов не виден — иначе его просто переберут.
    // Проверяет код серверная функция, а заводит и правит админка.
    permissions: ADMIN_ONLY,
    documentSecurity: true,
    attributes: [
      S('code', 40, true),
      E('discountType', ['PERCENT', 'FIXED', 'FREE_DELIVERY'], true),
      I('discountValue', false, 0), I('minOrderTotal'),
      D('startsAt'), D('expiresAt'), I('usageLimit'), I('usageCount', false, 0),
      B('isActive', false, true),
    ],
    indexes: [{ key: 'idx_code', type: 'unique', attributes: ['code'] }],
  },
  {
    id: 'promocode_usages',
    name: 'Использования промокодов',
    permissions: SERVER_ONLY,
    attributes: [S('promocodeId', 64, true), S('orderId', 64, true), S('userId', 64)],
    indexes: [{ key: 'idx_promo', type: 'key', attributes: ['promocodeId'] }],
  },
  {
    id: 'orders',
    name: 'Заказы',
    permissions: SERVER_WRITES,
    documentSecurity: true,
    attributes: [
      S('publicOrderNumber', 40, true), S('userId', 64),
      S('customerName', 160, true), S('phone', 20, true), S('email', 160),
      I('subtotal', true), I('discount', false, 0), S('promocode', 40),
      I('deliveryPrice', false, 0), I('total', true),
      E('paymentMethod', ['CARD', 'SBP', 'CASH_ON_DELIVERY'], false, 'CARD'),
      E('paymentStatus', ['PENDING', 'WAITING_FOR_CAPTURE', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'], false, 'PENDING'),
      E('deliveryStatus', ['NOT_SHIPPED', 'READY', 'HANDED_OVER', 'IN_TRANSIT', 'AT_PICKUP_POINT', 'DELIVERED', 'RETURNED'], false, 'NOT_SHIPPED'),
      E('orderStatus', ['NEW', 'AWAITING_PAYMENT', 'PAID', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUND', 'PROBLEM'], false, 'NEW'),
      E('deliveryMethod', ['PICKUP_POINT', 'COURIER', 'POST', 'SELF_PICKUP'], false, 'PICKUP_POINT'),
      S('deliveryProvider', 40),
      S('shippingAddress', 1200), S('pickupPoint', 1200),
      S('trackingNumber', 64), S('paymentId', 64), S('deliveryId', 64),
      S('comment', 600),
      // Уникальный индекс не даст создать второй заказ по тому же ключу (ТЗ §32)
      S('idempotencyKey', 80),
      S('searchIndex', 500),
    ],
    indexes: [
      { key: 'idx_number', type: 'unique', attributes: ['publicOrderNumber'] },
      { key: 'idx_idempotency', type: 'unique', attributes: ['idempotencyKey'] },
      { key: 'idx_user', type: 'key', attributes: ['userId'] },
      { key: 'idx_status', type: 'key', attributes: ['orderStatus'] },
      { key: 'idx_total', type: 'key', attributes: ['total'] },
      { key: 'idx_search', type: 'fulltext', attributes: ['searchIndex'] },
    ],
  },
  {
    id: 'order_items',
    name: 'Позиции заказов',
    permissions: SERVER_WRITES,
    documentSecurity: true,
    attributes: [
      S('orderId', 64, true), S('productId', 64, true), S('variantId', 64, true),
      S('productTitle', 200, true), S('productSlug', 160), S('productImage', 400),
      E('size', ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ONE_SIZE'], false, 'ONE_SIZE'),
      S('sku', 80), I('quantity', true), I('price', true), I('total', true),
    ],
    indexes: [{ key: 'idx_order', type: 'key', attributes: ['orderId'] }],
  },
  {
    id: 'payments',
    name: 'Платежи',
    permissions: SERVER_ONLY,
    attributes: [
      S('orderId', 64, true), S('provider', 40), S('providerPaymentId', 120),
      E('method', ['CARD', 'SBP', 'CASH_ON_DELIVERY'], false, 'CARD'),
      I('amount', true),
      E('status', ['PENDING', 'WAITING_FOR_CAPTURE', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'], false, 'PENDING'),
      S('confirmationUrl', 800), D('paidAt'),
    ],
    indexes: [
      { key: 'idx_order', type: 'key', attributes: ['orderId'] },
      { key: 'idx_provider_payment', type: 'key', attributes: ['providerPaymentId'] },
    ],
  },
  {
    id: 'deliveries',
    name: 'Отправления',
    permissions: SERVER_ONLY,
    attributes: [
      S('orderId', 64, true), S('provider', 40), S('externalId', 120),
      S('trackingNumber', 64), S('status', 60), S('rawStatus', 1200),
    ],
    indexes: [{ key: 'idx_order', type: 'key', attributes: ['orderId'] }],
  },
  {
    id: 'order_status_history',
    name: 'История заказов',
    permissions: SERVER_WRITES,
    documentSecurity: true,
    attributes: [
      S('orderId', 64, true), S('field', 60, true),
      S('oldValue', 200), S('newValue', 200, true),
      S('changedBy', 64), S('changedByName', 160), S('comment', 400),
    ],
    indexes: [{ key: 'idx_order', type: 'key', attributes: ['orderId'] }],
  },
  {
    id: 'notification_logs',
    name: 'Журнал уведомлений',
    permissions: SERVER_ONLY,
    attributes: [
      E('channel', ['EMAIL', 'SMS', 'TELEGRAM', 'INTERNAL'], true),
      S('event', 60, true), S('recipient', 160),
      E('status', ['QUEUED', 'SENT', 'FAILED'], false, 'QUEUED'),
      S('error', 400),
    ],
    indexes: [{ key: 'idx_event', type: 'key', attributes: ['event'] }],
  },
  {
    id: 'audit_logs',
    name: 'Журнал действий',
    permissions: ADMIN_ONLY,
    documentSecurity: true,
    attributes: [
      S('actorId', 64), S('actorName', 160), S('action', 80, true),
      S('entity', 60), S('entityId', 64),
    ],
    indexes: [{ key: 'idx_action', type: 'key', attributes: ['action'] }],
  },
  {
    id: 'homepage_blocks',
    name: 'Блоки главной',
    permissions: CATALOG,
    attributes: [
      E('type', ['HERO', 'NEW_COLLECTION', 'CATEGORIES', 'FEATURED_PRODUCTS', 'EDITORIAL', 'MEDIA', 'STORY', 'NEW_ARRIVALS', 'COLLECTIONS', 'CTA', 'MARQUEE'], true),
      I('sortOrder', false, 0), B('isEnabled', false, true),
      S('data', 8000),
    ],
    indexes: [{ key: 'idx_sort', type: 'key', attributes: ['sortOrder'] }],
  },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function safe(label, fn) {
  try {
    await fn()
    console.log(`  + ${label}`)
  } catch (error) {
    if (error?.code === 409) {
      console.log(`  = ${label} (уже есть)`)
      return
    }
    console.error(`  ! ${label}: ${error?.message || error}`)
  }
}

async function createAttribute(collectionId, attr) {
  const { type, key, size, required, def, elements, array } = attr
  switch (type) {
    case 'string':
      return databases.createStringAttribute(dbId, collectionId, key, size, required, def ?? undefined, array ?? false)
    case 'integer':
      return databases.createIntegerAttribute(dbId, collectionId, key, required, undefined, undefined, def ?? undefined)
    case 'boolean':
      return databases.createBooleanAttribute(dbId, collectionId, key, required, def ?? undefined)
    case 'datetime':
      return databases.createDatetimeAttribute(dbId, collectionId, key, required)
    case 'enum':
      return databases.createEnumAttribute(dbId, collectionId, key, elements, required, def ?? undefined)
    default:
      throw new Error(`Неизвестный тип атрибута: ${type}`)
  }
}

async function main() {
  console.log(`\nMANILI — настройка Appwrite\n  проект: ${projectId}\n  база:   ${dbId}\n`)

  await safe(`база ${dbId}`, () => databases.create(dbId, 'MANILI'))

  for (const collection of SCHEMA) {
    console.log(`\n${collection.name} (${collection.id})`)

    // Сначала пробуем создать; если коллекция уже есть — обновляем права.
    // Без этого правка модели доступа не доезжала бы до боевой базы:
    // createCollection отвечает 409, и старые права оставались навсегда.
    let created = false
    try {
      await databases.createCollection(
        dbId, collection.id, collection.name,
        collection.permissions, collection.documentSecurity ?? false,
      )
      created = true
      console.log('  + коллекция')
    } catch (error) {
      if (error?.code !== 409) {
        console.error(`  ! коллекция: ${error?.message || error}`)
      }
    }

    if (!created) {
      await safe('права коллекции обновлены', () =>
        databases.updateCollection(
          dbId, collection.id, collection.name,
          collection.permissions, collection.documentSecurity ?? false,
        ),
      )
    }

    for (const attr of collection.attributes) {
      await safe(`атрибут ${attr.key}`, () => createAttribute(collection.id, attr))
      // Appwrite создаёт атрибуты асинхронно: индексы упадут, если спешить.
      await sleep(180)
    }

    // Ждём, пока все атрибуты станут available, иначе индексы не создадутся.
    await sleep(1200)

    for (const index of collection.indexes ?? []) {
      await safe(`индекс ${index.key}`, () =>
        databases.createIndex(dbId, collection.id, index.key, index.type, index.attributes),
      )
      await sleep(250)
    }
  }

  console.log('\nХранилище файлов')
  await safe(`бакет ${bucketId}`, () =>
    storage.createBucket(bucketId, 'MANILI media', [Permission.read(Role.any())], false, true, 30 * 1024 * 1024),
  )

  console.log(`
Готово.

Дальше:
  1. Создайте функции из папки functions/ (create-order, payment-webhook,
     set-order-status, check-promocode, quote-delivery).
  2. Задайте им переменные окружения из .env.example (раздел SERVER-SIDE).
  3. Проставьте в проекте роль ADMIN своему профилю:
     коллекция profiles → ваш документ → role = ADMIN.
  4. В .env фронтенда укажите VITE_BACKEND=appwrite и ID проекта.
`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
