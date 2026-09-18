/* ==========================================================================
   MANILI — КОРЗИНА (ТЗ §12)

   Корзина живёт локально (гость тоже должен иметь возможность собрать заказ),
   но цены и остатки в ней — лишь снимок. Перед оформлением состав
   перепроверяется, а итоговую сумму считает сервер (ТЗ §15).
   ========================================================================== */

import { create } from 'zustand'
import type { CartItem, Product, ProductVariant } from '@/domain/types'
import { MAX_QTY_PER_ITEM, availableQuantity } from '@/domain/stock'
import { readStorage, writeStorage, STORAGE_KEYS } from '@/lib/storage'

interface CartState {
  items: CartItem[]
  /** Применённый промокод — валидность подтверждает сервер. */
  promocode: string | null
  promoDiscount: number
  promoFreeDelivery: boolean
  isOpen: boolean

  add: (product: Product, variant: ProductVariant, quantity?: number) => void
  remove: (variantId: string) => void
  setQuantity: (variantId: string, quantity: number) => void
  clear: () => void
  setPromocode: (code: string | null, discount: number, freeDelivery: boolean) => void
  open: () => void
  close: () => void
  toggle: () => void

  /** Сумма по снимкам цен — для отображения до обращения к серверу. */
  subtotal: () => number
  count: () => number
  findItem: (variantId: string) => CartItem | undefined
}

function persistItems(items: CartItem[]) {
  writeStorage(STORAGE_KEYS.cart, items)
}

export const useCart = create<CartState>((set, get) => ({
  items: readStorage<CartItem[]>(STORAGE_KEYS.cart, []),
  promocode: null,
  promoDiscount: 0,
  promoFreeDelivery: false,
  isOpen: false,

  add(product, variant, quantity = 1) {
    const available = availableQuantity(variant)
    if (available <= 0) return

    set((state) => {
      const existing = state.items.find((item) => item.variantId === variant.id)
      const nextQuantity = Math.min(
        (existing?.quantity ?? 0) + quantity,
        available,
        MAX_QTY_PER_ITEM,
      )

      const items = existing
        ? state.items.map((item) =>
            item.variantId === variant.id ? { ...item, quantity: nextQuantity } : item,
          )
        : [
            ...state.items,
            {
              productId: product.id,
              variantId: variant.id,
              size: variant.size,
              quantity: nextQuantity,
              priceSnapshot: product.price + variant.priceModifier,
            },
          ]

      persistItems(items)
      return { items }
    })
  },

  remove(variantId) {
    set((state) => {
      const items = state.items.filter((item) => item.variantId !== variantId)
      persistItems(items)
      // Промокод мог зависеть от суммы — сбрасываем, пересчитает сервер.
      return { items, promocode: null, promoDiscount: 0, promoFreeDelivery: false }
    })
  },

  setQuantity(variantId, quantity) {
    set((state) => {
      const items = state.items
        .map((item) =>
          item.variantId === variantId
            ? { ...item, quantity: Math.max(1, Math.min(quantity, MAX_QTY_PER_ITEM)) }
            : item,
        )
      persistItems(items)
      return { items, promocode: null, promoDiscount: 0, promoFreeDelivery: false }
    })
  },

  clear() {
    persistItems([])
    set({ items: [], promocode: null, promoDiscount: 0, promoFreeDelivery: false })
  },

  setPromocode(code, discount, freeDelivery) {
    set({ promocode: code, promoDiscount: discount, promoFreeDelivery: freeDelivery })
  },

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),

  subtotal: () => get().items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0),
  count: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
  findItem: (variantId) => get().items.find((item) => item.variantId === variantId),
}))
