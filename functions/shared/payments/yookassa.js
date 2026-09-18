/* ==========================================================================
   MANILI — ЮKassa
   Документация: https://yookassa.ru/developers/api
   ========================================================================== */

import { PublicError } from '../errors.js'

const API = 'https://api.yookassa.ru/v3'

function auth() {
  const shopId = process.env.PAYMENT_SHOP_ID
  const secret = process.env.PAYMENT_SECRET
  if (!shopId || !secret) {
    throw new PublicError(
      'PAYMENT_NOT_CONFIGURED',
      'Оплата временно недоступна.',
      'Нет PAYMENT_SHOP_ID / PAYMENT_SECRET',
    )
  }
  return 'Basic ' + Buffer.from(`${shopId}:${secret}`).toString('base64')
}

async function request(path, { method = 'GET', body, idempotencyKey } = {}) {
  const headers = { Authorization: auth(), 'Content-Type': 'application/json' }
  if (idempotencyKey) headers['Idempotence-Key'] = idempotencyKey

  const response = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new PublicError(
      'PAYMENT_ERROR',
      'Не удалось выполнить оплату. Попробуйте ещё раз.',
      `ЮKassa ${response.status}: ${JSON.stringify(payload)}`,
    )
  }
  return payload
}

export function createYooKassaProvider() {
  return {
    name: 'yookassa',

    /** Сумма всегда приходит из базы, а не из браузера. */
    async createPayment({ orderId, orderNumber, amount, method, returnUrl, email, phone, items }) {
      const payload = {
        amount: { value: (amount / 100).toFixed(2), currency: 'RUB' },
        capture: true,
        confirmation: { type: 'redirect', return_url: returnUrl },
        description: `Заказ ${orderNumber}`,
        metadata: { orderId, orderNumber },
      }

      if (method === 'SBP') payload.payment_method_data = { type: 'sbp' }
      if (method === 'CARD') payload.payment_method_data = { type: 'bank_card' }

      // Чек для 54-ФЗ: заполняется, если включена онлайн-касса.
      if (process.env.PAYMENT_RECEIPTS === '1' && (email || phone)) {
        payload.receipt = {
          customer: { ...(email ? { email } : {}), ...(phone ? { phone } : {}) },
          items: items.map((item) => ({
            description: item.productTitle.slice(0, 128),
            quantity: String(item.quantity),
            amount: { value: (item.price / 100).toFixed(2), currency: 'RUB' },
            vat_code: Number(process.env.PAYMENT_VAT_CODE || 1),
            payment_mode: 'full_payment',
            payment_subject: 'commodity',
          })),
        }
      }

      const result = await request('/payments', {
        method: 'POST',
        body: payload,
        // Идемпотентность на стороне провайдера: повтор не создаст второй платёж.
        idempotencyKey: `order-${orderId}`,
      })

      return {
        providerPaymentId: result.id,
        status: mapStatus(result.status),
        confirmationUrl: result.confirmation?.confirmation_url ?? null,
        raw: result,
      }
    },

    async checkPayment(providerPaymentId) {
      const result = await request(`/payments/${providerPaymentId}`)
      return {
        providerPaymentId: result.id,
        status: mapStatus(result.status),
        paidAmount: Math.round(Number(result.amount?.value || 0) * 100),
        raw: result,
      }
    },

    async refundPayment({ providerPaymentId, amount, orderId }) {
      const result = await request('/refunds', {
        method: 'POST',
        body: {
          payment_id: providerPaymentId,
          amount: { value: (amount / 100).toFixed(2), currency: 'RUB' },
        },
        idempotencyKey: `refund-${orderId}`,
      })
      return { refundId: result.id, status: result.status }
    },

    /**
     * Проверка webhook.
     * ЮKassa не подписывает уведомления, поэтому подлинность подтверждается
     * обратным запросом к API: доверяем только тому, что вернул сам провайдер
     * (ТЗ §32 — защита от подделки webhook).
     */
    async verifyWebhook({ body }) {
      const paymentId = body?.object?.id
      if (!paymentId) {
        throw new PublicError('BAD_WEBHOOK', 'Некорректное уведомление.', JSON.stringify(body).slice(0, 400))
      }
      const verified = await this.checkPayment(paymentId)
      return {
        providerPaymentId: verified.providerPaymentId,
        orderId: body?.object?.metadata?.orderId ?? verified.raw?.metadata?.orderId ?? null,
        status: verified.status,
        paidAmount: verified.paidAmount,
      }
    },
  }
}

function mapStatus(status) {
  switch (status) {
    case 'succeeded': return 'PAID'
    case 'waiting_for_capture': return 'WAITING_FOR_CAPTURE'
    case 'canceled': return 'CANCELLED'
    case 'pending': return 'PENDING'
    default: return 'PENDING'
  }
}
