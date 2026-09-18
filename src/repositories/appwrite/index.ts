/* ==========================================================================
   MANILI — APPWRITE BACKEND (ТЗ §5, §36)

   Правило разделения:
   • Чтение каталога и контента — напрямую из Databases (быстро, кешируемо).
   • Всё критичное (заказы, остатки, промокоды, смена статусов, платежи) —
     ТОЛЬКО через Appwrite Functions. У браузера нет ни API-ключа, ни
     возможности повлиять на сумму заказа (ТЗ §15, §32, §35).
   ========================================================================== */

import { ID as AppwriteID, Query } from 'appwrite'
import type { Models } from 'appwrite'
import type {
  Address,
  AuditLogEntry,
  Category,
  Collection,
  HomepageBlock,
  Order,
  Paginated,
  Product,
  ProductVariant,
  Promocode,
  Size,
  User,
} from '@/domain/types'
import { AppError } from '../contracts'
import type {
  AnalyticsRepository,
  AuditRepository,
  AuthRepository,
  AuthSession,
  Backend,
  CatalogAdminRepository,
  CatalogFacets,
  CatalogRepository,
  CustomerAdminRepository,
  CustomerSummary,
  DeliveryRepository,
  FavoritesRepository,
  HomepageAdminRepository,
  OrderAdminRepository,
  OrderRepository,
  ProductQuery,
  PromocodeAdminRepository,
  PromocodeRepository,
  SortOption,
  StorageRepository,
} from '../contracts'
import {
  account,
  BUCKET_ID,
  COLLECTIONS,
  DB_ID,
  databases,
  fileUrl,
  functions,
  FUNCTION_IDS,
  storage,
} from './client'
import {
  toCategory,
  toCollection,
  toHomepageBlock,
  toOrder,
  toOrderHistory,
  toOrderItem,
  toProduct,
  toPromocode,
  toUser,
  toVariant,
} from './mappers'

type Doc = Models.Document & Record<string, unknown>

/** Вызов серверной функции с разбором её ответа. */
async function callFunction<T>(functionId: string, payload: unknown): Promise<T> {
  const execution = await functions().createExecution(
    functionId,
    JSON.stringify(payload),
    false,
    '/',
    'POST' as never,
  )
  let parsed: { ok?: boolean; data?: T; code?: string; message?: string }
  try {
    parsed = JSON.parse(execution.responseBody || '{}')
  } catch {
    throw new AppError('BAD_RESPONSE', 'Сервис временно недоступен. Попробуйте позже.')
  }
  if (parsed.ok === false || parsed.data === undefined) {
    throw new AppError(
      parsed.code ?? 'FUNCTION_ERROR',
      parsed.message ?? 'Не удалось выполнить операцию. Попробуйте ещё раз.',
    )
  }
  return parsed.data
}

const SORT_QUERIES: Record<SortOption, string> = {
  popular: Query.orderDesc('popularity'),
  new: Query.orderDesc('$createdAt'),
  price_asc: Query.orderAsc('price'),
  price_desc: Query.orderDesc('price'),
}

async function loadVariants(productIds: string[]): Promise<Map<string, ProductVariant[]>> {
  if (productIds.length === 0) return new Map()
  const res = await databases().listDocuments(DB_ID, COLLECTIONS.productVariants, [
    Query.equal('productId', productIds),
    Query.limit(500),
  ])
  const map = new Map<string, ProductVariant[]>()
  for (const doc of res.documents as Doc[]) {
    const variant = toVariant(doc)
    const list = map.get(variant.productId) ?? []
    list.push(variant)
    map.set(variant.productId, list)
  }
  return map
}

async function hydrateProducts(docs: Doc[]): Promise<Product[]> {
  const variants = await loadVariants(docs.map((d) => d.$id))
  return docs.map((doc) => toProduct(doc, variants.get(doc.$id) ?? []))
}

