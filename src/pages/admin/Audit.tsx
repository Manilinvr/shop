/* ==========================================================================
   MANILI — ЖУРНАЛ ДЕЙСТВИЙ (ТЗ §32, §42)
   ========================================================================== */

import { EmptyState, Skeleton } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { formatDateTime } from '@/lib/utils'
import { backend } from '@/repositories'
import './admin.css'

const ACTION_LABELS: Record<string, string> = {
  'product.create': 'Создан товар',
  'product.update': 'Изменён товар',
  'product.delete': 'Удалён товар',
  'stock.update': 'Изменён остаток',
  'category.create': 'Создана категория',
  'category.update': 'Изменена категория',
  'category.delete': 'Удалена категория',
  'collection.create': 'Создана коллекция',
  'collection.update': 'Изменена коллекция',
  'collection.delete': 'Удалена коллекция',
  'order.status': 'Изменён статус заказа',
  'promocode.create': 'Создан промокод',
  'promocode.update': 'Изменён промокод',
  'promocode.delete': 'Удалён промокод',
  'customer.role': 'Изменена роль клиента',
  'homepage.update': 'Изменён блок главной',
  'homepage.reorder': 'Изменён порядок блоков',
  'homepage.toggle': 'Блок скрыт/показан',
}

export default function Audit() {
  const log = useAsync(() => backend.audit.list(1, 100), [])
  const items = log.data?.items ?? []

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Журнал действий</h1>
          <p className="admin-head__sub">Кто и что менял в админке</p>
        </div>
      </div>

      {log.loading ? (
        <Skeleton style={{ height: 300, borderRadius: 'var(--r-lg)' }} />
      ) : items.length === 0 ? (
        <div className="table-wrap">
          <EmptyState
            title="Записей пока нет"
            text="Здесь будут все изменения товаров, заказов, промокодов и контента."
          />
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Время</th>
                  <th>Кто</th>
                  <th>Действие</th>
                  <th>Объект</th>
                </tr>
              </thead>
              <tbody>
                {items.map((entry) => (
                  <tr key={entry.id}>
                    <td className="td--mono">{formatDateTime(entry.createdAt)}</td>
                    <td className="td--strong" style={{ color: 'var(--c-cream-100)' }}>
                      {entry.actorName}
                    </td>
                    <td>{ACTION_LABELS[entry.action] ?? entry.action}</td>
                    <td className="td--mono">{entry.entityId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="admin-note" style={{ marginTop: 20 }}>
        В журнал не попадают пароли, платёжные данные и секретные ключи — только факт
        и объект изменения (ТЗ §42).
      </div>
    </>
  )
}
