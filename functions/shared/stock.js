/* ==========================================================================
   MANILI — ОСТАТКИ И РЕЗЕРВИРОВАНИЕ (ТЗ §35)

   Правило: остатки меняет только сервер, и только через эти функции.

   ЗАЩИТА ОТ RACE CONDITION.
   В Appwrite нет транзакций, поэтому используется оптимистическая блокировка:
   читаем вариант с его `version`, пишем version+1, затем перечитываем и
   убеждаемся, что записали именно мы. Если нас опередили — повторяем попытку
   с нарастающей задержкой. Резерв на весь заказ ставится «всё или ничего»:
   при неудаче по одной позиции уже поставленные резервы откатываются.

   ОГРАНИЧЕНИЕ: это существенно сужает окно гонки, но не даёт строгой гарантии
   уровня БД. При выходе на заметный трафик остатки следует перенести в
   хранилище с транзакциями (self-host PostgreSQL) — архитектура это допускает
   (ТЗ §49): вся логика собрана здесь, вызывающий код менять не придётся.
   ========================================================================== */

import { DB_ID, Query, db } from './appwrite.js'
import { COLLECTIONS, MAX_QTY_PER_ITEM } from './constants.js'
import { PublicError } from './errors.js'

const MAX_ATTEMPTS = 6

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function availableQuantity(variant) {
  return Math.max(0, (variant.stock ?? 0) - (variant.reserved ?? 0))
}

/** Compare-and-set одной позиции. Возвращает true, если запись наша. */
async function casVariant(variantId, mutate) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const variant = await db().getDocument(DB_ID, COLLECTIONS.productVariants, variantId)
    const version = variant.version ?? 0
    const patch = mutate(variant)
    if (patch === null) return { ok: false, variant }

    await db().updateDocument(DB_ID, COLLECTIONS.productVariants, variantId, {
      ...patch,
      version: version + 1,
    })

    // Перечитываем: если version не наш, параллельный запрос перезаписал нас.
    const confirmed = await db().getDocument(DB_ID, COLLECTIONS.productVariants, variantId)
    if ((confirmed.version ?? 0) === version + 1) {
      return { ok: true, variant: confirmed }
    }

    await sleep(40 * (attempt + 1) + Math.random() * 40)
  }
  throw new PublicError(
    'STOCK_BUSY',
    'Товар сейчас разбирают. Обновите страницу и попробуйте ещё раз.',
    `CAS не удался за ${MAX_ATTEMPTS} попыток`,
  )
}

/**
 * Резервирует позиции заказа.
 * Сначала проверяет ВСЁ, потом резервирует; при сбое откатывает поставленное.
 */
export async function reserveStock(items, log) {
  const reserved = []

  try {
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QTY_PER_ITEM) {
        throw new PublicError('BAD_QUANTITY', 'Некорректное количество товара.')
      }

      const result = await casVariant(item.variantId, (variant) => {
        if (!variant.isActive) return null
        if (availableQuantity(variant) < item.quantity) return null
        return { reserved: (variant.reserved ?? 0) + item.quantity }
      })

      if (!result.ok) {
        throw new PublicError(
          'OUT_OF_STOCK',
          `Размер ${result.variant.size} закончился. Измените состав корзины.`,
        )
      }
      reserved.push(item)
    }
    return true
  } catch (error) {
    // Частичный резерв недопустим — откатываем то, что успели поставить.
    for (const item of reserved) {
      await casVariant(item.variantId, (variant) => ({
        reserved: Math.max(0, (variant.reserved ?? 0) - item.quantity),
      })).catch((e) => log?.(`Откат резерва не удался для ${item.variantId}: ${e}`))
    }
    throw error
  }
}

/** Освобождает резерв (отмена или возврат до оплаты). */
export async function releaseStock(items, log) {
  for (const item of items) {
    await casVariant(item.variantId, (variant) => ({
      reserved: Math.max(0, (variant.reserved ?? 0) - item.quantity),
    })).catch((e) => log?.(`Не удалось снять резерв ${item.variantId}: ${e}`))
  }
}

/** Подтверждает продажу: резерв превращается в списание со склада. */
export async function commitStock(items, log) {
  for (const item of items) {
    await casVariant(item.variantId, (variant) => ({
      reserved: Math.max(0, (variant.reserved ?? 0) - item.quantity),
      stock: Math.max(0, (variant.stock ?? 0) - item.quantity),
    })).catch((e) => log?.(`Не удалось списать остаток ${item.variantId}: ${e}`))
  }
}

/** Возвращает остаток на склад (возврат уже оплаченного заказа). */
export async function restoreStock(items, log) {
  for (const item of items) {
    await casVariant(item.variantId, (variant) => ({
      stock: (variant.stock ?? 0) + item.quantity,
    })).catch((e) => log?.(`Не удалось вернуть остаток ${item.variantId}: ${e}`))
  }
}

/** Варианты заказа вместе с товарами — для пересчёта суммы на сервере. */
export async function loadOrderLines(items) {
  const variantIds = items.map((i) => i.variantId)
  if (variantIds.length === 0) {
    throw new PublicError('EMPTY_CART', 'Корзина пуста.')
  }

  const variantsRes = await db().listDocuments(DB_ID, COLLECTIONS.productVariants, [
    Query.equal('$id', variantIds),
    Query.limit(variantIds.length),
  ])
  const variantById = new Map(variantsRes.documents.map((v) => [v.$id, v]))

  const productIds = [...new Set(variantsRes.documents.map((v) => v.productId))]
  const productsRes = await db().listDocuments(DB_ID, COLLECTIONS.products, [
    Query.equal('$id', productIds),
    Query.limit(productIds.length),
  ])
  const productById = new Map(productsRes.documents.map((p) => [p.$id, p]))

  return items.map((item) => {
    const variant = variantById.get(item.variantId)
    const product = variant && productById.get(variant.productId)

    if (!variant || !product) {
      throw new PublicError('ITEM_UNAVAILABLE', 'Один из товаров больше не доступен. Обновите корзину.')
    }
    if (product.status !== 'PUBLISHED') {
      throw new PublicError('ITEM_UNAVAILABLE', `«${product.title}» больше не продаётся.`)
    }

    // ЦЕНА БЕРЁТСЯ ИЗ БАЗЫ. То, что прислал браузер, игнорируется (ТЗ §15).
    const price = (product.price ?? 0) + (variant.priceModifier ?? 0)

    return {
      variantId: variant.$id,
      productId: product.$id,
      productTitle: product.title,
      productSlug: product.slug,
      productImage: Array.isArray(product.images) ? product.images[0] ?? null : null,
      size: variant.size,
      sku: variant.sku,
      quantity: item.quantity,
      price,
      total: price * item.quantity,
    }
  })
}
