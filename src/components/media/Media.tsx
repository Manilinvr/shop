/* ==========================================================================
   MANILI — УНИВЕРСАЛЬНОЕ МЕДИА

   Одна точка вывода изображений:
   • реальные фото бренда → <img> с lazy loading и responsive-атрибутами;
   • `placeholder:<вид>/<n>` → процедурный SVG в фирменной стилистике.

   Когда придёт съёмка, меняются только URL в данных — компоненты не трогаем.
   ========================================================================== */

import { memo, useMemo, useState } from 'react'
import { cx } from '@/lib/utils'
import { GARMENT_OFFSET_Y, resolveFabric, resolveGarment, SILHOUETTE_VIEWBOX } from './silhouettes'
import './media.css'

export interface MediaProps {
  src: string | null | undefined
  alt: string
  className?: string
  /** Соотношение сторон: '3/4' для карточек товара, '16/9' для баннеров. */
  ratio?: string
  /** Приоритетная загрузка — только для hero (ТЗ §30). */
  priority?: boolean
  sizes?: string
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'blob' | 'none'
}

const PLACEHOLDER_PREFIX = 'placeholder:'

/**
 * `placeholder:<вид>/<кадр>[/<цвет>]`
 *
 * Цвет добавлен третьим и необязательным: старые значения без него
 * продолжают работать, просто ткань берётся нейтральная.
 */
function parsePlaceholder(src: string): { shape: string; variant: number; color?: string } {
  const raw = src.slice(PLACEHOLDER_PREFIX.length)
  const [shape, variantRaw, color] = raw.split('/')
  return { shape: shape || 'editorial', variant: Number(variantRaw) || 1, color }
}

/** Детерминированный «шум» — один и тот же плейсхолдер всегда выглядит одинаково. */
function seededRandom(seed: number): () => number {
  let state = seed * 9301 + 49297
  return () => {
    state = (state * 9301 + 49297) % 233280
    return state / 233280
  }
}

const PlaceholderArt = memo(function PlaceholderArt({
  shape,
  variant,
  color,
}: {
  shape: string
  variant: number
  color?: string
}) {
  const { parts, fabric, specks, angle } = useMemo(() => {
    const seed = variant * 37 + shape.length * 13
    const rand = seededRandom(seed)
    return {
      parts: resolveGarment(shape),
      fabric: resolveFabric(color),
      // Редкие «пылинки» плёнки — оживляют плоский фон.
      specks: Array.from({ length: 22 }, () => ({
        x: rand() * 400,
        y: rand() * 533,
        r: 0.6 + rand() * 1.8,
        o: 0.05 + rand() * 0.12,
      })),
      // Кадры одного товара слегка развёрнуты — как разные ракурсы съёмки.
      angle: -3 + ((variant - 1) % 4) * 2,
    }
  }, [shape, variant, color])

  const gid = `mnl-${shape}-${variant}-${color ?? 'n'}`

  return (
    <svg
      className="media-ph"
      viewBox={SILHOUETTE_VIEWBOX}
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        {/* Свет студии: мягкое пятно сверху, затемнение по краям. */}
        <radialGradient id={`${gid}-glow`} cx="50%" cy="30%" r="68%">
          <stop offset="0%" stopColor="#544d44" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#544d44" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${gid}-vign`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0908" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#0a0908" stopOpacity="0" />
          <stop offset="100%" stopColor="#0a0908" stopOpacity="0.7" />
        </linearGradient>

        {/* Ткань: свет слева сверху, тень справа снизу. */}
        <linearGradient id={`${gid}-cloth`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor={fabric.light} />
          <stop offset="45%" stopColor={fabric.base} />
          <stop offset="100%" stopColor={fabric.dark} />
        </linearGradient>

        {/* Зерно ткани — иначе заливка выглядит пластиковой. */}
        <filter id={`${gid}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={variant} />
          <feColorMatrix type="saturate" values="0" />
        </filter>

        <clipPath id={`${gid}-clip`}>
          {parts
            .filter((part) => part.role === 'body')
            .map((part, i) => (
              <path key={i} d={part.d} />
            ))}
        </clipPath>
      </defs>

      <rect width="400" height="533" fill="#161412" />
      <rect width="400" height="533" fill={`url(#${gid}-glow)`} />

      <g
        transform={
          `translate(0 ${GARMENT_OFFSET_Y}) rotate(${angle} 200 260)` +
          ' translate(200 266) scale(1.08) translate(-200 -266)'
        }
      >
        {/* Тень на «полу» под вещью. */}
        <ellipse cx="200" cy="446" rx="132" ry="17" fill="#000" opacity="0.5" />

        {parts.map((part, i) => {
          if (part.role === 'body') {
            return <path key={i} d={part.d} fill={`url(#${gid}-cloth)`} />
          }
          if (part.role === 'shade') {
            return <path key={i} d={part.d} fill={fabric.dark} opacity="0.5" />
          }
          if (part.role === 'light') {
            return <path key={i} d={part.d} fill={fabric.light} opacity="0.35" />
          }
          if (part.role === 'accent') {
            return <path key={i} d={part.d} fill={fabric.seam} opacity="0.85" />
          }
          return (
            <path
              key={i}
              d={part.d}
              fill="none"
              stroke={fabric.seam}
              strokeWidth={part.w ?? 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.7"
            />
          )
        })}

        {/* Зерно ложится только на ткань, не на фон. */}
        <g clipPath={`url(#${gid}-clip)`} opacity="0.16">
          <rect width="400" height="533" filter={`url(#${gid}-grain)`} />
        </g>
      </g>

      <rect width="400" height="533" fill={`url(#${gid}-vign)`} />

      {specks.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#e6dcc8" opacity={s.o} />
      ))}
    </svg>
  )
})

export const Media = memo(function Media({
  src,
  alt,
  className,
  ratio = '3 / 4',
  priority = false,
  sizes = '(max-width: 767px) 92vw, (max-width: 1279px) 46vw, 30vw',
  rounded = 'lg',
}: MediaProps) {
  const [failed, setFailed] = useState(false)

  const isPlaceholder = !src || src.startsWith(PLACEHOLDER_PREFIX) || failed
  const placeholder = isPlaceholder
    ? parsePlaceholder(src && src.startsWith(PLACEHOLDER_PREFIX) ? src : 'placeholder:editorial/1')
    : null

  return (
    <div
      className={cx('media', rounded !== 'none' && `media--${rounded}`, className)}
      style={{ aspectRatio: ratio }}
    >
      {isPlaceholder && placeholder ? (
        <PlaceholderArt shape={placeholder.shape} variant={placeholder.variant} color={placeholder.color} />
      ) : (
        <img
          src={src ?? ''}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'auto'}
          sizes={sizes}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
})
