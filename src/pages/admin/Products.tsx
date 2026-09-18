/* ==========================================================================
   MANILI — ТОВАРЫ В АДМИНКЕ (ТЗ §26)
   ========================================================================== */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Media } from '@/components/media/Media'
import { Badge, Button, EmptyState, IconPlus, Skeleton } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { formatPrice } from '@/domain/money'
import { availableQuantity, productAvailability, AVAILABILITY_LABELS } from '@/domain/stock'
import type { PublishStatus } from '@/domain/types'
import { debounce, pluralWithCount } from '@/lib/utils'
import { backend } from '@/repositories'
import './admin.css'

const STATUS_LABELS: Record<PublishStatus, string> = {
  DRAFT: 'Черновик',
  PUBLISHED: 'Опубликован',
  HIDDEN: 'Скрыт',
  ARCHIVED: 'Архив',
}

export default function AdminProducts() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  const products = useAsync(
    () => backend.catalog.listProducts({ filters: { search: query || undefined }, pageSize: 100 }),
    [query],
  )
  const categories = useAsync(() => backend.catalog.listCategories(), [])
  const categoryById = Object.fromEntries((categories.data ?? []).map((c) => [c.id, c.title]))

  const applySearch = debounce((value: string) => setQuery(value), 260)
  const items = products.data?.items ?? []

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-head__title">Товары</h1>
          <p className="admin-head__sub">
            {products.data
              ? pluralWithCount(products.data.total, ['товар', 'товара', 'товаров'])
              : 'Загружаем…'}
          </p>
        </div>
        <div className="admin-head__actions">
          <Button size="sm" iconLeft={<IconPlus size={15} />} onClick={() => navigate('/admin/products/new')}>
            Новый товар
          </Button>
        </div>
      </div>

      <div className="admin-filters">
        <input
          className="admin-search"
          type="search"
          placeholder="Название, артикул или тег"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            applySearch(event.target.value)
          }}
          aria-label="Поиск по товарам"
        />
      </div>

      {products.loading && items.length === 0 ? (
        <Skeleton style={{ height: 320, borderRadius: 'var(--r-lg)' }} />
      ) : items.length === 0 ? (
        <div className="table-wrap">
          <EmptyState title="Товаров не найдено" text="Измените запрос или добавьте первый товар." />
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-scroll">
            <table className="table table--clickable">
              <thead>
                <tr>
                  <th style={{ width: 60 }}></th>
                  <th>Название</th>
                  <th>Артикул</th>
                  <th>Категория</th>
                  <th>Цена</th>
                  <th>Остаток</th>
                  <th>Наличие</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {items.map((product) => {
                  const stock = product.variants.reduce((sum, v) => sum + availableQuantity(v), 0)
                  const availability = productAvailability(product)
                  return (
                    <tr key={product.id} onClick={() => navigate(`/admin/products/${product.id}`)}>
                      <td>
                        <div style={{ width: 42 }}>
                          <Media
                            src={product.images[0]?.url}
                            alt=""
                            ratio="3 / 4"
                            rounded="sm"
                            sizes="42px"
                          />
                        </div>
                      </td>
                      <td className="td--strong td--wrap" style={{ color: 'var(--c-cream-100)' }}>
                        {product.title}
                      </td>
                      <td className="td--mono">{product.sku}</td>
                      <td>{categoryById[product.categoryId] ?? '—'}</td>
                      <td className="td--mono td--strong" style={{ color: 'var(--c-cream-100)' }}>
                        {formatPrice(product.price)}
                      </td>
                      <td className="td--mono">{stock} шт.</td>
                      <td>
                        <Badge
                          tone={
                            availability === 'IN_STOCK'
                              ? 'success'
                              : availability === 'LOW_STOCK'
                                ? 'warning'
                                : 'danger'
                          }
                          dot
                        >
                          {AVAILABILITY_LABELS[availability]}
                        </Badge>
                      </td>
                      <td>
                        <Badge tone={product.status === 'PUBLISHED' ? 'neutral' : 'outline'}>
                          {STATUS_LABELS[product.status]}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="admin-note" style={{ marginTop: 20 }}>
        Товары, у которых заканчиваются размеры, видно на{' '}
        <Link to="/admin" style={{ textDecoration: 'underline', color: 'var(--c-cream-200)' }}>
          дашборде
        </Link>
        .
      </div>
    </>
  )
}
