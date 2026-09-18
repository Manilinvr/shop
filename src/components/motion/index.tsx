/* ==========================================================================
   MANILI — МОТИОН-КОМПОНЕНТЫ (ТЗ §3)

   Обёртки над CSS-переходами и общим IntersectionObserver.
   Никаких анимационных библиотек: анимируем только transform/opacity,
   поэтому кадры считает композитор, а не главный поток.
   ========================================================================== */

import { Children, useMemo } from 'react'
import type { ElementType, ReactNode } from 'react'
import { useReveal } from '@/hooks/useReveal'
import { useParallax } from '@/hooks/useParallax'
import { cx } from '@/lib/utils'
import './motion.css'

export type RevealMode = 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade' | 'blur' | 'mask'

export interface RevealProps {
  children: ReactNode
  mode?: RevealMode
  delay?: number
  className?: string
  as?: ElementType
  style?: React.CSSProperties
}

/** Появление элемента при входе в кадр. */
export function Reveal({
  children, mode = 'up', delay = 0, className, as: Tag = 'div', style,
}: RevealProps) {
  const ref = useReveal<HTMLDivElement>({ delay })
  return (
    <Tag ref={ref} data-reveal={mode} className={className} style={style}>
      {children}
    </Tag>
  )
}

/** Группа: дочерние элементы появляются каскадом. */
export function RevealGroup({
  children, mode = 'up', stagger = 90, className, baseDelay = 0,
}: {
  children: ReactNode
  mode?: RevealMode
  stagger?: number
  className?: string
  baseDelay?: number
}) {
  const items = Children.toArray(children)
  return (
    <div className={className}>
      {items.map((child, index) => (
        <Reveal key={index} mode={mode} delay={baseDelay + index * stagger}>
          {child}
        </Reveal>
      ))}
    </div>
  )
}

/**
 * Разбивает строку на сбалансированные строки по границам слов.
 * Нужно, чтобы крупный заголовок ложился ровным блоком, а не рваной лесенкой.
 */
function balanceLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return [text]

  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

/** Построчный выезд текста из-под маски. */
export function TextReveal({
  text, delay = 0, stagger = 110, className, as: Tag = 'span', maxChars = 16,
}: {
  /** Массив — готовые строки. Строка — разобьём сами по словам. */
  text: string | string[]
  delay?: number
  stagger?: number
  className?: string
  as?: ElementType
  /** Ориентировочная длина строки при автоматической разбивке. */
  maxChars?: number
}) {
  const lines = useMemo(
    () => (Array.isArray(text) ? text.filter(Boolean) : balanceLines(text, maxChars)),
    [text, maxChars],
  )
  const ref = useReveal<HTMLSpanElement>()

  return (
    <Tag ref={ref} className={cx('text-reveal', className)} data-reveal="fade">
      {lines.map((line, index) => (
        <span key={index} className="text-reveal__line">
          <span
            className="text-reveal__inner"
            style={{ ['--line-delay' as string]: `${delay + index * stagger}ms` }}
          >
            {line}
          </span>
        </span>
      ))}
    </Tag>
  )
}

/** Плавное смещение при прокрутке. */
export function Parallax({
  children, speed = 0.18, scale = 1, className,
}: {
  children: ReactNode
  speed?: number
  scale?: number
  className?: string
}) {
  const ref = useParallax<HTMLDivElement>(speed, scale)
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

/** Бесконечная бегущая строка. */
export function Marquee({
  items, reverse = false, duration = 38, gap = '3rem', className,
}: {
  items: ReactNode[]
  reverse?: boolean
  duration?: number
  gap?: string
  className?: string
}) {
  // Дублируем содержимое, чтобы стык был незаметен.
  const track = (
    <div className="marquee__track" aria-hidden="false">
      {items.map((item, index) => (
        <span key={index} className="marquee__item">
          {item}
        </span>
      ))}
    </div>
  )

  return (
    <div
      className={cx('marquee', reverse && 'marquee--reverse', className)}
      style={{
        ['--marquee-duration' as string]: `${duration}s`,
        ['--marquee-gap' as string]: gap,
      }}
    >
      {track}
      <div className="marquee__track" aria-hidden="true">
        {items.map((item, index) => (
          <span key={index} className="marquee__item">
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
