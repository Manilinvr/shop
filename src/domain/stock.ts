/* ==========================================================================
   MANILI — ОСТАТКИ (ТЗ §10, §35)
   Клиентские helper'ы для отображения. Источник истины — сервер:
   резервирование и списание делает только серверная функция.
   ========================================================================== */

import type { Availability, Product, ProductVariant, Size } from './types'

/** Порог, ниже которого показываем «Осталось мало». */
export const LOW_STOCK_THRESHOLD = 3

/** Реально доступно к покупке = физический остаток минус резерв. */
export function availableQuantity(variant: ProductVariant): number {
  return Math.max(0, variant.stock - variant.reserved)
}

export function variantAvailability(variant: ProductVariant): Availability {
  if (!variant.isActive) return 'OUT_OF_STOCK'
  const available = availableQuantity(variant)
  if (available <= 0) return 'OUT_OF_STOCK'
  if (available <= LOW_STOCK_THRESHOLD) return 'LOW_STOCK'
  return 'IN_STOCK'
}

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  IN_STOCK: 'В наличии',
  LOW_STOCK: 'Осталось мало',
  OUT_OF_STOCK: 'Нет в наличии',
}

/** Доступность товара целиком — по лучшему из вариантов. */
export function productAvailability(product: Product): Availability {
  const states = product.variants.map(variantAvailability)
  if (states.includes('IN_STOCK')) return 'IN_STOCK'
  if (states.includes('LOW_STOCK')) return 'LOW_STOCK'
  return 'OUT_OF_STOCK'
}

export function findVariant(product: Product, size: Size): ProductVariant | undefined {
  return product.variants.find((v) => v.size === size)
}

export function findVariantById(product: Product, variantId: string): ProductVariant | undefined {
  return product.variants.find((v) => v.id === variantId)
}

/** Размеры, которые вообще существуют у товара — в каноническом порядке. */
export function productSizes(product: Product): ProductVariant[] {
  return [...product.variants].sort((a, b) => sizeOrder(a.size) - sizeOrder(b.size))
}

const SIZE_ORDER: Record<Size, number> = {
  XS: 0, S: 1, M: 2, L: 3, XL: 4, XXL: 5, ONE_SIZE: 6,
}

export function sizeOrder(size: Size): number {
  return SIZE_ORDER[size] ?? 99
}

export const SIZE_LABELS: Record<Size, string> = {
  XS: 'XS', S: 'S', M: 'M', L: 'L', XL: 'XL', XXL: 'XXL', ONE_SIZE: 'ONE SIZE',
}

/** Нельзя продать больше, чем доступно (ТЗ §10). */
export function canAddToCart(variant: ProductVariant, requestedQty: number): boolean {
  return variant.isActive && availableQuantity(variant) >= requestedQty
}

/** Максимум, который покупатель может положить в корзину за раз. */
export const MAX_QTY_PER_ITEM = 10

export function maxAddableQuantity(variant: ProductVariant): number {
  return Math.min(availableQuantity(variant), MAX_QTY_PER_ITEM)
}
