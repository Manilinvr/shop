/* ==========================================================================
   MANILI — АДРЕСА ДОСТАВКИ (ТЗ §24)
   ========================================================================== */

import { useState } from 'react'
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  IconButton,
  IconEdit,
  IconPlus,
  IconTrash,
  Input,
  Modal,
  Spinner,
  showToast,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import type { Address } from '@/domain/types'
import { backend, toUserMessage } from '@/repositories'
import '../auth.css'
import '../checkout.css'

const EMPTY = {
  label: '', city: '', street: '', house: '',
  apartment: '', postalCode: '', comment: '', isDefault: false,
}

export default function Addresses() {
  const addresses = useAsync(() => backend.auth.listAddresses(), [])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Address | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setModalOpen(true)
  }

  const openEdit = (address: Address) => {
    setEditing(address)
    setForm({
      label: address.label ?? '',
      city: address.city,
      street: address.street,
      house: address.house,
      apartment: address.apartment ?? '',
      postalCode: address.postalCode ?? '',
      comment: address.comment ?? '',
      isDefault: address.isDefault,
    })
    setModalOpen(true)
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.city.trim() || !form.street.trim() || !form.house.trim()) {
      showToast('Заполните город, улицу и дом.', { tone: 'error' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        label: form.label || null,
        city: form.city,
        street: form.street,
        house: form.house,
        apartment: form.apartment || null,
        postalCode: form.postalCode || null,
        comment: form.comment || null,
        isDefault: form.isDefault,
      }
      if (editing) await backend.auth.updateAddress(editing.id, payload)
      else await backend.auth.createAddress(payload)

      setModalOpen(false)
      addresses.reload()
      showToast(editing ? 'Адрес обновлён.' : 'Адрес добавлен.', { tone: 'success' })
    } catch (error) {
      showToast(toUserMessage(error), { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (address: Address) => {
    try {
      await backend.auth.deleteAddress(address.id)
      addresses.reload()
      showToast('Адрес удалён.')
    } catch (error) {
      showToast(toUserMessage(error), { tone: 'error' })
    }
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <h1 className="account__panel-title">Адреса доставки</h1>
        <Button size="sm" iconLeft={<IconPlus size={15} />} onClick={openCreate}>
          Добавить адрес
        </Button>
      </div>

      {addresses.loading && <Spinner center />}

      {!addresses.loading && (addresses.data?.length ?? 0) === 0 && (
        <EmptyState
          title="Адресов пока нет"
          text="Сохраните адрес — при следующем заказе он подставится автоматически."
          action={<Button onClick={openCreate}>Добавить адрес</Button>}
        />
      )}

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {(addresses.data ?? []).map((address) => (
          <div key={address.id} className="address-card">
            <div className="address-card__head">
              <span className="address-card__label">{address.label || 'Адрес'}</span>
              {address.isDefault && <Badge tone="outline">По умолчанию</Badge>}
            </div>
            <p className="address-card__text">
              {address.city}, {address.street}, д. {address.house}
              {address.apartment ? `, кв. ${address.apartment}` : ''}
              {address.postalCode ? `, ${address.postalCode}` : ''}
            </p>
            {address.comment && (
              <p className="address-card__text" style={{ color: 'var(--c-text-muted)' }}>
                {address.comment}
              </p>
            )}
            <div className="address-card__actions">
              <IconButton label="Редактировать" size="sm" onClick={() => openEdit(address)}>
                <IconEdit size={16} />
              </IconButton>
              <IconButton label="Удалить" size="sm" onClick={() => void remove(address)}>
                <IconTrash size={16} />
              </IconButton>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Изменить адрес' : 'Новый адрес'}
      >
        <form onSubmit={save} className="checkout-block">
          <Input
            label="Название"
            placeholder="Дом, работа…"
            value={form.label}
            onChange={(event) => setForm({ ...form, label: event.target.value })}
          />
          <Input
            label="Город"
            value={form.city}
            onChange={(event) => setForm({ ...form, city: event.target.value })}
          />
          <Input
            label="Улица"
            value={form.street}
            onChange={(event) => setForm({ ...form, street: event.target.value })}
          />
          <div className="form-row form-row--3">
            <Input
              label="Дом"
              value={form.house}
              onChange={(event) => setForm({ ...form, house: event.target.value })}
            />
            <Input
              label="Квартира"
              value={form.apartment}
              onChange={(event) => setForm({ ...form, apartment: event.target.value })}
            />
            <Input
              label="Индекс"
              inputMode="numeric"
              value={form.postalCode}
              onChange={(event) => setForm({ ...form, postalCode: event.target.value })}
            />
          </div>
          <Checkbox
            checked={form.isDefault}
            onChange={(event) => setForm({ ...form, isDefault: event.target.checked })}
          >
            Использовать по умолчанию
          </Checkbox>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button type="submit" loading={saving}>
              Сохранить
            </Button>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
