/* ==========================================================================
   MANILI — MOCK BACKEND
   Реализация всех контрактов на локальных данных.
   Используется, когда Appwrite не настроен (VITE_BACKEND=mock).

   Серверная логика (резерв остатков, пересчёт суммы, промокоды) здесь
   воспроизведена намеренно: тот же алгоритм переезжает в Appwrite Function
   без изменений в UI.
   ========================================================================== */

import {
  AVAILABILITY_LABELS,
  availableQuantity,
  findVariantById,
  LOW_STOCK_THRESHOLD,
} from '@/domain/stock'
import { percentOf } from '@/domain/money'
import type {
  Address,
  AuditLogEntry,
  Category,
  Collection,
  DeliveryOption,
  HomepageBlock,
  ID,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistoryEntry,
  Paginated,
  PickupPoint,
  Product,
  Promocode,
  PromocodeCheck,
  Role,
  Size,
  User,
} from '@/domain/types'
import { canTransition, ORDER_STATUS_LABELS, STOCK_RELEASING_STATUSES } from '@/domain/order-status'
import { sleep, uid } from '@/lib/utils'
import { AppError } from '../contracts'
import type {
  AnalyticsPeriod,
  AnalyticsRepository,
  AnalyticsSummary,
  AuditRepository,
  AuthRepository,
  AuthSession,
  Backend,
  CatalogAdminRepository,
  CatalogFacets,
  CatalogRepository,
  CategoryDraft,
  CollectionDraft,
  CreateOrderInput,
  CreateOrderResult,
  CustomerAdminRepository,
  CustomerSummary,
  DeliveryQuoteInput,
  DeliveryRepository,
  FavoritesRepository,
  HomepageAdminRepository,
  OrderAdminRepository,
  OrderFilters,
  OrderRepository,
  ProductDraft,
  ProductQuery,
  PromocodeAdminRepository,
  PromocodeRepository,
  SortOption,
  StorageRepository,
} from '../contracts'
import { DEMO_ADMIN, getDb, mutate, NETWORK_DELAY, nextOrderNumber, persist } from './db'

/** Ограничение размера загружаемого изображения. */
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
import { FREE_DELIVERY_THRESHOLD } from './seed'
import { emitOrderEvent } from '@/services/order-events'

async function tick<T>(value: T): Promise<T> {
  await sleep(NETWORK_DELAY)
  return value
}

/* --- Каталог ------------------------------------------------------------ */

function sortProducts(items: Product[], sort: SortOption): Product[] {
  const sorted = [...items]
  switch (sort) {
    case 'new':
      return sorted.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    case 'price_asc':
      return sorted.sort((a, b) => a.price - b.price)
    case 'price_desc':
      return sorted.sort((a, b) => b.price - a.price)
    case 'popular':
    default:
      return sorted.sort((a, b) => b.popularity - a.popularity)
  }
}

function matchesFilters(product: Product, query: ProductQuery): boolean {
  const f = query.filters
  if (!f) return true
  const db = getDb()

  if (f.categorySlugs?.length) {
    const cat = db.categories.find((c) => c.id === product.categoryId)
    if (!cat || !f.categorySlugs.includes(cat.slug)) return false
  }
  if (f.collectionSlugs?.length) {
    const col = db.collections.find((c) => c.id === product.collectionId)
    if (!col || !f.collectionSlugs.includes(col.slug)) return false
  }
  if (f.sizes?.length) {
    const has = product.variants.some(
      (v) => f.sizes!.includes(v.size) && availableQuantity(v) > 0,
    )
    if (!has) return false
  }
  if (f.colors?.length && !f.colors.includes(product.color.code)) return false
  if (f.minPrice !== undefined && product.price < f.minPrice) return false
  if (f.maxPrice !== undefined && product.price > f.maxPrice) return false
  if (f.inStockOnly && !product.variants.some((v) => availableQuantity(v) > 0)) return false
  if (f.isNew && !product.isNew) return false
  if (f.isLimited && !product.isLimited) return false
  if (f.tags?.length && !f.tags.some((t) => product.tags.includes(t))) return false
  if (f.search) {
    const q = f.search.trim().toLowerCase()
    const haystack = [
      product.title, product.subtitle ?? '', product.description,
      product.sku, product.color.title, ...product.tags,
    ].join(' ').toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}

const catalog: CatalogRepository = {
  async listProducts(query = {}) {
    const db = getDb()
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 12
    const visible = db.products.filter((p) => p.status === 'PUBLISHED')
    const filtered = visible.filter((p) => matchesFilters(p, query))
    const sorted = sortProducts(filtered, query.sort ?? 'popular')
    const start = (page - 1) * pageSize
    const items = sorted.slice(start, start + pageSize)
    return tick<Paginated<Product>>({
      items, total: sorted.length, page, pageSize,
      hasMore: start + pageSize < sorted.length,
    })
  },

  async getProductBySlug(slug) {
    const found = getDb().products.find((p) => p.slug === slug && p.status === 'PUBLISHED')
    return tick(found ?? null)
  },

  async getProductById(id) {
    return tick(getDb().products.find((p) => p.id === id) ?? null)
  },

  async getProductsByIds(ids) {
    const db = getDb()
    const byId = new Map(db.products.map((p) => [p.id, p]))
    return tick(ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p)))
  },

  async getRelatedProducts(productId, limit = 4) {
    const db = getDb()
    const product = db.products.find((p) => p.id === productId)
    if (!product) return tick([])
    const sameCategory = db.products.filter(
      (p) => p.id !== productId && p.status === 'PUBLISHED' && p.categoryId === product.categoryId,
    )
    const sameCollection = db.products.filter(
      (p) =>
        p.id !== productId && p.status === 'PUBLISHED' &&
        p.collectionId === product.collectionId && !sameCategory.includes(p),
    )
    const rest = db.products.filter(
      (p) =>
        p.id !== productId && p.status === 'PUBLISHED' &&
        !sameCategory.includes(p) && !sameCollection.includes(p),
    )
    return tick([...sameCategory, ...sameCollection, ...rest].slice(0, limit))
  },

  async getFacets() {
    const db = getDb()
    const visible = db.products.filter((p) => p.status === 'PUBLISHED')
    const prices = visible.map((p) => p.price)
    const sizeSet = new Set<Size>()
    visible.forEach((p) => p.variants.forEach((v) => sizeSet.add(v.size)))
    const colorMap = new Map<string, { code: string; title: string; hex: string; count: number }>()
    visible.forEach((p) => {
      const entry = colorMap.get(p.color.code)
      if (entry) entry.count += 1
      else colorMap.set(p.color.code, { ...p.color, count: 1 })
    })
    return tick<CatalogFacets>({
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      sizes: Array.from(sizeSet),
      colors: Array.from(colorMap.values()),
    })
  },

  async listCategories() {
    return tick(getDb().categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder))
  },
  async getCategoryBySlug(slug) {
    return tick(getDb().categories.find((c) => c.slug === slug) ?? null)
  },
  async listCollections() {
    return tick(
      getDb().collections.filter((c) => c.status === 'PUBLISHED').sort((a, b) => a.sortOrder - b.sortOrder),
    )
  },
  async getCollectionBySlug(slug) {
    return tick(getDb().collections.find((c) => c.slug === slug) ?? null)
  },
}