const catalog: CatalogRepository = {
  async listProducts(query: ProductQuery = {}): Promise<Paginated<Product>> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 12
    const f = query.filters ?? {}

    const queries: string[] = [
      Query.equal('status', 'PUBLISHED'),
      SORT_QUERIES[query.sort ?? 'popular'],
      Query.limit(pageSize),
      Query.offset((page - 1) * pageSize),
    ]

    if (f.minPrice !== undefined) queries.push(Query.greaterThanEqual('price', f.minPrice))
    if (f.maxPrice !== undefined) queries.push(Query.lessThanEqual('price', f.maxPrice))
    if (f.colors?.length) queries.push(Query.equal('colorCode', f.colors))
    if (f.isNew) queries.push(Query.equal('isNew', true))
    if (f.isLimited) queries.push(Query.equal('isLimited', true))
    if (f.search) queries.push(Query.search('title', f.search))
    if (f.tags?.length) queries.push(Query.contains('tags', f.tags))

    // Категории и коллекции приходят слагами — переводим в id.
    if (f.categorySlugs?.length) {
      const cats = await databases().listDocuments(DB_ID, COLLECTIONS.categories, [
        Query.equal('slug', f.categorySlugs), Query.limit(50),
      ])
      queries.push(Query.equal('categoryId', cats.documents.map((d) => d.$id)))
    }
    if (f.collectionSlugs?.length) {
      const cols = await databases().listDocuments(DB_ID, COLLECTIONS.collections, [
        Query.equal('slug', f.collectionSlugs), Query.limit(50),
      ])
      queries.push(Query.equal('collectionId', cols.documents.map((d) => d.$id)))
    }

    const res = await databases().listDocuments(DB_ID, COLLECTIONS.products, queries)
    let items = await hydrateProducts(res.documents as Doc[])

    // Фильтры по размеру и наличию зависят от вариантов — досеиваем после загрузки.
    if (f.sizes?.length) {
      items = items.filter((p) =>
        p.variants.some((v) => f.sizes!.includes(v.size) && v.stock - v.reserved > 0),
      )
    }
    if (f.inStockOnly) {
      items = items.filter((p) => p.variants.some((v) => v.stock - v.reserved > 0))
    }

    return {
      items, total: res.total, page, pageSize,
      hasMore: page * pageSize < res.total,
    }
  },

  async getProductBySlug(slug) {
    const res = await databases().listDocuments(DB_ID, COLLECTIONS.products, [
      Query.equal('slug', slug), Query.limit(1),
    ])
    if (res.documents.length === 0) return null
    const [product] = await hydrateProducts(res.documents as Doc[])
    return product ?? null
  },

  async getProductById(id) {
    try {
      const doc = (await databases().getDocument(DB_ID, COLLECTIONS.products, id)) as Doc
      const [product] = await hydrateProducts([doc])
      return product ?? null
    } catch {
      return null
    }
  },

  async getProductsByIds(ids) {
    if (ids.length === 0) return []
    const res = await databases().listDocuments(DB_ID, COLLECTIONS.products, [
      Query.equal('$id', ids), Query.limit(ids.length),
    ])
    const products = await hydrateProducts(res.documents as Doc[])
    // Сохраняем порядок, заданный вызывающим кодом.
    const byId = new Map(products.map((p) => [p.id, p]))
    return ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p))
  },

  async getRelatedProducts(productId, limit = 4) {
    const product = await catalog.getProductById(productId)
    if (!product) return []
    const res = await databases().listDocuments(DB_ID, COLLECTIONS.products, [
      Query.equal('status', 'PUBLISHED'),
      Query.equal('categoryId', product.categoryId),
      Query.notEqual('$id', productId),
      Query.orderDesc('popularity'),
      Query.limit(limit),
    ])
    return hydrateProducts(res.documents as Doc[])
  },

  async getFacets(): Promise<CatalogFacets> {
    const res = await databases().listDocuments(DB_ID, COLLECTIONS.products, [
      Query.equal('status', 'PUBLISHED'), Query.limit(500),
    ])
    const products = await hydrateProducts(res.documents as Doc[])
    const prices = products.map((p) => p.price)
    const sizes = new Set<Size>()
    products.forEach((p) => p.variants.forEach((v) => sizes.add(v.size)))
    const colors = new Map<string, { code: string; title: string; hex: string; count: number }>()
    products.forEach((p) => {
      const entry = colors.get(p.color.code)
      if (entry) entry.count += 1
      else colors.set(p.color.code, { ...p.color, count: 1 })
    })
    return {
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      sizes: Array.from(sizes),
      colors: Array.from(colors.values()),
    }
  },

  async listCategories() {
    const res = await databases().listDocuments(DB_ID, COLLECTIONS.categories, [
      Query.equal('isActive', true), Query.orderAsc('sortOrder'), Query.limit(100),
    ])
    return (res.documents as Doc[]).map(toCategory)
  },
  async getCategoryBySlug(slug) {
    const res = await databases().listDocuments(DB_ID, COLLECTIONS.categories, [
      Query.equal('slug', slug), Query.limit(1),
    ])
    return res.documents[0] ? toCategory(res.documents[0] as Doc) : null
  },
  async listCollections() {
    const res = await databases().listDocuments(DB_ID, COLLECTIONS.collections, [
      Query.equal('status', 'PUBLISHED'), Query.orderAsc('sortOrder'), Query.limit(100),
    ])
    return (res.documents as Doc[]).map(toCollection)
  },
  async getCollectionBySlug(slug) {
    const res = await databases().listDocuments(DB_ID, COLLECTIONS.collections, [
      Query.equal('slug', slug), Query.limit(1),
    ])
    return res.documents[0] ? toCollection(res.documents[0] as Doc) : null
  },
}

