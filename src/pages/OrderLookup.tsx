/* ==========================================================================
   MANILI — ОТСЛЕЖИВАНИЕ ЗАКАЗА ДЛЯ ГОСТЯ
   Заказ можно оформить без регистрации, поэтому нужен доступ по номеру.
   ========================================================================== */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Reveal } from '@/components/motion'
import { Button, EmptyState, Input, showToast } from '@/components/ui'
import { useSeo } from '@/hooks/useSeo'
import { formatPrice } from '@/domain/money'
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from '@/domain/order-status'
import { SIZE_LABELS } from '@/domain/stock'
import type { Order } from '@/domain/types'
import { formatDateTime, formatPhone } from '@/lib/utils'
import { backend, toUserMessage } from '@/repositories'
import { Badge } from '@/components/ui'
import './checkout.css'
import './shop.css'

export default function OrderLookup() {
  useSeo({ title: 'Отследить заказ', canonical: '/order-lookup' })

  const [number, setNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [order, setOrder] = useState<Order | null>(null)
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)

  const search = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!number.trim() || !phone.trim()) {
      showToast('Укажите номер заказа и телефон.', { tone: 'error' })
      return
    }
    setLoading(true)
    try {
      const found = await backend.orders.getByPublicNumber(number, phone)
      setOrder(found)
      setSearched(true)
    } catch (error) {
      showToast(toUserMessage(error), { tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="container page-head">
        <nav className="crumbs" aria-label="Хлебные крошки">
          <Link to="/">Главная</Link>
          <span className="crumbs__sep">/</span>
          <span>Отследить заказ</span>
        </nav>
        <Reveal mode="up">
          <h1 className="page-title">Отследить заказ</h1>
        </Reveal>
        <Reveal mode="up" delay={80}>
          <p className="page-lead">
            Введите номер заказа и телефон, который указывали при оформлении.
          </p>
        </Reveal>
      </div>

      <div className="container-narrow" style={{ paddingBottom: 'var(--section-y)' }}>
        <form onSubmit={search} className="checkout-block" style={{ marginBottom: 40 }}>
          <div className="form-row form-row--2">
            <Input
              label="Номер заказа"
              placeholder="1042"
              value={number}
              onChange={(event) => setNumber(event.target.value)}
            />
            <Input
              label="Телефон"
              type="tel"
              inputMode="tel"
              placeholder="+7 999 123-45-67"
              value={phone}
              onChange={(event) => setPhone(formatPhone(event.target.value))}
            />
          </div>
          <Button type="submit" size="lg" loading={loading}>
            Найти заказ
          </Button>
        </form>

        {searched && !order && (
          <EmptyState
            title="Заказ не найден"
            text="Проверьте номер и телефон. Если ошибки нет — напишите нам, разберёмся."
          />
        )}

        {order && (
          <div className="review-block">
            <div className="review-block__head">
              <span className="review-block__title">{order.publicOrderNumber}</span>
              <Badge tone={ORDER_STATUS_TONE[order.orderStatus]} dot>
                {ORDER_STATUS_LABELS[order.orderStatus]}
              </Badge>
            </div>
            <div className="review-block__body">
              <p style={{ marginBottom: 14 }}>Оформлен {formatDateTime(order.createdAt)}</p>

              {order.items.map((item) => (
                <div
                  key={item.id}
                  style={{ display: 'flex', justifyContent: 'space-between', gap: 16, paddingBlock: 6 }}
                >
                  <span>
                    {item.productTitle} · {SIZE_LABELS[item.size]} × {item.quantity}
                  </span>
                  <span style={{ fontFamily: 'var(--f-mono)', whiteSpace: 'nowrap' }}>
                    {formatPrice(item.total)}
                  </span>
                </div>
              ))}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: '1px solid var(--c-line)',
                }}
              >
                <strong>Итого</strong>
                <strong style={{ fontFamily: 'var(--f-mono)' }}>{formatPrice(order.total)}</strong>
              </div>

              {order.trackingNumber && (
                <p style={{ marginTop: 14 }}>
                  Трек-номер: <strong>{order.trackingNumber}</strong>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
