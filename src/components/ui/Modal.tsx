import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { useScrollLock } from '@/hooks/useScrollLock'
import { cx } from '@/lib/utils'
import { IconButton } from './IconButton'
import { IconClose } from './Icons'
import './ui.css'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  wide?: boolean
  /** Скрыть крестик, если закрытие идёт через кнопки внутри. */
  hideClose?: boolean
}

export function Modal({ open, onClose, title, children, wide, hideClose }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  useScrollLock(open)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    // Переносим фокус внутрь модалки, иначе клавиатура остаётся на фоне.
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        className={cx('modal', wide && 'modal--wide')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        {(title || !hideClose) && (
          <div className="modal__head">
            {title && <h2 className="modal__title">{title}</h2>}
            {!hideClose && (
              <IconButton label="Закрыть" onClick={onClose} size="sm">
                <IconClose size={18} />
              </IconButton>
            )}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}
