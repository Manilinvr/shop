#!/usr/bin/env node
/* ==========================================================================
   MANILI — ЗАЩИТА ОТ СЕКРЕТА В ПУБЛИЧНОЙ ПЕРЕМЕННОЙ (ТЗ §32, §47)

   Всё, что начинается на VITE_, Vite вшивает в скрипты сайта. Сайт открыт
   всем, значит и значение открыто всем. Плюс GitHub печатает Variables
   в журнале сборки как есть — в отличие от Secrets, которые маскирует.

   Поэтому секрет, случайно положенный в Variables вместо Secrets, утекает
   сразу в двух местах. Ошибиться легко: поля в интерфейсе GitHub выглядят
   одинаково, а имена переменных длинные и похожие.

   Скрипт смотрит на значения VITE_* перед сборкой и останавливает её,
   если значение похоже на ключ. Лучше красный деплой, чем ключ в интернете.

   Запуск:  node scripts/check-public-env.mjs
   ========================================================================== */

/** Форма значения → что это, скорее всего. Проверяем форму, не содержимое. */
const SECRET_SHAPES = [
  { test: /^standard_[0-9a-f]{40,}$/i, what: 'API-ключ Appwrite' },
  { test: /^(sk|rk)_(live|test)_[A-Za-z0-9]{16,}$/, what: 'секретный ключ платёжной системы' },
  { test: /^(ghp|gho|ghs|ghr)_[A-Za-z0-9]{30,}$/, what: 'токен GitHub' },
  { test: /^github_pat_[A-Za-z0-9_]{30,}$/, what: 'токен GitHub' },
  { test: /^\d{6,12}:[A-Za-z0-9_-]{30,}$/, what: 'токен Telegram-бота' },
  { test: /^[0-9a-f]{40,}$/i, what: 'ключ или токен' },
  { test: /^[A-Za-z0-9+/]{60,}={0,2}$/, what: 'ключ или токен' },
]

/** Переменные, которые обязаны быть адресом. Ключ на адрес не похож. */
const MUST_BE_URL = ['VITE_APPWRITE_ENDPOINT', 'VITE_API_BASE_URL', 'VITE_SITE_URL']

const problems = []

for (const [name, value] of Object.entries(process.env)) {
  if (!name.startsWith('VITE_') || !value) continue

  const shape = SECRET_SHAPES.find((s) => s.test.test(value.trim()))
  if (shape) {
    problems.push(
      `${name} похоже на ${shape.what}.\n` +
      `    Секретам место в Secrets, а не в Variables: Variables видны всем\n` +
      `    и попадают в скрипты сайта, который открыт любому посетителю.`,
    )
    continue
  }

  if (MUST_BE_URL.includes(name)) {
    let ok = false
    try {
      ok = ['http:', 'https:'].includes(new URL(value.trim()).protocol)
    } catch {
      ok = false
    }
    if (!ok) {
      problems.push(
        `${name} должно быть адресом вида https://..., а там «${preview(value)}».\n` +
        `    Скорее всего сюда вставлено не то значение.`,
      )
    }
  }
}

/** Показываем огрызок: вдруг это всё-таки секрет, не печатать же его целиком. */
function preview(value) {
  const trimmed = value.trim()
  return trimmed.length > 16 ? `${trimmed.slice(0, 8)}…${trimmed.slice(-4)}` : trimmed
}

if (problems.length > 0) {
  console.error('\nСборка остановлена: публичная переменная содержит не то.\n')
  problems.forEach((p, i) => console.error(`  ${i + 1}. ${p}\n`))
  console.error(
    'Исправить: Settings → Secrets and variables → Actions.\n' +
    'Если секрет уже побывал в Variables — считайте его скомпрометированным\n' +
    'и выпустите новый: журналы запусков остаются доступными.\n',
  )
  process.exit(1)
}

console.log('Публичные переменные проверены: секретов среди них нет.')
