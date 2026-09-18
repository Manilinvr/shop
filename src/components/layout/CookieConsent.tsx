/* ==========================================================================
   MANILI — УВЕДОМЛЕНИЕ О COOKIE (ТЗ §33)
   ========================================================================== */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { readStorage, writeStorage, STORAGE_KEYS } from '@/lib/storage'
import './cookie.css'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Показываем не сразу — баннер поверх hero портит первое впечатление.
    const timer = setTimeout(() => {
      if (!readStorage(STORAGE_KEYS.cookieConsent, false)) setVisible(true)
    }, 1600)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="cookie" role="dialog" aria-label="Использование cookie">
      <p className="cookie__text">
        Мы используем cookie, чтобы сайт работал корректно и запоминал вашу корзину.
        Подробнее — в{' '}
        <Link to="/legal/privacy" className="cookie__link">
          политике конфиденциальности
        </Link>
        .
      </p>
      <Button
        size="sm"
        onClick={() => {
          writeStorage(STORAGE_KEYS.cookieConsent, true)
          setVisible(false)
        }}
      >
        Хорошо
      </Button>
    </div>
  )
}