/* --- Аудит --------------------------------------------------------------- */

function writeAudit(action: string, entity: string, entityId: string, diff: AuditLogEntry['diff'] = null) {
  mutate((d) => {
    const actor = d.users.find((u) => u.id === d.currentUserId)
    d.auditLog.unshift({
      id: uid('audit'),
      actorId: actor?.id ?? 'system',
      actorName: actor ? `${actor.firstName} ${actor.lastName}` : 'Система',
      action, entity, entityId, diff,
      createdAt: new Date().toISOString(),
    })
    d.auditLog = d.auditLog.slice(0, 500)
  })
}

/* --- Админ: каталог ------------------------------------------------------ */

const catalogAdmin: CatalogAdminRepository = {
  async createProduct(draft: ProductDraft) {
    const now = new Date().toISOString()
    const product: Product = { ...draft, id: uid('prd'), createdAt: now, updatedAt: now }
    mutate((d) => d.products.unshift(product))
    writeAudit('product.create', 'product', product.id)
    return tick(product)
  },
  async updateProduct(id, patch) {
    const updated = mutate((d) => {
      const idx = d.products.findIndex((p) => p.id === id)
      if (idx === -1) throw new AppError('NOT_FOUND', 'Товар не найден.')
      d.products[idx] = { ...d.products[idx], ...patch, updatedAt: new Date().toISOString() }
      return d.products[idx]
    })
    writeAudit('product.update', 'product', id)
    return tick(updated)
  },
  async deleteProduct(id) {
    mutate((d) => { d.products = d.products.filter((p) => p.id !== id) })
    writeAudit('product.delete', 'product', id)
    return tick(undefined)
  },
  async setVariantStock(variantId, stock) {
    mutate((d) => {
      for (const p of d.products) {
        const v = p.variants.find((x) => x.id === variantId)
        if (v) { v.stock = Math.max(0, stock); return }
      }
      throw new AppError('NOT_FOUND', 'Размер не найден.')
    })
    writeAudit('stock.update', 'variant', variantId)
    return tick(undefined)
  },

  async createCategory(draft: CategoryDraft) {
    const category: Category = { ...draft, id: uid('cat') }
    mutate((d) => d.categories.push(category))
    writeAudit('category.create', 'category', category.id)
    return tick(category)
  },
  async updateCategory(id, patch) {
    const updated = mutate((d) => {
      const idx = d.categories.findIndex((c) => c.id === id)
      if (idx === -1) throw new AppError('NOT_FOUND', 'Категория не найдена.')
      d.categories[idx] = { ...d.categories[idx], ...patch }
      return d.categories[idx]
    })
    writeAudit('category.update', 'category', id)
    return tick(updated)
  },
  async deleteCategory(id) {
    mutate((d) => { d.categories = d.categories.filter((c) => c.id !== id) })
    writeAudit('category.delete', 'category', id)
    return tick(undefined)
  },

  async createCollection(draft: CollectionDraft) {
    const collection: Collection = { ...draft, id: uid('col') }
    mutate((d) => d.collections.push(collection))
    writeAudit('collection.create', 'collection', collection.id)
    return tick(collection)
  },
  async updateCollection(id, patch) {
    const updated = mutate((d) => {
      const idx = d.collections.findIndex((c) => c.id === id)
      if (idx === -1) throw new AppError('NOT_FOUND', 'Коллекция не найдена.')
      d.collections[idx] = { ...d.collections[idx], ...patch }
      return d.collections[idx]
    })
    writeAudit('collection.update', 'collection', id)
    return tick(updated)
  },
  async deleteCollection(id) {
    mutate((d) => { d.collections = d.collections.filter((c) => c.id !== id) })
    writeAudit('collection.delete', 'collection', id)
    return tick(undefined)
  },
}

