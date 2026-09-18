/* ==========================================================================
   MANILI — ЛОГОТИП

   ТЗ §2: использовать фирменный логотип владельца, не придумывать свой
   и не добавлять посторонних символов.

   Пока файл логотипа не передан, выводится нейтральная типографическая
   надпись — без короны, знаков и выдуманной графики.

   ЧТОБЫ ПОДКЛЮЧИТЬ НАСТОЯЩИЙ ЛОГОТИП:
   положить SVG в public/brand/manili-logo.svg (и, при наличии,
   кириллическую версию в public/brand/manili-logo-ru.svg).
   Компонент подхватит их автоматически.
   ========================================================================== */

import { useEffect, useState } from 'react'
import { cx } from '@/lib/utils'
import './logo.css'

const LOGO_SRC = `${import.meta.env.BASE_URL}brand/manili-logo.svg`

export interface LogoProps {
  className?: string
  /** Высота логотипа в px. */
  size?: number
  tone?: 'cream' | 'ink'
}

export function Logo({ className, size = 28, tone = 'cream' }: LogoProps) {
  const [hasBrandFile, setHasBrandFile] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.onload = () => { if (!cancelled) setHasBrandFile(true) }
    img.onerror = () => { if (!cancelled) setHasBrandFile(false) }
    img.src = LOGO_SRC
    return () => { cancelled = true }
  }, [])

  if (hasBrandFile) {
    return (
      <img
        src={LOGO_SRC}
        alt="MANILI"
        className={cx('logo-img', `logo--${tone}`, className)}
        style={{ height: size }}
      />
    )
  }

  return (
    <span
      className={cx('logo-word', `logo--${tone}`, className)}
      style={{ fontSize: size * 0.82 }}
      aria-label="MANILI"
    >
      MANILI
      <sup className="logo-word__reg" aria-hidden="true">®</sup>
    </span>
  )
}
