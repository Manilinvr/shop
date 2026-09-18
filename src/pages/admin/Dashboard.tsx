/* ==========================================================================
   MANILI — ДАШБОРД (ТЗ §39)
   Новые заказы, продажи, ожидают оплаты, требуют внимания, низкие остатки.
   ========================================================================== */

import { Link } from 'react-router-dom'
import { Badge, ButtonLink, EmptyState, Skeleton } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { formatPrice } from '@/domain/money'
import { isActiveOrder, ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from '@/domain/order-status'
import { backend } from '@/repositories'
import { formatDateTime } from '@/lib/utils'
import './admin.css'

function periodDays(days: number) {
  const to = new Date()
  const from = new Date(to.getTime() - days * 24 * 3600 * 1000)
  return { from: from.toISOString(), to: to.toISOString() }
}

export default function Dashboard() {
  const orders = useAsync(() => backend.ordersAdmin.list({}, 1, 50), [])
  const analytics = useAsync(() => backend.analytics.getSummary(periodDays(30)), [])

  const list = orders.data?.items ?? []
  const awaitingPayment = list.filter((order) => order.paymentStatus === 'PENDING')
  const needsAttention = list.filter(
    (order) => order.orderStatus === 'PROBLEM' || order.orderStatus === 'NEW',
  )
  const inWork = list.filter((order) => isActiveOrder(order.orderStatus))

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Дашборд</h1>
          <p className="admin-head__sub">Сводка за последние 30 дней</p>
        </div>
        <div className="admin-head__actions">
          <ButtonLink to="/admin/orders" variant="secondary" size="sm">
            Все заказы
          </ButtonLink>
          <ButtonLink to="/admin/products" size="sm">
            Товары
          </ButtonLink>
        </div>
      </div>

      {analytics.loading ? (
        <div className="stat-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} style={{ height: 116, borderRadius: 'var(--r-lg)' }} />
          ))}
        </div>
      ) : (
        <div className="stat-grid">
          <div className="stat">
            <p className="stat__label">Выручка</p>
            <p className="stat__value">{formatPrice(analytics.data?.revenue ?? 0)}</p>
            <p className="stat__hint">оплаченные заказы</p>
          </div>
          <div className="stat">
            <p className="stat__label">Заказов</p>
            <p className="stat__value">{analytics.data?.ordersCount ?? 0}</p>
            <p className="stat__hint">{inWork.length} в работе</p>
          </div>
          <div className="stat">
            <p className="stat__label">Средний чек</p>
            <p className="stat__value">{formatPrice(analytics.data?.averageOrderValue ?? 0)}</p>
            <p className="stat__hint">по оплаченным</p>
          </div>
          <div className={awaitingPayment.length > 0 ? 'stat stat--alert' : 'stat'}>
            <p className="stat__label">Ожидают оплаты</p>
            <p className="stat__value">{awaitingPayment.length}</p>
            <p className="stat__hint">
              {awaitingPayment.length > 0 ? 'резерв держится до оплаты' : 'всё оплачено'}
            </p>
          </div>
        </div>
      )}

      {needsAttention.length > 0 && (
        <div className="panel" style={{ marginBottom: 14 }}>
          <p className="panel__title">Требуют внимания</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {needsAttention.map((order) => (
              <Link
                key={order.id}
                to={`/admin/orders/${order.id}`}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}
              >
                <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--c-cream-100)' }}>
                  {order.publicOrderNumber}
                </span>
                <Badge tone={ORDER_STATUS_TONE[order.orderStatus]} dot>
                  {ORDER_STATUS_LABELS[order.orderStatus]}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="panel" style={{ marginBottom: 14 }}>
        <p className="panel__title">Последние заказы</p>

        {orders.loading && <Skeleton style={{ height: 180, borderRadius: 'var(--r-md)' }} />}

        {!orders.loading && list.length === 0 && (
          <EmptyState
            title="Заказов пока нет"
            text="Как только покупатель оформит заказ, он появится здесь, а вам придёт уведомление в Telegram."
          />
        )}

        {list.length > 0 && (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Заказ</th>
                  <th>Покупатель</th>
                  <th>Дата</th>
                  <th>Сумма</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {list.slice(0, 8).map((order) => (
                  <tr key={order.id}>
                    <td className="td--strong table__link">
                      <Link to={`/admin/orders/${order.id}`} style={{ color: 'var(--c-cream-100)', fontFamily: 'var(--f-mono)' }}>
                        {order.publicOrderNumber}
                      </Link>
                    </td>
                    <td>{order.customerName}</td>
                    <td className="td--mono">{formatDateTime(order.createdAt)}</td>
                    <td className="td--mono td--strong">{formatPrice(order.total)}</td>
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
        )}
      </div>

      {(analytics.data?.lowStock.length ?? 0) > 0 && (
        <div className="panel">
          <p className="panel__title">Заканчиваются размеры</p>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>Размер</th>
                  <th>Осталось</th>
                </tr>
              </thead>
              <tbody>
                {(analytics.data?.lowStock ?? []).map((row) => (
                  <tr key={`${row.productId}-${row.size}`}>
                    <td className="td--strong td--wrap">{row.title}</td>
                    <td className="td--mono">{row.size}</td>
                    <td>
                      <Badge tone={row.left === 0 ? 'danger' : 'warning'}>
                        {row.left === 0 ? 'нет' : `${row.left} шт.`}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
