/* ==========================================================================
   MANILI — УТИЛИТЫ
   ========================================================================== */

/** Условные классы без внешних зависимостей. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function uid(prefix = 'id'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${rand}`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function slugify(input: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  }
  return input
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Дата в человеческом виде: «12 апреля 2026». */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(iso))
}

/** Короткая дата: «12.04.2026». */
export function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(iso))
}

/** Время: «09:41». */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return `${formatDateShort(iso)}, ${formatTime(iso)}`
}

/**
 * Приводит любой ввод к каноническому виду 7XXXXXXXXXX (11 цифр).
 * Учитывает три способа набора: «+7 999…», «8 999…» и просто «999…» —
 * в последнем случае код страны подставляется, а не съедается первая цифра.
 */
function toCanonicalDigits(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`
  else if (digits.length > 0 && !digits.startsWith('7')) digits = `7${digits}`
  return digits.slice(0, 11)
}

/** Маска телефона: +7 999 123-45-67 */
export function formatPhone(raw: string): string {
  const digits = toCanonicalDigits(raw)
  if (digits.length === 0) return ''

  const a = digits.slice(1, 4)
  const b = digits.slice(4, 7)
  const c = digits.slice(7, 9)
  const d = digits.slice(9, 11)

  let out = '+7'
  if (a) out += ` ${a}`
  if (b) out += ` ${b}`
  if (c) out += `-${c}`
  if (d) out += `-${d}`
  return out
}

/** Канонический вид для отправки на сервер: +7XXXXXXXXXX. */
export function normalizePhone(raw: string): string {
  const digits = toCanonicalDigits(raw)
  return digits.length === 11 ? `+${digits}` : raw
}

export function isValidPhone(raw: string): boolean {
  return /^7\d{10}$/.test(toCanonicalDigits(raw))
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim())
}

/** Склонение: 1 товар, 2 товара, 5 товаров. */
export function plural(count: number, forms: [string, string, string]): string {
  const n = Math.abs(count) % 100
  const n1 = n % 10
  if (n > 10 && n < 20) return forms[2]
  if (n1 > 1 && n1 < 5) return forms[1]
  if (n1 === 1) return forms[0]
  return forms[2]
}

export function pluralWithCount(count: number, forms: [string, string, string]): string {
  return `${count} ${plural(count, forms)}`
}

/** debounce для поиска и фильтров. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: A) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

/** Разбивка массива на группы — для сеток и каруселей. */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}