/* --- Профиль текущего пользователя --------------------------------------- */

async function loadProfile(accountId: string, fallbackEmail: string | null): Promise<User> {
  try {
    const doc = (await databases().getDocument(DB_ID, COLLECTIONS.profiles, accountId)) as Doc
    return toUser(doc)
  } catch {
    // Профиля ещё нет — создаём заготовку. Роль всегда CUSTOMER:
    // повысить её может только сервер (ТЗ §25).
    const doc = (await databases().createDocument(DB_ID, COLLECTIONS.profiles, accountId, {
      firstName: '', lastName: '', phone: null, email: fallbackEmail, role: 'CUSTOMER',
      notifyEmail: true, notifySms: true, notifyTelegram: false, notifyMarketing: false,
    })) as Doc
    return toUser(doc)
  }
}

const auth: AuthRepository = {
  async getCurrentUser() {
    try {
      const me = await account().get()
      return await loadProfile(me.$id, me.email || null)
    } catch {
      return null
    }
  },

  async requestPhoneCode(phone) {
    await account().createPhoneToken(AppwriteID.unique(), phone)
    return { sent: true, retryAfterSec: 60 }
  },

  async verifyPhoneCode(phone, code): Promise<AuthSession> {
    // Appwrite отдаёт userId в createPhoneToken; здесь ожидаем, что вызывающий
    // код передал его через phone-параметр сессии сервиса аутентификации.
    const session = await account().createSession(phone, code)
    const user = await loadProfile(session.userId, null)
    if (!user.phone) await databases().updateDocument(DB_ID, COLLECTIONS.profiles, user.id, { phone })
    return { user: { ...user, phone: user.phone ?? phone }, expiresAt: session.expire }
  },

  async registerWithEmail(input): Promise<AuthSession> {
    const created = await account().create(
      AppwriteID.unique(), input.email, input.password, `${input.firstName} ${input.lastName}`.trim(),
    )
    await account().createEmailPasswordSession(input.email, input.password)
    const doc = (await databases().createDocument(DB_ID, COLLECTIONS.profiles, created.$id, {
      firstName: input.firstName, lastName: input.lastName,
      phone: input.phone ?? null, email: input.email, role: 'CUSTOMER',
      notifyEmail: true, notifySms: false, notifyTelegram: false, notifyMarketing: true,
    })) as Doc
    return { user: toUser(doc), expiresAt: null }
  },

  async loginWithEmail(email, password): Promise<AuthSession> {
    const session = await account().createEmailPasswordSession(email, password)
    const user = await loadProfile(session.userId, email)
    return { user, expiresAt: session.expire }
  },

  async requestPasswordRecovery(email) {
    await account().createRecovery(email, `${window.location.origin}/account/recovery`)
    return { sent: true }
  },

  async completePasswordRecovery(userId, secret, password) {
    await account().updateRecovery(userId, secret, password)
  },

  async logout() {
    try { await account().deleteSession('current') } catch { /* сессии уже нет */ }
  },

  async updateProfile(patch) {
    const me = await account().get()
    const payload: Record<string, unknown> = {}
    if (patch.firstName !== undefined) payload.firstName = patch.firstName
    if (patch.lastName !== undefined) payload.lastName = patch.lastName
    if (patch.phone !== undefined) payload.phone = patch.phone
    if (patch.email !== undefined) payload.email = patch.email
    if (patch.notificationSettings) {
      payload.notifyEmail = patch.notificationSettings.email
      payload.notifySms = patch.notificationSettings.sms
      payload.notifyTelegram = patch.notificationSettings.telegram
      payload.notifyMarketing = patch.notificationSettings.marketing
    }
    const doc = (await databases().updateDocument(DB_ID, COLLECTIONS.profiles, me.$id, payload)) as Doc
    return toUser(doc)
  },

  async listAddresses(): Promise<Address[]> {
    const me = await account().get()
    const res = await databases().listDocuments(DB_ID, COLLECTIONS.addresses, [
      Query.equal('userId', me.$id), Query.limit(50),
    ])
    return (res.documents as Doc[]).map((doc) => ({
      id: doc.$id,
      userId: String(doc.userId ?? ''),
      label: (doc.label as string) ?? null,
      city: String(doc.city ?? ''),
      street: String(doc.street ?? ''),
      house: String(doc.house ?? ''),
      apartment: (doc.apartment as string) ?? null,
      postalCode: (doc.postalCode as string) ?? null,
      comment: (doc.comment as string) ?? null,
      isDefault: Boolean(doc.isDefault),
    }))
  },

  async createAddress(draft) {
    const me = await account().get()
    const doc = (await databases().createDocument(DB_ID, COLLECTIONS.addresses, AppwriteID.unique(), {
      ...draft, userId: me.$id,
    })) as Doc
    return { ...draft, id: doc.$id, userId: me.$id }
  },

  async updateAddress(id, patch) {
    const doc = (await databases().updateDocument(DB_ID, COLLECTIONS.addresses, id, patch)) as Doc
    return {
      id: doc.$id, userId: String(doc.userId ?? ''),
      label: (doc.label as string) ?? null, city: String(doc.city ?? ''),
      street: String(doc.street ?? ''), house: String(doc.house ?? ''),
      apartment: (doc.apartment as string) ?? null,
      postalCode: (doc.postalCode as string) ?? null,
      comment: (doc.comment as string) ?? null,
      isDefault: Boolean(doc.isDefault),
    }
  },

  async deleteAddress(id) {
    await databases().deleteDocument(DB_ID, COLLECTIONS.addresses, id)
  },
}

