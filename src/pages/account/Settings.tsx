/* ==========================================================================
   MANILI — НАСТРОЙКИ УВЕДОМЛЕНИЙ (ТЗ §23, §24)
   ========================================================================== */

import { useEffect, useState } from 'react'
import { Button, Checkbox, showToast } from '@/components/ui'
import type { NotificationSettings } from '@/domain/types'
import { backend, toUserMessage } from '@/repositories'
import { useAuth } from '@/store/auth'
import '../auth.css'
import '../checkout.css'

const OPTIONS: { key: keyof NotificationSettings; label: string; hint: string }[] = [
  { key: 'email', label: 'Email о статусе заказа', hint: 'Подтверждение, отправка, доставка' },
  { key: 'sms', label: 'SMS о статусе заказа', hint: 'Короткие уведомления на телефон' },
  { key: 'telegram', label: 'Telegram', hint: 'Появится после подключения бота' },
  { key: 'marketing', label: 'Новости и дропы', hint: 'Не чаще пары писем в месяц' },
]

export default function Settings() {
  const user = useAuth((state) => state.user)
  const setUser = useAuth((state) => state.setUser)
  const logout = useAuth((state) => state.logout)

  const [settings, setSettings] = useState<NotificationSettings>({
    email: true, sms: true, telegram: false, marketing: false,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) setSettings(user.notificationSettings)
  }, [user])

  const save = async () => {
    setSaving(true)
    try {
      const updated = await backend.auth.updateProfile({ notificationSettings: settings })
      setUser(updated)
      showToast('Настройки сохранены.', { tone: 'success' })
    } catch (error) {
      showToast(toUserMessage(error), { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <h1 className="account__panel-title">Настройки</h1>

      <div className="review-block" style={{ maxWidth: 560 }}>
        <div className="review-block__head">
          <span className="review-block__title">Уведомления</span>
        </div>
        <div style={{ display: 'grid', gap: 18 }}>
          {OPTIONS.map((option) => (
            <div key={option.key}>
              <Checkbox
                checked={settings[option.key]}
                disabled={option.key === 'telegram'}
                onChange={(event) =>
                  setSettings({ ...settings, [option.key]: event.target.checked })
                }
              >
                {option.label}
              </Checkbox>
              <p
                style={{
                  marginLeft: 34,
                  marginTop: 3,
                  fontSize: 'var(--fs-xs)',
                  color: 'var(--c-text-muted)',
                }}
              >
                {option.hint}
              </p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 22 }}>
          <Button loading={saving} onClick={() => void save()}>
            Сохранить
          </Button>
        </div>
      </div>

      <div className="review-block" style={{ maxWidth: 560 }}>
        <div className="review-block__head">
          <span className="review-block__title">Аккаунт</span>
        </div>
        <div className="review-block__body" style={{ marginBottom: 16 }}>
          Чтобы удалить аккаунт и все связанные данные, напишите нам — обработаем
          запрос в течение 30 дней в соответствии с политикой конфиденциальности.
        </div>
        <Button variant="danger" size="sm" onClick={() => void logout()}>
          Выйти из аккаунта
        </Button>
      </div>
    </>
  )
}