/* --- Аутентификация ------------------------------------------------------ */

/** Демо-код подтверждения. В production код генерирует и шлёт SMS-провайдер. */
const DEMO_SMS_CODE = '0000'

const auth: AuthRepository = {
  async getCurrentUser() {
    const db = getDb()
    return tick(db.users.find((u) => u.id === db.currentUserId) ?? null)
  },

  async requestPhoneCode(phone) {
    if (!/^\+?7\d{10}$/.test(phone.replace(/\D/g, '').replace(/^8/, '7').replace(/^7/, '+7'))) {
      // мягкая проверка: точная валидация — на сервере
    }
    return tick({ sent: true, retryAfterSec: 60 })
  },

  async verifyPhoneCode(phone, code) {
    if (code !== DEMO_SMS_CODE) {
      throw new AppError('INVALID_CODE', 'Неверный код. Проверьте SMS и попробуйте ещё раз.')
    }
    const session = mutate((d) => {
      let user = d.users.find((u) => u.phone === phone)
      if (!user) {
        user = {
          id: uid('usr'), firstName: '', lastName: '', phone, email: null,
          role: 'CUSTOMER', createdAt: new Date().toISOString(),
          notificationSettings: { email: true, sms: true, telegram: false, marketing: false },
        }
        d.users.push(user)
      }
      d.currentUserId = user.id
      return { user, expiresAt: null } as AuthSession
    })
    return tick(session)
  },

  async registerWithEmail(input) {
    const session = mutate((d) => {
      if (d.users.some((u) => u.email === input.email)) {
        throw new AppError('EMAIL_TAKEN', 'Такой email уже зарегистрирован. Попробуйте войти.')
      }
      const user: User = {
        id: uid('usr'), firstName: input.firstName, lastName: input.lastName,
        phone: input.phone ?? null, email: input.email, role: 'CUSTOMER',
        createdAt: new Date().toISOString(),
        notificationSettings: { email: true, sms: false, telegram: false, marketing: true },
      }
      d.users.push(user)
      d.currentUserId = user.id
      return { user, expiresAt: null } as AuthSession
    })
    return tick(session)
  },

  async loginWithEmail(email, password) {
    // Demo-режим: пароль не проверяется, потому что хранить его на клиенте нельзя.
    // В Appwrite-адаптере это account.createEmailPasswordSession().
    if (password.length < 6) {
      throw new AppError('BAD_CREDENTIALS', 'Неверный email или пароль.')
    }
    const session = mutate((d) => {
      const user = d.users.find((u) => u.email === email)
      if (!user) throw new AppError('BAD_CREDENTIALS', 'Неверный email или пароль.')
      d.currentUserId = user.id
      return { user, expiresAt: null } as AuthSession
    })
    return tick(session)
  },

  async requestPasswordRecovery() { return tick({ sent: true }) },
  async completePasswordRecovery() { return tick(undefined) },

  async logout() {
    mutate((d) => { d.currentUserId = null })
    return tick(undefined)
  },

  async updateProfile(patch) {
    const updated = mutate((d) => {
      const user = d.users.find((u) => u.id === d.currentUserId)
      if (!user) throw new AppError('UNAUTHORIZED', 'Нужно войти в аккаунт.')
      Object.assign(user, patch)
      return user
    })
    return tick(updated)
  },

  async listAddresses() {
    const db = getDb()
    return tick(db.addresses.filter((a) => a.userId === db.currentUserId))
  },
  async createAddress(draft) {
    const address = mutate((d) => {
      if (!d.currentUserId) throw new AppError('UNAUTHORIZED', 'Нужно войти в аккаунт.')
      const created: Address = { ...draft, id: uid('adr'), userId: d.currentUserId }
      if (created.isDefault) {
        d.addresses.forEach((a) => { if (a.userId === d.currentUserId) a.isDefault = false })
      }
      d.addresses.push(created)
      return created
    })
    return tick(address)
  },
  async updateAddress(id, patch) {
    const updated = mutate((d) => {
      const address = d.addresses.find((a) => a.id === id)
      if (!address) throw new AppError('NOT_FOUND', 'Адрес не найден.')
      if (patch.isDefault) {
        d.addresses.forEach((a) => { if (a.userId === address.userId) a.isDefault = false })
      }
      Object.assign(address, patch)
      return address
    })
    return tick(updated)
  },
  async deleteAddress(id) {
    mutate((d) => { d.addresses = d.addresses.filter((a) => a.id !== id) })
    return tick(undefined)
  },
}

/* --- Избранное ----------------------------------------------------------- */

const favorites: FavoritesRepository = {
  async list() {
    const db = getDb()
    if (!db.currentUserId) return tick<ID[]>([])
    return tick(db.favorites[db.currentUserId] ?? [])
  },
  async add(productId) {
    mutate((d) => {
      if (!d.currentUserId) return
      const list = d.favorites[d.currentUserId] ?? []
      if (!list.includes(productId)) d.favorites[d.currentUserId] = [...list, productId]
    })
    return tick(undefined)
  },
  async remove(productId) {
    mutate((d) => {
      if (!d.currentUserId) return
      d.favorites[d.currentUserId] = (d.favorites[d.currentUserId] ?? []).filter((id) => id !== productId)
    })
    return tick(undefined)
  },
  async sync(localProductIds) {
    const merged = mutate((d) => {
      if (!d.currentUserId) return localProductIds
      const existing = d.favorites[d.currentUserId] ?? []
      const next = Array.from(new Set([...existing, ...localProductIds]))
      d.favorites[d.currentUserId] = next
      return next
    })
    return tick(merged)
  },
}

