/* ==========================================================================
   MANILI — ДЕТАЛИ ЗАКАЗА ДЛЯ ПОКУПАТЕЛЯ (ТЗ §20, §24)
   Покупатель видит путь заказа так же, как владелец — только без
   служебных действий.
   ========================================================================== */

import { Link, useParams } from 'react-router-dom'
import { Media } from '@/components/media/Media'
import {
  Badge,
  ButtonLink,
  EmptyState,
  IconCheck,
  Spinner,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { formatPrice } from '@/domain/money'
import {
  DELIVERY_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  PAYMENT_STATUS_LABELS,
} from '@/domain/order-status'
import { SIZE_LABELS } from '@/domain/stock'
import type { OrderStatus } from '@/domain/types'
import { formatDateTime } from '@/lib/utils'
import { backend } from '@/repositories'
import '../auth.css'
import '../checkout.css'

/** Путь, который проходит заказ — для ленты статусов. */
const JOURNEY: OrderStatus[] = [
  'AWAITING_PAYMENT',
  'PAID',
  'PROCESSING',
  'READY_TO_SHIP',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
]

export default function OrderDetails() {
  const { orderId } = useParams<{ orderId: string }>()

  const order = useAsync(() => backend.orders.getMine(orderId ?? ''), [orderId])
  const history = useAsync(
    () => backend.ordersAdmin.getHistory(orderId ?? ''),
    [orderId],
    { skip: !orderId },
  )

  if (order.loading) return <Spinner center />

  if (!order.data) {
    return (
      <EmptyState
        title="Заказ не найден"
        text="Возможно, он оформлен на другой аккаунт."
        action={<ButtonLink to="/account/orders">К списку заказов</ButtonLink>}
      />
    )
  }

  const current = order.data
  const currentIndex = JOURNEY.indexOf(current.orderStatus)
  const statusTimes = new Map(
    (history.data ?? [])
      .filter((entry) => entry.field === 'orderStatus')
      .map((entry) => [entry.newValue, entry.createdAt]),
  )

  return (
    <>
      <nav className="crumbs" aria-label="Хлебные крошки" style={{ marginBottom: 12 }}>
        <Link to="/account/orders">Мои заказы</Link>
        <span className="crumbs__sep">/</span>
        <span>{current.publicOrderNumber}</span>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <h1 className="account__panel-title">{current.publicOrderNumber}</h1>
        <Badge tone={ORDER_STATUS_TONE[current.orderStatus]} dot>
          {ORDER_STATUS_LABELS[current.orderStatus]}
        </Badge>
      </div>

      <p style={{ color: 'var(--c-text-muted)', fontSize: 'var(--fs-sm)' }}>
        Оформлен {formatDateTime(current.createdAt)}
      </p>

      {/* Лента статусов */}
      <div className="review-block">
        <div className="review-block__head">
          <span className="review-block__title">Статус заказа</span>
        </div>
        <div className="timeline">
          {JOURNEY.map((status, index) => {
            const done = currentIndex >= index && currentIndex !== -1
            const time = statusTimes.get(status)
            return (
              <div key={status} className="timeline__row">
                <span className="timeline__dot" data-done={done ? 'true' : undefined}>
                  {done ? <IconCheck size={11} /> : <span />}
                </span>
                <div>
                  <p
                    className="timeline__label"
                    style={{ color: done ? 'var(--c-cream-100)' : 'var(--c-text-muted)' }}
                  >
                    {ORDER_STATUS_LABELS[status]}
                  </p>
                  {time && <p className="timeline__time">{formatDateTime(time)}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Состав */}
      <div className="review-block">
        <div className="review-block__head">
          <span className="review-block__title">Состав заказа</span>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          {current.items.map((item) => (
            <div key={item.id} className="checkout-summary__item" style={{ gridTemplateColumns: '64px 1fr auto' }}>
              <Link to={`/product/${item.productSlug}`}>
                <Media src={item.productImage} alt="" ratio="3 / 4" rounded="sm" sizes="64px" />
              </Link>
              <div style={{ minWidth: 0 }}>
                <Link to={`/product/${item.productSlug}`} className="checkout-summary__item-title">
                  {item.productTitle}
                </Link>
                <p className="checkout-summary__item-meta">
                  {SIZE_LABELS[item.size]} × {item.quantity} · {item.sku}
                </p>
              </div>
              <span className="checkout-summary__item-price">{formatPrice(item.total)}</span>
            </div>
          ))}
        </div>

        <div className="cart-summary" style={{ marginTop: 20, marginBottom: 0 }}>
          <div className="cart-summary__row">
            <span>Товары</span>
            <span className="cart-summary__value">{formatPrice(current.subtotal)}</span>
          </div>
          {current.discount > 0 && (
            <div className="cart-summary__row">
              <span>Скидка{current.promocode ? ` · ${current.promocode}` : ''}</span>
              <span className="cart-summary__value">−{formatPrice(current.discount)}</span>
            </div>
          )}
          <div className="cart-summary__row">
            <span>Доставка</span>
            <span className="cart-summary__value">
              {current.deliveryPrice === 0 ? (
                <span className="cart-summary__free">Бесплатно</span>
              ) : (
                formatPrice(current.deliveryPrice)
              )}
            </span>
          </div>
          <div className="cart-summary__row cart-summary__row--total">
            <span>Итого</span>
            <span className="cart-summary__value">{formatPrice(current.total)}</span>
          </div>
        </div>
      </div>

      {/* Доставка и оплата */}
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div className="review-block">
          <div className="review-block__head">
            <span className="review-block__title">Доставка</span>
          </div>
          <div className="review-block__body">
            <strong>{DELIVERY_STATUS_LABELS[current.deliveryStatus]}</strong>
            <br />
            {current.pickupPoint
              ? `${current.pickupPoint.name}, ${current.pickupPoint.address}`
              : current.shippingAddress
                ? `${current.shippingAddress.city}, ${current.shippingAddress.street}, д. ${current.shippingAddress.house}${
                    current.shippingAddress.apartment ? `, кв. ${current.shippingAddress.apartment}` : ''
                  }`
                : '—'}
            {current.trackingNumber && (
              <>
                <br />
                Трек-номер: <strong>{current.trackingNumber}</strong>
              </>
            )}
          </div>
        </div>

        <div className="review-block">
          <div className="review-block__head">
            <span className="review-block__title">Оплата</span>
          </div>
          <div className="review-block__body">
            <strong>{PAYMENT_STATUS_LABELS[current.paymentStatus]}</strong>
            <br />
            {current.paymentMethod === 'CARD' ? 'Банковская карта' : current.paymentMethod === 'SBP' ? 'СБП' : 'При получении'}
          </div>
        </div>
      </div>
    </>
  )
}
