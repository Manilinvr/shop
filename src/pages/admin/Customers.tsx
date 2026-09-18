/* ==========================================================================
   MANILI — КЛИЕНТЫ (ТЗ §25, §39)
   ========================================================================== */

import { useState } from 'react'
import { Badge, EmptyState, Select, Skeleton, showToast } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { formatPrice } from '@/domain/money'
import { ROLES } from '@/domain/types'
import type { Role } from '@/domain/types'
import { debounce, formatDateShort, formatPhone, pluralWithCount } from '@/lib/utils'
import { backend, toUserMessage } from '@/repositories'
import { useAuth } from '@/store/auth'
import './admin.css'

const ROLE_LABELS: Record<Role, string> = {
  CUSTOMER: 'Покупатель',
  MANAGER: 'Менеджер',
  ADMIN: 'Администратор',
}

export default function Customers() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const isAdmin = useAuth((state) => state.isAdmin)

  const customers = useAsync(
    () => backend.customersAdmin.list(query || undefined, 1, 50),
    [query],
  )

  const applySearch = debounce((value: string) => setQuery(value), 260)
  const items = customers.data?.items ?? []

  const changeRole = async (id: string, role: Role) => {
    try {
      await backend.customersAdmin.setRole(id, role)
      customers.reload()
      showToast(`Роль изменена: ${ROLE_LABELS[role]}`, { tone: 'success' })
    } catch (error) {
      showToast(toUserMessage(error), { tone: 'error' })
    }
  }

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Клиенты</h1>
          <p className="admin-head__sub">
            {customers.data
              ? pluralWithCount(customers.data.total, ['клиент', 'клиента', 'клиентов'])
              : 'Загружаем…'}
          </p>
        </div>
      </div>

      <div className="admin-filters">
        <input
          className="admin-search"
          type="search"
          placeholder="Имя, телефон или email"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            applySearch(event.target.value)
          }}
          aria-label="Поиск по клиентам"
        />
      </div>

      {customers.loading && items.length === 0 ? (
        <Skeleton style={{ height: 280, borderRadius: 'var(--r-lg)' }} />
      ) : items.length === 0 ? (
        <div className="table-wrap">
          <EmptyState title="Клиентов не найдено" />
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Имя</th>
                  <th>Телефон</th>
                  <th>Email</th>
                  <th>Заказов</th>
                  <th>Сумма</th>
                  <th>Последний</th>
                  <th>Регистрация</th>
                  <th>Роль</th>
                </tr>
              </thead>
              <tbody>
                {items.map((customer) => (
                  <tr key={customer.id}>
                    <td className="td--strong" style={{ color: 'var(--c-cream-100)' }}>
                      {[customer.firstName, customer.lastName].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="td--mono">
                      {customer.phone ? formatPhone(customer.phone) : '—'}
                    </td>
                    <td>{customer.email ?? '—'}</td>
                    <td className="td--mono">{customer.ordersCount}</td>
                    <td className="td--mono td--strong" style={{ color: 'var(--c-cream-100)' }}>
                      {formatPrice(customer.totalSpent)}
                    </td>
                    <td className="td--mono">
                      {customer.lastOrderAt ? formatDateShort(customer.lastOrderAt) : '—'}
                    </td>
                    <td className="td--mono">{formatDateShort(customer.createdAt)}</td>
                    <td>
                      {isAdmin() ? (
                        <Select
                          value={customer.role}
                          onChange={(event) => void changeRole(customer.id, event.target.value as Role)}
                          className="admin-select"
                          aria-label={`Роль для ${customer.firstName}`}
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Badge tone={customer.role === 'CUSTOMER' ? 'neutral' : 'info'}>
                          {ROLE_LABELS[customer.role]}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="admin-note" style={{ marginTop: 20 }}>
        <strong>Роли проверяются на сервере.</strong> Изменение роли здесь — это запрос к серверу;
        подделать права через браузер нельзя.
      </div>
    </>
  )
}
