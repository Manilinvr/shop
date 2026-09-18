/* ==========================================================================
   MANILI — ЗАКАЗ ОФОРМЛЕН (ТЗ §45)
   Красивое подтверждение + понятный следующий шаг.
   ========================================================================== */

import { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Reveal } from '@/components/motion'
import {
  Button,
  ButtonLink,
  EmptyState,
  IconCheck,
  Spinner,
  showToast,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { config } from '@/api/config'
import { formatPrice } from '@/domain/money'
import { ORDER_STATUS_LABELS } from '@/domain/order-status'
import { SIZE_LABELS } from '@/domain/stock'
import type { Order } from '@/domain/types'
import { formatDateTime } from '@/lib/utils'
import { backend, toUserMessage } from '@/repositories'
import { useAuth } from '@/store/auth'
import './checkout.css'

export default function OrderSuccess() {
  useSeo({ title: 'Заказ оформлен', noIndex: true })

  const { orderId } = useParams<{ orderId: string }>()
  const location = useLocation()
  const user = useAuth((state) => state.user)
  const passedOrder = (location.state as { order?: Order } | null)?.order ?? null
  const [paying, setPaying] = useState(false)

  const loaded = useAsync(
    () => backend.orders.getMine(orderId ?? ''),
    [orderId],
    { skip: Boolean(passedOrder) || !user },
  )

  const [order, setOrder] = useState<Order | null>(passedOrder)
  const current = order ?? loaded.data ?? passedOrder

  /**
   * Демо-оплата. В production статус PAID выставляет ТОЛЬКО webhook
   * платёжного провайдера — фронт на это влиять не может (ТЗ §37).
   */
  const simulatePayment = async () => {
    if (!current) return
    setPaying(true)
    try {
      const updated = await backend.ordersAdmin.setStatus(current.id, 'PAID', 'Демо-оплата')
      setOrder(updated)
      showToast('Заказ оплачен. Владельцу ушло уведомление.', { tone: 'success' })
    } catch (error) {
      showToast(toUserMessage(error), { tone: 'error' })
    } finally {
      setPaying(false)
    }
  }

  if (loaded.loading && !current) {
    return <Spinner center />
  }

  if (!current) {
    return (
      <div className="container" style={{ paddingTop: 'calc(var(--header-h) + 80px)', paddingBottom: 'var(--section-y)' }}>
        <EmptyState
          title="Заказ не найден"
          text="Проверьте ссылку или найдите заказ по номеру и телефону."
          action={<ButtonLink to="/order-lookup">Найти заказ</ButtonLink>}
        />
      </div>
    )
  }

  const awaitingPayment = current.paymentStatus === 'PENDING'

  return (
    <div className="container success">
      <Reveal mode="scale">
        <div className="success__mark">
          <IconCheck size={34} />
        </div>
      </Reveal>

      <Reveal mode="up" delay={80}>
        <h1 className="success__title">
          {awaitingPayment ? 'Заказ создан' : 'Спасибо за заказ'}
        </h1>
      </Reveal>

      <Reveal mode="up" delay={140}>
        <p className="success__number">{current.publicOrderNumber}</p>
      </Reveal>

      <Reveal mode="up" delay={200}>
        <p className="success__text">
          {awaitingPayment
            ? 'Мы придержали ваши размеры. Заказ перейдёт в работу сразу после оплаты.'
            : 'Мы уже собираем заказ. Статус придёт на почту и в SMS, а отследить его можно в личном кабинете.'}
        </p>
      </Reveal>

      <Reveal mode="up" delay={260}>
        <div className="success__actions">
          {user ? (
            <ButtonLink to={`/account/orders/${current.id}`} size="lg">
              Отследить заказ
            </ButtonLink>
          ) : (
            <ButtonLink to="/order-lookup" size="lg">
              Отследить заказ
            </ButtonLink>
          )}
          <ButtonLink to="/shop" size="lg" variant="secondary">
            Продолжить покупки
          </ButtonLink>
        </div>
      </Reveal>

      <Reveal mode="up" delay={320}>
        <div className="review-block success__card">
          <div className="review-block__head">
            <span className="review-block__title">Состав заказа</span>
            <span className="review-block__title">{ORDER_STATUS_LABELS[current.orderStatus]}</span>
          </div>
          <div className="review-block__body">
            {current.items.map((item) => (
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
                gap: 16,
                marginTop: 14,
                paddingTop: 14,
                borderTop: '1px solid var(--c-line)',
              }}
            >
              <strong>Итого</strong>
              <strong style={{ fontFamily: 'var(--f-mono)' }}>{formatPrice(current.total)}</strong>
            </div>

            <p style={{ marginTop: 14, fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)' }}>
              Создан {formatDateTime(current.createdAt)}
            </p>
          </div>
        </div>
      </Reveal>

      {/* Демо-режим: платёжный провайдер ещё не подключён (ТЗ §15). */}
      {config.backend === 'mock' && awaitingPayment && (
        <Reveal mode="up" delay={380}>
          <div className="review-block success__card" style={{ borderStyle: 'dashed' }}>
            <div className="review-block__head">
              <span className="review-block__title">Демо-режим</span>
            </div>
            <div className="review-block__body">
              <p style={{ marginBottom: 16 }}>
                Платёжная система пока не подключена. Нажмите кнопку, чтобы посмотреть,
                как заказ проходит путь после оплаты: списание остатков, уведомление
                владельцу и смена статусов.
              </p>
              <Button loading={paying} onClick={() => void simulatePayment()}>
                Имитировать успешную оплату
              </Button>
            </div>
          </div>
        </Reveal>
      )}
    </div>
  )
}
