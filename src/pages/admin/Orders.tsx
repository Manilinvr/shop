/* ==========================================================================
   MANILI — СПИСОК ЗАКАЗОВ (ТЗ §19)
   Фильтры по статусу, дате, сумме, способам оплаты и доставки; поиск
   по номеру, имени, телефону и email.
   ========================================================================== */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, EmptyState, Skeleton } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { formatPrice } from '@/domain/money'
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from '@/domain/order-status'
import { ORDER_STATUSES } from '@/domain/types'
import type { DeliveryMethod, OrderStatus, PaymentMethod } from '@/domain/types'
import { debounce, formatDateTime, pluralWithCount } from '@/lib/utils'
import { backend } from '@/repositories'
import type { OrderFilters } from '@/repositories'
import './admin.css'

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CARD: 'Карта',
  SBP: 'СБП',
  CASH_ON_DELIVERY: 'При получении',
}

const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  PICKUP_POINT: 'ПВЗ',
  COURIER: 'Курьер',
  POST: 'Почта',
  SELF_PICKUP: 'Самовывоз',
}

export default function AdminOrders() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<OrderFilters>({})
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')

  const orders = useAsync(
    () => backend.ordersAdmin.list(filters, page, 25),
    [JSON.stringify(filters), page],
  )

  const applySearch = debounce((value: string) => {
    setPage(1)
    setFilters((prev) => ({ ...prev, search: value || undefined }))
  }, 260)

  const items = orders.data?.items ?? []

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Заказы</h1>
          <p className="admin-head__sub">
            {orders.data
              ? pluralWithCount(orders.data.total, ['заказ', 'заказа', 'заказов'])
              : 'Загружаем…'}
          </p>
        </div>
      </div>

      <div className="admin-filters">
        <input
          className="admin-search"
          type="search"
          placeholder="Номер, имя, телефон или email"
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value)
            applySearch(event.target.value)
          }}
          aria-label="Поиск по заказам"
        />

        <select
          className="admin-select"
          value={filters.statuses?.[0] ?? ''}
          onChange={(event) => {
            setPage(1)
            setFilters((prev) => ({
              ...prev,
              statuses: event.target.value ? [event.target.value as OrderStatus] : undefined,
            }))
          }}
          aria-label="Статус"
        >
          <option value="">Все статусы</option>
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        <select
          className="admin-select"
          value={filters.paymentMethod ?? ''}
          onChange={(event) => {
            setPage(1)
            setFilters((prev) => ({
              ...prev,
              paymentMethod: (event.target.value || undefined) as PaymentMethod | undefined,
            }))
          }}
          aria-label="Способ оплаты"
        >
          <option value="">Любая оплата</option>
          <option value="CARD">Карта</option>
          <option value="SBP">СБП</option>
        </select>

        <select
          className="admin-select"
          value={filters.deliveryMethod ?? ''}
          onChange={(event) => {
            setPage(1)
            setFilters((prev) => ({
              ...prev,
              deliveryMethod: (event.target.value || undefined) as DeliveryMethod | undefined,
            }))
          }}
          aria-label="Способ доставки"
        >
          <option value="">Любая доставка</option>
          <option value="PICKUP_POINT">ПВЗ</option>
          <option value="COURIER">Курьер</option>
          <option value="POST">Почта</option>
          <option value="SELF_PICKUP">Самовывоз</option>
        </select>

        {(filters.statuses || filters.paymentMethod || filters.deliveryMethod || filters.search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilters({})
              setSearchInput('')
              setPage(1)
            }}
          >
            Сбросить
          </Button>
        )}
      </div>

      {orders.loading && items.length === 0 ? (
        <Skeleton style={{ height: 320, borderRadius: 'var(--r-lg)' }} />
      ) : items.length === 0 ? (
        <div className="table-wrap">
          <EmptyState
            title="Заказы не найдены"
            text="Измените фильтры или дождитесь первого заказа."
          />
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <div className="table-scroll">
              <table className="table table--clickable">
                <thead>
                  <tr>
                    <th>Заказ</th>
                    <th>Покупатель</th>
                    <th>Дата</th>
                    <th>Оплата</th>
                    <th>Доставка</th>
                    <th>Сумма</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((order) => (
                    <tr key={order.id} onClick={() => navigate(`/admin/orders/${order.id}`)}>
                      <td className="td--strong td--mono" style={{ color: 'var(--c-cream-100)' }}>
                        {order.publicOrderNumber}
                      </td>
                      <td>
                        {order.customerName}
                        <span className="table__sub td--mono">{order.phone}</span>
                      </td>
                      <td className="td--mono">{formatDateTime(order.createdAt)}</td>
                      <td>{PAYMENT_LABELS[order.paymentMethod]}</td>
                      <td>{DELIVERY_LABELS[order.deliveryMethod]}</td>
                      <td className="td--mono td--strong" style={{ color: 'var(--c-cream-100)' }}>
                        {formatPrice(order.total)}
                      </td>
                      <td>
                        <Badge tone={ORDER_STATUS_TONE[order.orderStatus]} dot>
                          {ORDER_STATUS_LABELS[order.orderStatus]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {(page > 1 || (orders.data?.hasMore ?? false)) && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Назад
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!orders.data?.hasMore}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд
              </Button>
            </div>
          )}
        </>
      )}
    </>
  )
}
