/* ==========================================================================
   MANILI — АУТЕНТИФИКАЦИЯ (ТЗ §6, §25)

   Роль из этого стора используется ТОЛЬКО для отрисовки интерфейса.
   Реальная проверка прав — всегда на сервере: любой пользователь может
   подменить состояние в браузере.
   ========================================================================== */

import { create } from 'zustand'
import type { User } from '@/domain/types'
import { backend } from '@/repositories'
import { useFavorites } from './favorites'

interface AuthState {
  user: User | null
  /** true, пока идёт первичная проверка сессии при загрузке страницы. */
  initializing: boolean
  setUser: (user: User | null) => void
  init: () => Promise<void>
  logout: () => Promise<void>
  isAdmin: () => boolean
  isStaff: () => boolean
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  initializing: true,

  setUser(user) {
    set({ user })
    if (user) void useFavorites.getState().syncWithAccount()
  },

  async init() {
    try {
      const user = await backend.auth.getCurrentUser()
      set({ user, initializing: false })
      if (user) void useFavorites.getState().loadFromAccount()
    } catch {
      set({ user: null, initializing: false })
    }
  },

  async logout() {
    await backend.auth.logout()
    set({ user: null })
    useFavorites.getState().reset()
  },

  isAdmin: () => get().user?.role === 'ADMIN',
  isStaff: () => {
    const role = get().user?.role
    return role === 'ADMIN' || role === 'MANAGER'
  },
}))
