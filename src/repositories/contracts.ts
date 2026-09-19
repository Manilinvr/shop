/* ==========================================================================
   MANILI — КОНТРАКТЫ РЕПОЗИТОРИЕВ (ТЗ §4, §49)

   Это единственная точка, через которую UI общается с данными.
   Appwrite, mock-данные или любой будущий backend реализуют эти интерфейсы —
   фронтенд при замене backend не переписывается.
   ========================================================================== */

import type {
  Address,
  AuditLogEntry,
  Category,
  Collection,
  DeliveryOption,
  HomepageBlock,
  ID,
  Order,
  OrderStatus,
  OrderStatusHistoryEntry,
  Paginated,
  PickupPoint,
  Product,
  Promocode,
  PromocodeCheck,
  Role,
  ShippingAddress,
  Size,
  User,
  Kopecks,
  PaymentMethod,
  DeliveryMethod,
  CartItem,
} from '@/domain/types'

/* --- Каталог ------------------------------------------------------------ */

export interface ProductFilters {
  categorySlugs?: string[]
  collectionSlugs?: string[]
  sizes?: Size[]
  colors?: string[]
  minPrice?: Kopecks
  maxPrice?: Kopecks
  inStockOnly?: boolean
  isNew?: boolean
  isLimited?: boolean
  search?: string
  tags?: string[]
}

export const SORT_OPTIONS = ['popular', 'new', 'price_asc', 'price_desc'] as const
export type SortOption = (typeof SORT_OPTIONS)[number]

export const SORT_LABELS: Record<SortOption, string> = {
  popular: 'Популярные',
  new: 'Новинки',
  price_asc: 'Сначала дешевле',
  price_desc: 'Сначала дороже',
}

export interface ProductQuery {
  filters?: ProductFilters
  sort?: SortOption
  page?: number
  pageSize?: number
}

/** Границы фильтров, посчитанные по всему каталогу — для UI. */
export interface CatalogFacets {
  minPrice: Kopecks
  maxPrice: Kopecks
  sizes: Size[]
  colors: { code: string; title: string; hex: string; count: number }[]
}

export interface CatalogRepository {
  listProducts(query?: ProductQuery): Promise<Paginated<Product>>
  getProductBySlug(slug: string): Promise<Product | null>
  getProductById(id: ID): Promise<Product | null>
  getProductsByIds(ids: ID[]): Promise<Product[]>
  /** Рекомендации в карточке товара (ТЗ §10). */
  getRelatedProducts(productId: ID, limit?: number): Promise<Product[]>
  getFacets(): Promise<CatalogFacets>

  listCategories(): Promise<Category[]>
  getCategoryBySlug(slug: string): Promise<Category | null>

  listCollections(): Promise<Collection[]>
  getCollectionBySlug(slug: string): Promise<Collection | null>
}

/* --- Админ: управление каталогом (ТЗ §26, §27) -------------------------- */

export type ProductDraft = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
export type CategoryDraft = Omit<Category, 'id'>
export type CollectionDraft = Omit<Collection, 'id'>

export interface CatalogAdminRepository {
  createProduct(draft: ProductDraft): Promise<Product>
  updateProduct(id: ID, patch: Partial<ProductDraft>): Promise<Product>
  deleteProduct(id: ID): Promise<void>
  /** Правка остатков — только через сервер (ТЗ §35). */
  setVariantStock(variantId: ID, stock: number): Promise<void>

  createCategory(draft: CategoryDraft): Promise<Category>
  updateCategory(id: ID, patch: Partial<CategoryDraft>): Promise<Category>
  deleteCategory(id: ID): Promise<void>

  createCollection(draft: CollectionDraft): Promise<Collection>
  updateCollection(id: ID, patch: Partial<CollectionDraft>): Promise<Collection>
  deleteCollection(id: ID): Promise<void>
}

/* --- Аутентификация (ТЗ §6) --------------------------------------------- */

