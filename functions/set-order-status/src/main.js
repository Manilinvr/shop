/* ==========================================================================
   MANILI — АДМИНСКИЕ ОПЕРАЦИИ (ТЗ §19, §20, §25, §28, §35)

   Одна функция на все действия персонала: смена статуса, трек-номер,
   правка остатков, роли, аналитика. Все они требуют роль ADMIN/MANAGER,
   и роль читается из базы, а не из запроса.
   ========================================================================== */

import { DB_ID, ID, Query, db, requireRole } from '../../shared/appwrite.js'
import {
  COLLECTIONS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TRANSITIONS,
  PAYMENT_STATUS,
  ROLES,
  STATUS_EVENT_MAP,
  STOCK_RELEASING_STATUSES,
} from '../../shared/constants.js'
import { PublicError, fail, ok, parseBody } from '../../shared/errors.js'
import { commitStock, releaseStock, restoreStock } from '../../shared/stock.js'
import { dispatchOrderEvent } from '../../shared/notifications/index.js'

const STAFF = [ROLES.ADMIN, ROLES.MANAGER]

export default async ({ req, res, log, error }) => {
  try {
    const body = parseBody(req)

    switch (body.action) {
      case 'set-stock': {
        const { profile } = await requireRole(req, STAFF)
        return res.json(ok(await setStock(body, profile)))
      }
      case 'set-role': {
        // Роли меняет только ADMIN — менеджер не может повысить сам себя.
        const { profile } = await requireRole(req, [ROLES.ADMIN])
        return res.json(ok(await setRole(body, profile)))
      }
      case 'analytics': {
        await requireRole(req, STAFF)
        return res.json(ok(await analytics(body)))
      }
      default: {
        const { userId, profile } = await requireRole(req, STAFF)
        if (body.trackingNumber !== undefined && body.status === undefined) {
          return res.json(ok(await setTracking(body, { id: userId, profile })))
        }
        return res.json(ok(await setStatus(body, { id: userId, profile }, log)))
      }
    }
  } catch (e) {
    error(String(e?.stack || e))
    return res.json(fail(e, log))
  }
}

/* --- Смена статуса -------------------------------------------------------- */

async function setStatus({ orderId, status, comment }, actor, log) {
  if (!orderId || !status) throw new PublicError('BAD_REQUEST', 'Некорректный запрос.')

  const order = await db().getDocument(DB_ID, COLLECTIONS.orders, orderId)

  const allowed = ORDER_STATUS_TRANSITIONS[order.orderStatus] ?? []
  if (!allowed.includes(status)) {
    throw new PublicError(
      'INVALID_TRANSITION',
      `Нельзя перевести заказ из «${ORDER_STATUS_LABELS[order.orderStatus]}» в «${ORDER_STATUS_LABELS[status]}».`,
    )
  }

  const itemsRes = await db().listDocuments(DB_ID, COLLECTIONS.orderItems, [
    Query.equal('orderId', orderId),
    Query.limit(100),
  ])
  const items = itemsRes.documents.map((i) => ({ variantId: i.variantId, quantity: i.quantity }))

  const patch = { orderStatus: status }

  // Побочные эффекты по остаткам (ТЗ §35).
  if (status === 'PAID' && order.paymentStatus !== PAYMENT_STATUS.PAID) {
    // Ручное подтверждение оплаты владельцем (например, перевод).
    patch.paymentStatus = PAYMENT_STATUS.PAID
    await commitStock(items, log)
  }
  if (STOCK_RELEASING_STATUSES.includes(status)) {
    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      // Оплаченный заказ уже списан — возвращаем товар на склад.
      await restoreStock(items, log)
      patch.paymentStatus = PAYMENT_STATUS.REFUNDED
    } else {
      await releaseStock(items, log)
    }
  }

  if (status === 'READY_TO_SHIP') patch.deliveryStatus = 'READY'
  if (status === 'SHIPPED') patch.deliveryStatus = 'HANDED_OVER'
  if (status === 'IN_TRANSIT') patch.deliveryStatus = 'IN_TRANSIT'
  if (status === 'DELIVERED') patch.deliveryStatus = 'DELIVERED'

  const updated = await db().updateDocument(DB_ID, COLLECTIONS.orders, orderId, patch)

  await writeHistory(orderId, 'orderStatus', order.orderStatus, status, comment, actor)
  await writeAudit(actor, 'order.status', 'order', orderId)

  const event = STATUS_EVENT_MAP[status]
  if (event) {
    await dispatchOrderEvent(
      event,
      { ...toPlainOrder(updated), items: itemsRes.documents.map(toPlainItem) },
      { status },
      log,
    )
  }

  return toPlainOrder(updated, itemsRes.documents)
}

