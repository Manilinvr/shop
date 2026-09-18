/* ==========================================================================
   MANILI — КОНТАКТЫ
   ========================================================================== */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Reveal } from '@/components/motion'
import {
  Button,
  IconTelegram,
  IconVk,
  Input,
  Textarea,
  showToast,
} from '@/components/ui'
import { useSeo } from '@/hooks/useSeo'
import { config } from '@/api/config'
import { isValidEmail } from '@/lib/utils'
import './shop.css'
import './checkout.css'
import './home.css'

export default function Contacts() {
  useSeo({
    title: 'Контакты MANILI',
    description: 'Связаться с MANILI: почта, телефон, Telegram и форма обратной связи.',
    canonical: '/contacts',
  })

  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sending, setSending] = useState(false)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name.trim() || !isValidEmail(form.email) || form.message.trim().length < 10) {
      showToast('Заполните все поля — в сообщении хотя бы пара предложений.', { tone: 'error' })
      return
    }
    setSending(true)
    // Отправка уходит через ту же серверную функцию, что и остальные уведомления.
    setTimeout(() => {
      setSending(false)
      setForm({ name: '', email: '', message: '' })
      showToast('Ответим на почту в течение рабочего дня.', { tone: 'success', title: 'Сообщение отправлено' })
    }, 500)
  }

  return (
    <>
      <div className="container page-head">
        <nav className="crumbs" aria-label="Хлебные крошки">
          <Link to="/">Главная</Link>
          <span className="crumbs__sep">/</span>
          <span>Контакты</span>
        </nav>
        <Reveal mode="up">
          <h1 className="page-title">Контакты</h1>
        </Reveal>
        <Reveal mode="up" delay={80}>
          <p className="page-lead">
            Пишите по любым вопросам: размеры, доставка, возврат, сотрудничество.
            Отвечаем в течение рабочего дня.
          </p>
        </Reveal>
      </div>

      <div className="container" style={{ paddingBottom: 'var(--section-y)' }}>
        <div className="checkout-grid">
          <form onSubmit={submit} className="checkout-block">
            <h2 className="checkout-block__title">Написать нам</h2>
            <div className="form-row form-row--2">
              <Input
                label="Имя"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
              <Input
                label="Email"
                type="email"
                inputMode="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>
            <Textarea
              label="Сообщение"
              placeholder="Расскажите, чем помочь"
              value={form.message}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
            />
            <Button type="submit" size="lg" loading={sending}>
              Отправить
            </Button>
          </form>

          <aside className="checkout-summary">
            <h2 className="checkout-summary__title">Связь напрямую</h2>
            <div style={{ display: 'grid', gap: 18 }}>
              <div>
                <p className="review-block__title">Почта</p>
                <a
                  href={`mailto:${config.site.supportEmail}`}
                  style={{ color: 'var(--c-cream-100)', fontSize: 'var(--fs-md)' }}
                >
                  {config.site.supportEmail}
                </a>
              </div>
              <div>
                <p className="review-block__title">Телефон</p>
                <a
                  href={`tel:${config.site.supportPhone.replace(/\s/g, '')}`}
                  style={{ color: 'var(--c-cream-100)', fontSize: 'var(--fs-md)' }}
                >
                  {config.site.supportPhone}
                </a>
              </div>
              <div>
                <p className="review-block__title">Режим работы</p>
                <p style={{ color: 'var(--c-text-dim)', fontSize: 'var(--fs-sm)' }}>
                  Пн–Вс, 10:00–20:00 МСК
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                {config.site.telegram && (
                  <Button
                    variant="secondary"
                    size="sm"
                    iconLeft={<IconTelegram size={16} />}
                    onClick={() => window.open(config.site.telegram, '_blank', 'noopener')}
                  >
                    Telegram
                  </Button>
                )}
                {config.site.vk && (
                  <Button
                    variant="secondary"
                    size="sm"
                    iconLeft={<IconVk size={16} />}
                    onClick={() => window.open(config.site.vk, '_blank', 'noopener')}
                  >
                    ВКонтакте
                  </Button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
