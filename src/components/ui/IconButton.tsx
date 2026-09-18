import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/utils'
import './ui.css'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Обязательно: иконка без подписи недоступна без метки. */
  label: string
  size?: 'sm' | 'md' | 'lg'
  tone?: 'plain' | 'outlined' | 'filled'
  active?: boolean
  children: ReactNode
}

/** Круглая кнопка-иконка. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'md', tone = 'plain', active, children, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      data-active={active ? 'true' : undefined}
      className={cx('icon-btn', `icon-btn--${size}`, tone !== 'plain' && `icon-btn--${tone}`, className)}
      {...rest}
    >
      {children}
    </button>
  )
})
