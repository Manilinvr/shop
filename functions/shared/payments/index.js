/* ==========================================================================
   MANILI — PAYMENT PROVIDER ADAPTER (ТЗ §15)

   Единый интерфейс поверх любого эквайера:
     createPayment() / checkPayment() / refundPayment() / verifyWebhook()

   Смена провайдера = новый файл рядом и одна переменная окружения.
   Checkout и обработка webhook не меняются.

   Секреты (shopId, secretKey) читаются ТОЛЬКО из переменных окружения
   функции и никогда не покидают сервер.
   ========================================================================== */

import { PublicError } from '../errors.js'
import { createYooKassaProvider } from './yookassa.js'
import { createTBankProvider } from './tbank.js'

export function getPaymentProvider() {
  const name = (process.env.PAYMENT_PROVIDER || '').toLowerCase()

  switch (name) {
    case 'yookassa':
      return createYooKassaProvider()
    case 'tbank':
    case 'tinkoff':
      return createTBankProvider()
    default:
      throw new PublicError(
        'PAYMENT_NOT_CONFIGURED',
        'Оплата временно недоступна. Попробуйте позже.',
        `PAYMENT_PROVIDER не задан или неизвестен: "${name}"`,
      )
  }
}

export function isPaymentConfigured() {
  return Boolean(process.env.PAYMENT_PROVIDER)
}
