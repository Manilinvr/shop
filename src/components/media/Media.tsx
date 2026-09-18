/* ==========================================================================
   MANILI — УНИВЕРСАЛЬНОЕ МЕДИА

   Одна точка вывода изображений:
   • реальные фото бренда → <img> с lazy loading и responsive-атрибутами;
   • `placeholder:<вид>/<n>` → процедурный SVG в фирменной стилистике.

   Когда придёт съёмка, меняются только URL в данных — компоненты не трогаем.
   ========================================================================== */

import { memo, useMemo, useState } from 'react'
import { cx } from '@/lib/utils'
import { resolveSilhouette, SILHOUETTE_VIEWBOX } from './silhouettes'
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

function parsePlaceholder(src: string): { shape: string; variant: number } {
  const raw = src.slice(PLACEHOLDER_PREFIX.length)
  const [shape, variantRaw] = raw.split('/')
  return { shape: shape || 'editorial', variant: Number(variantRaw) || 1 }
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
}: {
  shape: string
  variant: number
}) {
  const { path, specks, angle, tint } = useMemo(() => {
    const seed = variant * 37 + shape.length * 13
    const rand = seededRandom(seed)
    return {
      path: resolveSilhouette(shape),
      // Редкие «пылинки» плёнки — оживляют плоский фон.
      specks: Array.from({ length: 22 }, () => ({
        x: rand() * 400,
        y: rand() * 480,
        r: 0.6 + rand() * 1.8,
        o: 0.06 + rand() * 0.16,
      })),
      angle: -8 + rand() * 16,
      tint: 4 + Math.floor(rand() * 6),
    }
  }, [shape, variant])

  const gid = `mnl-${shape}-${variant}`

  return (
    <svg
      className="media-ph"
      viewBox={SILHOUETTE_VIEWBOX}
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${gid}-bg`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#201d1a" />
          <stop offset="55%" stopColor="#17151300" stopOpacity="0" />
          <stop offset="100%" stopColor="#0c0b0a" />
        </linearGradient>
        <radialGradient id={`${gid}-glow`} cx="50%" cy="38%" r="62%">
          <stop offset="0%" stopColor="#4a453d" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#4a453d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${gid}-fill`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#4d463d" />
          <stop offset="100%" stopColor="#2a2621" />
        </linearGradient>
      </defs>

      <rect width="400" height="480" fill="#1a1816" />
      <rect width="400" height="480" fill={`url(#${gid}-glow)`} />
      <rect width="400" height="480" fill={`url(#${gid}-bg)`} />

      <g transform={`rotate(${angle} 200 240)`} opacity="0.12">
        <rect x="-60" y={120 + tint * 8} width="520" height="1.5" fill="#e6dcc8" />
        <rect x="-60" y={320 - tint * 6} width="520" height="1" fill="#e6dcc8" opacity="0.6" />
      </g>

      <path d={path} fill={`url(#${gid}-fill)`} />
      <path d={path} fill="none" stroke="#847a6c" strokeWidth="1.3" opacity="0.65" />

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
        <PlaceholderArt shape={placeholder.shape} variant={placeholder.variant} />
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
