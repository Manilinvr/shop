/* ==========================================================================
   MANILI — ИКОНКИ
   Тонкие линии, скруглённые концы — в одном ключе с дизайн-системой.
   Инлайн-SVG вместо иконочной библиотеки: ноль килобайт в бандле (ТЗ §30).
   ========================================================================== */

import type { CSSProperties } from 'react'

interface IconProps {
  size?: number
  className?: string
  strokeWidth?: number
  /** Нужен для поворота стрелок и подобных мелочей. */
  style?: CSSProperties
}

function base(size: number, className?: string, style?: CSSProperties) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    className,
    style,
    'aria-hidden': true as const,
    focusable: 'false' as const,
  }
}

const S = {
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const IconSearch = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <circle cx="11" cy="11" r="7" {...S} strokeWidth={strokeWidth} />
    <path d="M20 20l-3.5-3.5" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconUser = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <circle cx="12" cy="8" r="4" {...S} strokeWidth={strokeWidth} />
    <path d="M4 20c0-3.9 3.6-7 8-7s8 3.1 8 7" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconBag = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M5.4 8h13.2a1.5 1.5 0 011.5 1.65l-.9 9A2.5 2.5 0 0116.7 21H7.3a2.5 2.5 0 01-2.5-2.35l-.9-9A1.5 1.5 0 015.4 8z" {...S} strokeWidth={strokeWidth} />
    <path d="M8.5 10V7a3.5 3.5 0 017 0v3" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconHeart = ({ size = 20, className, strokeWidth = 1.5, filled = false, style }: IconProps & { filled?: boolean }) => (
  <svg {...base(size, className, style)}>
    <path
      d="M12 20.2l-7-6.6C2.6 11.3 3 7.8 5.7 6.2A4.8 4.8 0 0112 7.5a4.8 4.8 0 016.3-1.3c2.7 1.6 3.1 5.1.7 7.4l-7 6.6z"
      {...S}
      strokeWidth={strokeWidth}
      fill={filled ? 'currentColor' : 'none'}
    />
  </svg>
)

export const IconClose = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M6 6l12 12M18 6L6 18" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconPlus = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M12 5v14M5 12h14" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconMinus = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M5 12h14" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconArrowRight = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M4 12h16M14 6l6 6-6 6" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconArrowLeft = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M20 12H4M10 6l-6 6 6 6" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconArrowUpRight = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M7 17L17 7M8 7h9v9" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconChevronDown = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M6 9l6 6 6-6" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconCheck = ({ size = 20, className, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M4.5 12.5l5 5 10-11" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconMenu = ({ size = 22, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M4 7h16M4 12h16M4 17h10" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconFilter = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M4 7h16M7 12h10M10 17h4" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconTruck = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M3 7.5A1.5 1.5 0 014.5 6h9A1.5 1.5 0 0115 7.5V16H3V7.5z" {...S} strokeWidth={strokeWidth} />
    <path d="M15 10h3.2a2 2 0 011.7 1l1.1 2v3h-6v-6z" {...S} strokeWidth={strokeWidth} />
    <circle cx="7" cy="18" r="2" {...S} strokeWidth={strokeWidth} />
    <circle cx="17.5" cy="18" r="2" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconCard = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="3" {...S} strokeWidth={strokeWidth} />
    <path d="M2.5 10h19" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconShield = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M12 3l7 2.8v5.4c0 4.2-2.9 8-7 9.8-4.1-1.8-7-5.6-7-9.8V5.8L12 3z" {...S} strokeWidth={strokeWidth} />
    <path d="M9 12l2 2 4-4.5" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconPackage = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2L12 3z" {...S} strokeWidth={strokeWidth} />
    <path d="M4 7.2l8 4.2 8-4.2M12 11.4V21" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconPin = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z" {...S} strokeWidth={strokeWidth} />
    <circle cx="12" cy="10" r="2.5" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconTrash = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M4.5 7h15M9.5 7V5.5A1.5 1.5 0 0111 4h2a1.5 1.5 0 011.5 1.5V7" {...S} strokeWidth={strokeWidth} />
    <path d="M6.5 7l.8 11.6A1.5 1.5 0 008.8 20h6.4a1.5 1.5 0 001.5-1.4L17.5 7" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconEdit = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M4 20h4L19 9a2.1 2.1 0 00-3-3L5 17v3z" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconEye = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" {...S} strokeWidth={strokeWidth} />
    <circle cx="12" cy="12" r="2.8" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconEyeOff = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M4 4l16 16" {...S} strokeWidth={strokeWidth} />
    <path d="M9.6 9.6A2.8 2.8 0 0012 14.8c.8 0 1.5-.3 2-.8" {...S} strokeWidth={strokeWidth} />
    <path d="M6.3 6.6C3.9 8.2 2.5 12 2.5 12s3.5 6 9.5 6c1.7 0 3.2-.5 4.4-1.2M11 6.1c.3 0 .6-.1 1-.1 6 0 9.5 6 9.5 6s-.7 1.2-2 2.6" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconChart = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconSettings = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <circle cx="12" cy="12" r="3" {...S} strokeWidth={strokeWidth} />
    <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9L5.3 5.3" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconLogout = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M14 7V5.5A1.5 1.5 0 0012.5 4h-6A1.5 1.5 0 005 5.5v13A1.5 1.5 0 006.5 20h6a1.5 1.5 0 001.5-1.5V17" {...S} strokeWidth={strokeWidth} />
    <path d="M10 12h10M17 8.5l3.5 3.5-3.5 3.5" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconGrid = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" {...S} strokeWidth={strokeWidth} />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" {...S} strokeWidth={strokeWidth} />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" {...S} strokeWidth={strokeWidth} />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconTag = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M11 3.5H5.8A2.3 2.3 0 003.5 5.8V11a2 2 0 00.6 1.4l7.5 7.5a2 2 0 002.8 0l6-6a2 2 0 000-2.8L12.4 4.1A2 2 0 0011 3.5z" {...S} strokeWidth={strokeWidth} />
    <circle cx="8" cy="8" r="1.4" fill="currentColor" />
  </svg>
)

export const IconBell = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M18 9a6 6 0 10-12 0c0 5-2 6-2 6h16s-2-1-2-6z" {...S} strokeWidth={strokeWidth} />
    <path d="M10.3 19a2 2 0 003.4 0" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconHome = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 19v-8.5z" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconList = ({ size = 20, className, strokeWidth = 1.5, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" {...S} strokeWidth={strokeWidth} />
  </svg>
)

export const IconTelegram = ({ size = 20, className, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path
      d="M21 5.2L18.1 19c-.2 1-.8 1.2-1.6.7l-4.4-3.2-2.1 2c-.2.3-.4.4-.9.4l.3-4.4 8-7.2c.3-.3-.1-.5-.5-.2l-9.9 6.2-4.3-1.3c-.9-.3-.9-.9.2-1.4l16.8-6.5c.8-.3 1.5.2 1.3 1.3z"
      fill="currentColor"
    />
  </svg>
)

export const IconVk = ({ size = 20, className, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path
      d="M12.8 17c-5.2 0-8.5-3.7-8.6-9.8h2.7c.1 4.5 2.2 6.4 3.8 6.8V7.2h2.5v3.9c1.5-.2 3.1-2 3.7-3.9h2.5c-.4 2.3-2.1 4.1-3.3 4.9 1.2.6 3.1 2.2 3.8 4.9h-2.8c-.6-1.8-2-3.2-3.9-3.5V17h-.4z"
      fill="currentColor"
    />
  </svg>
)

export const IconSpark = ({ size = 20, className, strokeWidth = 1.3, style }: IconProps) => (
  <svg {...base(size, className, style)}>
    <path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18" {...S} strokeWidth={strokeWidth} />
  </svg>
)