/* --- Избранное ----------------------------------------------------------- */

const favorites: FavoritesRepository = {
  async list() {
    const me = await account().get().catch(() => null)
    if (!me) return []
    const res = await databases().listDocuments(DB_ID, COLLECTIONS.favorites, [
      Query.equal('userId', me.$id), Query.limit(200),
    ])
    return res.documents.map((d) => String((d as Doc).productId ?? ''))
  },
  async add(productId) {
    const me = await account().get()
    await databases().createDocument(DB_ID, COLLECTIONS.favorites, AppwriteID.unique(), {
      userId: me.$id, productId,
    })
  },
  async remove(productId) {
    const me = await account().get()
    const res = await databases().listDocuments(DB_ID, COLLECTIONS.favorites, [
      Query.equal('userId', me.$id), Query.equal('productId', productId), Query.limit(10),
    ])
    await Promise.all(
      res.documents.map((d) => databases().deleteDocument(DB_ID, COLLECTIONS.favorites, d.$id)),
    )
  },
  async sync(localProductIds) {
    const existing = await favorites.list()
    const toAdd = localProductIds.filter((id) => !existing.includes(id))
    await Promise.all(toAdd.map((id) => favorites.add(id)))
    return Array.from(new Set([...existing, ...localProductIds]))
  },
}

/* --- Критичные операции: только через серверные функции -------------------- */

const promocodes: PromocodeRepository = {
  check(code, subtotal) {
    return callFunction(FUNCTION_IDS.checkPromocode, { code, subtotal })
  },
}

const delivery: DeliveryRepository = {
  getOptions(input) { return callFunction(FUNCTION_IDS.quoteDelivery, { action: 'options', ...input }) },
  findPickupPoints(city, provider) {
    return callFunction(FUNCTION_IDS.quoteDelivery, { action: 'pickup-points', city, provider })
  },
  suggestCities(query) {
    return callFunction(FUNCTION_IDS.quoteDelivery, { action: 'cities', query })
  },
  getTracking(orderId) {
    return callFunction(FUNCTION_IDS.quoteDelivery, { action: 'tracking', orderId })
  },
}

