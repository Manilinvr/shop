import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cx } from '@/lib/utils'
import { IconCheck } from './Icons'
import './ui.css'

interface FieldShellProps {
  label?: string
  error?: string | null
  hint?: string
  children: ReactNode
  className?: string
  htmlFor?: string
}

function FieldShell({ label, error, hint, children, className, htmlFor }: FieldShellProps) {
  const message = error || hint
  return (
    <div className={cx('field', error && 'field--error', className)}>
      {label && (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      <div className="field__control">{children}</div>
      {message && <span className="field__message">{message}</span>}
    </div>
  )
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string | null
  hint?: string
  suffix?: ReactNode
  wrapperClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, suffix, className, wrapperClassName, id, ...rest },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <FieldShell label={label} error={error} hint={hint} className={wrapperClassName} htmlFor={inputId}>
      <input ref={ref} id={inputId} className={cx('field__input', className)} {...rest} />
      {suffix && <span className="field__suffix field__suffix--interactive">{suffix}</span>}
    </FieldShell>
  )
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string | null
  hint?: string
  wrapperClassName?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, wrapperClassName, id, ...rest },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <FieldShell label={label} error={error} hint={hint} className={wrapperClassName} htmlFor={inputId}>
      <textarea ref={ref} id={inputId} className={cx('field__input', className)} {...rest} />
    </FieldShell>
  )
})

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string | null
  hint?: string
  wrapperClassName?: string
  children: ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, className, wrapperClassName, children, id, ...rest },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <FieldShell label={label} error={error} hint={hint} className={wrapperClassName} htmlFor={inputId}>
      <select ref={ref} id={inputId} className={cx('field__input', className)} {...rest}>
        {children}
      </select>
    </FieldShell>
  )
})

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  children: ReactNode
}

export function Checkbox({ children, className, ...rest }: CheckboxProps) {
  return (
    <label className={cx('checkbox', className)}>
      <input type="checkbox" {...rest} />
      <span className="checkbox__box">
        <IconCheck size={14} />
      </span>
      <span className="checkbox__label">{children}</span>
    </label>
  )
}

export interface RadioCardProps {
  selected: boolean
  onSelect: () => void
  title: ReactNode
  meta?: ReactNode
  price?: ReactNode
  disabled?: boolean
}

/** Карточка выбора — используется для доставки и оплаты в checkout. */
export function RadioCard({ selected, onSelect, title, meta, price, disabled }: RadioCardProps) {
  return (
    <button
      type="button"
      className="radio-card"
      data-selected={selected ? 'true' : undefined}
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
    >
      <span className="radio-card__mark" />
      <span className="radio-card__body">
        <span className="radio-card__title">{title}</span>
        {meta && <span className="radio-card__meta">{meta}</span>}
      </span>
      {price && <span className="radio-card__price">{price}</span>}
    </button>
  )
}
