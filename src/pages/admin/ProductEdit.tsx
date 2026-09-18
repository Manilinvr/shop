/* ==========================================================================
   MANILI — РЕДАКТИРОВАНИЕ ТОВАРА (ТЗ §26)

   Остатки правятся отдельно от карточки: их изменение идёт через
   серверную операцию, чтобы не разъехаться с резервами (ТЗ §35).
   ========================================================================== */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Badge,
  Button,
  IconArrowLeft,
  Input,
  Select,
  Spinner,
  Textarea,
  showToast,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { kopecksToRubles, rublesToKopecks } from '@/domain/money'
import { availableQuantity, SIZE_LABELS } from '@/domain/stock'
import { PUBLISH_STATUSES } from '@/domain/types'
import type { Product, PublishStatus, Size } from '@/domain/types'
import { slugify } from '@/lib/utils'
import { backend, toUserMessage } from '@/repositories'
import './admin.css'
import '../checkout.css'

const STATUS_LABELS: Record<PublishStatus, string> = {
  DRAFT: 'Черновик',
  PUBLISHED: 'Опубликован',
  HIDDEN: 'Скрыт',
  ARCHIVED: 'Архив',
}

const DEFAULT_SIZES: Size[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

interface FormState {
  title: string
  slug: string
  subtitle: string
  description: string
  composition: string
  price: string
  oldPrice: string
  sku: string
  categoryId: string
  collectionId: string
  colorTitle: string
  colorHex: string
  tags: string
  status: PublishStatus
  isNew: boolean
  isLimited: boolean
  seoTitle: string
  seoDescription: string
}

const EMPTY_FORM: FormState = {
  title: '', slug: '', subtitle: '', description: '', composition: '',
  price: '', oldPrice: '', sku: '', categoryId: '', collectionId: '',
  colorTitle: 'Чёрный', colorHex: '#14120f', tags: '',
  status: 'DRAFT', isNew: false, isLimited: false,
  seoTitle: '', seoDescription: '',
}

export default function ProductEdit() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const isNew = productId === 'new'

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [stocks, setStocks] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)

  const product = useAsync(
    () => (isNew ? Promise.resolve(null) : backend.catalog.getProductById(productId ?? '')),
    [productId],
  )
  const categories = useAsync(() => backend.catalog.listCategories(), [])
  const collections = useAsync(() => backend.catalog.listCollections(), [])

  useEffect(() => {
    const item = product.data
    if (!item) return
    setForm({
      title: item.title,
      slug: item.slug,
      subtitle: item.subtitle ?? '',
      description: item.description,
      composition: item.composition ?? '',
      price: String(kopecksToRubles(item.price)),
      oldPrice: item.oldPrice ? String(kopecksToRubles(item.oldPrice)) : '',
      sku: item.sku,
      categoryId: item.categoryId,
      collectionId: item.collectionId ?? '',
      colorTitle: item.color.title,
      colorHex: item.color.hex,
      tags: item.tags.join(', '),
      status: item.status,
      isNew: item.isNew,
      isLimited: item.isLimited,
      seoTitle: item.seoTitle ?? '',
      seoDescription: item.seoDescription ?? '',
    })
    setStocks(Object.fromEntries(item.variants.map((v) => [v.id, v.stock])))
  }, [product.data])

  const save = async () => {
    if (!form.title.trim() || !form.price) {
      showToast('Заполните название и цену.', { tone: 'error' })
      return
    }
    setSaving(true)
    try {
      const patch = {
        title: form.title,
        slug: form.slug || slugify(form.title),
        subtitle: form.subtitle || null,
        description: form.description,
        composition: form.composition || null,
        price: rublesToKopecks(Number(form.price)),
        oldPrice: form.oldPrice ? rublesToKopecks(Number(form.oldPrice)) : null,
        sku: form.sku,
        categoryId: form.categoryId || categories.data?.[0]?.id || '',
        collectionId: form.collectionId || null,
        color: { code: slugify(form.colorTitle), title: form.colorTitle, hex: form.colorHex },
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        status: form.status,
        isNew: form.isNew,
        isLimited: form.isLimited,
        seoTitle: form.seoTitle || null,
        seoDescription: form.seoDescription || null,
      }

      if (isNew) {
        const created = await backend.catalogAdmin.createProduct({
          ...patch,
          images: [],
          videoUrl: null,
          popularity: 0,
          variants: DEFAULT_SIZES.map((size) => ({
            id: '', productId: '', size,
            sku: `${patch.sku}-${size}`,
            stock: 0, reserved: 0, priceModifier: 0, isActive: true,
          })),
        } as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>)
        showToast('Товар создан.', { tone: 'success' })
        navigate(`/admin/products/${created.id}`, { replace: true })
        return
      }

      await backend.catalogAdmin.updateProduct(productId ?? '', patch)

      // Остатки сохраняем отдельным вызовом — он идёт через сервер.
      const original = product.data
      if (original) {
        await Promise.all(
          original.variants
            .filter((variant) => stocks[variant.id] !== undefined && stocks[variant.id] !== variant.stock)
            .map((variant) => backend.catalogAdmin.setVariantStock(variant.id, stocks[variant.id])),
        )
      }

      product.reload()
      showToast('Изменения сохранены.', { tone: 'success' })
    } catch (error) {
      showToast(toUserMessage(error), { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (product.loading && !isNew) return <Spinner center />

  return (
    <>
      <div className="admin-head">
        <div>
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10,
              fontFamily: 'var(--f-mono)', fontSize: 'var(--fs-2xs)',
              letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase',
              color: 'var(--c-text-muted)',
            }}
          >
            <IconArrowLeft size={14} /> Все товары
          </button>
          <h1 className="admin-head__title">{isNew ? 'Новый товар' : form.title || 'Товар'}</h1>
          {!isNew && product.data && (
            <p className="admin-head__sub">Артикул {product.data.sku}</p>
          )}
        </div>
        <div className="admin-head__actions">
          <Badge tone={form.status === 'PUBLISHED' ? 'success' : 'outline'}>
            {STATUS_LABELS[form.status]}
          </Badge>
          <Button loading={saving} onClick={() => void save()}>
            Сохранить
          </Button>
        </div>
      </div>

      <div className="order-card">
        <div>
          <div className="panel">
            <p className="panel__title">Основное</p>
            <div className="checkout-block">
              <Input
                label="Название"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
              <Input
                label="Ссылка (slug)"
                value={form.slug}
                placeholder={slugify(form.title)}
                hint="Используется в адресе: /product/manili-hoodie"
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
              />
              <Input
                label="Подзаголовок"
                value={form.subtitle}
                onChange={(event) => setForm({ ...form, subtitle: event.target.value })}
              />
              <Textarea
                label="Описание"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
              <Textarea
                label="Состав и уход"
                value={form.composition}
                onChange={(event) => setForm({ ...form, composition: event.target.value })}
              />
            </div>
          </div>

          <div className="panel">
            <p className="panel__title">Цена и артикул</p>
            <div className="form-row form-row--3" style={{ display: 'grid', gap: 'var(--s-4)' }}>
              <Input
                label="Цена, ₽"
                type="number"
                inputMode="numeric"
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
              />
              <Input
                label="Старая цена, ₽"
                type="number"
                inputMode="numeric"
                value={form.oldPrice}
                onChange={(event) => setForm({ ...form, oldPrice: event.target.value })}
              />
              <Input
                label="Артикул"
                value={form.sku}
                onChange={(event) => setForm({ ...form, sku: event.target.value })}
              />
            </div>
          </div>

          {!isNew && product.data && (
            <div className="panel">
              <p className="panel__title">Остатки по размерам</p>
              {product.data.variants.map((variant) => (
                <div key={variant.id} className="variant-row">
                  <span className="variant-row__size">{SIZE_LABELS[variant.size]}</span>
                  <span className="variant-row__sku">
                    {variant.sku}
                    {variant.reserved > 0 && ` · в резерве ${variant.reserved}`}
                    {` · доступно ${availableQuantity(variant)}`}
                  </span>
                  <input
                    className="variant-row__input"
                    type="number"
                    min={0}
                    value={stocks[variant.id] ?? variant.stock}
                    onChange={(event) =>
                      setStocks({ ...stocks, [variant.id]: Math.max(0, Number(event.target.value)) })
                    }
                    aria-label={`Остаток размера ${variant.size}`}
                  />
                </div>
              ))}
              <p className="admin-note" style={{ marginTop: 16 }}>
                <strong>Резерв</strong> — количество, отложенное под неоплаченные заказы.
                Оно вычитается из остатка автоматически и освобождается при отмене.
              </p>
            </div>
          )}

          <div className="panel">
            <p className="panel__title">SEO</p>
            <div className="checkout-block">
              <Input
                label="SEO title"
                value={form.seoTitle}
                placeholder={`${form.title} — MANILI`}
                onChange={(event) => setForm({ ...form, seoTitle: event.target.value })}
              />
              <Textarea
                label="SEO description"
                value={form.seoDescription}
                onChange={(event) => setForm({ ...form, seoDescription: event.target.value })}
              />
            </div>
          </div>
        </div>

        <aside>
          <div className="panel">
            <p className="panel__title">Публикация</p>
            <Select
              label="Статус"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as PublishStatus })}
            >
              {PUBLISH_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </Select>

            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              <Button
                size="sm"
                variant={form.isNew ? 'primary' : 'secondary'}
                onClick={() => setForm({ ...form, isNew: !form.isNew })}
              >
                Новинка
              </Button>
              <Button
                size="sm"
                variant={form.isLimited ? 'primary' : 'secondary'}
                onClick={() => setForm({ ...form, isLimited: !form.isLimited })}
              >
                Limited
              </Button>
            </div>
          </div>

          <div className="panel">
            <p className="panel__title">Классификация</p>
            <div className="checkout-block">
              <Select
                label="Категория"
                value={form.categoryId}
                onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
              >
                <option value="">Выберите</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.title}
                  </option>
                ))}
              </Select>

              <Select
                label="Коллекция"
                value={form.collectionId}
                onChange={(event) => setForm({ ...form, collectionId: event.target.value })}
              >
                <option value="">Без коллекции</option>
                {(collections.data ?? []).map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.title}
                  </option>
                ))}
              </Select>

              <Input
                label="Теги"
                value={form.tags}
                hint="Через запятую"
                onChange={(event) => setForm({ ...form, tags: event.target.value })}
              />
            </div>
          </div>

          <div className="panel">
            <p className="panel__title">Цвет</p>
            <div className="checkout-block">
              <Input
                label="Название цвета"
                value={form.colorTitle}
                onChange={(event) => setForm({ ...form, colorTitle: event.target.value })}
              />
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input
                  type="color"
                  value={form.colorHex}
                  onChange={(event) => setForm({ ...form, colorHex: event.target.value })}
                  aria-label="Цвет товара"
                  style={{
                    width: 54, height: 54, borderRadius: 'var(--r-pill)',
                    border: '1px solid var(--c-line-strong)', background: 'none', cursor: 'pointer',
                  }}
                />
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 'var(--fs-sm)', color: 'var(--c-text-dim)' }}>
                  {form.colorHex}
                </span>
              </div>
            </div>
          </div>

          <div className="panel">
            <p className="panel__title">Фотографии</p>
            <p className="admin-note">
              Загрузка изображений подключается вместе с Appwrite Storage.
              До этого карточка показывает фирменный плейсхолдер.
            </p>
          </div>
        </aside>
      </div>
    </>
  )
}