async function loadOrderItems(orderIds: string[]) {
  if (orderIds.length === 0) return new Map<string, ReturnType<typeof toOrderItem>[]>()
  const res = await databases().listDocuments(DB_ID, COLLECTIONS.orderItems, [
    Query.equal('orderId', orderIds), Query.limit(500),
  ])
  const map = new Map<string, ReturnType<typeof toOrderItem>[]>()
  for (const doc of res.documents as Doc[]) {
    const item = toOrderItem(doc)
    const list = map.get(item.orderId) ?? []
    list.push(item)
    map.set(item.orderId, list)
  }
  return map
}

async function hydrateOrders(docs: Doc[]): Promise<Order[]> {
  const items = await loadOrderItems(docs.map((d) => d.$id))
  return docs.map((doc) => toOrder(doc, items.get(doc.$id) ?? []))
}

const orders: OrderRepository = {
  create(input) {
    // Сумма, остатки и промокод пересчитываются на сервере (ТЗ §37).
    return callFunction(FUNCTION_IDS.createOrder, input)
  },
  async listMine() {
    const me = await account().get().catch(() => null)
    if (!me) return []
    const res = await databases().listDocuments(DB_ID, COLLECTIONS.orders, [
      Query.equal('userId', me.$id), Query.orderDesc('$createdAt'), Query.limit(100),
    ])
    return hydrateOrders(res.documents as Doc[])
  },
  async getMine(id) {
    try {
      const doc = (await databases().getDocument(DB_ID, COLLECTIONS.orders, id)) as Doc
      const [order] = await hydrateOrders([doc])
      return order ?? null
    } catch {
      return null
    }
  },
  getByPublicNumber(number, phone) {
    return callFunction(FUNCTION_IDS.createOrder, { action: 'lookup', number, phone })
  },
}

const ordersAdmin: OrderAdminRepository = {
  async list(filters = {}, page = 1, pageSize = 20): Promise<Paginated<Order>> {
    const queries: string[] = [
      Query.orderDesc('$createdAt'),
      Query.limit(pageSize),
      Query.offset((page - 1) * pageSize),
    ]
    if (filters.statuses?.length) queries.push(Query.equal('orderStatus', filters.statuses))
    if (filters.dateFrom) queries.push(Query.greaterThanEqual('$createdAt', filters.dateFrom))
    if (filters.dateTo) queries.push(Query.lessThanEqual('$createdAt', filters.dateTo))
    if (filters.minTotal !== undefined) queries.push(Query.greaterThanEqual('total', filters.minTotal))
    if (filters.maxTotal !== undefined) queries.push(Query.lessThanEqual('total', filters.maxTotal))
    if (filters.paymentMethod) queries.push(Query.equal('paymentMethod', filters.paymentMethod))
    if (filters.deliveryMethod) queries.push(Query.equal('deliveryMethod', filters.deliveryMethod))
    if (filters.search) queries.push(Query.search('searchIndex', filters.search))

    const res = await databases().listDocuments(DB_ID, COLLECTIONS.orders, queries)
    return {
      items: await hydrateOrders(res.documents as Doc[]),
      total: res.total, page, pageSize,
      hasMore: page * pageSize < res.total,
    }
  },
  async get(id) {
    try {
      const doc = (await databases().getDocument(DB_ID, COLLECTIONS.orders, id)) as Doc
      const [order] = await hydrateOrders([doc])
      return order ?? null
    } catch {
      return null
    }
  },
  setStatus(id, status, comment) {
    // Смена статуса пишет историю, дёргает события и правит остатки — только сервер.
    return callFunction(FUNCTION_IDS.setOrderStatus, { orderId: id, status, comment })
  },
  setTrackingNumber(id, trackingNumber) {
    return callFunction(FUNCTION_IDS.setOrderStatus, { orderId: id, trackingNumber })
  },
  async getHistory(id) {
    const res = await databases().listDocuments(DB_ID, COLLECTIONS.orderStatusHistory, [
      Query.equal('orderId', id), Query.orderAsc('$createdAt'), Query.limit(200),
    ])
    return (res.documents as Doc[]).map(toOrderHistory)
  },
}

/* --- Админские репозитории ------------------------------------------------ */

