/* ==========================================================================
   MANILI — СТРАНИЦА ТОВАРА (ТЗ §10)
   Галерея с зумом, выбор размера с учётом остатков, избранное, рекомендации.
   Купить отсутствующий размер нельзя — кнопка недоступна.
   ========================================================================== */

import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Media } from '@/components/media/Media'
import { Reveal } from '@/components/motion'
import { ProductCard } from '@/components/shop/ProductCard'
import {
  Accordion,
  Badge,
  Button,
  Chip,
  EmptyState,
  IconArrowLeft,
  IconArrowRight,
  IconButton,
  IconHeart,
  Modal,
  QuantityStepper,
  Skeleton,
  showToast,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { discountPercent, formatPrice } from '@/domain/money'
import {
  AVAILABILITY_LABELS,
  availableQuantity,
  maxAddableQuantity,
  productSizes,
  SIZE_LABELS,
  variantAvailability,
} from '@/domain/stock'
import type { ProductVariant } from '@/domain/types'
import { backend } from '@/repositories'
import { useCart } from '@/store/cart'
import { useFavorites } from '@/store/favorites'
import './product.css'
import './shop.css'

const SIZE_CHART = [
  { size: 'XS', chest: '96', length: '64', sleeve: '58' },
  { size: 'S', chest: '102', length: '66', sleeve: '59' },
  { size: 'M', chest: '108', length: '68', sleeve: '61' },
  { size: 'L', chest: '114', length: '70', sleeve: '62' },
  { size: 'XL', chest: '120', length: '72', sleeve: '64' },
  { size: 'XXL', chest: '126', length: '74', sleeve: '65' },
]

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const [activeImage, setActiveImage] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [sizeModalOpen, setSizeModalOpen] = useState(false)

  const product = useAsync(
    () => backend.catalog.getProductBySlug(slug ?? ''),
    [slug],
  )
  const related = useAsync(
    () =>
      product.data
        ? backend.catalog.getRelatedProducts(product.data.id, 4)
        : Promise.resolve([]),
    [product.data?.id],
    { skip: !product.data },
  )

  const addToCart = useCart((state) => state.add)
  const openCart = useCart((state) => state.open)
  const isFavorite = useFavorites((state) => (product.data ? state.ids.includes(product.data.id) : false))
  const toggleFavorite = useFavorites((state) => state.toggle)

  const variants = useMemo(() => (product.data ? productSizes(product.data) : []), [product.data])
  const selectedVariant: ProductVariant | undefined = variants.find((v) => v.id === selectedVariantId)

  // Для товаров с единственным размером выбор не нужен — ставим его сразу.
  useEffect(() => {
    if (variants.length === 1 && availableQuantity(variants[0]) > 0) {
      setSelectedVariantId(variants[0].id)
    } else {
      setSelectedVariantId(null)
    }
    setQuantity(1)
    setActiveImage(0)
  }, [product.data?.id, variants])

  useSeo({
    title: product.data?.seoTitle ?? product.data?.title ?? 'Товар',
    description: product.data?.seoDescription ?? product.data?.subtitle ?? undefined,
    canonical: `/product/${slug}`,
    type: 'product',
  })

  if (product.loading) {
    return (
      <div className="container pdp">
        <Skeleton style={{ aspectRatio: '3 / 4', borderRadius: 'var(--r-xl)' }} />
        <div style={{ display: 'grid', gap: 20 }}>
          <Skeleton style={{ height: 44 }} />
          <Skeleton style={{ height: 24, width: '60%' }} />
          <Skeleton style={{ height: 120 }} />
        </div>
      </div>
    )
  }

  if (!product.data) {
    return (
      <div className="container" style={{ paddingTop: 'calc(var(--header-h) + 80px)', paddingBottom: 'var(--section-y)' }}>
        <EmptyState
          title="Товар не найден"
          text="Возможно, он больше не продаётся или ссылка устарела."
          action={<Button onClick={() => window.history.back()}>Назад</Button>}
        />
      </div>
    )
  }

  const item = product.data
  const images = item.images.length > 0 ? item.images : [{ id: 'ph', url: null, alt: null, sortOrder: 0, isPrimary: true }]
  const availability = selectedVariant ? variantAvailability(selectedVariant) : null
  const discount = item.oldPrice ? discountPercent(item.price, item.oldPrice) : 0
  const canBuy = Boolean(selectedVariant && availableQuantity(selectedVariant) >= quantity)
  const maxQty = selectedVariant ? maxAddableQuantity(selectedVariant) : 1

  const handleAdd = () => {
    if (!selectedVariant) {
      showToast('Сначала выберите размер.', { tone: 'error' })
      return
    }
    addToCart(item, selectedVariant, quantity)
    openCart()
    showToast(`${item.title} · ${SIZE_LABELS[selectedVariant.size]} × ${quantity}`, {
      tone: 'success',
      title: 'Добавлено в корзину',
    })
  }

  return (
    <>
      <div className="container" style={{ paddingTop: 'calc(var(--header-h) + 28px)' }}>
        <nav className="crumbs" aria-label="Хлебные крошки">
          <Link to="/">Главная</Link>
          <span className="crumbs__sep">/</span>
          <Link to="/shop">Магазин</Link>
          <span className="crumbs__sep">/</span>
          <span>{item.title}</span>
        </nav>
      </div>

      <div className="container pdp" style={{ paddingTop: 0 }}>
        <div className="pdp-gallery">
          <div className="pdp-thumbs" role="tablist" aria-label="Фотографии товара">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                role="tab"
                aria-selected={index === activeImage}
                className="pdp-thumb"
                data-active={index === activeImage ? 'true' : undefined}
                onClick={() => setActiveImage(index)}
              >
                <Media src={image.url} alt="" ratio="3 / 4" rounded="none" sizes="88px" />
              </button>
            ))}
          </div>

          <div
            className="pdp-stage"
            data-zoomed={zoomed ? 'true' : undefined}
            onClick={() => setZoomed((z) => !z)}
            role="button"
            tabIndex={0}
            aria-label={zoomed ? 'Уменьшить фото' : 'Увеличить фото'}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setZoomed((z) => !z)
              }
            }}
          >
            <div className="pdp-stage__img">
              <Media
                src={images[activeImage]?.url}
                alt={item.title}
                ratio="3 / 4"
                rounded="none"
                priority
                sizes="(max-width: 999px) 96vw, 56vw"
              />
            </div>

            <span className="pdp-stage__dot">
              {activeImage + 1} / {images.length}
            </span>

            {images.length > 1 && (
              <div className="pdp-stage__nav" onClick={(event) => event.stopPropagation()}>
                <IconButton
                  label="Предыдущее фото"
                  tone="filled"
                  onClick={() => setActiveImage((i) => (i - 1 + images.length) % images.length)}
                >
                  <IconArrowLeft size={17} />
                </IconButton>
                <IconButton
                  label="Следующее фото"
                  tone="filled"
                  onClick={() => setActiveImage((i) => (i + 1) % images.length)}
                >
                  <IconArrowRight size={17} />
                </IconButton>
              </div>
            )}
          </div>
        </div>

        <div className="pdp-info">
          <div>
            <div className="pdp-badges" style={{ marginBottom: 14 }}>
              {item.isLimited && <Badge tone="accent">Limited</Badge>}
              {item.isNew && <Badge tone="outline">Новинка</Badge>}
              {discount > 0 && <Badge tone="danger">−{discount}%</Badge>}
            </div>
            <h1 className="pdp-title">{item.title}</h1>
            {item.subtitle && <p className="pdp-subtitle">{item.subtitle}</p>}
          </div>

          <div className="pdp-price-row">
            <span className="pdp-price">{formatPrice(item.price)}</span>
            {item.oldPrice && <span className="pdp-old">{formatPrice(item.oldPrice)}</span>}
          </div>

          <div className="pdp-section">
            <div className="pdp-section__head">
              <span className="pdp-section__title">Размер</span>
              <button
                type="button"
                className="pdp-section__link"
                onClick={() => setSizeModalOpen(true)}
              >
                Таблица размеров
              </button>
            </div>
            <div className="pdp-sizes">
              {variants.map((variant) => {
                const left = availableQuantity(variant)
                return (
                  <Chip
                    key={variant.id}
                    selected={variant.id === selectedVariantId}
                    disabled={left <= 0}
                    onClick={() => {
                      setSelectedVariantId(variant.id)
                      setQuantity(1)
                    }}
                    title={left <= 0 ? 'Нет в наличии' : undefined}
                  >
                    {SIZE_LABELS[variant.size]}
                  </Chip>
                )
              })}
            </div>

            {availability && (
              <p
                className={`pdp-stock pdp-stock--${
                  availability === 'IN_STOCK' ? 'in' : availability === 'LOW_STOCK' ? 'low' : 'out'
                }`}
              >
                <span className="pdp-stock__dot" />
                {AVAILABILITY_LABELS[availability]}
                {availability === 'LOW_STOCK' && selectedVariant
                  ? ` — ${availableQuantity(selectedVariant)} шт.`
                  : ''}
              </p>
            )}
          </div>

          <div className="pdp-actions">
            {selectedVariant && availableQuantity(selectedVariant) > 0 && (
              <QuantityStepper value={quantity} min={1} max={maxQty} onChange={setQuantity} />
            )}
            <Button size="lg" onClick={handleAdd} disabled={!canBuy}>
              {selectedVariant
                ? canBuy
                  ? 'Добавить в корзину'
                  : 'Нет в наличии'
                : 'Выберите размер'}
            </Button>
            <IconButton
              label={isFavorite ? 'Убрать из избранного' : 'В избранное'}
              size="lg"
              tone="outlined"
              active={isFavorite}
              onClick={() => void toggleFavorite(item.id)}
            >
              <IconHeart size={20} filled={isFavorite} />
            </IconButton>
          </div>

          <Accordion
            defaultOpenId="description"
            items={[
              { id: 'description', title: 'Описание', content: <p>{item.description}</p> },
              ...(item.composition
                ? [{ id: 'composition', title: 'Состав и уход', content: <p>{item.composition}</p> }]
                : []),
              {
                id: 'delivery',
                title: 'Доставка и оплата',
                content: (
                  <div style={{ display: 'grid', gap: 10 }}>
                    <p>СДЭК до пункта выдачи — 1–5 дней, от 350 ₽.</p>
                    <p>Курьер по Москве — 1–2 дня, 400 ₽.</p>
                    <p>Почта России — 3–10 дней, от 300 ₽.</p>
                    <p>Бесплатная доставка при заказе от 10 000 ₽.</p>
                    <p>
                      Оплата картой или через СБП.{' '}
                      <Link to="/delivery" style={{ textDecoration: 'underline' }}>
                        Подробнее
                      </Link>
                    </p>
                  </div>
                ),
              },
              {
                id: 'returns',
                title: 'Обмен и возврат',
                content: (
                  <p>
                    14 дней на возврат, если вещь не подошла и сохранила товарный вид.{' '}
                    <Link to="/returns" style={{ textDecoration: 'underline' }}>
                      Условия возврата
                    </Link>
                  </p>
                ),
              },
            ]}
          />

          <div className="pdp-meta">
            <span>Артикул: {item.sku}</span>
            <span>Цвет: {item.color.title}</span>
          </div>
        </div>
      </div>

      {(related.data?.length ?? 0) > 0 && (
        <section className="section container">
          <div className="sec-head">
            <Reveal mode="up">
              <h2 className="sec-head__title">С этим смотрят</h2>
            </Reveal>
          </div>
          <div className="pgrid">
            {(related.data ?? []).map((product, index) => (
              <Reveal key={product.id} mode="up" delay={index * 70}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <Modal open={sizeModalOpen} onClose={() => setSizeModalOpen(false)} title="Таблица размеров">
        <p style={{ color: 'var(--c-text-dim)', fontSize: 'var(--fs-sm)', marginBottom: 20, lineHeight: 1.7 }}>
          Замеры изделия в сантиметрах. Крой свободный — если между размерами, берите меньший.
        </p>
        <table className="size-table">
          <thead>
            <tr>
              <th>Размер</th>
              <th>Грудь</th>
              <th>Длина</th>
              <th>Рукав</th>
            </tr>
          </thead>
          <tbody>
            {SIZE_CHART.map((row) => (
              <tr key={row.size}>
                <td>{row.size}</td>
                <td>{row.chest}</td>
                <td>{row.length}</td>
                <td>{row.sleeve}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>
    </>
  )
}
