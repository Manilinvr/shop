/* ==========================================================================
   MANILI — ПРОМОКОДЫ (ТЗ §13)
   ========================================================================== */

import { useState } from 'react'
import {
  Badge,
  Button,
  IconButton,
  IconEdit,
  IconPlus,
  IconTrash,
  Input,
  Modal,
  Select,
  Spinner,
  showToast,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { formatPrice, kopecksToRubles, rublesToKopecks } from '@/domain/money'
import { DISCOUNT_TYPES } from '@/domain/types'
import type { DiscountType, Promocode } from '@/domain/types'
import { formatDateShort } from '@/lib/utils'
import { backend, toUserMessage } from '@/repositories'
import './admin.css'
import '../checkout.css'

const TYPE_LABELS: Record<DiscountType, string> = {
  PERCENT: 'Процент',
  FIXED: 'Фиксированная сумма',
  FREE_DELIVERY: 'Бесплатная доставка',
}

const EMPTY = {
  code: '', discountType: 'PERCENT' as DiscountType, discountValue: '10',
  minOrderTotal: '', expiresAt: '', usageLimit: '', isActive: true,
}

export default function Promocodes() {
  const promocodes = useAsync(() => backend.promocodesAdmin.list(), [])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Promocode | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.code.trim()) {
      showToast('Укажите код.', { tone: 'error' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue:
          form.discountType === 'FIXED'
            ? rublesToKopecks(Number(form.discountValue))
            : Number(form.discountValue),
        minOrderTotal: form.minOrderTotal ? rublesToKopecks(Number(form.minOrderTotal)) : null,
        startsAt: null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        isActive: form.isActive,
      }
      if (editing) await backend.promocodesAdmin.update(editing.id, payload)
      else await backend.promocodesAdmin.create(payload)
      setModalOpen(false)
      promocodes.reload()
      showToast(editing ? 'Промокод обновлён.' : 'Промокод создан.', { tone: 'success' })
    } catch (error) {
      showToast(toUserMessage(error), { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Промокоды</h1>
          <p className="admin-head__sub">Скидка всегда пересчитывается на сервере</p>
        </div>
        <div className="admin-head__actions">
          <Button
            size="sm"
            iconLeft={<IconPlus size={15} />}
            onClick={() => {
              setEditing(null)
              setForm(EMPTY)
              setModalOpen(true)
            }}
          >
            Новый промокод
          </Button>
        </div>
      </div>

      {promocodes.loading && <Spinner center />}

      <div className="table-wrap">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Код</th>
                <th>Тип</th>
                <th>Скидка</th>
                <th>Мин. заказ</th>
                <th>Использовано</th>
                <th>Действует до</th>
                <th>Статус</th>
                <th style={{ textAlign: 'right' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {(promocodes.data ?? []).map((promo) => (
                <tr key={promo.id}>
                  <td className="td--mono td--strong" style={{ color: 'var(--c-cream-100)' }}>
                    {promo.code}
                  </td>
                  <td>{TYPE_LABELS[promo.discountType]}</td>
                  <td className="td--mono">
                    {promo.discountType === 'PERCENT'
                      ? `${promo.discountValue}%`
                      : promo.discountType === 'FIXED'
                        ? formatPrice(promo.discountValue)
                        : '—'}
                  </td>
                  <td className="td--mono">
                    {promo.minOrderTotal ? formatPrice(promo.minOrderTotal) : '—'}
                  </td>
                  <td className="td--mono">
                    {promo.usageCount}
                    {promo.usageLimit ? ` / ${promo.usageLimit}` : ''}
                  </td>
                  <td className="td--mono">
                    {promo.expiresAt ? formatDateShort(promo.expiresAt) : 'бессрочно'}
                  </td>
                  <td>
                    <Badge tone={promo.isActive ? 'success' : 'neutral'} dot>
                      {promo.isActive ? 'Активен' : 'Выключен'}
                    </Badge>
                  </td>
                  <td>
                    <div className="table__actions">
                      <IconButton
                        label="Изменить"
                        size="sm"
                        onClick={() => {
                          setEditing(promo)
                          setForm({
                            code: promo.code,
                            discountType: promo.discountType,
                            discountValue: String(
                              promo.discountType === 'FIXED'
                                ? kopecksToRubles(promo.discountValue)
                                : promo.discountValue,
                            ),
                            minOrderTotal: promo.minOrderTotal
                              ? String(kopecksToRubles(promo.minOrderTotal))
                              : '',
                            expiresAt: promo.expiresAt ? promo.expiresAt.slice(0, 10) : '',
                            usageLimit: promo.usageLimit ? String(promo.usageLimit) : '',
                            isActive: promo.isActive,
                          })
                          setModalOpen(true)
                        }}
                      >
                        <IconEdit size={16} />
                      </IconButton>
                      <IconButton
                        label="Удалить"
                        size="sm"
                        onClick={async () => {
                          await backend.promocodesAdmin.delete(promo.id)
                          promocodes.reload()
                          showToast('Промокод удалён.')
                        }}
                      >
                        <IconTrash size={16} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Изменить промокод' : 'Новый промокод'}
      >
        <form onSubmit={save} className="checkout-block">
          <Input
            label="Код"
            value={form.code}
            placeholder="WELCOME10"
            onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
          />
          <Select
            label="Тип скидки"
            value={form.discountType}
            onChange={(event) =>
              setForm({ ...form, discountType: event.target.value as DiscountType })
            }
          >
            {DISCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
          {form.discountType !== 'FREE_DELIVERY' && (
            <Input
              label={form.discountType === 'PERCENT' ? 'Скидка, %' : 'Скидка, ₽'}
              type="number"
              inputMode="numeric"
              value={form.discountValue}
              onChange={(event) => setForm({ ...form, discountValue: event.target.value })}
            />
          )}
          <Input
            label="Минимальная сумма заказа, ₽"
            type="number"
            inputMode="numeric"
            value={form.minOrderTotal}
            hint="Оставьте пустым, если ограничения нет"
            onChange={(event) => setForm({ ...form, minOrderTotal: event.target.value })}
          />
          <Input
            label="Действует до"
            type="date"
            value={form.expiresAt}
            onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}
          />
          <Input
            label="Лимит использований"
            type="number"
            inputMode="numeric"
            value={form.usageLimit}
            hint="Оставьте пустым для безлимитного"
            onChange={(event) => setForm({ ...form, usageLimit: event.target.value })}
          />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Button
              type="button"
              size="sm"
              variant={form.isActive ? 'primary' : 'secondary'}
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
            >
              {form.isActive ? 'Активен' : 'Выключен'}
            </Button>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button type="submit" loading={saving}>Сохранить</Button>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Отмена</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