/* --- Промокоды ----------------------------------------------------------- */

/**
 * Проверка промокода. В production это серверная функция:
 * фронт не должен уметь назначать скидку сам (ТЗ §13).
 */
function evaluatePromocode(promo: Promocode | undefined, subtotal: number, code: string): PromocodeCheck {
  const base: PromocodeCheck = { valid: false, code, discount: 0, freeDelivery: false }
  if (!promo || !promo.isActive) {
    return { ...base, reason: 'Промокод не найден или больше не действует.' }
  }
  const now = Date.now()
  if (promo.startsAt && now < +new Date(promo.startsAt)) {
    return { ...base, reason: 'Промокод ещё не активирован.' }
  }
  if (promo.expiresAt && now > +new Date(promo.expiresAt)) {
    return { ...base, reason: 'Срок действия промокода истёк.' }
  }
  if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) {
    return { ...base, reason: 'Промокод исчерпан.' }
  }
  if (promo.minOrderTotal !== null && subtotal < promo.minOrderTotal) {
    const need = Math.ceil((promo.minOrderTotal - subtotal) / 100)
    return { ...base, reason: `Промокод действует от ${Math.ceil(promo.minOrderTotal / 100)} ₽. Добавьте ещё на ${need} ₽.` }
  }
  if (promo.discountType === 'FREE_DELIVERY') {
    return { valid: true, code: promo.code, discount: 0, freeDelivery: true }
  }
  const discount =
    promo.discountType === 'PERCENT'
      ? percentOf(subtotal, promo.discountValue)
      : Math.min(promo.discountValue, subtotal)
  return { valid: true, code: promo.code, discount, freeDelivery: false }
}

const promocodes: PromocodeRepository = {
  async check(code, subtotal) {
    const normalized = code.trim().toUpperCase()
    const promo = getDb().promocodes.find((p) => p.code.toUpperCase() === normalized)
    return tick(evaluatePromocode(promo, subtotal, normalized))
  },
}

const promocodesAdmin: PromocodeAdminRepository = {
  async list() { return tick(getDb().promocodes) },
  async create(draft) {
    const promo: Promocode = { ...draft, id: uid('promo'), usageCount: 0 }
    mutate((d) => d.promocodes.push(promo))
    writeAudit('promocode.create', 'promocode', promo.id)
    return tick(promo)
  },
  async update(id, patch) {
    const updated = mutate((d) => {
      const idx = d.promocodes.findIndex((p) => p.id === id)
      if (idx === -1) throw new AppError('NOT_FOUND', 'Промокод не найден.')
      d.promocodes[idx] = { ...d.promocodes[idx], ...patch }
      return d.promocodes[idx]
    })
    writeAudit('promocode.update', 'promocode', id)
    return tick(updated)
  },
  async delete(id) {
    mutate((d) => { d.promocodes = d.promocodes.filter((p) => p.id !== id) })
    writeAudit('promocode.delete', 'promocode', id)
    return tick(undefined)
  },
}

/* --- Доставка ------------------------------------------------------------ */

const CITIES = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
  'Нижний Новгород', 'Челябинск', 'Самара', 'Уфа', 'Ростов-на-Дону',
  'Краснодар', 'Омск', 'Воронеж', 'Пермь', 'Волгоград', 'Сочи', 'Тюмень',
]

const delivery: DeliveryRepository = {
  async getOptions(input: DeliveryQuoteInput) {
    const isMoscow = input.city.toLowerCase().includes('москв')
    const freeByTotal = input.subtotal >= FREE_DELIVERY_THRESHOLD
    const price = (base: number) => (freeByTotal ? 0 : base)
    const options: DeliveryOption[] = [
      {
        id: 'cdek-pvz', provider: 'CDEK', method: 'PICKUP_POINT',
        title: 'СДЭК — пункт выдачи', description: 'Забрать в удобном ПВЗ',
        price: price(35000), minDays: isMoscow ? 1 : 2, maxDays: isMoscow ? 2 : 5,
      },
      {
        id: 'cdek-courier', provider: 'CDEK', method: 'COURIER',
        title: 'СДЭК — курьер до двери', description: 'Курьер привезёт по адресу',
        price: price(isMoscow ? 40000 : 55000), minDays: isMoscow ? 1 : 2, maxDays: isMoscow ? 2 : 6,
      },
      {
        id: 'post-rf', provider: 'POST_RF', method: 'POST',
        title: 'Почта России', description: 'Доставка в отделение',
        price: price(30000), minDays: 3, maxDays: 10,
      },
    ]
    if (isMoscow) {
      options.push({
        id: 'self-pickup', provider: 'MANILI', method: 'SELF_PICKUP',
        title: 'Самовывоз', description: 'Москва, шоурум бренда — бесплатно',
        price: 0, minDays: 1, maxDays: 2,
      })
    }
    return tick(options)
  },

  async findPickupPoints(city, provider = 'CDEK') {
    const points: PickupPoint[] = Array.from({ length: 6 }, (_, i) => ({
      id: `${provider}-${i + 1}`,
      provider,
      code: `${provider}${100 + i}`,
      name: `Пункт выдачи №${i + 1}`,
      address: `${city}, ул. Примерная, д. ${10 + i * 3}`,
      city,
      workHours: i % 2 === 0 ? 'Пн–Вс 10:00–21:00' : 'Пн–Пт 09:00–20:00, Сб 10:00–18:00',
      lat: 55.75 + i * 0.01,
      lng: 37.61 + i * 0.015,
    }))
    return tick(points)
  },

  async suggestCities(query) {
    const q = query.trim().toLowerCase()
    if (!q) return tick(CITIES.slice(0, 8))
    return tick(CITIES.filter((c) => c.toLowerCase().includes(q)).slice(0, 8))
  },

  async getTracking(orderId) {
    const order = getDb().orders.find((o) => o.id === orderId)
    const history = getDb().orderHistory
      .filter((h) => h.orderId === orderId && h.field === 'orderStatus')
      .map((h) => ({ date: h.createdAt, text: ORDER_STATUS_LABELS[h.newValue as OrderStatus] ?? h.newValue }))
    return tick({ status: order?.deliveryStatus ?? 'NOT_SHIPPED', events: history })
  },
}

