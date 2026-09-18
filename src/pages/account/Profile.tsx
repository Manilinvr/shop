/* ==========================================================================
   MANILI — ПРОФИЛЬ
   ========================================================================== */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input, showToast } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { formatPrice } from '@/domain/money'
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from '@/domain/order-status'
import { Badge } from '@/components/ui'
import { formatDateShort, formatPhone, isValidEmail, normalizePhone } from '@/lib/utils'
import { backend, toUserMessage } from '@/repositories'
import { useAuth } from '@/store/auth'
import '../auth.css'
import '../checkout.css'

export default function Profile() {
  const user = useAuth((state) => state.user)
  const setUser = useAuth((state) => state.setUser)

  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ? formatPhone(user.phone) : '',
      email: user.email ?? '',
    })
  }, [user])

  const orders = useAsync(() => backend.orders.listMine(), [])
  const recent = (orders.data ?? []).slice(0, 3)

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (form.email && !isValidEmail(form.email)) {
      showToast('Проверьте адрес почты.', { tone: 'error' })
      return
    }
    setSaving(true)
    try {
      const updated = await backend.auth.updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone ? normalizePhone(form.phone) : null,
        email: form.email || null,
      })
      setUser(updated)
      showToast('Профиль обновлён.', { tone: 'success' })
    } catch (error) {
      showToast(toUserMessage(error), { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <h1 className="account__panel-title">Мой профиль</h1>

      <form onSubmit={save} className="checkout-block" style={{ maxWidth: 560 }}>
        <div className="form-row form-row--2">
          <Input
            label="Имя"
            autoComplete="given-name"
            value={form.firstName}
            onChange={(event) => setForm({ ...form, firstName: event.target.value })}
          />
          <Input
            label="Фамилия"
            autoComplete="family-name"
            value={form.lastName}
            onChange={(event) => setForm({ ...form, lastName: event.target.value })}
          />
        </div>
        <div className="form-row form-row--2">
          <Input
            label="Телефон"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: formatPhone(event.target.value) })}
          />
          <Input
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </div>
        <div>
          <Button type="submit" loading={saving}>
            Сохранить
          </Button>
        </div>
      </form>

      {recent.length > 0 && (
        <div style={{ marginTop: 'var(--s-7)' }}>
          <div className="sec-head" style={{ marginBottom: 'var(--s-5)' }}>
            <h2 className="account__panel-title" style={{ fontSize: 'var(--fs-lg)' }}>
              Последние заказы
            </h2>
            <Link
              to="/account/orders"
              style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-dim)', textDecoration: 'underline' }}
            >
              Все заказы
            </Link>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {recent.map((order) => (
              <Link key={order.id} to={`/account/orders/${order.id}`} className="order-row">
                <div className="order-row__head">
                  <span className="order-row__number">{order.publicOrderNumber}</span>
                  <Badge tone={ORDER_STATUS_TONE[order.orderStatus]} dot>
                    {ORDER_STATUS_LABELS[order.orderStatus]}
                  </Badge>
                </div>
                <div className="order-row__foot" style={{ borderTop: 'none', paddingTop: 0 }}>
                  <span className="order-row__date">{formatDateShort(order.createdAt)}</span>
                  <span className="order-row__total">{formatPrice(order.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
