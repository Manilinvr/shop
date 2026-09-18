/* ==========================================================================
   MANILI — СЕРВЕРНЫЙ КЛИЕНТ APPWRITE

   APPWRITE_API_KEY существует ТОЛЬКО здесь, в переменных окружения функции.
   Он никогда не попадает во фронтенд и в репозиторий (ТЗ §32, §47).
   ========================================================================== */

import { Client, Databases, Users, ID, Query } from 'node-appwrite'
import { PublicError } from './errors.js'

export { ID, Query }

export const DB_ID = process.env.APPWRITE_DATABASE_ID || 'manili'

/** Клиент с правами администратора — для внутренних операций функции. */
export function adminClient() {
  const endpoint = process.env.APPWRITE_ENDPOINT
  const project = process.env.APPWRITE_PROJECT_ID
  const key = process.env.APPWRITE_API_KEY

  if (!endpoint || !project || !key) {
    throw new PublicError(
      'CONFIG',
      'Сервис временно недоступен.',
      'Не заданы APPWRITE_ENDPOINT / APPWRITE_PROJECT_ID / APPWRITE_API_KEY.',
    )
  }

  return new Client().setEndpoint(endpoint).setProject(project).setKey(key)
}

/** Клиент от имени вызывающего пользователя — чтобы узнать, кто он. */
export function userClient(jwt) {
  return new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setJWT(jwt)
}

export const db = () => new Databases(adminClient())
export const users = () => new Users(adminClient())

/**
 * Кто вызвал функцию. Appwrite передаёт id пользователя в заголовке,
 * который подставляет сам сервер — подделать его из браузера нельзя.
 */
export function callerUserId(req) {
  return req.headers?.['x-appwrite-user-id'] || null
}

/**
 * Проверка прав (ТЗ §25). Роль берётся из базы, а не из запроса:
 * значение, присланное клиентом, не имеет силы.
 */
export async function requireRole(req, allowedRoles) {
  const userId = callerUserId(req)
  if (!userId) {
    throw new PublicError('UNAUTHORIZED', 'Нужно войти в аккаунт.')
  }
  let profile
  try {
    profile = await db().getDocument(DB_ID, 'profiles', userId)
  } catch {
    throw new PublicError('FORBIDDEN', 'Недостаточно прав.')
  }
  if (!allowedRoles.includes(profile.role)) {
    throw new PublicError('FORBIDDEN', 'Недостаточно прав.', `role=${profile.role}`)
  }
  return { userId, profile }
}
