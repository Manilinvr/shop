import type { ReactNode } from 'react'
import { cx } from '@/lib/utils'
import './ui.css'

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent' | 'outline'

export function Badge({
  tone = 'neutral', dot, children, className,
}: {
  tone?: BadgeTone
  dot?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <span className={cx('badge', `badge--${tone}`, className)}>
      {dot && <span className="badge__dot" />}
      {children}
    </span>
  )
}
