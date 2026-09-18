/* ==========================================================================
   MANILI — ПРОМОКОДЫ НА СЕРВЕРЕ (ТЗ §13)
   Скидку, присланную браузером, никогда не принимаем: считаем сами.
   ========================================================================== */

import { DB_ID, Query, db } from './appwrite.js'
import { COLLECTIONS } from './constants.js'

const invalid = (code, reason) => ({ valid: false, code, discount: 0, freeDelivery: false, reason })

export async function evaluatePromocode(rawCode, subtotal) {
  const code = String(rawCode || '').trim().toUpperCase()
  if (!code) return invalid(code, 'Введите промокод.')

  const res = await db().listDocuments(DB_ID, COLLECTIONS.promocodes, [
    Query.equal('code', code),
    Query.limit(1),
  ])
  const promo = res.documents[0]

  if (!promo || !promo.isActive) {
    return invalid(code, 'Промокод не найден или больше не действует.')
  }

  const now = Date.now()
  if (promo.startsAt && now < Date.parse(promo.startsAt)) {
    return invalid(code, 'Промокод ещё не активирован.')
  }
  if (promo.expiresAt && now > Date.parse(promo.expiresAt)) {
    return invalid(code, 'Срок действия промокода истёк.')
  }
  if (promo.usageLimit !== null && promo.usageLimit !== undefined && promo.usageCount >= promo.usageLimit) {
    return invalid(code, 'Промокод исчерпан.')
  }
  if (promo.minOrderTotal && subtotal < promo.minOrderTotal) {
    const need = Math.ceil((promo.minOrderTotal - subtotal) / 100)
    return invalid(code, `Промокод действует от ${Math.ceil(promo.minOrderTotal / 100)} ₽. Добавьте ещё на ${need} ₽.`)
  }

  if (promo.discountType === 'FREE_DELIVERY') {
    return { valid: true, code: promo.code, discount: 0, freeDelivery: true, promoId: promo.$id }
  }

  const discount =
    promo.discountType === 'PERCENT'
      ? Math.floor((subtotal * promo.discountValue) / 100)
      : Math.min(promo.discountValue, subtotal)

  return { valid: true, code: promo.code, discount, freeDelivery: false, promoId: promo.$id }
}

/** Отмечает использование промокода после успешного создания заказа. */
export async function markPromocodeUsed(promoId, orderId, userId) {
  if (!promoId) return
  try {
    const promo = await db().getDocument(DB_ID, COLLECTIONS.promocodes, promoId)
    await db().updateDocument(DB_ID, COLLECTIONS.promocodes, promoId, {
      usageCount: (promo.usageCount ?? 0) + 1,
    })
    await db().createDocument(DB_ID, COLLECTIONS.promocodeUsages, 'unique()', {
      promocodeId: promoId,
      orderId,
      userId: userId ?? null,
    })
  } catch {
    // Учёт использований не должен ломать оформление заказа.
  }
}
