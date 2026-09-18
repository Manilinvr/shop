/* ==========================================================================
   MANILI — REVEAL ПРИ СКРОЛЛЕ (ТЗ §3)
   Один общий IntersectionObserver на все элементы: дешевле, чем observer
   на каждый узел, и держит FPS на длинных страницах.
   ========================================================================== */

import { useEffect, useRef } from 'react'

type RevealElement = HTMLElement & { dataset: DOMStringMap }

let observer: IntersectionObserver | null = null
const pending = new WeakSet<Element>()

function getObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null
  if (observer) return observer
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const el = entry.target as RevealElement
        el.dataset.revealed = 'true'
        observer?.unobserve(el)
        pending.delete(el)
      }
    },
    // Запускаем чуть раньше, чем элемент полностью войдёт в кадр —
    // так анимация успевает начаться до того, как пользователь её увидит.
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  )
  return observer
}

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Помечает элемент для reveal-анимации.
 * Возвращает ref, который нужно повесить на узел.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options: { delay?: number; once?: boolean } = {},
) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (prefersReducedMotion()) {
      el.dataset.revealed = 'true'
      return
    }

    if (options.delay) {
      el.style.setProperty('--reveal-delay', `${options.delay}ms`)
    }

    const obs = getObserver()
    if (!obs) {
      el.dataset.revealed = 'true'
      return
    }

    pending.add(el)
    obs.observe(el)
    return () => {
      obs.unobserve(el)
      pending.delete(el)
    }
  }, [options.delay, options.once])

  return ref
}