const catalogAdmin: CatalogAdminRepository = {
  async createProduct(draft) {
    const { variants, images, color, ...rest } = draft
    const doc = (await databases().createDocument(DB_ID, COLLECTIONS.products, AppwriteID.unique(), {
      ...rest,
      images: images.map((i) => i.url),
      colorCode: color.code, colorTitle: color.title, colorHex: color.hex,
    })) as Doc
    await Promise.all(
      variants.map((v) =>
        databases().createDocument(DB_ID, COLLECTIONS.productVariants, AppwriteID.unique(), {
          productId: doc.$id, size: v.size, sku: v.sku,
          stock: v.stock, reserved: 0, priceModifier: v.priceModifier, isActive: v.isActive,
        }),
      ),
    )
    const [product] = await hydrateProducts([doc])
    return product
  },
  async updateProduct(id, patch) {
    const payload: Record<string, unknown> = { ...patch }
    delete payload.variants
    if (patch.images) payload.images = patch.images.map((i) => i.url)
    if (patch.color) {
      payload.colorCode = patch.color.code
      payload.colorTitle = patch.color.title
      payload.colorHex = patch.color.hex
      delete payload.color
    }
    const doc = (await databases().updateDocument(DB_ID, COLLECTIONS.products, id, payload)) as Doc
    const [product] = await hydrateProducts([doc])
    return product
  },
  async deleteProduct(id) {
    await databases().deleteDocument(DB_ID, COLLECTIONS.products, id)
  },
  async setVariantStock(variantId, stock) {
    // Остатки правит серверная функция, чтобы не разъехаться с резервами.
    await callFunction(FUNCTION_IDS.setOrderStatus, { action: 'set-stock', variantId, stock })
  },

  async createCategory(draft): Promise<Category> {
    const doc = (await databases().createDocument(DB_ID, COLLECTIONS.categories, AppwriteID.unique(), draft)) as Doc
    return toCategory(doc)
  },
  async updateCategory(id, patch) {
    return toCategory((await databases().updateDocument(DB_ID, COLLECTIONS.categories, id, patch)) as Doc)
  },
  async deleteCategory(id) {
    await databases().deleteDocument(DB_ID, COLLECTIONS.categories, id)
  },

  async createCollection(draft): Promise<Collection> {
    const doc = (await databases().createDocument(DB_ID, COLLECTIONS.collections, AppwriteID.unique(), draft)) as Doc
    return toCollection(doc)
  },
  async updateCollection(id, patch) {
    return toCollection((await databases().updateDocument(DB_ID, COLLECTIONS.collections, id, patch)) as Doc)
  },
  async deleteCollection(id) {
    await databases().deleteDocument(DB_ID, COLLECTIONS.collections, id)
  },
}

const promocodesAdmin: PromocodeAdminRepository = {
  async list(): Promise<Promocode[]> {
    const res = await databases().listDocuments(DB_ID, COLLECTIONS.promocodes, [Query.limit(200)])
    return (res.documents as Doc[]).map(toPromocode)
  },
  async create(draft) {
    const doc = (await databases().createDocument(DB_ID, COLLECTIONS.promocodes, AppwriteID.unique(), {
      ...draft, usageCount: 0,
    })) as Doc
    return toPromocode(doc)
  },
  async update(id, patch) {
    return toPromocode((await databases().updateDocument(DB_ID, COLLECTIONS.promocodes, id, patch)) as Doc)
  },
  async delete(id) {
    await databases().deleteDocument(DB_ID, COLLECTIONS.promocodes, id)
  },
}

const customersAdmin: CustomerAdminRepository = {
  async list(search, page = 1, pageSize = 20): Promise<Paginated<CustomerSummary>> {
    const queries: string[] = [Query.limit(pageSize), Query.offset((page - 1) * pageSize)]
    if (search) queries.push(Query.search('searchIndex', search))
    const res = await databases().listDocuments(DB_ID, COLLECTIONS.profiles, queries)
    const users = (res.documents as Doc[]).map(toUser)
    const summaries = await Promise.all(
      users.map(async (user): Promise<CustomerSummary> => {
        const ordersRes = await databases().listDocuments(DB_ID, COLLECTIONS.orders, [
          Query.equal('userId', user.id), Query.orderDesc('$createdAt'), Query.limit(100),
        ])
        const list = ordersRes.documents as Doc[]
        const paid = list.filter((o) => o.paymentStatus === 'PAID')
        return {
          ...user,
          ordersCount: ordersRes.total,
          totalSpent: paid.reduce((sum, o) => sum + Number(o.total ?? 0), 0),
          lastOrderAt: list[0]?.$createdAt ?? null,
        }
      }),
    )
    return { items: summaries, total: res.total, page, pageSize, hasMore: page * pageSize < res.total }
  },
  async get(id) {
    const list = await customersAdmin.list(undefined, 1, 100)
    return list.items.find((u) => u.id === id) ?? null
  },
  async setRole(id, role) {
    // Роль меняет только сервер после проверки прав вызывающего (ТЗ §25).
    await callFunction(FUNCTION_IDS.setOrderStatus, { action: 'set-role', userId: id, role })
  },
}

