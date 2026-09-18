/* ==========================================================================
   MANILI — КАРТОЧКА ТОВАРА
   Второе фото при наведении, быстрый выбор размера, избранное, бейджи.
   Недоступные размеры зачёркнуты и не кликабельны (ТЗ §10).
   ========================================================================== */

import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Media } from '@/components/media/Media'
import { Badge, IconButton, IconHeart, showToast } from '@/components/ui'
import { discountPercent, formatPrice } from '@/domain/money'
import {
  availableQuantity,
  productAvailability,
  productSizes,
  SIZE_LABELS,
} from '@/domain/stock'
import type { Product } from '@/domain/types'
import { cx } from '@/lib/utils'
import { useCart } from '@/store/cart'
import { useFavorites } from '@/store/favorites'
import './product-card.css'

export interface ProductCardProps {
  product: Product
  /** Приоритетная загрузка — только для первых карточек над сгибом. */
  priority?: boolean
  className?: string
  sizes?: string
}

export const ProductCard = memo(function ProductCard({
  product,
  priority,
  className,
  sizes,
}: ProductCardProps) {
  const addToCart = useCart((state) => state.add)
  const openCart = useCart((state) => state.open)
  const isFavorite = useFavorites((state) => state.ids.includes(product.id))
  const toggleFavorite = useFavorites((state) => state.toggle)

  const availability = productAvailability(product)
  const soldOut = availability === 'OUT_OF_STOCK'
  const variants = productSizes(product)
  const discount = product.oldPrice ? discountPercent(product.price, product.oldPrice) : 0

  return (
    <article className={cx('pcard', className)}>
      <div className="pcard__media-wrap">
        <Link to={`/product/${product.slug}`} aria-label={product.title}>
          <Media
            src={product.images[0]?.url}
            alt={product.title}
            className="pcard__media pcard__media--main"
            priority={priority}
            sizes={sizes}
            rounded="none"
          />
          {product.images[1] && (
            <Media
              src={product.images[1].url}
              alt=""
              className="pcard__media pcard__media--alt"
              sizes={sizes}
              rounded="none"
            />
          )}
        </Link>

        <div className="pcard__badges">
          {product.isLimited && <Badge tone="accent">Limited</Badge>}
          {product.isNew && !product.isLimited && <Badge tone="outline">Новинка</Badge>}
          {discount > 0 && <Badge tone="danger">−{discount}%</Badge>}
          {availability === 'LOW_STOCK' && !soldOut && <Badge tone="warning">Осталось мало</Badge>}
        </div>

        <IconButton
          label={isFavorite ? 'Убрать из избранного' : 'В избранное'}
          className="pcard__fav"
          size="sm"
          active={isFavorite}
          onClick={() => void toggleFavorite(product.id)}
        >
          <IconHeart size={17} filled={isFavorite} />
        </IconButton>

        {soldOut ? (
          <div className="pcard__sold-out">
            <Badge tone="neutral">Нет в наличии</Badge>
          </div>
        ) : (
          <div className="pcard__quick">
            {variants.map((variant) => {
              const left = availableQuantity(variant)
              return (
                <button
                  key={variant.id}
                  type="button"
                  className="pcard__size"
                  disabled={left <= 0}
                  onClick={() => {
                    addToCart(product, variant, 1)
                    openCart()
                    showToast(`${product.title} · ${SIZE_LABELS[variant.size]}`, {
                      tone: 'success',
                      title: 'Добавлено в корзину',
                    })
                  }}
                  aria-label={`Добавить размер ${SIZE_LABELS[variant.size]} в корзину`}
                >
                  {SIZE_LABELS[variant.size]}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="pcard__info">
        <div className="pcard__head">
          <Link to={`/product/${product.slug}`} className="pcard__title">
            {product.title}
          </Link>
          <div className="pcard__prices">
            <span className="pcard__price">{formatPrice(product.price)}</span>
            {product.oldPrice && <span className="pcard__old">{formatPrice(product.oldPrice)}</span>}
          </div>
        </div>
        <p className="pcard__meta">{product.color.title}</p>
      </div>
    </article>
  )
})
