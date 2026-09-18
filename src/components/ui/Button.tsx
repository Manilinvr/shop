import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '@/lib/utils'
import './ui.css'

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface CommonProps {
  variant?: Variant
  size?: Size
  block?: boolean
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
  children?: ReactNode
  className?: string
}

export interface ButtonProps
  extends CommonProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> {}

/** Кнопка. Форма всегда pill — прямоугольных кнопок в MANILI нет. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', block, loading, iconLeft, iconRight, children, className, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cx('btn', `btn--${variant}`, `btn--${size}`, block && 'btn--block', className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="btn__spinner" /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  )
})

export interface ButtonLinkProps extends CommonProps {
  to: string
  /** Внешняя ссылка открывается в новой вкладке. */
  external?: boolean
  onClick?: () => void
  'aria-label'?: string
}

/** Та же кнопка, но как ссылка — чтобы навигация оставалась ссылкой. */
export function ButtonLink({
  to, external, variant = 'primary', size = 'md', block,
  iconLeft, iconRight, children, className, onClick, ...rest
}: ButtonLinkProps) {
  const classes = cx('btn', `btn--${variant}`, `btn--${size}`, block && 'btn--block', className)

  if (external) {
    return (
      <a href={to} className={classes} target="_blank" rel="noreferrer noopener" onClick={onClick} {...rest}>
        {iconLeft}
        {children}
        {iconRight}
      </a>
    )
  }

  return (
    <Link to={to} className={classes} onClick={onClick} {...rest}>
      {iconLeft}
      {children}
      {iconRight}
    </Link>
  )
}
