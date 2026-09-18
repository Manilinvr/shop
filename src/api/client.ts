/* ==========================================================================
   MANILI — HTTP-КЛИЕНТ СЕРВЕРНЫХ ФУНКЦИЙ
   Единственный способ, которым фронт разговаривает с сервером напрямую
   (помимо Appwrite SDK). Секретов не передаёт и не хранит.
   ========================================================================== */

import { AppError } from '@/repositories/contracts'
import { config, isServerApiConfigured } from './config'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Ключ идемпотентности для операций, которые нельзя выполнять дважды. */
  idempotencyKey?: string
  signal?: AbortSignal
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!isServerApiConfigured()) {
    throw new AppError(
      'API_NOT_CONFIGURED',
      'Сервис временно недоступен. Попробуйте позже.',
      'VITE_API_BASE_URL не задан — серверные функции не подключены.',
    )
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey

  let response: Response
  try {
    response = await fetch(`${config.apiBaseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: 'include',
      signal: options.signal,
    })
  } catch (cause) {
    throw new AppError(
      'NETWORK',
      'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.',
      String(cause),
    )
  }

  if (!response.ok) {
    // Сервер возвращает { code, message } — техническую детализацию наружу не выносим (ТЗ §41).
    const payload = await response.json().catch(() => null)
    throw new AppError(
      payload?.code ?? `HTTP_${response.status}`,
      payload?.message ?? 'Не удалось выполнить операцию. Попробуйте ещё раз.',
      `${response.status} ${response.statusText}`,
    )
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
