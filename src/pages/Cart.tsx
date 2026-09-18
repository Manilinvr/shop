/* ==========================================================================
   MANILI — СТРАНИЦА КОРЗИНЫ (ТЗ §12)
   Полноразмерная версия панели корзины: удобнее на мобильном и её можно
   отправить ссылкой.
   ========================================================================== */

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Media } from '@/components/media/Media'
import { Reveal } from '@/components/motion'
import {
  Button,
  ButtonLink,
  EmptyState,
  IconButton,
  IconTrash,
  QuantityStepper,
  Spinner,
  showToast,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { formatPrice } from '@/domain/money'
import { availableQuantity, findVariantById, MAX_QTY_PER_ITEM, SIZE_LABELS } from '@/domain/stock'
import { pluralWithCount } from '@/lib/utils'
import { backend, toUserMessage } from '@/repositories'
import { FREE_DELIVERY_THRESHOLD } from '@/repositories/mock/seed'
import { useCart } from '@/store/cart'
import './shop.css'
import '@/components/shop/cart-drawer.css'
import './checkout.css'

export default function Cart() {
  useSeo({ title: 'Корзина', canonical: '/cart', noIndex: true })

  const items = useCart((state) => state.items)
  const setQuantity = useCart((state) => state.setQuantity)
  const remove = useCart((state) => state.remove)
  const promocode = useCart((state) => state.promocode)
  const promoDiscount = useCart((state) => state.promoDiscount)
  const promoFreeDelivery = useCart((state) => state.promoFreeDelivery)
  const setPromocode = useCart((state) => state.setPromocode)

  const [promoInput, setPromoInput] = useState('')
  const [promoChecking, setPromoChecking] = useState(false)
  const navigate = useNavigate()

  const products = useAsync(
    () => backend.catalog.getProductsByIds(items.map((item) => item.productId)),
    [items.map((item) => item.productId).join(',')],
    { skip: items.length === 0 },
  )

  const byId = Object.fromEntries((products.data ?? []).map((p) => [p.id, p]))

  const subtotal = items.reduce((sum, item) => {
    const product = byId[item.productId]
    return sum + (product ? product.price : item.priceSnapshot) * item.quantity
  }, 0)
  const total = Math.max(0, subtotal - promoDiscount)
  const freeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD || promoFreeDelivery

  // Сумма изменилась — промокод мог перестать подходить под минимальный порог.
  useEffect(() => {
    if (!promocode || items.length === 0) return
    void backend.promocodes.check(promocode, subtotal).then((result) => {
      if (!result.valid) {
        setPromocode(null, 0, false)
        showToast(result.reason ?? 'Промокод больше не действует.', { tone: 'error' })
      } else if (result.discount !== promoDiscount) {
        setPromocode(result.code, result.discount, result.freeDelivery)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal])

  const applyPromocode = async () => {
    const code = promoInput.trim()
    if (!code) return
    setPromoChecking(true)
    try {
      const result = await backend.promocodes.check(code, subtotal)
      if (!result.valid) {
        showToast(result.reason ?? 'Промокод недействителен.', { tone: 'error' })
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
    <>
      <div className="container page-head">
        <nav className="crumbs" aria-label="Хлебные крошки">
          <Link to="/">Главная</Link>
          <span className="crumbs__sep">/</span>
          <span>Корзина</span>
        </nav>
        <Reveal mode="up">
          <h1 className="page-title">
            Корзина
            {items.length > 0 && (
              <span style={{ color: 'var(--c-sand)', fontSize: '0.4em', marginLeft: 16 }}>
                {pluralWithCount(items.reduce((s, i) => s + i.quantity, 0), ['товар', 'товара', 'товаров'])}
              </span>
            )}
          </h1>
        </Reveal>
      </div>

      <div className="container" style={{ paddingBottom: 'var(--section-y)' }}>
        {items.length === 0 ? (
          <EmptyState
            title="Корзина пуста"
            text="Выберите что-нибудь из каталога — базовая линия или свежий дроп."
            action={<ButtonLink to="/shop">В каталог</ButtonLink>}
          />
        ) : (
          <div className="checkout-grid">
            <div>
              {products.loading && !products.data && <Spinner center />}

              {items.map((item) => {
                const product = byId[item.productId]
                const variant = product ? findVariantById(product, item.variantId) : undefined
                const available = variant ? availableQuantity(variant) : item.quantity
                const price = product ? product.price : item.priceSnapshot

                return (
                  <div className="cart-line" key={item.variantId} style={{ gridTemplateColumns: '110px 1fr' }}>
                    <Link to={product ? `/product/${product.slug}` : '#'}>
                      <Media
                        src={product?.images[0]?.url}
                        alt={product?.title ?? ''}
                        ratio="3 / 4"
                        rounded="md"
                        sizes="110px"
                      />
                    </Link>

                    <div className="cart-line__body">
                      <div className="cart-line__top">
                        <div style={{ minWidth: 0 }}>
                          <Link
                            to={product ? `/product/${product.slug}` : '#'}
                            className="cart-line__title"
                          >
                            {product?.title ?? 'Товар'}
                          </Link>
                          <p className="cart-line__meta">
                            Размер {SIZE_LABELS[item.size]}
                            {product ? ` · ${product.color.title}` : ''}
                            {product ? ` · ${product.sku}` : ''}
                          </p>
                        </div>
                        <IconButton label="Удалить" size="sm" onClick={() => remove(item.variantId)}>
                          <IconTrash size={17} />
                        </IconButton>
                      </div>

                      {variant && item.quantity > available && (
                        <p className="cart-line__warn">
                          Доступно {available} шт. — уменьшите количество.
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
            </div>

            <aside className="checkout-summary">
              <h2 className="checkout-summary__title">Итог</h2>

              <div className="cart-promo" style={{ marginBottom: 20 }}>
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
                    {freeDelivery ? (
                      <span className="cart-summary__free">Бесплатно</span>
                    ) : (
                      'на следующем шаге'
                    )}
                  </span>
                </div>
                <div className="cart-summary__row cart-summary__row--total">
                  <span>Итого</span>
                  <span className="cart-summary__value">{formatPrice(total)}</span>
                </div>
              </div>

              <Button block size="lg" onClick={() => navigate('/checkout')}>
                Оформить заказ
              </Button>
              <ButtonLink to="/shop" variant="ghost" block size="sm" className="checkout-summary__back">
                Продолжить покупки
              </ButtonLink>
            </aside>
          </div>
        )}
      </div>
    </>
  )
}
