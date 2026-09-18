/* ==========================================================================
   MANILI — Т-Банк Эквайринг
   Документация: https://www.tbank.ru/kassa/dev/payments/
   ========================================================================== */

import crypto from 'node:crypto'
import { PublicError } from '../errors.js'

const API = 'https://securepay.tinkoff.ru/v2'

function credentials() {
  const terminalKey = process.env.PAYMENT_SHOP_ID
  const password = process.env.PAYMENT_SECRET
  if (!terminalKey || !password) {
    throw new PublicError(
      'PAYMENT_NOT_CONFIGURED',
      'Оплата временно недоступна.',
      'Нет PAYMENT_SHOP_ID / PAYMENT_SECRET',
    )
  }
  return { terminalKey, password }
}

/**
 * Подпись Token: конкатенация значений корневых полей по алфавиту + пароль,
 * затем SHA-256. Вложенные объекты в подпись не входят.
 */
function signToken(payload, password) {
  const source = { ...payload, Password: password }
  const value = Object.keys(source)
    .filter((key) => typeof source[key] !== 'object' && source[key] !== undefined)
    .sort()
    .map((key) => source[key])
    .join('')
  return crypto.createHash('sha256').update(value).digest('hex')
}

async function request(path, payload) {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result.Success === false) {
    throw new PublicError(
      'PAYMENT_ERROR',
      'Не удалось выполнить оплату. Попробуйте ещё раз.',
      `Т-Банк ${response.status}: ${result.Message || ''} ${result.Details || ''}`,
    )
  }
  return result
}

export function createTBankProvider() {
  return {
    name: 'tbank',

    async createPayment({ orderId, orderNumber, amount, method, returnUrl, email, phone }) {
      const { terminalKey, password } = credentials()
      const payload = {
        TerminalKey: terminalKey,
        Amount: amount,
        OrderId: orderId,
        Description: `Заказ ${orderNumber}`,
        SuccessURL: returnUrl,
        FailURL: returnUrl,
      }
      if (method === 'SBP') payload.PayType = 'O'
      payload.Token = signToken(payload, password)

      if (email || phone) {
        payload.DATA = { ...(email ? { Email: email } : {}), ...(phone ? { Phone: phone } : {}) }
      }

      const result = await request('/Init', payload)
      return {
        providerPaymentId: String(result.PaymentId),
        status: mapStatus(result.Status),
        confirmationUrl: result.PaymentURL ?? null,
        raw: result,
      }
    },

    async checkPayment(providerPaymentId) {
      const { terminalKey, password } = credentials()
      const payload = { TerminalKey: terminalKey, PaymentId: providerPaymentId }
      payload.Token = signToken(payload, password)
      const result = await request('/GetState', payload)
      return {
        providerPaymentId: String(result.PaymentId),
        status: mapStatus(result.Status),
        paidAmount: Number(result.Amount || 0),
        raw: result,
      }
    },

    async refundPayment({ providerPaymentId, amount }) {
      const { terminalKey, password } = credentials()
      const payload = { TerminalKey: terminalKey, PaymentId: providerPaymentId, Amount: amount }
      payload.Token = signToken(payload, password)
      const result = await request('/Cancel', payload)
      return { refundId: String(result.PaymentId), status: result.Status }
    },

    /** Т-Банк подписывает уведомление тем же Token — проверяем подпись. */
    async verifyWebhook({ body }) {
      const { password } = credentials()
      const { Token, ...rest } = body || {}
      const expected = signToken(rest, password)

      if (!Token || Token !== expected) {
        throw new PublicError('BAD_WEBHOOK', 'Некорректное уведомление.', 'Подпись Token не совпала')
      }

      return {
        providerPaymentId: String(body.PaymentId),
        orderId: body.OrderId,
        status: mapStatus(body.Status),
        paidAmount: Number(body.Amount || 0),
      }
    },
  }
}

function mapStatus(status) {
  switch (status) {
    case 'CONFIRMED': return 'PAID'
    case 'AUTHORIZED': return 'WAITING_FOR_CAPTURE'
    case 'REJECTED':
    case 'DEADLINE_EXPIRED': return 'FAILED'
    case 'CANCELED':
    case 'REVERSED': return 'CANCELLED'
    case 'REFUNDED':
    case 'PARTIAL_REFUNDED': return 'REFUNDED'
    default: return 'PENDING'
  }
}