const homepage: HomepageAdminRepository = {
  async getBlocks(): Promise<HomepageBlock[]> {
    const res = await databases().listDocuments(DB_ID, COLLECTIONS.homepageBlocks, [
      Query.orderAsc('sortOrder'), Query.limit(50),
    ])
    return (res.documents as Doc[]).map(toHomepageBlock)
  },
  async updateBlock(id, patch) {
    const payload: Record<string, unknown> = { ...patch }
    if (patch.data) payload.data = JSON.stringify(patch.data)
    return toHomepageBlock(
      (await databases().updateDocument(DB_ID, COLLECTIONS.homepageBlocks, id, payload)) as Doc,
    )
  },
  async reorderBlocks(orderedIds) {
    await Promise.all(
      orderedIds.map((id, index) =>
        databases().updateDocument(DB_ID, COLLECTIONS.homepageBlocks, id, { sortOrder: index + 1 }),
      ),
    )
    return homepage.getBlocks()
  },
  async toggleBlock(id, isEnabled) {
    return toHomepageBlock(
      (await databases().updateDocument(DB_ID, COLLECTIONS.homepageBlocks, id, { isEnabled })) as Doc,
    )
  },
}

const analytics: AnalyticsRepository = {
  getSummary(period) {
    return callFunction(FUNCTION_IDS.setOrderStatus, { action: 'analytics', ...period })
  },
}

const audit: AuditRepository = {
  async list(page = 1, pageSize = 50): Promise<Paginated<AuditLogEntry>> {
    const res = await databases().listDocuments(DB_ID, COLLECTIONS.auditLogs, [
      Query.orderDesc('$createdAt'), Query.limit(pageSize), Query.offset((page - 1) * pageSize),
    ])
    const items = (res.documents as Doc[]).map((doc): AuditLogEntry => ({
      id: doc.$id,
      actorId: String(doc.actorId ?? 'system'),
      actorName: String(doc.actorName ?? 'Система'),
      action: String(doc.action ?? ''),
      entity: String(doc.entity ?? ''),
      entityId: String(doc.entityId ?? ''),
      diff: null,
      createdAt: doc.$createdAt,
    }))
    return { items, total: res.total, page, pageSize, hasMore: page * pageSize < res.total }
  },
}

/* --- Файлы: Appwrite Storage (ТЗ §26) -------------------------------------- */

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

const storageRepo: StorageRepository = {
  isAvailable: () => Boolean(BUCKET_ID),

  async upload(file, onProgress) {
    if (!file.type.startsWith('image/')) {
      throw new AppError('BAD_FILE', 'Можно загружать только изображения.')
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new AppError('FILE_TOO_BIG', `Файл больше ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} МБ.`)
    }

    const created = await storage().createFile(
      BUCKET_ID,
      AppwriteID.unique(),
      file,
      undefined,
      // SDK сообщает прогресс — показываем его в интерфейсе.
      (progress) => onProgress?.(Math.round(progress.progress)),
    )

    return {
      id: created.$id,
      // Храним готовый URL: карточка товара не должна знать про Storage.
      url: fileUrl(created.$id),
      name: created.name,
      sizeBytes: created.sizeOriginal,
    }
  },

  async remove(fileId) {
    await storage().deleteFile(BUCKET_ID, fileId)
  },
}

export const appwriteBackend: Backend = {
  name: 'appwrite',
  catalog, catalogAdmin, auth, favorites,
  promocodes, promocodesAdmin, delivery,
  orders, ordersAdmin, customersAdmin,
  homepage, analytics, audit,
  storage: storageRepo,
}
