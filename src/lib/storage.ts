/* ==========================================================================
   MANILI — БЕЗОПАСНАЯ РАБОТА С localStorage
   Приватный режим, отключённые cookie и квоты — всё это бросает исключения.
   Здесь одно место, где они гасятся.
   ========================================================================== */

const PREFIX = 'manili:'

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* приватный режим или превышена квота — молча игнорируем */
  }
}

export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* no-op */
  }
}

export const STORAGE_KEYS = {
  cart: 'cart',
  favorites: 'favorites',
  session: 'session',
  recentlyViewed: 'recently-viewed',
  mockDb: 'mock-db',
  cookieConsent: 'cookie-consent',
} as const
