/* ==========================================================================
   MANILI — КАРТОЧКА ЗАКАЗА В АДМИНКЕ (ТЗ §19, §20)
   Кнопки быстрых действий, история изменений, трек-номер.
   ========================================================================== */

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Media } from '@/components/media/Media'
import {
  Badge,
  Button,
  EmptyState,
  IconArrowLeft,
  Input,
  Modal,
  Spinner,
  showToast,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { formatPrice } from '@/domain/money'
import {
  canTransition,
  CRITICAL_ACTION_STATUSES,
  DELIVERY_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  PAYMENT_STATUS_LABELS,
  QUICK_ACTION_STATUSES,
} from '@/domain/order-status'
import { SIZE_LABELS } from '@/domain/stock'
import type { Order, OrderStatus } from '@/domain/types'
import { formatDateTime } from '@/lib/utils'
import { backend, toUserMessage } from '@/repositories'
import './admin.css'
import '../checkout.css'

/** Коды служб доставки → человеческие названия. */
const PROVIDER_LABELS: Record<string, string> = {
  CDEK: 'СДЭК',
  POST_RF: 'Почта России',
  MANILI: 'Самовывоз MANILI',
}

export default function OrderCard() {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [busy, setBusy] = useState<OrderStatus | null>(null)
  const [trackModal, setTrackModal] = useState(false)
  const [trackInput, setTrackInput] = useState('')

  const loaded = useAsync(() => backend.ordersAdmin.get(orderId ?? ''), [orderId])
  const history = useAsync(
    () => backend.ordersAdmin.getHistory(orderId ?? ''),
    [orderId, order?.updatedAt],
  )

  const current = order ?? loaded.data

  const changeStatus = async (status: OrderStatus) => {
    if (!current) return
    setBusy(status)
    try {
      const updated = await backend.ordersAdmin.setStatus(current.id, status)
      setOrder(updated)
      history.reload()
      showToast(`Статус: ${ORDER_STATUS_LABELS[status]}`, { tone: 'success' })
    } catch (error) {
      showToast(toUserMessage(error), { tone: 'error' })
    } finally {
      setBusy(null)
    }
  }

  const saveTracking = async () => {
    if (!current || !trackInput.trim()) return
    try {
      const updated = await backend.ordersAdmin.setTrackingNumber(current.id, trackInput.trim())
      setOrder(updated)
      history.reload()
      setTrackModal(false)
      showToast('Трек-номер сохранён.', { tone: 'success' })
    } catch (error) {
      showToast(toUserMessage(error), { tone: 'error' })
    }
  }

  if (loaded.loading && !current) return <Spinner center />

  if (!current) {
    return (
      <EmptyState
        title="Заказ не найден"
        action={
          <Link to="/admin/orders">
            <Button variant="secondary">К списку заказов</Button>
          </Link>
        }
      />
    )
  }

  return (
    <>
      <div className="admin-head">
        <div>
          <Link
            to="/admin/orders"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10,
              fontFamily: 'var(--f-mono)', fontSize: 'var(--fs-2xs)',
              letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase',
              color: 'var(--c-text-muted)',
            }}
          >
            <IconArrowLeft size={14} /> Все заказы
          </Link>
          <h1 className="admin-head__title">{current.publicOrderNumber}</h1>
          <p className="admin-head__sub">Создан {formatDateTime(current.createdAt)}</p>
        </div>
        <Badge tone={ORDER_STATUS_TONE[current.orderStatus]} dot>
          {ORDER_STATUS_LABELS[current.orderStatus]}
        </Badge>
      </div>

      <div className="order-card">
        <div>
          <div className="panel">
            <p className="panel__title">Быстрые действия</p>
            <div className="status-actions">
              {QUICK_ACTION_STATUSES.map((status) => {
                const allowed = canTransition(current.orderStatus, status)
                return (
                  <Button
                    key={status}
                    size="sm"
                    variant={allowed ? 'secondary' : 'ghost'}
                    disabled={!allowed}
                    loading={busy === status}
                    onClick={() => void changeStatus(status)}
                  >
                    {ORDER_STATUS_LABELS[status]}
                  </Button>
                )
              })}
            </div>

            <div className="status-actions" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--c-line)' }}>
              {CRITICAL_ACTION_STATUSES.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant="danger"
                  disabled={!canTransition(current.orderStatus, status)}
                  loading={busy === status}
                  onClick={() => void changeStatus(status)}
                >
                  {ORDER_STATUS_LABELS[status]}
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTrackInput(current.trackingNumber ?? '')
                  setTrackModal(true)
                }}
              >
                {current.trackingNumber ? 'Изменить трек-номер' : 'Добавить трек-номер'}
              </Button>
            </div>
          </div>

          <div className="panel">
            <p className="panel__title">Состав заказа</p>
            <div style={{ display: 'grid', gap: 14 }}>
              {current.items.map((item) => (
                <div
                  key={item.id}
                  className="checkout-summary__item"
                  style={{ gridTemplateColumns: '54px 1fr auto' }}
                >
                  <Media src={item.productImage} alt="" ratio="3 / 4" rounded="sm" sizes="54px" />
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

            <div className="kv" style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--c-line)' }}>
              <div className="kv__row">
                <span className="kv__key">Товары</span>
                <span className="kv__value kv__value--strong">{formatPrice(current.subtotal)}</span>
              </div>
              {current.discount > 0 && (
                <div className="kv__row">
                  <span className="kv__key">Скидка{current.promocode ? ` · ${current.promocode}` : ''}</span>
                  <span className="kv__value kv__value--strong">−{formatPrice(current.discount)}</span>
                </div>
              )}
              <div className="kv__row">
                <span className="kv__key">Доставка</span>
                <span className="kv__value kv__value--strong">{formatPrice(current.deliveryPrice)}</span>
              </div>
              <div className="kv__row" style={{ paddingTop: 10, borderTop: '1px solid var(--c-line)' }}>
                <span className="kv__key" style={{ color: 'var(--c-cream-100)' }}>Итого</span>
                <span className="kv__value kv__value--strong" style={{ fontSize: 'var(--fs-lg)' }}>
                  {formatPrice(current.total)}
                </span>
              </div>
            </div>
          </div>

          <div className="panel">
            <p className="panel__title">История заказа</p>
            {history.loading && <Spinner center />}
            {!history.loading && (history.data?.length ?? 0) === 0 && (
              <p style={{ color: 'var(--c-text-muted)', fontSize: 'var(--fs-sm)' }}>
                Изменений пока не было.
              </p>
            )}
            <div className="timeline">
              {(history.data ?? []).map((entry) => (
                <div key={entry.id} className="timeline__row">
                  <span className="timeline__dot" data-done="true">
                    <span />
                  </span>
                  <div>
                    <p className="timeline__label">
                      {entry.field === 'orderStatus'
                        ? ORDER_STATUS_LABELS[entry.newValue as OrderStatus] ?? entry.newValue
                        : entry.field === 'trackingNumber'
                          ? `Трек-номер: ${entry.newValue}`
                          : `${entry.field}: ${entry.newValue}`}
                      {entry.comment ? ` — ${entry.comment}` : ''}
                    </p>
                    <p className="timeline__time">
                      {formatDateTime(entry.createdAt)} · {entry.changedByName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside>
          <div className="panel">
            <p className="panel__title">Покупатель</p>
            <div className="kv">
              <div className="kv__row">
                <span className="kv__key">Имя</span>
                <span className="kv__value">{current.customerName}</span>
              </div>
              <div className="kv__row">
                <span className="kv__key">Телефон</span>
                <a href={`tel:${current.phone}`} className="kv__value kv__value--strong">
                  {current.phone}
                </a>
              </div>
              {current.email && (
                <div className="kv__row">
                  <span className="kv__key">Email</span>
                  <a href={`mailto:${current.email}`} className="kv__value">
                    {current.email}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <p className="panel__title">Оплата</p>
            <div className="kv">
              <div className="kv__row">
                <span className="kv__key">Статус</span>
                <span className="kv__value kv__value--strong">
                  {PAYMENT_STATUS_LABELS[current.paymentStatus]}
                </span>
              </div>
              <div className="kv__row">
                <span className="kv__key">Способ</span>
                <span className="kv__value">
                  {current.paymentMethod === 'CARD' ? 'Банковская карта' : current.paymentMethod === 'SBP' ? 'СБП' : 'При получении'}
                </span>
              </div>
            </div>
          </div>

          <div className="panel">
            <p className="panel__title">Доставка</p>
            <div className="kv">
              <div className="kv__row">
                <span className="kv__key">Статус</span>
                <span className="kv__value kv__value--strong">
                  {DELIVERY_STATUS_LABELS[current.deliveryStatus]}
                </span>
              </div>
              <div className="kv__row">
                <span className="kv__key">Служба</span>
                <span className="kv__value">{current.deliveryProvider ? (PROVIDER_LABELS[current.deliveryProvider] ?? current.deliveryProvider) : '—'}</span>
              </div>
              {current.trackingNumber && (
                <div className="kv__row">
                  <span className="kv__key">Трек-номер</span>
                  <span className="kv__value kv__value--strong">{current.trackingNumber}</span>
                </div>
              )}
              <div className="kv__row">
                <span className="kv__key">Адрес</span>
                <span className="kv__value">
                  {current.pickupPoint
                    ? `${current.pickupPoint.name}, ${current.pickupPoint.address}`
                    : current.shippingAddress
                      ? `${current.shippingAddress.city}, ${current.shippingAddress.street}, д. ${current.shippingAddress.house}${
                          current.shippingAddress.apartment ? `, кв. ${current.shippingAddress.apartment}` : ''
                        }`
                      : '—'}
                </span>
              </div>
            </div>
          </div>

          {current.comment && (
            <div className="panel">
              <p className="panel__title">Комментарий покупателя</p>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-dim)', lineHeight: 1.7 }}>
                {current.comment}
              </p>
            </div>
          )}
        </aside>
      </div>

      <Modal open={trackModal} onClose={() => setTrackModal(false)} title="Трек-номер">
        <div style={{ display: 'grid', gap: 18 }}>
          <Input
            label="Номер отправления"
            value={trackInput}
            onChange={(event) => setTrackInput(event.target.value)}
            placeholder="Например, 1234567890"
          />
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)', lineHeight: 1.6 }}>
            Покупатель увидит трек-номер в личном кабинете и получит уведомление.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={() => void saveTracking()} disabled={!trackInput.trim()}>
              Сохранить
            </Button>
            <Button variant="ghost" onClick={() => setTrackModal(false)}>
              Отмена
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
