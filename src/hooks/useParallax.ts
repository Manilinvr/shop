/* ==========================================================================
   MANILI — PARALLAX (ТЗ §3)
   Все параллакс-элементы считаются в одном rAF-цикле, а не каждый в своём
   scroll-слушателе. Это держит прокрутку плавной даже на длинной главной.
   ========================================================================== */

import { useEffect, useRef } from 'react'

interface ParallaxEntry {
  el: HTMLElement
  /** Сила смещения: 0.1 — едва заметно, 0.4 — выраженно. */
  speed: number
  /** Дополнительное масштабирование при движении. */
  scale: number
}

const entries = new Set<ParallaxEntry>()
let rafId: number | null = null
let running = false

function update() {
  const viewportHeight = window.innerHeight
  for (const entry of entries) {
    const rect = entry.el.getBoundingClientRect()
    // Пропускаем всё, что далеко за кадром — не тратим вычисления.
    if (rect.bottom < -viewportHeight || rect.top > viewportHeight * 2) continue
    // progress: -1 (элемент ниже экрана) → 1 (элемент выше экрана)
    const progress = (rect.top + rect.height / 2 - viewportHeight / 2) / viewportHeight
    const offset = -progress * entry.speed * 100
    entry.el.style.setProperty('--parallax-y', `${offset.toFixed(2)}px`)
    if (entry.scale !== 1) {
      const scale = 1 + Math.abs(progress) * (entry.scale - 1)
      entry.el.style.setProperty('--parallax-scale', scale.toFixed(4))
    }
  }
  rafId = requestAnimationFrame(update)
}

function start() {
  if (running) return
  running = true
  rafId = requestAnimationFrame(update)
}

function stop() {
  if (rafId !== null) cancelAnimationFrame(rafId)
  rafId = null
  running = false
}

export function useParallax<T extends HTMLElement = HTMLDivElement>(
  speed = 0.18,
  scale = 1,
) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // На узких экранах параллакс отключаем: он съедает кадры и мешает чтению.
    if (window.innerWidth < 768) return

    const entry: ParallaxEntry = { el, speed, scale }
    entries.add(entry)
    el.dataset.parallax = 'true'
    start()

    return () => {
      entries.delete(entry)
      el.style.removeProperty('--parallax-y')
      el.style.removeProperty('--parallax-scale')
      if (entries.size === 0) stop()
    }
  }, [speed, scale])

  return ref
}
