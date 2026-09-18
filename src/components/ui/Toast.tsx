/* ==========================================================================
   MANILI — ТОСТЫ
   Короткие подтверждения действий. Тексты — человеческие, без технических
   подробностей (ТЗ §41).
   ========================================================================== */

import { createPortal } from 'react-dom'
import { useSyncExternalStore } from 'react'
import { cx, uid } from '@/lib/utils'
import { IconCheck, IconClose } from './Icons'
import './ui.css'

export type ToastTone = 'default' | 'success' | 'error'

export interface ToastItem {
  id: string
  title?: string
  message: string
  tone: ToastTone
}

let toasts: ToastItem[] = []
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return toasts
}

export function showToast(message: string, options: { title?: string; tone?: ToastTone; duration?: number } = {}) {
  const item: ToastItem = {
    id: uid('toast'),
    title: options.title,
    message,
    tone: options.tone ?? 'default',
  }
  toasts = [...toasts, item]
  emit()
  setTimeout(() => dismissToast(item.id), options.duration ?? 4200)
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function ToastHost() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  if (items.length === 0) return null

  return createPortal(
    <div className="toast-stack" role="status" aria-live="polite">
      {items.map((toast) => (
        <div key={toast.id} className={cx('toast', toast.tone !== 'default' && `toast--${toast.tone}`)}>
          {toast.tone === 'success' && <IconCheck size={18} />}
          <div className="toast__body">
            {toast.title && <div className="toast__title">{toast.title}</div>}
            {toast.message}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Закрыть уведомление"
            style={{ color: 'inherit', opacity: 0.6, display: 'grid', placeItems: 'center' }}
          >
            <IconClose size={16} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
