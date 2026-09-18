/* ==========================================================================
   MANILI — КАТАЛОГ (ТЗ §9)
   Фильтры и сортировка живут в URL: ссылку на подборку можно отправить,
   а кнопка «назад» работает как ожидается.
   ========================================================================== */

import { useCallback, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Filters } from '@/components/shop/Filters'
import { ProductCard } from '@/components/shop/ProductCard'
import { Reveal } from '@/components/motion'
import {
  Button,
  Drawer,
  EmptyState,
  IconClose,
  IconFilter,
  Skeleton,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { rublesToKopecks, kopecksToRubles } from '@/domain/money'
import { SIZE_LABELS } from '@/domain/stock'
import type { Size } from '@/domain/types'
import { pluralWithCount } from '@/lib/utils'
import { backend, SORT_LABELS, SORT_OPTIONS } from '@/repositories'
import type { ProductFilters, SortOption } from '@/repositories'
import './shop.css'

const PAGE_SIZE = 12

/** Фильтры читаются из query-параметров, чтобы подборка была ссылкой. */
function parseFilters(params: URLSearchParams, lockedCategory?: string): ProductFilters {
  const list = (key: string) => params.get(key)?.split(',').filter(Boolean)
  return {
    categorySlugs: lockedCategory ? [lockedCategory] : list('category'),
    collectionSlugs: list('collection'),
    sizes: list('size') as Size[] | undefined,
    colors: list('color'),
    minPrice: params.get('from') ? rublesToKopecks(Number(params.get('from'))) : undefined,
    maxPrice: params.get('to') ? rublesToKopecks(Number(params.get('to'))) : undefined,
    inStockOnly: params.get('stock') === '1' || undefined,
    isNew: params.get('new') === '1' || undefined,
    isLimited: params.get('limited') === '1' || undefined,
    search: params.get('q') ?? undefined,
  }
}

export default function Shop() {
  const { categorySlug } = useParams<{ categorySlug: string }>()
  const [params, setParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const filters = useMemo(() => parseFilters(params, categorySlug), [params, categorySlug])
  const sort = (params.get('sort') as SortOption) || 'popular'

  const category = useAsync(
    () => (categorySlug ? backend.catalog.getCategoryBySlug(categorySlug) : Promise.resolve(null)),
    [categorySlug],
  )
  const categories = useAsync(() => backend.catalog.listCategories(), [])
  const collections = useAsync(() => backend.catalog.listCollections(), [])
  const facets = useAsync(() => backend.catalog.getFacets(), [])

  const products = useAsync(
    () => backend.catalog.listProducts({ filters, sort, page: 1, pageSize: page * PAGE_SIZE }),
    [JSON.stringify(filters), sort, page],
  )

  const title = category.data?.title ?? (filters.search ? `Поиск: ${filters.search}` : 'Все товары')

  useSeo({
    title: `${title} — MANILI`,
    description:
      category.data?.description ??
      'Каталог MANILI: худи, футболки, кепки, сумки и аксессуары. Доставка по России.',
    canonical: categorySlug ? `/shop/${categorySlug}` : '/shop',
  })

  /** Пишем фильтры обратно в URL. */
  const applyFilters = useCallback(
    (patch: Partial<ProductFilters>) => {
      const next = { ...filters, ...patch }
      const search = new URLSearchParams()

      if (!categorySlug && next.categorySlugs?.length) search.set('category', next.categorySlugs.join(','))
      if (next.collectionSlugs?.length) search.set('collection', next.collectionSlugs.join(','))
      if (next.sizes?.length) search.set('size', next.sizes.join(','))
      if (next.colors?.length) search.set('color', next.colors.join(','))
      if (next.minPrice !== undefined) search.set('from', String(kopecksToRubles(next.minPrice)))
      if (next.maxPrice !== undefined) search.set('to', String(kopecksToRubles(next.maxPrice)))
      if (next.inStockOnly) search.set('stock', '1')
      if (next.isNew) search.set('new', '1')
      if (next.isLimited) search.set('limited', '1')
      if (next.search) search.set('q', next.search)
      if (sort !== 'popular') search.set('sort', sort)

      setPage(1)
      setParams(search, { replace: true })
    },
    [filters, categorySlug, sort, setParams],
  )

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = []

    filters.collectionSlugs?.forEach((slug) => {
      const collection = collections.data?.find((c) => c.slug === slug)
      chips.push({
        key: `col-${slug}`,
        label: collection?.title ?? slug,
        clear: () =>
          applyFilters({ collectionSlugs: filters.collectionSlugs?.filter((s) => s !== slug) }),
      })
    })
    filters.sizes?.forEach((size) => {
      chips.push({
        key: `size-${size}`,
        label: `Размер ${SIZE_LABELS[size]}`,
        clear: () => applyFilters({ sizes: filters.sizes?.filter((s) => s !== size) }),
      })
    })
    filters.colors?.forEach((code) => {
      const color = facets.data?.colors.find((c) => c.code === code)
      chips.push({
        key: `color-${code}`,
        label: color?.title ?? code,
        clear: () => applyFilters({ colors: filters.colors?.filter((c) => c !== code) }),
      })
    })
    if (!categorySlug) {
      filters.categorySlugs?.forEach((slug) => {
        const cat = categories.data?.find((c) => c.slug === slug)
        chips.push({
          key: `cat-${slug}`,
          label: cat?.title ?? slug,
          clear: () =>
            applyFilters({ categorySlugs: filters.categorySlugs?.filter((s) => s !== slug) }),
        })
      })
    }
    if (filters.inStockOnly) {
      chips.push({ key: 'stock', label: 'В наличии', clear: () => applyFilters({ inStockOnly: undefined }) })
    }
    if (filters.isNew) {
      chips.push({ key: 'new', label: 'Новинки', clear: () => applyFilters({ isNew: undefined }) })
    }
    if (filters.isLimited) {
      chips.push({ key: 'limited', label: 'Limited', clear: () => applyFilters({ isLimited: undefined }) })
    }
    if (filters.search) {
      chips.push({
        key: 'q',
        label: `«${filters.search}»`,
        clear: () => applyFilters({ search: undefined }),
      })
    }
    return chips
  }, [filters, collections.data, categories.data, facets.data, categorySlug, applyFilters])

  const filtersNode = (
    <Filters
      filters={filters}
      facets={facets.data}
      categories={categories.data ?? []}
      collections={collections.data ?? []}
      onChange={applyFilters}
      lockedCategory={categorySlug}
    />
  )

  const total = products.data?.total ?? 0
  const items = products.data?.items ?? []
  const hasMore = products.data?.hasMore ?? false

  return (
    <>
      <div className="container page-head">
        <nav className="crumbs" aria-label="Хлебные крошки">
          <Link to="/">Главная</Link>
          <span className="crumbs__sep">/</span>
          {categorySlug ? (
            <>
              <Link to="/shop">Магазин</Link>
              <span className="crumbs__sep">/</span>
              <span>{title}</span>
            </>
          ) : (
            <span>Магазин</span>
          )}
        </nav>

        <Reveal mode="up">
          <h1 className="page-title">{title}</h1>
        </Reveal>
        {category.data?.description && (
          <Reveal mode="up" delay={100}>
            <p className="page-lead">{category.data.description}</p>
          </Reveal>
        )}
      </div>

      <div className="container" style={{ paddingBottom: 'var(--section-y)' }}>
        <div className="catalog-bar">
          <Button
            variant="secondary"
            size="sm"
            className="catalog-bar__filters-btn"
            iconLeft={<IconFilter size={16} />}
            onClick={() => setFiltersOpen(true)}
          >
            Фильтры{activeChips.length > 0 ? ` (${activeChips.length})` : ''}
          </Button>

          <span className="catalog-bar__count">
            {products.loading && items.length === 0
              ? 'Загружаем…'
              : pluralWithCount(total, ['товар', 'товара', 'товаров'])}
          </span>

          <span className="catalog-bar__spacer" />

          <select
            className="catalog-bar__sort"
            value={sort}
            onChange={(event) => {
              const next = new URLSearchParams(params)
              if (event.target.value === 'popular') next.delete('sort')
              else next.set('sort', event.target.value)
              setPage(1)
              setParams(next, { replace: true })
            }}
            aria-label="Сортировка"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {SORT_LABELS[option]}
              </option>
            ))}
          </select>
        </div>

        {activeChips.length > 0 && (
          <div className="active-filters">
            {activeChips.map((chip) => (
              <button key={chip.key} type="button" className="active-filter" onClick={chip.clear}>
                {chip.label}
                <IconClose size={13} />
              </button>
            ))}
            <button
              type="button"
              className="active-filter"
              onClick={() => applyFilters({
                categorySlugs: categorySlug ? [categorySlug] : undefined,
                collectionSlugs: undefined, sizes: undefined, colors: undefined,
                minPrice: undefined, maxPrice: undefined,
                inStockOnly: undefined, isNew: undefined, isLimited: undefined, search: undefined,
              })}
              style={{ background: 'transparent' }}
            >
              Сбросить всё
            </button>
          </div>
        )}

        <div className="catalog-layout">
          <aside className="catalog-layout__aside">{filtersNode}</aside>

          <div>
            {products.loading && items.length === 0 ? (
              <div className="pgrid">
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} style={{ aspectRatio: '3 / 4', borderRadius: 'var(--r-lg)' }} />
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                title="Ничего не нашлось"
                text="Попробуйте убрать часть фильтров или загляните в весь каталог."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => setParams(new URLSearchParams(), { replace: true })}
                  >
                    Сбросить фильтры
                  </Button>
                }
              />
            ) : (
              <>
                <div className="pgrid">
                  {items.map((product, index) => (
                    <Reveal key={product.id} mode="up" delay={Math.min(index, 7) * 60}>
                      <ProductCard product={product} priority={index < 4} />
                    </Reveal>
                  ))}
                </div>

                {hasMore && (
                  <div className="load-more">
                    <Button
                      variant="secondary"
                      size="lg"
                      loading={products.loading}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Показать ещё
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Фильтры" side="left"
        footer={
          <Button block size="lg" onClick={() => setFiltersOpen(false)}>
            Показать {total > 0 ? pluralWithCount(total, ['товар', 'товара', 'товаров']) : 'результаты'}
          </Button>
        }
      >
        {filtersNode}
      </Drawer>
    </>
  )
}