export interface AuthSession {
  user: User
  /** Токен хранит сам адаптер; UI его не видит. */
  expiresAt: string | null
}

export interface AuthRepository {
  getCurrentUser(): Promise<User | null>

  /** Телефон + SMS — приоритетный способ для РФ. */
  requestPhoneCode(phone: string): Promise<{ sent: boolean; retryAfterSec: number }>
  verifyPhoneCode(phone: string, code: string): Promise<AuthSession>

  /** Email + пароль. */
  registerWithEmail(input: {
    email: string
    password: string
    firstName: string
    lastName: string
    phone?: string
  }): Promise<AuthSession>
  loginWithEmail(email: string, password: string): Promise<AuthSession>
  requestPasswordRecovery(email: string): Promise<{ sent: boolean }>
  completePasswordRecovery(userId: string, secret: string, password: string): Promise<void>

  logout(): Promise<void>
  updateProfile(patch: Partial<Pick<User, 'firstName' | 'lastName' | 'phone' | 'email' | 'notificationSettings'>>): Promise<User>

  listAddresses(): Promise<Address[]>
  createAddress(draft: Omit<Address, 'id' | 'userId'>): Promise<Address>
  updateAddress(id: ID, patch: Partial<Omit<Address, 'id' | 'userId'>>): Promise<Address>
  deleteAddress(id: ID): Promise<void>
}

/* --- Избранное (ТЗ §11) -------------------------------------------------- */

export interface FavoritesRepository {
  list(): Promise<ID[]>
  add(productId: ID): Promise<void>
  remove(productId: ID): Promise<void>
  /** Слить локальное избранное гостя с аккаунтом после входа. */
  sync(localProductIds: ID[]): Promise<ID[]>
}

/* --- Промокоды (ТЗ §13) -------------------------------------------------- */

export interface PromocodeRepository {
  /** Проверку выполняет сервер, фронт только показывает результат. */
  check(code: string, subtotal: Kopecks): Promise<PromocodeCheck>
}

export interface PromocodeAdminRepository {
  list(): Promise<Promocode[]>
  create(draft: Omit<Promocode, 'id' | 'usageCount'>): Promise<Promocode>
  update(id: ID, patch: Partial<Promocode>): Promise<Promocode>
  delete(id: ID): Promise<void>
}

/* --- Доставка (ТЗ §16) --------------------------------------------------- */

export interface DeliveryQuoteInput {
  city: string
  items: { variantId: ID; quantity: number }[]
  subtotal: Kopecks
}

export interface DeliveryRepository {
  getOptions(input: DeliveryQuoteInput): Promise<DeliveryOption[]>
  findPickupPoints(city: string, provider?: string): Promise<PickupPoint[]>
  suggestCities(query: string): Promise<string[]>
  getTracking(orderId: ID): Promise<{ status: string; events: { date: string; text: string }[] }>
}

/* --- Заказы (ТЗ §14, §17) ------------------------------------------------ */

export interface CreateOrderInput {
  customerName: string
  phone: string
  email: string | null
  items: CartItem[]
  promocode: string | null
  deliveryMethod: DeliveryMethod
  deliveryOptionId: string
  shippingAddress: ShippingAddress | null
  pickupPointId: string | null
  paymentMethod: PaymentMethod
  comment: string | null
  /** Ключ идемпотентности — защита от двойного заказа (ТЗ §32). */
  idempotencyKey: string
}

export interface CreateOrderResult {
  order: Order
  /** Куда отправить пользователя для оплаты. */
  confirmationUrl: string | null
}

export interface OrderRepository {
  /**
   * Создание заказа — ВСЕГДА server-side (ТЗ §36, §37):
   * сервер пересчитывает цены, проверяет остатки, резервирует их и
   * создаёт платёж. Фронт не может влиять на сумму.
   */
  create(input: CreateOrderInput): Promise<CreateOrderResult>
  listMine(): Promise<Order[]>
  getMine(id: ID): Promise<Order | null>
  /** Публичный просмотр заказа по номеру+телефону для гостя. */
  getByPublicNumber(number: string, phone: string): Promise<Order | null>
}

