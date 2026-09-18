/* ==========================================================================
   MANILI — ДОСТАВКА (ТЗ §16)
   Расчёт стоимости, список ПВЗ, подсказка городов и трекинг.
   Ключ API службы доставки живёт только здесь.
   ========================================================================== */

import { DB_ID, Query, db } from '../../shared/appwrite.js'
import { COLLECTIONS } from '../../shared/constants.js'
import { PublicError, fail, ok, parseBody } from '../../shared/errors.js'
import { getDeliveryProvider } from '../../shared/delivery/index.js'

export default async ({ req, res, log, error }) => {
  try {
    const body = parseBody(req)
    const provider = getDeliveryProvider()

    switch (body.action) {
      case 'options': {
        // Сумму корзины пересчитываем по базе: от неё зависит бесплатная доставка.
        const subtotal = await recalcSubtotal(body.items)
        return res.json(ok(await provider.quote({ city: body.city, items: body.items ?? [], subtotal })))
      }
      case 'pickup-points':
        return res.json(ok(await provider.pickupPoints(body.city, body.provider)))
      case 'cities':
        return res.json(ok(await provider.suggestCities(body.query)))
      case 'tracking':
        return res.json(ok(await track(body.orderId, provider)))
      default:
        throw new PublicError('BAD_REQUEST', 'Некорректный запрос.')
    }
  } catch (e) {
    error(String(e?.stack || e))
    return res.json(fail(e, log))
  }
}

/** Сумма корзины по ценам из базы — присланной клиентом не доверяем. */
async function recalcSubtotal(items) {
  if (!Array.isArray(items) || items.length === 0) return 0

  const variantIds = items.map((i) => i.variantId).filter(Boolean)
  if (variantIds.length === 0) return 0

  const variantsRes = await db().listDocuments(DB_ID, COLLECTIONS.productVariants, [
    Query.equal('$id', variantIds),
    Query.limit(variantIds.length),
  ])
  const variantById = new Map(variantsRes.documents.map((v) => [v.$id, v]))

  const productIds = [...new Set(variantsRes.documents.map((v) => v.productId))]
  if (productIds.length === 0) return 0

  const productsRes = await db().listDocuments(DB_ID, COLLECTIONS.products, [
    Query.equal('$id', productIds),
    Query.limit(productIds.length),
  ])
  const productById = new Map(productsRes.documents.map((p) => [p.$id, p]))

  return items.reduce((sum, item) => {
    const variant = variantById.get(item.variantId)
    const product = variant && productById.get(variant.productId)
    if (!product) return sum
    const price = (product.price ?? 0) + (variant.priceModifier ?? 0)
    return sum + price * Math.max(0, Number(item.quantity) || 0)
  }, 0)
}

async function track(orderId, provider) {
  if (!orderId) throw new PublicError('BAD_REQUEST', 'Не указан заказ.')
  const order = await db().getDocument(DB_ID, COLLECTIONS.orders, orderId)

  if (!order.deliveryId) {
    // Отправление ещё не создано — показываем историю статусов заказа.
    const history = await db().listDocuments(DB_ID, COLLECTIONS.orderStatusHistory, [
      Query.equal('orderId', orderId),
      Query.equal('field', 'orderStatus'),
      Query.orderAsc('$createdAt'),
      Query.limit(50),
    ])
    return {
      status: order.deliveryStatus,
      events: history.documents.map((h) => ({ date: h.$createdAt, text: h.newValue })),
    }
  }

  return provider.track(order.deliveryId)
}