/* --- Заказы -------------------------------------------------------------- */

function recordHistory(entry: Omit<OrderStatusHistoryEntry, 'id' | 'createdAt'>) {
  mutate((d) => {
    d.orderHistory.push({ ...entry, id: uid('hist'), createdAt: new Date().toISOString() })
  })
}

/**
 * Резервирование остатков (ТЗ §35).
 * В mock это синхронно, поэтому race condition невозможен by design.
 * В Appwrite Function тот же шаг выполняется атомарно на сервере.
 */
function reserveStock(items: CreateOrderInput['items']): void {
  const db = getDb()
  // Сначала проверяем ВСЁ, и только потом резервируем — частичный резерв недопустим.
  for (const item of items) {
    const product = db.products.find((p) => p.id === item.productId)
    const variant = product && findVariantById(product, item.variantId)
    if (!product || !variant) {
      throw new AppError('ITEM_UNAVAILABLE', 'Один из товаров больше не доступен. Обновите корзину.')
    }
    if (availableQuantity(variant) < item.quantity) {
      throw new AppError(
        'OUT_OF_STOCK',
        `«${product.title}», размер ${variant.size}: ${AVAILABILITY_LABELS.OUT_OF_STOCK.toLowerCase()}. Измените количество.`,
      )
    }
  }
  mutate((d) => {
    for (const item of items) {
      const product = d.products.find((p) => p.id === item.productId)!
      const variant = findVariantById(product, item.variantId)!
      variant.reserved += item.quantity
    }
  })
}

function releaseStock(order: Order): void {
  mutate((d) => {
    for (const item of order.items) {
      const product = d.products.find((p) => p.id === item.productId)
      const variant = product && findVariantById(product, item.variantId)
      if (variant) variant.reserved = Math.max(0, variant.reserved - item.quantity)
    }
  })
}

/** Подтверждение продажи после оплаты: резерв превращается в списание. */
function commitStock(order: Order): void {
  mutate((d) => {
    for (const item of order.items) {
      const product = d.products.find((p) => p.id === item.productId)
      const variant = product && findVariantById(product, item.variantId)
      if (variant) {
        variant.reserved = Math.max(0, variant.reserved - item.quantity)
        variant.stock = Math.max(0, variant.stock - item.quantity)
      }
      const product2 = d.products.find((p) => p.id === item.productId)
      if (product2) product2.popularity += item.quantity
    }
  })
}

