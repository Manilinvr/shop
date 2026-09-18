/* ==========================================================================
   MANILI — АНАЛИТИКА (ТЗ §28)
   ========================================================================== */

import { useState } from 'react'
import { EmptyState, Skeleton, Tabs } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { formatPrice } from '@/domain/money'
import { backend } from '@/repositories'
import { formatDateShort } from '@/lib/utils'
import './admin.css'

type Period = '1' | '7' | '30' | '90'

const PERIOD_TABS: { value: Period; label: string }[] = [
  { value: '1', label: 'Сегодня' },
  { value: '7', label: '7 дней' },
  { value: '30', label: '30 дней' },
  { value: '90', label: '90 дней' },
]

function periodRange(days: number) {
  const to = new Date()
  const from = new Date(to.getTime() - days * 24 * 3600 * 1000)
  return { from: from.toISOString(), to: to.toISOString() }
}

export default function Analytics() {
  const [period, setPeriod] = useState<Period>('30')
  const data = useAsync(() => backend.analytics.getSummary(periodRange(Number(period))), [period])

  const summary = data.data
  const maxRevenue = Math.max(1, ...(summary?.salesByDay ?? []).map((day) => day.revenue))

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Аналитика</h1>
          <p className="admin-head__sub">Продажи, клиенты и остатки</p>
        </div>
        <Tabs tabs={PERIOD_TABS} value={period} onChange={setPeriod} />
      </div>

      {data.loading ? (
        <div className="stat-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} style={{ height: 116, borderRadius: 'var(--r-lg)' }} />
          ))}
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat">
              <p className="stat__label">Выручка</p>
              <p className="stat__value">{formatPrice(summary?.revenue ?? 0)}</p>
            </div>
            <div className="stat">
              <p className="stat__label">Заказов</p>
              <p className="stat__value">{summary?.ordersCount ?? 0}</p>
            </div>
            <div className="stat">
              <p className="stat__label">Средний чек</p>
              <p className="stat__value">{formatPrice(summary?.averageOrderValue ?? 0)}</p>
            </div>
            <div className="stat">
              <p className="stat__label">Клиентов всего</p>
              <p className="stat__value">{summary?.customersCount ?? 0}</p>
            </div>
            <div className="stat">
              <p className="stat__label">Новых клиентов</p>
              <p className="stat__value">{summary?.newCustomers ?? 0}</p>
              <p className="stat__hint">за выбранный период</p>
            </div>
            <div className="stat">
              <p className="stat__label">Повторные покупки</p>
              <p className="stat__value">
                {Math.round((summary?.repeatPurchaseRate ?? 0) * 100)}%
              </p>
              <p className="stat__hint">доля клиентов с 2+ заказами</p>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 14 }}>
            <p className="panel__title">Продажи по дням</p>
            {(summary?.salesByDay.length ?? 0) === 0 ? (
              <div className="chart__empty">Пока нет оплаченных заказов за период</div>
            ) : (
              <>
                <div className="chart">
                  {(summary?.salesByDay ?? []).map((day) => (
                    <div
                      key={day.date}
                      className="chart__bar"
                      style={{ height: `${Math.max(4, (day.revenue / maxRevenue) * 100)}%` }}
                      title={`${formatDateShort(day.date)} — ${formatPrice(day.revenue)} (${day.orders} зак.)`}
                    />
                  ))}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 12,
                    fontFamily: 'var(--f-mono)',
                    fontSize: 'var(--fs-2xs)',
                    color: 'var(--c-text-muted)',
                  }}
                >
                  <span>{formatDateShort(summary!.salesByDay[0].date)}</span>
                  <span>{formatDateShort(summary!.salesByDay[summary!.salesByDay.length - 1].date)}</span>
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            <div className="panel">
              <p className="panel__title">Популярные товары</p>
              {(summary?.topProducts.length ?? 0) === 0 ? (
                <EmptyState title="Нет данных" text="Появятся после первых оплаченных заказов." />
              ) : (
                <div className="table-scroll">
                  <table className="table" style={{ minWidth: 0 }}>
                    <thead>
                      <tr>
                        <th>Товар</th>
                        <th>Продано</th>
                        <th>Выручка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(summary?.topProducts ?? []).map((row) => (
                        <tr key={row.productId}>
                          <td className="td--strong td--wrap" style={{ color: 'var(--c-cream-100)' }}>
                            {row.title}
                          </td>
                          <td className="td--mono">{row.sold}</td>
                          <td className="td--mono">{formatPrice(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="panel">
              <p className="panel__title">Популярные размеры</p>
              {(summary?.topSizes.length ?? 0) === 0 ? (
                <EmptyState title="Нет данных" />
              ) : (
                <div className="table-scroll">
                  <table className="table" style={{ minWidth: 0 }}>
                    <thead>
                      <tr>
                        <th>Размер</th>
                        <th>Продано</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(summary?.topSizes ?? []).map((row) => (
                        <tr key={row.size}>
                          <td className="td--mono td--strong" style={{ color: 'var(--c-cream-100)' }}>
                            {row.size}
                          </td>
                          <td className="td--mono">{row.sold}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
