/* ==========================================================================
   MANILI — ФИЛЬТРЫ КАТАЛОГА (ТЗ §9)
   Один и тот же компонент используется в боковой панели на десктопе
   и в выдвижной панели на мобильном.
   ========================================================================== */

import { Chip } from '@/components/ui'
import type { CatalogFacets, ProductFilters } from '@/repositories'
import { SIZE_LABELS, sizeOrder } from '@/domain/stock'
import type { Category, Collection, Size } from '@/domain/types'
import { kopecksToRubles, rublesToKopecks } from '@/domain/money'

export interface FiltersProps {
  filters: ProductFilters
  facets: CatalogFacets | null
  categories: Category[]
  collections: Collection[]
  onChange: (patch: Partial<ProductFilters>) => void
  /** Категория зафиксирована маршрутом (/shop/hoodies) — скрываем её выбор. */
  lockedCategory?: string
}

export function Filters({
  filters,
  facets,
  categories,
  collections,
  onChange,
  lockedCategory,
}: FiltersProps) {
  const toggleInList = <T,>(list: T[] | undefined, value: T): T[] => {
    const current = list ?? []
    return current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
  }

  return (
    <div className="filters">
      {!lockedCategory && (
        <div className="filter-group">
          <p className="filter-group__title">Категория</p>
          <div className="filter-chips">
            {categories.map((category) => (
              <Chip
                key={category.id}
                selected={filters.categorySlugs?.includes(category.slug)}
                onClick={() =>
                  onChange({ categorySlugs: toggleInList(filters.categorySlugs, category.slug) })
                }
              >
                {category.title}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div className="filter-group">
        <p className="filter-group__title">Коллекция</p>
        <div className="filter-chips">
          {collections.map((collection) => (
            <Chip
              key={collection.id}
              selected={filters.collectionSlugs?.includes(collection.slug)}
              onClick={() =>
                onChange({ collectionSlugs: toggleInList(filters.collectionSlugs, collection.slug) })
              }
            >
              {collection.title}
            </Chip>
          ))}
        </div>
      </div>

      {facets && facets.sizes.length > 0 && (
        <div className="filter-group">
          <p className="filter-group__title">Размер</p>
          <div className="filter-chips">
            {[...facets.sizes].sort((a, b) => sizeOrder(a) - sizeOrder(b)).map((size: Size) => (
              <Chip
                key={size}
                selected={filters.sizes?.includes(size)}
                onClick={() => onChange({ sizes: toggleInList(filters.sizes, size) })}
              >
                {SIZE_LABELS[size]}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {facets && facets.colors.length > 0 && (
        <div className="filter-group">
          <p className="filter-group__title">Цвет</p>
          <div className="filter-colors">
            {facets.colors.map((color) => (
              <button
                key={color.code}
                type="button"
                className="filter-color"
                data-selected={filters.colors?.includes(color.code) ? 'true' : undefined}
                onClick={() => onChange({ colors: toggleInList(filters.colors, color.code) })}
                aria-pressed={filters.colors?.includes(color.code) ?? false}
              >
                <span className="filter-color__swatch" style={{ background: color.hex }} />
                {color.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {facets && (
        <div className="filter-group">
          <p className="filter-group__title">Цена, ₽</p>
          <div className="filter-price">
            <div className="filter-price__inputs">
              <input
                className="filter-price__input"
                type="number"
                inputMode="numeric"
                placeholder={String(Math.floor(kopecksToRubles(facets.minPrice)))}
                value={filters.minPrice !== undefined ? kopecksToRubles(filters.minPrice) : ''}
                onChange={(event) =>
                  onChange({
                    minPrice: event.target.value ? rublesToKopecks(Number(event.target.value)) : undefined,
                  })
                }
                aria-label="Цена от"
              />
              <span className="filter-price__dash">—</span>
              <input
                className="filter-price__input"
                type="number"
                inputMode="numeric"
                placeholder={String(Math.ceil(kopecksToRubles(facets.maxPrice)))}
                value={filters.maxPrice !== undefined ? kopecksToRubles(filters.maxPrice) : ''}
                onChange={(event) =>
                  onChange({
                    maxPrice: event.target.value ? rublesToKopecks(Number(event.target.value)) : undefined,
                  })
                }
                aria-label="Цена до"
              />
            </div>
          </div>
        </div>
      )}

      <div className="filter-group">
        <p className="filter-group__title">Ещё</p>
        <div className="filter-chips">
          <Chip
            selected={filters.inStockOnly}
            onClick={() => onChange({ inStockOnly: filters.inStockOnly ? undefined : true })}
          >
            Только в наличии
          </Chip>
          <Chip
            selected={filters.isNew}
            onClick={() => onChange({ isNew: filters.isNew ? undefined : true })}
          >
            Новинки
          </Chip>
          <Chip
            selected={filters.isLimited}
            onClick={() => onChange({ isLimited: filters.isLimited ? undefined : true })}
          >
            Limited
          </Chip>
        </div>
      </div>
    </div>
  )
}
