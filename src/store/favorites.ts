/* ==========================================================================
   MANILI — ИЗБРАННОЕ (ТЗ §11)
   Гость копит избранное локально; после входа оно сливается с аккаунтом.
   ========================================================================== */

import { create } from 'zustand'
import { backend } from '@/repositories'
import { readStorage, writeStorage, STORAGE_KEYS } from '@/lib/storage'

interface FavoritesState {
  ids: string[]
  /** true, пока идёт синхронизация с backend. */
  syncing: boolean
  has: (productId: string) => boolean
  toggle: (productId: string) => Promise<void>
  /** Вызывается после успешного входа. */
  syncWithAccount: () => Promise<void>
  loadFromAccount: () => Promise<void>
  reset: () => void
}

export const useFavorites = create<FavoritesState>((set, get) => ({
  ids: readStorage<string[]>(STORAGE_KEYS.favorites, []),
  syncing: false,

  has: (productId) => get().ids.includes(productId),

  async toggle(productId) {
    const isFavorite = get().ids.includes(productId)
    const next = isFavorite
      ? get().ids.filter((id) => id !== productId)
      : [...get().ids, productId]

    // Оптимистично: интерфейс не должен ждать сеть.
    set({ ids: next })
    writeStorage(STORAGE_KEYS.favorites, next)

    try {
      if (isFavorite) await backend.favorites.remove(productId)
      else await backend.favorites.add(productId)
    } catch {
      // Гость не авторизован — локального списка достаточно.
    }
  },

  async syncWithAccount() {
    set({ syncing: true })
    try {
      const merged = await backend.favorites.sync(get().ids)
      set({ ids: merged })
      writeStorage(STORAGE_KEYS.favorites, merged)
    } catch {
      /* синхронизация не критична */
    } finally {
      set({ syncing: false })
    }
  },

  async loadFromAccount() {
    try {
      const ids = await backend.favorites.list()
      if (ids.length > 0) {
        set({ ids })
        writeStorage(STORAGE_KEYS.favorites, ids)
      }
    } catch {
      /* не авторизован */
    }
  },

  reset() {
    set({ ids: [] })
    writeStorage(STORAGE_KEYS.favorites, [])
  },
}))
