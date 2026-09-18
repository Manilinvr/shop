import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { useScrollLock } from '@/hooks/useScrollLock'
import { cx } from '@/lib/utils'
import { IconButton } from './IconButton'
import { IconClose } from './Icons'
import './ui.css'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  side?: 'left' | 'right'
  children: ReactNode
  footer?: ReactNode
}

/** Выдвижная панель: корзина, фильтры, мобильное меню. */
export function Drawer({ open, onClose, title, side = 'right', children, footer }: DrawerProps) {
  useScrollLock(open)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside
        className={cx('drawer', side === 'left' && 'drawer--left')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="drawer__head">
          <h2 className="drawer__title">{title}</h2>
          <IconButton label="Закрыть" onClick={onClose} size="sm">
            <IconClose size={18} />
          </IconButton>
        </div>
        <div className="drawer__body">{children}</div>
        {footer && <div className="drawer__foot">{footer}</div>}
      </aside>
    </>,
    document.body,
  )
}
