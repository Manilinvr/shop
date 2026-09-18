#!/usr/bin/env node
/* ==========================================================================
   MANILI — ПОДКЛЮЧЕНИЕ TELEGRAM-БОТА (ТЗ §21)

   Делает три вещи, которые иначе пришлось бы делать руками через браузер:
     1. проверяет токен и показывает имя бота;
     2. показывает chat_id — его нужно вписать в TELEGRAM_OWNER_CHAT_ID;
     3. привязывает webhook к функции, чтобы заработали кнопки под заказом.

   Запуск:
     TELEGRAM_BOT_TOKEN=... node scripts/register-telegram-webhook.mjs
     TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_URL=... \
     TELEGRAM_WEBHOOK_SECRET=... node scripts/register-telegram-webhook.mjs
   ========================================================================== */

const API = 'https://api.telegram.org'

const token = process.env.TELEGRAM_BOT_TOKEN
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL
const secret = process.env.TELEGRAM_WEBHOOK_SECRET

if (!token) {
  console.error(`
Не задан TELEGRAM_BOT_TOKEN.

Как получить:
  1. Откройте @BotFather в Telegram
  2. /newbot → придумайте имя и username
  3. Скопируйте токен вида 1234567890:AAH...
`)
  process.exit(1)
}

async function call(method, body) {
  const response = await fetch(`${API}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  const data = await response.json().catch(() => ({}))
  if (!data.ok) throw new Error(`${method}: ${data.description || response.status}`)
  return data.result
}

async function main() {
  const me = await call('getMe')
  console.log(`\nБот: @${me.username} (${me.first_name})`)

  // chat_id владельца достаём из последних сообщений боту.
  const updates = await call('getUpdates', { limit: 20 })
  const chats = new Map()
  for (const update of updates) {
    const chat = update.message?.chat ?? update.callback_query?.message?.chat
    if (chat) chats.set(String(chat.id), chat)
  }

  if (chats.size === 0) {
    console.log(`
chat_id пока не определить: бот ещё не получал сообщений.

  1. Откройте @${me.username} в Telegram
  2. Нажмите «Start» и отправьте любое сообщение
  3. Запустите эту команду снова
`)
  } else {
    console.log('\nНайденные чаты — впишите нужный в TELEGRAM_OWNER_CHAT_ID:')
    for (const [id, chat] of chats) {
      const title = chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ')
      console.log(`  ${id}  —  ${title}${chat.username ? ` (@${chat.username})` : ''}`)
    }
  }

  if (!webhookUrl) {
    console.log(`
Webhook не привязан: не задан TELEGRAM_WEBHOOK_URL.

Это адрес функции telegram-webhook из консоли Appwrite, вида:
  https://<region>.cloud.appwrite.io/v1/functions/telegram-webhook/executions

Запустите так:
  TELEGRAM_BOT_TOKEN=... \\
  TELEGRAM_WEBHOOK_URL=https://... \\
  TELEGRAM_WEBHOOK_SECRET=придумайте-строку \\
  node scripts/register-telegram-webhook.mjs
`)
    return
  }

  await call('setWebhook', {
    url: webhookUrl,
    // Секрет отсекает запросы не от Telegram (проверяется в функции).
    secret_token: secret || undefined,
    allowed_updates: ['callback_query'],
    drop_pending_updates: true,
  })

  const info = await call('getWebhookInfo')
  console.log(`
Webhook привязан:
  ${info.url}
  ожидает обновлений: ${info.pending_update_count}
  ${info.last_error_message ? `последняя ошибка: ${info.last_error_message}` : 'ошибок нет'}

Не забудьте задать в переменных функции telegram-webhook:
  TELEGRAM_BOT_TOKEN
  TELEGRAM_OWNER_CHAT_ID
  TELEGRAM_WEBHOOK_SECRET${secret ? ` = ${secret}` : ''}
`)
}

main().catch((error) => {
  console.error(`\nОшибка: ${error.message}\n`)
  process.exit(1)
})