async function setTracking({ orderId, trackingNumber }, actor) {
  const order = await db().getDocument(DB_ID, COLLECTIONS.orders, orderId)
  const updated = await db().updateDocument(DB_ID, COLLECTIONS.orders, orderId, {
    trackingNumber: String(trackingNumber).slice(0, 64),
  })
  await writeHistory(orderId, 'trackingNumber', order.trackingNumber, trackingNumber, null, actor)
  return toPlainOrder(updated)
}

/* --- Остатки и роли ------------------------------------------------------- */

async function setStock({ variantId, stock }, profile) {
  if (!variantId || !Number.isInteger(stock) || stock < 0) {
    throw new PublicError('BAD_REQUEST', 'Некорректное значение остатка.')
  }
  const variant = await db().getDocument(DB_ID, COLLECTIONS.productVariants, variantId)
  await db().updateDocument(DB_ID, COLLECTIONS.productVariants, variantId, {
    stock,
    version: (variant.version ?? 0) + 1,
  })
  await writeAudit({ profile }, 'stock.update', 'variant', variantId)
  return { variantId, stock }
}

async function setRole({ userId, role }, profile) {
  if (!Object.values(ROLES).includes(role)) {
    throw new PublicError('BAD_REQUEST', 'Неизвестная роль.')
  }
  await db().updateDocument(DB_ID, COLLECTIONS.profiles, userId, { role })
  await writeAudit({ profile }, 'customer.role', 'user', userId)
  return { userId, role }
}

/* --- Аналитика (ТЗ §28) ---------------------------------------------------- */