const orders: OrderRepository = {
  async create(input: CreateOrderInput): Promise<CreateOrderResult> {
    const db = getDb()

    // Идемпотентность: повторный сабмит формы не создаёт второй заказ (ТЗ §32).
    const existingId = db.idempotencyKeys[input.idempotencyKey]
    if (existingId) {
      const existing = db.orders.find((o) => o.id === existingId)
      if (existing) return tick({ order: existing, confirmationUrl: null })
    }

    if (input.items.length === 0) {
      throw new AppError('EMPTY_CART', 'Корзина пуста.')
    }

    // ИСТОЧНИК ИСТИНЫ ДЛЯ ЦЕНЫ — база, а не то, что прислал фронт (ТЗ §15).
    const orderId = uid('ord')
    const orderItems: OrderItem[] = input.items.map((item) => {
      const product = db.products.find((p) => p.id === item.productId)
      const variant = product && findVariantById(product, item.variantId)
      if (!product || !variant) {
        throw new AppError('ITEM_UNAVAILABLE', 'Один из товаров больше не доступен. Обновите корзину.')
      }
      const price = product.price + variant.priceModifier
      return {
        id: uid('oit'), orderId,
        productId: product.id, variantId: variant.id,
        productTitle: product.title, productSlug: product.slug,
        productImage: product.images[0]?.url ?? null,
        size: variant.size, sku: variant.sku,
        quantity: item.quantity, price, total: price * item.quantity,
      }
    })

    const subtotal = orderItems.reduce((sum, i) => sum + i.total, 0)

    // Скидку тоже считает сервер (ТЗ §13).
    let discount = 0
    let freeDelivery = false
    if (input.promocode) {
      const promo = db.promocodes.find((p) => p.code.toUpperCase() === input.promocode!.toUpperCase())
      const check = evaluatePromocode(promo, subtotal, input.promocode)
      if (!check.valid) {
        throw new AppError('INVALID_PROMOCODE', check.reason ?? 'Промокод недействителен.')
      }
      discount = check.discount
      freeDelivery = check.freeDelivery
    }

    const options = await delivery.getOptions({
      city: input.shippingAddress?.city ?? 'Москва',
      items: input.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      subtotal,
    })
    const option = options.find((o) => o.id === input.deliveryOptionId)
    if (!option) throw new AppError('INVALID_DELIVERY', 'Выбранный способ доставки недоступен.')
    const deliveryPrice = freeDelivery ? 0 : option.price

    reserveStock(input.items)

    const pickupPoint = input.pickupPointId
      ? (await delivery.findPickupPoints(input.shippingAddress?.city ?? 'Москва', option.provider))
          .find((p) => p.id === input.pickupPointId) ?? null
      : null

    const now = new Date().toISOString()
    const order: Order = {
      id: orderId,
      publicOrderNumber: nextOrderNumber(),
      userId: db.currentUserId,
      customerName: input.customerName,
      phone: input.phone,
      email: input.email,
      items: orderItems,
      subtotal,
      discount,
      promocode: input.promocode,
      deliveryPrice,
      total: Math.max(0, subtotal - discount) + deliveryPrice,
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentMethod === 'CASH_ON_DELIVERY' ? 'PENDING' : 'PENDING',
      deliveryStatus: 'NOT_SHIPPED',
      orderStatus: 'AWAITING_PAYMENT',
      deliveryMethod: input.deliveryMethod,
      deliveryProvider: option.provider,
      shippingAddress: input.shippingAddress,
      pickupPoint,
      trackingNumber: null,
      paymentId: null,
      deliveryId: null,
      comment: input.comment,
      createdAt: now,
      updatedAt: now,
    }

    mutate((d) => {
      d.orders.unshift(order)
      d.idempotencyKeys[input.idempotencyKey] = order.id
      if (input.promocode) {
        const promo = d.promocodes.find((p) => p.code.toUpperCase() === input.promocode!.toUpperCase())
        if (promo) promo.usageCount += 1
      }
    })

    recordHistory({
      orderId: order.id, field: 'orderStatus', oldValue: null, newValue: 'NEW',
      changedBy: 'system', changedByName: 'Система', comment: 'Заказ создан',
    })

    await emitOrderEvent('order.created', order)

    // Demo: имитируем успешную оплату сразу, чтобы было видно весь путь заказа.
    // В production сюда возвращается confirmationUrl платёжного провайдера,
    // а статус PAID выставляется ТОЛЬКО по webhook (ТЗ §37).
    return tick({ order, confirmationUrl: `#/checkout/payment/${order.id}` })
  },

  async listMine() {
    const db = getDb()
    if (!db.currentUserId) return tick<Order[]>([])
    return tick(db.orders.filter((o) => o.userId === db.currentUserId))
  },

  async getMine(id) {
    const db = getDb()
    const order = db.orders.find((o) => o.id === id && o.userId === db.currentUserId)
    return tick(order ?? null)
  },

  async getByPublicNumber(number, phone) {
    const normalized = number.replace(/[^\d]/g, '')
    const order = getDb().orders.find(
      (o) => o.publicOrderNumber.replace(/[^\d]/g, '') === normalized &&
             o.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''),
    )
    return tick(order ?? null)
  },
}

function applyStatusSideEffects(order: Order, next: OrderStatus): void {
  if (next === 'PAID' && order.paymentStatus !== 'PAID') {
    order.paymentStatus = 'PAID'
    commitStock(order)
  }
  if (STOCK_RELEASING_STATUSES.includes(next) && order.paymentStatus !== 'PAID') {
    releaseStock(order)
  }
  if (next === 'SHIPPED') order.deliveryStatus = 'HANDED_OVER'
  if (next === 'IN_TRANSIT') order.deliveryStatus = 'IN_TRANSIT'
  if (next === 'DELIVERED') order.deliveryStatus = 'DELIVERED'
  if (next === 'READY_TO_SHIP') order.deliveryStatus = 'READY'
  if (next === 'REFUND') order.paymentStatus = 'REFUNDED'
}

const STATUS_EVENT_MAP: Partial<Record<OrderStatus, Parameters<typeof emitOrderEvent>[0]>> = {
  PAID: 'payment.paid',
  PROCESSING: 'order.processing',
  READY_TO_SHIP: 'order.ready',
  SHIPPED: 'order.shipped',
  IN_TRANSIT: 'order.in_transit',
  DELIVERED: 'order.delivered',
  COMPLETED: 'order.completed',
  CANCELLED: 'order.cancelled',
  REFUND: 'order.refunded',
  PROBLEM: 'order.problem',
}

