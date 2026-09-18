/* ==========================================================================
   MANILI — ФАБРИКА BACKEND (ТЗ §4, §49)

   Единственное место, где решается, какой backend используется.
   Компоненты импортируют `backend` и не знают, Appwrite это или mock —
   именно это позволяет заменить backend без переписывания frontend.
   ========================================================================== */

import { config, isAppwriteConfigured } from '@/api/config'
import type { Backend } from './contracts'
import { mockBackend } from './mock'

/** Активная реализация. До загрузки Appwrite работает mock — UI не блокируется. */
let current: Backend = mockBackend

/** Промис готовности выбранного backend (нужен при старте приложения). */
export const backendReady: Promise<Backend> = (async () => {
  if (config.backend !== 'appwrite') return mockBackend

  if (!isAppwriteConfigured()) {
    console.warn(
      '[MANILI] VITE_BACKEND=appwrite, но VITE_APPWRITE_ENDPOINT / VITE_APPWRITE_PROJECT_ID ' +
      'не заданы. Работает локальный mock-backend.',
    )
    return mockBackend
  }

  try {
    // Отдельный чанк: SDK Appwrite не попадает в бандл демо-режима.
    const module = await import('./appwrite')
    current = module.appwriteBackend
    return current
  } catch (error) {
    console.error('[MANILI] Не удалось подключить Appwrite, работает mock-backend.', error)
    return mockBackend
  }
})()

/** Прокси: всегда обращается к актуальной реализации. */
export const backend: Backend = new Proxy({} as Backend, {
  get(_target, prop: string) {
    return current[prop as keyof Backend]
  },
})

export * from './contracts'
