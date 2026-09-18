/* ==========================================================================
   MANILI — MOCK DB
   Локальная имитация backend для разработки и превью без Appwrite.
   Состояние переживает перезагрузку через localStorage, чтобы заказы,
   остатки и правки из админки вели себя как настоящие.
   ВАЖНО: это dev-слой. В production данные живут в Appwrite.
   ========================================================================== */

import type {
  Address,
  AuditLogEntry,
  Category,
  Collection,
  HomepageBlock,
  NotificationLog,
  Order,
  OrderStatusHistoryEntry,
  Product,
  Promocode,
  User,
} from '@/domain/types'
import { readStorage, writeStorage, STORAGE_KEYS } from '@/lib/storage'
import { CATEGORIES, COLLECTIONS, HOMEPAGE_BLOCKS, PRODUCTS, PROMOCODES } from './seed'

export interface MockDb {
  version: number
  products: Product[]
  categories: Category[]
  collections: Collection[]
  promocodes: Promocode[]
  homepageBlocks: HomepageBlock[]
  users: User[]
  addresses: Address[]
  orders: Order[]
  orderHistory: OrderStatusHistoryEntry[]
  notifications: NotificationLog[]
  auditLog: AuditLogEntry[]
  favorites: Record<string, string[]>
  /** Последний выданный публичный номер заказа. */
  orderCounter: number
  /** Ключи идемпотентности уже созданных заказов (ТЗ §32). */
  idempotencyKeys: Record<string, string>
  currentUserId: string | null
}

const DB_VERSION = 1

/** Демонстрационный владелец магазина — вход в админку без backend. */
export const DEMO_ADMIN: User = {
  id: 'usr-admin',
  firstName: 'Владелец',
  lastName: 'MANILI',
  phone: '+79990000000',
  email: 'admin@manili-event.ru',
  role: 'ADMIN',
  createdAt: '2026-01-01T00:00:00.000Z',
  notificationSettings: { email: true, sms: true, telegram: true, marketing: false },
}

const DEMO_CUSTOMER: User = {
  id: 'usr-demo',
  firstName: 'Иван',
  lastName: 'Иванов',
  phone: '+79991234567',
  email: 'ivan@mail.ru',
  role: 'CUSTOMER',
  createdAt: '2026-03-14T09:00:00.000Z',
  notificationSettings: { email: true, sms: true, telegram: false, marketing: true },
}

function createInitialDb(): MockDb {
  return {
    version: DB_VERSION,
    products: structuredClone(PRODUCTS),
    categories: structuredClone(CATEGORIES),
    collections: structuredClone(COLLECTIONS),
    promocodes: structuredClone(PROMOCODES),
    homepageBlocks: structuredClone(HOMEPAGE_BLOCKS),
    users: [DEMO_ADMIN, DEMO_CUSTOMER],
    addresses: [
      {
        id: 'adr-1', userId: 'usr-demo', label: 'Дом', city: 'Москва',
        street: 'Ленинский проспект', house: '32', apartment: '118',
        postalCode: '119991', comment: null, isDefault: true,
      },
    ],
    orders: [],
    orderHistory: [],
    notifications: [],
    auditLog: [],
    favorites: {},
    orderCounter: 1041,
    idempotencyKeys: {},
    currentUserId: null,
  }
}

let db: MockDb | null = null

export function getDb(): MockDb {
  if (db) return db
  const stored = readStorage<MockDb | null>(STORAGE_KEYS.mockDb, null)
  if (stored && stored.version === DB_VERSION) {
    db = stored
  } else {
    db = createInitialDb()
    persist()
  }
  return db
}

export function persist(): void {
  if (db) writeStorage(STORAGE_KEYS.mockDb, db)
}

/** Мутация + сохранение одним вызовом. */
export function mutate<T>(fn: (db: MockDb) => T): T {
  const result = fn(getDb())
  persist()
  return result
}

/** Сбросить локальную базу к seed-состоянию (кнопка в админке). */
export function resetDb(): void {
  db = createInitialDb()
  persist()
}

export function nextOrderNumber(): string {
  return mutate((d) => {
    d.orderCounter += 1
    return `MANILI #${d.orderCounter}`
  })
}

/** Имитация сетевой задержки, чтобы UI-состояния загрузки были видны. */
export const NETWORK_DELAY = 120
