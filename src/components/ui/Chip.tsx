import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/utils'
import './ui.css'

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  children: ReactNode
}

/** Чип фильтра / выбора размера. Недоступный вариант зачёркнут (ТЗ §10). */
export function Chip({ selected, children, className, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      data-selected={selected ? 'true' : undefined}
      aria-pressed={selected}
      className={cx('chip', className)}
      {...rest}
    >
      {children}
    </button>
  )
}