async function analytics({ from, to }) {
  const ordersRes = await db().listDocuments(DB_ID, COLLECTIONS.orders, [
    Query.greaterThanEqual('$createdAt', from),
    Query.lessThanEqual('$createdAt', to),
    Query.limit(500),
  ])
  const orders = ordersRes.documents
  const paid = orders.filter((o) => o.paymentStatus === PAYMENT_STATUS.PAID)
  const revenue = paid.reduce((sum, o) => sum + (o.total ?? 0), 0)

  const itemsRes = paid.length
    ? await db().listDocuments(DB_ID, COLLECTIONS.orderItems, [
        Query.equal('orderId', paid.map((o) => o.$id)),
        Query.limit(2000),
      ])
    : { documents: [] }

  const byProduct = new Map()
  const bySize = new Map()
  for (const item of itemsRes.documents) {
    const entry = byProduct.get(item.productId) ?? { title: item.productTitle, sold: 0, revenue: 0 }
    entry.sold += item.quantity
    entry.revenue += item.total
    byProduct.set(item.productId, entry)
    bySize.set(item.size, (bySize.get(item.size) ?? 0) + item.quantity)
  }

  const variantsRes = await db().listDocuments(DB_ID, COLLECTIONS.productVariants, [Query.limit(500)])
  const lowStock = variantsRes.documents
    .map((v) => ({ variant: v, left: Math.max(0, (v.stock ?? 0) - (v.reserved ?? 0)) }))
    .filter((v) => v.left <= 3)
    .sort((a, b) => a.left - b.left)
    .slice(0, 12)

  const productsRes = lowStock.length
    ? await db().listDocuments(DB_ID, COLLECTIONS.products, [
        Query.equal('$id', [...new Set(lowStock.map((v) => v.variant.productId))]),
        Query.limit(50),
      ])
    : { documents: [] }
  const productTitle = new Map(productsRes.documents.map((p) => [p.$id, p.title]))

  const byDay = new Map()
  for (const order of paid) {
    const day = order.$createdAt.slice(0, 10)
    const entry = byDay.get(day) ?? { revenue: 0, orders: 0 }
    entry.revenue += order.total
    entry.orders += 1
    byDay.set(day, entry)
  }

  const profilesRes = await db().listDocuments(DB_ID, COLLECTIONS.profiles, [Query.limit(500)])
  const customerIds = new Set(orders.map((o) => o.userId).filter(Boolean))
  const repeat = [...customerIds].filter(
    (id) => orders.filter((o) => o.userId === id).length > 1,
  )

  return {
    revenue,
    ordersCount: orders.length,
    averageOrderValue: paid.length ? Math.round(revenue / paid.length) : 0,
    customersCount: profilesRes.documents.filter((p) => p.role === ROLES.CUSTOMER).length,
    newCustomers: profilesRes.documents.filter((p) => p.$createdAt >= from && p.$createdAt <= to).length,
    repeatPurchaseRate: customerIds.size ? repeat.length / customerIds.size : 0,
    topProducts: [...byProduct.entries()]
      .map(([productId, v]) => ({ productId, ...v }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 8),
    topSizes: [...bySize.entries()].map(([size, sold]) => ({ size, sold })).sort((a, b) => b.sold - a.sold),
    lowStock: lowStock.map((v) => ({
      productId: v.variant.productId,
      title: productTitle.get(v.variant.productId) ?? '',
      size: v.variant.size,
      left: v.left,
    })),
    salesByDay: [...byDay.entries()]
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }
}

/* --- Журналы -------------------------------------------------------------- */

async function writeHistory(orderId, field, oldValue, newValue, comment, actor) {
  await db().createDocument(DB_ID, COLLECTIONS.orderStatusHistory, ID.unique(), {
    orderId,
    field,
    oldValue: oldValue ?? null,
    newValue: String(newValue),
    changedBy: actor?.id ?? 'system',
    changedByName: actor?.profile
      ? `${actor.profile.firstName ?? ''} ${actor.profile.lastName ?? ''}`.trim() || 'Администратор'
      : 'Система',
    comment: comment ?? null,
  })
}

async function writeAudit(actor, action, entity, entityId) {
  try {
    await db().createDocument(DB_ID, COLLECTIONS.auditLogs, ID.unique(), {
      actorId: actor?.id ?? 'system',
      actorName: actor?.profile
        ? `${actor.profile.firstName ?? ''} ${actor.profile.lastName ?? ''}`.trim() || 'Администратор'
        : 'Система',
      action,
      entity,
      entityId,
    })
  } catch {
    // Аудит не должен ломать основную операцию.
  }
}

const toPlainItem = (doc) => ({
  id: doc.$id, orderId: doc.orderId, productId: doc.productId, variantId: doc.variantId,
  productTitle: doc.productTitle, productSlug: doc.productSlug, productImage: doc.productImage,
  size: doc.size, sku: doc.sku, quantity: doc.quantity, price: doc.price, total: doc.total,
})

function toPlainOrder(doc, itemDocs = []) {
  const parse = (v) => { try { return v ? JSON.parse(v) : null } catch { return null } }
  return {
    id: doc.$id,
    $id: doc.$id,
    publicOrderNumber: doc.publicOrderNumber,
    userId: doc.userId ?? null,
    customerName: doc.customerName,
    phone: doc.phone,
    email: doc.email ?? null,
    items: itemDocs.map(toPlainItem),
    subtotal: doc.subtotal,
    discount: doc.discount,
    promocode: doc.promocode ?? null,
    deliveryPrice: doc.deliveryPrice,
    total: doc.total,
    paymentMethod: doc.paymentMethod,
    paymentStatus: doc.paymentStatus,
    deliveryStatus: doc.deliveryStatus,
    orderStatus: doc.orderStatus,
    deliveryMethod: doc.deliveryMethod,
    deliveryProvider: doc.deliveryProvider ?? null,
    shippingAddress: parse(doc.shippingAddress),
    pickupPoint: parse(doc.pickupPoint),
    trackingNumber: doc.trackingNumber ?? null,
    paymentId: doc.paymentId ?? null,
    deliveryId: doc.deliveryId ?? null,
    comment: doc.comment ?? null,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  }
}