const ordersAdmin: OrderAdminRepository = {
  async list(filters: OrderFilters = {}, page = 1, pageSize = 20) {
    const db = getDb()
    let items = [...db.orders]

    if (filters.statuses?.length) items = items.filter((o) => filters.statuses!.includes(o.orderStatus))
    if (filters.dateFrom) items = items.filter((o) => o.createdAt >= filters.dateFrom!)
    if (filters.dateTo) items = items.filter((o) => o.createdAt <= filters.dateTo!)
    if (filters.minTotal !== undefined) items = items.filter((o) => o.total >= filters.minTotal!)
    if (filters.maxTotal !== undefined) items = items.filter((o) => o.total <= filters.maxTotal!)
    if (filters.paymentMethod) items = items.filter((o) => o.paymentMethod === filters.paymentMethod)
    if (filters.deliveryMethod) items = items.filter((o) => o.deliveryMethod === filters.deliveryMethod)
    if (filters.search) {
      const q = filters.search.trim().toLowerCase()
      items = items.filter((o) =>
        [o.publicOrderNumber, o.customerName, o.phone, o.email ?? '']
          .join(' ').toLowerCase().includes(q),
      )
    }

    const start = (page - 1) * pageSize
    return tick<Paginated<Order>>({
      items: items.slice(start, start + pageSize),
      total: items.length, page, pageSize,
      hasMore: start + pageSize < items.length,
    })
  },

  async get(id) { return tick(getDb().orders.find((o) => o.id === id) ?? null) },

  async setStatus(id, status, comment) {
    const db = getDb()
    const order = db.orders.find((o) => o.id === id)
    if (!order) throw new AppError('NOT_FOUND', 'Заказ не найден.')
    if (!canTransition(order.orderStatus, status)) {
      throw new AppError(
        'INVALID_TRANSITION',
        `Нельзя перевести заказ из «${ORDER_STATUS_LABELS[order.orderStatus]}» в «${ORDER_STATUS_LABELS[status]}».`,
      )
    }
    const previous = order.orderStatus
    const actor = db.users.find((u) => u.id === db.currentUserId)
    order.orderStatus = status
    order.updatedAt = new Date().toISOString()
    applyStatusSideEffects(order, status)
    persist()

    recordHistory({
      orderId: id, field: 'orderStatus', oldValue: previous, newValue: status,
      changedBy: actor?.id ?? 'system',
      changedByName: actor ? `${actor.firstName} ${actor.lastName}` : 'Система',
      comment: comment ?? null,
    })
    writeAudit('order.status', 'order', id, { orderStatus: { from: previous, to: status } })

    const event = STATUS_EVENT_MAP[status]
    if (event) await emitOrderEvent(event, order)

    return tick(order)
  },

  async setTrackingNumber(id, trackingNumber) {
    const db = getDb()
    const order = db.orders.find((o) => o.id === id)
    if (!order) throw new AppError('NOT_FOUND', 'Заказ не найден.')
    const previous = order.trackingNumber
    order.trackingNumber = trackingNumber
    order.updatedAt = new Date().toISOString()
    persist()
    recordHistory({
      orderId: id, field: 'trackingNumber', oldValue: previous, newValue: trackingNumber,
      changedBy: db.currentUserId ?? 'system', changedByName: 'Администратор', comment: null,
    })
    return tick(order)
  },

  async getHistory(id) {
    return tick(
      getDb().orderHistory
        .filter((h) => h.orderId === id)
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    )
  },
}

/* --- Клиенты ------------------------------------------------------------- */

function buildCustomerSummary(user: User): CustomerSummary {
  const userOrders = getDb().orders.filter((o) => o.userId === user.id)
  const paid = userOrders.filter((o) => o.paymentStatus === 'PAID')
  return {
    ...user,
    ordersCount: userOrders.length,
    totalSpent: paid.reduce((sum, o) => sum + o.total, 0),
    lastOrderAt: userOrders[0]?.createdAt ?? null,
  }
}

const customersAdmin: CustomerAdminRepository = {
  async list(search, page = 1, pageSize = 20) {
    let users = getDb().users.map(buildCustomerSummary)
    if (search) {
      const q = search.trim().toLowerCase()
      users = users.filter((u) =>
        [u.firstName, u.lastName, u.phone ?? '', u.email ?? ''].join(' ').toLowerCase().includes(q),
      )
    }
    const start = (page - 1) * pageSize
    return tick<Paginated<CustomerSummary>>({
      items: users.slice(start, start + pageSize),
      total: users.length, page, pageSize,
      hasMore: start + pageSize < users.length,
    })
  },
  async get(id) {
    const user = getDb().users.find((u) => u.id === id)
    return tick(user ? buildCustomerSummary(user) : null)
  },
  async setRole(id, role: Role) {
    mutate((d) => {
      const user = d.users.find((u) => u.id === id)
      if (user) user.role = role
    })
    writeAudit('customer.role', 'user', id)
    return tick(undefined)
  },
}

/* --- CMS главной --------------------------------------------------------- */

const homepage: HomepageAdminRepository = {
  async getBlocks() {
    return tick([...getDb().homepageBlocks].sort((a, b) => a.sortOrder - b.sortOrder))
  },
  async updateBlock(id, patch) {
    const updated = mutate((d) => {
      const idx = d.homepageBlocks.findIndex((b) => b.id === id)
      if (idx === -1) throw new AppError('NOT_FOUND', 'Блок не найден.')
      d.homepageBlocks[idx] = { ...d.homepageBlocks[idx], ...patch } as HomepageBlock
      return d.homepageBlocks[idx]
    })
    writeAudit('homepage.update', 'homepage_block', id)
    return tick(updated)
  },
  async reorderBlocks(orderedIds) {
    const blocks = mutate((d) => {
      orderedIds.forEach((id, index) => {
        const block = d.homepageBlocks.find((b) => b.id === id)
        if (block) block.sortOrder = index + 1
      })
      return [...d.homepageBlocks].sort((a, b) => a.sortOrder - b.sortOrder)
    })
    writeAudit('homepage.reorder', 'homepage_block', 'all')
    return tick(blocks)
  },
  async toggleBlock(id, isEnabled) {
    const updated = mutate((d) => {
      const block = d.homepageBlocks.find((b) => b.id === id)
      if (!block) throw new AppError('NOT_FOUND', 'Блок не найден.')
      block.isEnabled = isEnabled
      return block
    })
    writeAudit('homepage.toggle', 'homepage_block', id)
    return tick(updated)
  },
}

