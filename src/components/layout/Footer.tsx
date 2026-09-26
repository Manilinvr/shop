/* ==========================================================================
   MANILI — ПОДВАЛ
   ========================================================================== */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import {
  Button,
  Checkbox,
  IconArrowRight,
  IconButton,
  IconTelegram,
  IconVk,
  showToast,
} from '@/components/ui'
import { Reveal } from '@/components/motion'
import { config } from '@/api/config'
import { isValidEmail } from '@/lib/utils'
import './footer.css'

const SHOP_LINKS = [
  { to: '/shop', label: 'Все товары' },
  { to: '/shop/hoodies', label: 'Худи' },
  { to: '/shop/tshirts', label: 'Футболки' },
  { to: '/shop/caps', label: 'Кепки' },
  { to: '/shop/bags', label: 'Сумки' },
  { to: '/shop?new=1', label: 'Новинки' },
]

const HELP_LINKS = [
  { to: '/delivery', label: 'Доставка и оплата' },
  { to: '/returns', label: 'Возврат и обмен' },
  { to: '/sizes', label: 'Таблица размеров' },
  { to: '/order-lookup', label: 'Отследить заказ' },
  { to: '/contacts', label: 'Контакты' },
]

const BRAND_LINKS = [
  { to: '/about', label: 'О бренде' },
  { to: '/collections', label: 'Коллекции' },
  { to: '/lookbook', label: 'Lookbook' },
]

const LEGAL_LINKS = [
  { to: '/legal/privacy', label: 'Конфиденциальность' },
  { to: '/legal/terms', label: 'Пользовательское соглашение' },
  { to: '/legal/offer', label: 'Оферта' },
]

export function Footer() {
  const [email, setEmail] = useState('')
  const [agreed, setAgreed] = useState(false)

  const handleSubscribe = (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValidEmail(email)) {
      showToast('Проверьте адрес почты — кажется, в нём опечатка.', { tone: 'error' })
      return
    }
    if (!agreed) {
      showToast('Нужно согласие на обработку персональных данных.', { tone: 'error' })
      return
    }
    // Подписка уходит на сервер вместе с остальными уведомлениями (ТЗ §23).
    showToast('Готово — расскажем о новых дропах первыми.', { tone: 'success', title: 'Вы подписаны' })
    setEmail('')
    setAgreed(false)
  }

  return (
    <footer className="footer" id="subscribe">
      <div className="container">
        <div className="footer__cta">
          <Reveal mode="up">
            <h2 className="footer__cta-title">Будь в курсе новых поступлений</h2>
          </Reveal>

          <Reveal mode="up" delay={100}>
            <form className="footer__subscribe" onSubmit={handleSubscribe}>
              <div className="footer__subscribe-field">
                <input
                  className="footer__subscribe-input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Ваш email"
                  aria-label="Email для подписки"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <Button type="submit" size="sm" aria-label="Подписаться">
                  <IconArrowRight size={16} />
                </Button>
              </div>
              <Checkbox checked={agreed} onChange={(event) => setAgreed(event.target.checked)}>
                Я согласен с{' '}
                <Link to="/legal/privacy" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
                  политикой конфиденциальности
                </Link>
              </Checkbox>
            </form>
          </Reveal>
        </div>

        <div className="footer__grid">
          <div className="footer__brand">
            <Logo size={30} />
            <p className="footer__tagline">
              MANILI — одежда для тех, кто в движении. Делаем вещи, которые носят каждый день,
              и снимаем людей, а не манекены.
            </p>
            <div className="footer__socials">
              {config.site.telegram && (
                <IconButton
                  label="Telegram"
                  tone="outlined"
                  onClick={() => window.open(config.site.telegram, '_blank', 'noopener')}
                >
                  <IconTelegram size={18} />
                </IconButton>
              )}
              {config.site.vk && (
                <IconButton
                  label="ВКонтакте"
                  tone="outlined"
                  onClick={() => window.open(config.site.vk, '_blank', 'noopener')}
                >
                  <IconVk size={18} />
                </IconButton>
              )}
            </div>
          </div>

          <div>
            <p className="footer__col-title">Магазин</p>
            <div className="footer__links">
              {SHOP_LINKS.map((link) => (
                <Link key={link.to} to={link.to} className="footer__link">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="footer__col-title">Помощь</p>
            <div className="footer__links">
              {HELP_LINKS.map((link) => (
                <Link key={link.to} to={link.to} className="footer__link">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="footer__col-title">Бренд</p>
            <div className="footer__links">
              {BRAND_LINKS.map((link) => (
                <Link key={link.to} to={link.to} className="footer__link">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="footer__col-title">Связь</p>
            <div className="footer__links">
              <a href={`mailto:${config.site.supportEmail}`} className="footer__link">
                {config.site.supportEmail}
              </a>
              <a href={`tel:${config.site.supportPhone.replace(/\s/g, '')}`} className="footer__link">
                {config.site.supportPhone}
              </a>
              <span className="footer__link" style={{ color: 'var(--c-sand)' }}>
                Пн–Вс, 10:00–20:00 МСК
              </span>
            </div>
          </div>
        </div>

        <div className="footer__bottom">
          <div className="footer__legal">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="footer__link" style={{ fontSize: 'var(--fs-xs)' }}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="footer__pay" aria-label="Способы оплаты">
            <span className="footer__pay-chip">Карта</span>
            <span className="footer__pay-chip">СБП</span>
          </div>

          <p className="footer__copy">
            © {new Date().getFullYear()} MANILI
            {config.backend === 'mock' && (
              <>
                {' · '}
                <Link to="/login" className="footer__demo">
                  демо-версия — загляните в админку
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="footer__wordmark" aria-hidden="true">
        MANILI
      </div>
    </footer>
  )
}