export interface OrderFilters {
  statuses?: OrderStatus[]
  dateFrom?: string
  dateTo?: string
  minTotal?: Kopecks
  maxTotal?: Kopecks
  paymentMethod?: PaymentMethod
  deliveryMethod?: DeliveryMethod
  search?: string
}

export interface OrderAdminRepository {
  list(filters?: OrderFilters, page?: number, pageSize?: number): Promise<Paginated<Order>>
  get(id: ID): Promise<Order | null>
  /** Смена статуса пишет запись в историю и запускает событие (ТЗ §20, §38). */
  setStatus(id: ID, status: OrderStatus, comment?: string): Promise<Order>
  setTrackingNumber(id: ID, trackingNumber: string): Promise<Order>
  getHistory(id: ID): Promise<OrderStatusHistoryEntry[]>
}

/* --- Клиенты (админка) --------------------------------------------------- */

export interface CustomerSummary extends User {
  ordersCount: number
  totalSpent: Kopecks
  lastOrderAt: string | null
}

export interface CustomerAdminRepository {
  list(search?: string, page?: number, pageSize?: number): Promise<Paginated<CustomerSummary>>
  get(id: ID): Promise<CustomerSummary | null>
  setRole(id: ID, role: Role): Promise<void>
}

/* --- CMS главной (ТЗ §8) -------------------------------------------------- */

export interface HomepageRepository {
  getBlocks(): Promise<HomepageBlock[]>
}

export interface HomepageAdminRepository extends HomepageRepository {
  updateBlock(id: ID, patch: Partial<HomepageBlock>): Promise<HomepageBlock>
  reorderBlocks(orderedIds: ID[]): Promise<HomepageBlock[]>
  toggleBlock(id: ID, isEnabled: boolean): Promise<HomepageBlock>
}

/* --- Аналитика (ТЗ §28) --------------------------------------------------- */

export interface AnalyticsPeriod {
  from: string
  to: string
}

export interface AnalyticsSummary {
  revenue: Kopecks
  ordersCount: number
  averageOrderValue: Kopecks
  customersCount: number
  newCustomers: number
  repeatPurchaseRate: number
  topProducts: { productId: ID; title: string; sold: number; revenue: Kopecks }[]
  topSizes: { size: Size; sold: number }[]
  lowStock: { productId: ID; title: string; size: Size; left: number }[]
  salesByDay: { date: string; revenue: Kopecks; orders: number }[]
}

export interface AnalyticsRepository {
  getSummary(period: AnalyticsPeriod): Promise<AnalyticsSummary>
}

/* --- Файлы (ТЗ §26, §27) --------------------------------------------------- */

export interface UploadedFile {
  id: string
  /** Готовый URL для вывода в <img>. */
  url: string
  name: string
  sizeBytes: number
}

export interface StorageRepository {
  /** Загружает изображение и возвращает ссылку для сохранения в товаре. */
  upload(file: File, onProgress?: (percent: number) => void): Promise<UploadedFile>
  remove(fileId: string): Promise<void>
  /** Доступна ли реальная загрузка (иначе админка предложит вставить ссылку). */
  isAvailable(): boolean
}

/* --- Аудит --------------------------------------------------------------- */

export interface AuditRepository {
  list(page?: number, pageSize?: number): Promise<Paginated<AuditLogEntry>>
}

/* --- Сборка всех репозиториев -------------------------------------------- */

export interface Backend {
  readonly name: string
  catalog: CatalogRepository
  catalogAdmin: CatalogAdminRepository
  auth: AuthRepository
  favorites: FavoritesRepository
  promocodes: PromocodeRepository
  promocodesAdmin: PromocodeAdminRepository
  delivery: DeliveryRepository
  orders: OrderRepository
  ordersAdmin: OrderAdminRepository
  customersAdmin: CustomerAdminRepository
  homepage: HomepageAdminRepository
  analytics: AnalyticsRepository
  audit: AuditRepository
  storage: StorageRepository
}