/* --- Аналитика ----------------------------------------------------------- */

const analytics: AnalyticsRepository = {
  async getSummary(period: AnalyticsPeriod): Promise<AnalyticsSummary> {
    const db = getDb()
    const inPeriod = db.orders.filter(
      (o) => o.createdAt >= period.from && o.createdAt <= period.to,
    )
    const paid = inPeriod.filter((o) => o.paymentStatus === 'PAID')
    const revenue = paid.reduce((sum, o) => sum + o.total, 0)

    const soldByProduct = new Map<string, { title: string; sold: number; revenue: number }>()
    const soldBySize = new Map<Size, number>()
    for (const order of paid) {
      for (const item of order.items) {
        const entry = soldByProduct.get(item.productId) ?? { title: item.productTitle, sold: 0, revenue: 0 }
        entry.sold += item.quantity
        entry.revenue += item.total
        soldByProduct.set(item.productId, entry)
        soldBySize.set(item.size, (soldBySize.get(item.size) ?? 0) + item.quantity)
      }
    }

    const lowStock: AnalyticsSummary['lowStock'] = []
    for (const product of db.products) {
      for (const variant of product.variants) {
        const left = availableQuantity(variant)
        if (left <= LOW_STOCK_THRESHOLD) {
          lowStock.push({ productId: product.id, title: product.title, size: variant.size, left })
        }
      }
    }

    const byDay = new Map<string, { revenue: number; orders: number }>()
    for (const order of paid) {
      const day = order.createdAt.slice(0, 10)
      const entry = byDay.get(day) ?? { revenue: 0, orders: 0 }
      entry.revenue += order.total
      entry.orders += 1
      byDay.set(day, entry)
    }

    const customerIds = new Set(inPeriod.map((o) => o.userId).filter(Boolean) as string[])
    const repeatCustomers = Array.from(customerIds).filter(
      (id) => db.orders.filter((o) => o.userId === id).length > 1,
    )

    return tick<AnalyticsSummary>({
      revenue,
      ordersCount: inPeriod.length,
      // Средний чек — в целых рублях, копейки в сводке только шумят.
      averageOrderValue: paid.length ? Math.round(revenue / paid.length / 100) * 100 : 0,
      customersCount: db.users.filter((u) => u.role === 'CUSTOMER').length,
      newCustomers: db.users.filter((u) => u.createdAt >= period.from && u.createdAt <= period.to).length,
      repeatPurchaseRate: customerIds.size ? repeatCustomers.length / customerIds.size : 0,
      topProducts: Array.from(soldByProduct.entries())
        .map(([productId, v]) => ({ productId, ...v }))
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 8),
      topSizes: Array.from(soldBySize.entries())
        .map(([size, sold]) => ({ size, sold }))
        .sort((a, b) => b.sold - a.sold),
      lowStock: lowStock.sort((a, b) => a.left - b.left).slice(0, 12),
      salesByDay: Array.from(byDay.entries())
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    })
  },
}

const audit: AuditRepository = {
  async list(page = 1, pageSize = 50) {
    const items = getDb().auditLog
    const start = (page - 1) * pageSize
    return tick<Paginated<AuditLogEntry>>({
      items: items.slice(start, start + pageSize),
      total: items.length, page, pageSize,
      hasMore: start + pageSize < items.length,
    })
  },
}

/* --- Файлы ---------------------------------------------------------------- */

/**
 * Демо-хранилище. Файл превращается в data URL и остаётся в браузере —
 * этого достаточно, чтобы посмотреть, как карточка выглядит с настоящим фото.
 * В production файлы уходят в Appwrite Storage.
 */
const storage: StorageRepository = {
  isAvailable: () => true,

  async upload(file, onProgress) {
    if (!file.type.startsWith('image/')) {
      throw new AppError('BAD_FILE', 'Можно загружать только изображения.')
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new AppError('FILE_TOO_BIG', `Файл больше ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} МБ.`)
    }

    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onprogress = (event) => {
        if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
      }
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new AppError('UPLOAD_FAILED', 'Не удалось прочитать файл.'))
      reader.readAsDataURL(file)
    })

    onProgress?.(100)
    return { id: uid('file'), url, name: file.name, sizeBytes: file.size }
  },

  async remove() {
    // В демо-режиме файл нигде не хранится отдельно — удалять нечего.
  },
}

/* --- Сборка -------------------------------------------------------------- */

export const mockBackend: Backend = {
  name: 'mock',
  catalog, catalogAdmin, auth, favorites,
  promocodes, promocodesAdmin, delivery,
  orders, ordersAdmin, customersAdmin,
  homepage, analytics, audit, storage,
}

/** Демо-вход в админку без backend (кнопка на странице входа). */
export async function loginAsDemoAdmin(): Promise<User> {
  return mutate((d) => {
    d.currentUserId = DEMO_ADMIN.id
    return DEMO_ADMIN
  })
}

export type { HomepageBlock }
