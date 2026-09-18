/* ==========================================================================
   MANILI — ПАНЕЛЬ КОРЗИНЫ (ТЗ §12)

   Показывает состав, промокод и итог. Суммы здесь — предварительные:
   окончательный расчёт делает сервер при оформлении (ТЗ §15).
   ========================================================================== */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Media } from '@/components/media/Media'
import {
  Button,
  Drawer,
  EmptyState,
  IconButton,
  IconTrash,
  QuantityStepper,
  Spinner,
  showToast,
} from '@/components/ui'
import { formatPrice } from '@/domain/money'
import { availableQuantity, findVariantById, MAX_QTY_PER_ITEM } from '@/domain/stock'
import type { Product } from '@/domain/types'
import { pluralWithCount } from '@/lib/utils'
import { backend, toUserMessage } from '@/repositories'
import { FREE_DELIVERY_THRESHOLD } from '@/repositories/mock/seed'
import { useCart } from '@/store/cart'
import './cart-drawer.css'

export function CartDrawer() {
  const isOpen = useCart((state) => state.isOpen)
  const close = useCart((state) => state.close)
  const items = useCart((state) => state.items)
  const setQuantity = useCart((state) => state.setQuantity)
  const remove = useCart((state) => state.remove)
  const promocode = useCart((state) => state.promocode)
  const promoDiscount = useCart((state) => state.promoDiscount)
  const promoFreeDelivery = useCart((state) => state.promoFreeDelivery)
  const setPromocode = useCart((state) => state.setPromocode)

  const [products, setProducts] = useState<Record<string, Product>>({})
  const [loading, setLoading] = useState(false)
  const [promoInput, setPromoInput] = useState('')
  const [promoChecking, setPromoChecking] = useState(false)
  const navigate = useNavigate()

  // Подтягиваем актуальные товары при открытии: цена и остатки могли измениться.
  useEffect(() => {
    if (!isOpen || items.length === 0) return
    let cancelled = false
    setLoading(true)
    backend.catalog
      .getProductsByIds(items.map((item) => item.productId))
      .then((list) => {
        if (cancelled) return
        setProducts(Object.fromEntries(list.map((p) => [p.id, p])))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [isOpen, items])

  const subtotal = items.reduce((sum, item) => {
    const product = products[item.productId]
    const price = product ? product.price : item.priceSnapshot
    return sum + price * item.quantity
  }, 0)

  const total = Math.max(0, subtotal - promoDiscount)
  const remainingForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal)
  const freeDeliveryReached = remainingForFreeDelivery === 0 || promoFreeDelivery

  const applyPromocode = async () => {
    const code = promoInput.trim()
    if (!code) return
    setPromoChecking(true)
    try {
      const result = await backend.promocodes.check(code, subtotal)
      if (!result.valid) {
        showToast(result.reason ?? 'Промокод недействителен.', { tone: 'error' })
        setPromocode(null, 0, false)
        return
      }
      setPromocode(result.code, result.discount, result.freeDelivery)
      setPromoInput('')
      showToast(
        result.freeDelivery ? 'Доставка бесплатная.' : `Скидка ${formatPrice(result.discount)} применена.`,
        { tone: 'success', title: `Промокод ${result.code}` },
      )
    } catch (error) {
      showToast(toUserMessage(error), { tone: 'error' })
    } finally {
      setPromoChecking(false)
    }
  }

  return (
    <Drawer
      open={isOpen}
      onClose={close}
      title={items.length > 0 ? `Корзина · ${pluralWithCount(items.reduce((s, i) => s + i.quantity, 0), ['товар', 'товара', 'товаров'])}` : 'Корзина'}
      footer={
        items.length > 0 ? (
          <>
            <div className="cart-promo">
              <input
                className="cart-promo__input"
                placeholder="Промокод"
                value={promoInput}
                onChange={(event) => setPromoInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void applyPromocode()
                }}
                aria-label="Промокод"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void applyPromocode()}
                loading={promoChecking}
                disabled={!promoInput.trim()}
              >
                Применить
              </Button>
            </div>

            <div className="cart-summary">
              <div className="cart-summary__row">
                <span>Товары</span>
                <span className="cart-summary__value">{formatPrice(subtotal)}</span>
              </div>
              {promocode && promoDiscount > 0 && (
                <div className="cart-summary__row">
                  <span>Скидка · {promocode}</span>
                  <span className="cart-summary__value">−{formatPrice(promoDiscount)}</span>
                </div>
              )}
              <div className="cart-summary__row">
                <span>Доставка</span>
                <span className="cart-summary__value">
                  {freeDeliveryReached ? (
                    <span className="cart-summary__free">Бесплатно</span>
                  ) : (
                    'рассчитаем при оформлении'
                  )}
                </span>
              </div>
              <div className="cart-summary__row cart-summary__row--total">
                <span>Итого</span>
                <span className="cart-summary__value">{formatPrice(total)}</span>
              </div>
            </div>

            <Button
              block
              size="lg"
              onClick={() => {
                close()
                navigate('/checkout')
              }}
            >
              Оформить заказ
            </Button>
          </>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <EmptyState
          title="Здесь пока пусто"
          text="Загляните в каталог — начните с базовой линии или свежего дропа."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                close()
                navigate('/shop')
              }}
            >
              В каталог
            </Button>
          }
        />
      ) : (
        <>
          {!freeDeliveryReached && (
            <div className="cart-progress">
              <p className="cart-progress__text">
                До бесплатной доставки {formatPrice(remainingForFreeDelivery)}
              </p>
              <div className="cart-progress__bar">
                <div
                  className="cart-progress__fill"
                  style={{ width: `${Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {loading && items.length > 0 && Object.keys(products).length === 0 && <Spinner center />}

          {items.map((item) => {
            const product = products[item.productId]
            const variant = product ? findVariantById(product, item.variantId) : undefined
            const available = variant ? availableQuantity(variant) : item.quantity
            const price = product ? product.price : item.priceSnapshot
            const exceedsStock = variant ? item.quantity > available : false

            return (
              <div className="cart-line" key={item.variantId}>
                <Media
                  src={product?.images[0]?.url}
                  alt={product?.title ?? ''}
                  ratio="3 / 4"
                  rounded="sm"
                  sizes="82px"
                />

                <div className="cart-line__body">
                  <div className="cart-line__top">
                    <div style={{ minWidth: 0 }}>
                      <p className="cart-line__title">{product?.title ?? 'Товар'}</p>
                      <p className="cart-line__meta">
                        Размер {item.size}
                        {product ? ` · ${product.color.title}` : ''}
                      </p>
                    </div>
                    <IconButton
                      label="Удалить из корзины"
                      size="sm"
                      onClick={() => remove(item.variantId)}
                    >
                      <IconTrash size={17} />
                    </IconButton>
                  </div>

                  {exceedsStock && (
                    <p className="cart-line__warn">
                      Доступно только {available} шт. — уменьшите количество.
                    </p>
                  )}

                  <div className="cart-line__foot">
                    <QuantityStepper
                      value={item.quantity}
                      min={1}
                      max={Math.max(1, Math.min(available || MAX_QTY_PER_ITEM, MAX_QTY_PER_ITEM))}
                      onChange={(value) => setQuantity(item.variantId, value)}
                    />
                    <span className="cart-line__price">{formatPrice(price * item.quantity)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </>
      )}
    </Drawer>
  )
}