/* --- Ошибки -------------------------------------------------------------- */

/** Ошибка, безопасная для показа пользователю (ТЗ §41). */
export class AppError extends Error {
  readonly code: string
  readonly userMessage: string
  constructor(code: string, userMessage: string, technical?: string) {
    super(technical || userMessage)
    this.name = 'AppError'
    this.code = code
    this.userMessage = userMessage
  }
}

/**
 * Форма ошибки Appwrite. Тип описан здесь, а не импортирован из SDK:
 * этот файл — общий контракт, он не должен знать про конкретный backend.
 */
interface BackendError {
  code?: number
  type?: string
  message?: string
}

function asBackendError(error: unknown): BackendError | null {
  if (!error || typeof error !== 'object') return null
  const e = error as BackendError
  return typeof e.code === 'number' || typeof e.type === 'string' ? e : null
}

/**
 * Понятные объяснения вместо «что-то пошло не так».
 *
 * Дословный текст Appwrite показывать нельзя — он на английском и говорит
 * языком API. Но и прятать причину за общей фразой нельзя: владелец магазина
 * остаётся без единой зацепки, а настройка бэкенда — это как раз череда
 * мелких недоделок вроде незарегистрированного адреса или нехватки прав.
 */
const EXPLAINED: Array<{ match: (e: BackendError) => boolean; text: string }> = [
  {
    match: (e) => e.type === 'user_already_exists',
    text: 'Аккаунт с такой почтой уже существует. Войдите вместо регистрации.',
  },
  {
    match: (e) => e.type === 'user_invalid_credentials',
    text: 'Неверная почта или пароль.',
  },
  {
    match: (e) => e.type === 'password_recently_used' || e.type === 'password_personal_data',
    text: 'Такой пароль использовать нельзя — придумайте другой.',
  },
  {
    match: (e) => e.type === 'general_argument_invalid' && /password/i.test(e.message ?? ''),
    text: 'Пароль слишком короткий: нужно минимум 8 символов.',
  },
  {
    match: (e) => e.code === 401 || e.type === 'user_unauthorized',
    text:
      'База данных отклонила запрос: не хватает прав. ' +
      'Запустите в GitHub workflow «Настройка Appwrite» — он обновит права коллекций.',
  },
  {
    match: (e) => e.code === 404 && /collection|database/i.test(e.message ?? ''),
    text:
      'Нужный раздел базы не найден: схема ещё не развёрнута. ' +
      'Запустите в GitHub workflow «Настройка Appwrite».',
  },
  {
    // Браузер блокирует ответ, если адрес сайта не зарегистрирован в Appwrite.
    // Запрос до сервера не доходит, поэтому кода ошибки нет вовсе.
    match: (e) => e.code === 0 || /failed to fetch|networkerror|load failed/i.test(e.message ?? ''),
    text:
      'Сайт не может связаться с базой. В Appwrite → Apps добавьте Web-приложение ' +
      'с адресом этого сайта — без этого браузер блокирует запросы.',
  },
  {
    match: (e) => e.code === 429,
    text: 'Слишком много попыток подряд. Подождите минуту и повторите.',
  },
]

export function toUserMessage(error: unknown, fallback = 'Что-то пошло не так. Попробуйте ещё раз.'): string {
  if (error instanceof AppError) return error.userMessage

  const backend = asBackendError(error)
  if (backend) {
    // Техническая причина — в консоль: она нужна при настройке, но не на экране.
    console.error('[backend]', backend.code, backend.type, backend.message)
    const explained = EXPLAINED.find((rule) => rule.match(backend))
    if (explained) return explained.text
    if (backend.message) return `Не получилось: ${backend.message}`
  }

  if (error instanceof Error) console.error('[error]', error)
  return fallback
}
