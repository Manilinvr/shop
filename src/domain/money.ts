/* ==========================================================================
   MANILI — ДЕНЬГИ
   Все суммы в копейках (целые числа). Форматирование — только здесь.
   ========================================================================== */

import type { Kopecks } from './types'

const RUB = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})

const RUB_PRECISE = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
})

/** 690000 → «6 900 ₽» */
export function formatPrice(kopecks: Kopecks): string {
  const rubles = kopecks / 100
  return Number.isInteger(rubles) ? RUB.format(rubles) : RUB_PRECISE.format(rubles)
}

/** 690000 → «6 900» (без символа валюты) */
export function formatAmount(kopecks: Kopecks): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(kopecks / 100)
}

export function rublesToKopecks(rubles: number): Kopecks {
  return Math.round(rubles * 100)
}

export function kopecksToRubles(kopecks: Kopecks): number {
  return kopecks / 100
}

/** Процентная скидка с округлением вниз до копейки. */
export function percentOf(amount: Kopecks, percent: number): Kopecks {
  return Math.floor((amount * percent) / 100)
}

/** Скидка в процентах для бейджа «−30%». */
export function discountPercent(price: Kopecks, oldPrice: Kopecks): number {
  if (oldPrice <= 0 || price >= oldPrice) return 0
  return Math.round(((oldPrice - price) / oldPrice) * 100)
}
