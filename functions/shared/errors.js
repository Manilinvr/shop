/* ==========================================================================
   MANILI — ОШИБКИ СЕРВЕРНЫХ ФУНКЦИЙ (ТЗ §41)
   Наружу уходит только понятное человеку сообщение. Технические детали
   пишутся в лог функции и клиенту не показываются.
   ========================================================================== */

export class PublicError extends Error {
  constructor(code, userMessage, technical) {
    super(technical || userMessage)
    this.name = 'PublicError'
    this.code = code
    this.userMessage = userMessage
  }
}

export const ok = (data) => ({ ok: true, data })

export function fail(error, log) {
  if (error instanceof PublicError) {
    log?.(`[${error.code}] ${error.message}`)
    return { ok: false, code: error.code, message: error.userMessage }
  }
  // Неожиданная ошибка: наружу — обобщённый текст, в лог — всё.
  log?.(`[UNEXPECTED] ${error?.stack || error}`)
  return {
    ok: false,
    code: 'INTERNAL',
    message: 'Не удалось выполнить операцию. Попробуйте ещё раз.',
  }
}

/** Разбор тела запроса функции Appwrite. */
export function parseBody(req) {
  if (req.bodyJson && typeof req.bodyJson === 'object') return req.bodyJson
  if (!req.body) return {}
  if (typeof req.body === 'object') return req.body
  try {
    return JSON.parse(req.body)
  } catch {
    throw new PublicError('BAD_REQUEST', 'Некорректный запрос.')
  }
}
