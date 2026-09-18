/* ==========================================================================
   MANILI — НАСТРОЙКИ МАГАЗИНА (ТЗ §39, §47)

   Здесь показывается состояние интеграций, но НЕ сами ключи:
   секреты живут только в переменных окружения серверных функций (ТЗ §32).
   ========================================================================== */

import { Badge, Button, showToast } from '@/components/ui'
import { config, isAppwriteConfigured, isServerApiConfigured } from '@/api/config'
import { resetDb } from '@/repositories/mock/db'
import { useAuth } from '@/store/auth'
import './admin.css'

interface IntegrationRow {
  name: string
  ready: boolean
  description: string
  envKeys: string[]
}

export default function Settings() {
  const isAdmin = useAuth((state) => state.isAdmin)

  const integrations: IntegrationRow[] = [
    {
      name: 'Appwrite (backend)',
      ready: isAppwriteConfigured(),
      description: 'Авторизация, база данных, хранилище файлов и серверные функции.',
      envKeys: ['VITE_APPWRITE_ENDPOINT', 'VITE_APPWRITE_PROJECT_ID', 'APPWRITE_API_KEY (сервер)'],
    },
    {
      name: 'Серверные функции',
      ready: isServerApiConfigured(),
      description: 'Создание заказов, платежи, webhook, уведомления.',
      envKeys: ['VITE_API_BASE_URL'],
    },
    {
      name: 'Платёжная система',
      ready: false,
      description: 'ЮKassa или Т-Банк Эквайринг. Ключи хранятся только на сервере.',
      envKeys: ['PAYMENT_PROVIDER', 'PAYMENT_SHOP_ID (сервер)', 'PAYMENT_SECRET (сервер)'],
    },
    {
      name: 'Служба доставки',
      ready: false,
      description: 'СДЭК или Яндекс Доставка: расчёт стоимости, ПВЗ, трекинг.',
      envKeys: ['DELIVERY_PROVIDER', 'DELIVERY_API_KEY (сервер)'],
    },
    {
      name: 'Telegram-уведомления',
      ready: false,
      description: 'Сообщение владельцу о новом заказе с кнопками быстрых действий.',
      envKeys: ['TELEGRAM_BOT_TOKEN (сервер)', 'TELEGRAM_OWNER_CHAT_ID (сервер)'],
    },
    {
      name: 'Email-уведомления',
      ready: false,
      description: 'Письма владельцу и покупателю о статусе заказа.',
      envKeys: ['EMAIL_API_KEY (сервер)', 'EMAIL_FROM (сервер)'],
    },
    {
      name: 'SMS-провайдер',
      ready: false,
      description: 'Коды подтверждения при входе по телефону.',
      envKeys: ['SMS_API_KEY (сервер)'],
    },
  ]

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Настройки</h1>
          <p className="admin-head__sub">
            Backend: <strong style={{ color: 'var(--c-cream-100)' }}>{config.backend}</strong>
          </p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <p className="panel__title">Интеграции</p>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Интеграция</th>
                <th>Состояние</th>
                <th className="td--wrap">Что даёт</th>
                <th className="td--wrap">Переменные окружения</th>
              </tr>
            </thead>
            <tbody>
              {integrations.map((row) => (
                <tr key={row.name}>
                  <td className="td--strong" style={{ color: 'var(--c-cream-100)' }}>
                    {row.name}
                  </td>
                  <td>
                    <Badge tone={row.ready ? 'success' : 'warning'} dot>
                      {row.ready ? 'Подключено' : 'Не подключено'}
                    </Badge>
                  </td>
                  <td className="td--wrap">{row.description}</td>
                  <td className="td--wrap td--mono" style={{ fontSize: 'var(--fs-2xs)' }}>
                    {row.envKeys.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <p className="panel__title">Контакты магазина</p>
        <div className="kv">
          <div className="kv__row">
            <span className="kv__key">Домен</span>
            <span className="kv__value kv__value--strong">{config.site.url}</span>
          </div>
          <div className="kv__row">
            <span className="kv__key">Почта поддержки</span>
            <span className="kv__value">{config.site.supportEmail}</span>
          </div>
          <div className="kv__row">
            <span className="kv__key">Телефон</span>
            <span className="kv__value">{config.site.supportPhone}</span>
          </div>
        </div>
        <p className="admin-note" style={{ marginTop: 16 }}>
          Эти значения задаются переменными окружения при сборке
          (<code>VITE_SITE_URL</code>, <code>VITE_SUPPORT_EMAIL</code>, <code>VITE_SUPPORT_PHONE</code>)
          и одинаковы на всём сайте.
        </p>
      </div>

      <div className="panel">
        <p className="panel__title">Безопасность</p>
        <p className="admin-note">
          <strong>Секретные ключи никогда не попадают в браузер.</strong> Токен Telegram-бота,
          ключи платёжной системы, доставки и почты хранятся только в переменных окружения
          серверных функций. В репозитории лежит <code>.env.example</code> без реальных значений.
        </p>
      </div>

      {config.backend === 'mock' && isAdmin() && (
        <div className="panel">
          <p className="panel__title">Демо-данные</p>
          <p className="admin-note" style={{ marginBottom: 16 }}>
            Сейчас магазин работает на локальных демо-данных в браузере. Сброс вернёт
            каталог, заказы и остатки к исходному состоянию.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              resetDb()
              showToast('Демо-данные сброшены. Обновите страницу.', { tone: 'success' })
            }}
          >
            Сбросить демо-данные
          </Button>
        </div>
      )}
    </>
  )
}
