/* ==========================================================================
   MANILI — КОНФИГУРАЦИЯ ОКРУЖЕНИЯ

   ЗДЕСЬ НЕТ И НЕ ДОЛЖНО БЫТЬ СЕКРЕТОВ (ТЗ §32, §47).
   Всё, что попадает в import.meta.env.VITE_*, видно в браузере.
   Ключи платёжной системы, Telegram Bot Token, ключи API доставки и почты
   живут ТОЛЬКО в переменных окружения серверных функций.
   ========================================================================== */

export type BackendKind = 'mock' | 'appwrite'

function env(key: string, fallback = ''): string {
  return (import.meta.env[key as keyof ImportMetaEnv] as string | undefined) ?? fallback
}

/**
 * Адрес сайта, когда VITE_SITE_URL не задан: берём тот, с которого нас открыли.
 * Так сайт остаётся корректным и на своём домене, и на странице GitHub Pages.
 */
function defaultSiteUrl(): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, '')
}

export const config = {
  /** Какой backend использовать. По умолчанию mock — сайт работает без настройки. */
  backend: (env('VITE_BACKEND', 'mock') as BackendKind),

  /** Публичные параметры Appwrite — не секреты, их можно отдавать в браузер. */
  appwrite: {
    endpoint: env('VITE_APPWRITE_ENDPOINT'),
    projectId: env('VITE_APPWRITE_PROJECT_ID'),
    databaseId: env('VITE_APPWRITE_DATABASE_ID', 'manili'),
    bucketId: env('VITE_APPWRITE_BUCKET_ID', 'media'),
  },

  /**
   * Базовый URL серверных функций (создание заказа, платежи, webhook, Telegram).
   * Фронт вызывает только эти эндпоинты, секретов не знает.
   */
  apiBaseUrl: env('VITE_API_BASE_URL'),

  site: {
    name: 'MANILI',
    url: env('VITE_SITE_URL') || defaultSiteUrl(),
    supportEmail: env('VITE_SUPPORT_EMAIL', 'hello@manili-event.ru'),
    supportPhone: env('VITE_SUPPORT_PHONE', '+7 999 000-00-00'),
    telegram: env('VITE_SOCIAL_TELEGRAM', 'https://t.me/manili'),
    vk: env('VITE_SOCIAL_VK', 'https://vk.com/manili'),
    instagram: env('VITE_SOCIAL_INSTAGRAM', ''),
    marketplaceWildberries: env('VITE_MARKETPLACE_WB', ''),
    marketplaceOzon: env('VITE_MARKETPLACE_OZON', ''),
  },
} as const

/** Appwrite настроен и им можно пользоваться. */
export function isAppwriteConfigured(): boolean {
  return Boolean(config.appwrite.endpoint && config.appwrite.projectId)
}

/** Серверные функции доступны (иначе оплата/уведомления идут в демо-режиме). */
export function isServerApiConfigured(): boolean {
  return Boolean(config.apiBaseUrl)
}

/**
 * Полный адрес страницы по пути без домена: absoluteUrl('/shop') → 'https://…/shop'.
 *
 * Пути в коде пишутся без подпапки сборки ('/shop', не '/repo/shop'), а сайт
 * может жить в подпапке — поэтому домен и подпапку склеиваем здесь, в одном
 * месте. Из config.site.url берём только домен: в проектном режиме он уже
 * содержит подпапку, и иначе получилось бы '/repo/repo/shop'.
 */
export function absoluteUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const origin = config.site.url ? new URL(config.site.url).origin : ''
  const clean = path.startsWith('/') ? path.slice(1) : path
  return `${origin}${base}${clean}`.replace(/(.)\/$/, '$1')
}
