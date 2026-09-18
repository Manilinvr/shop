import type { ReactNode } from 'react'
import { cx } from '@/lib/utils'
import { IconMinus, IconPlus } from './Icons'
import './ui.css'

export function Spinner({ center, className }: { center?: boolean; className?: string }) {
  return <div className={cx('spinner', center && 'spinner--center', className)} role="status" aria-label="Загрузка" />
}

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cx('skeleton', className)} style={style} aria-hidden="true" />
}

export function EmptyState({
  title, text, action,
}: {
  title: string
  text?: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <h3 className="empty__title">{title}</h3>
      {text && <p className="empty__text">{text}</p>}
      {action}
    </div>
  )
}

export function Tabs<T extends string>({
  tabs, value, onChange, className,
}: {
  tabs: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cx('tabs', className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={tab.value === value}
          data-active={tab.value === value ? 'true' : undefined}
          className="tabs__tab"
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function QuantityStepper({
  value, min = 1, max = 10, onChange,
}: {
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
}) {
  return (
    <div className="qty">
      <button
        type="button"
        className="qty__btn"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Уменьшить количество"
      >
        <IconMinus size={15} />
      </button>
      <span className="qty__value" aria-live="polite">{value}</span>
      <button
        type="button"
        className="qty__btn"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Увеличить количество"
      >
        <IconPlus size={15} />
      </button>
    </div>
  )
}
