/* ==========================================================================
   MANILI — ПОИСК ПО КАТАЛОГУ (ТЗ §9)
   Полноэкранный оверлей с живой подсказкой.
   ========================================================================== */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Media } from '@/components/media/Media'
import { IconButton, IconClose, IconSearch, Spinner } from '@/components/ui'
import { useScrollLock } from '@/hooks/useScrollLock'
import { formatPrice } from '@/domain/money'
import { debounce } from '@/lib/utils'
import { backend } from '@/repositories'
import type { Product } from '@/domain/types'

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  useScrollLock(open)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      // Небольшая задержка: поле появляется вместе с анимацией оверлея.
      const timer = setTimeout(() => inputRef.current?.focus(), 80)
      return () => clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const search = useMemo(
    () =>
      debounce(async (value: string) => {
        if (value.trim().length < 2) {
          setResults([])
          setLoading(false)
          return
        }
        try {
          const page = await backend.catalog.listProducts({
            filters: { search: value },
            pageSize: 6,
          })
          setResults(page.items)
        } catch {
          setResults([])
        } finally {
          setLoading(false)
        }
      }, 220),
    [],
  )

  if (!open) return null

  return (
    <div
      className="header__search"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="header__search-inner">
        <div className="header__search-field">
          <IconSearch size={22} />
          <input
            ref={inputRef}
            className="header__search-input"
            type="search"
            placeholder="Что ищете?"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setLoading(event.target.value.trim().length >= 2)
              search(event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && query.trim()) {
                navigate(`/shop?q=${encodeURIComponent(query.trim())}`)
                onClose()
              }
            }}
          />
          <IconButton label="Закрыть поиск" onClick={onClose} tone="filled">
            <IconClose size={18} />
          </IconButton>
        </div>

        {loading && <Spinner center />}

        {!loading && results.length > 0 && (
          <div className="header__search-results">
            {results.map((product) => (
              <button
                key={product.id}
                type="button"
                className="header__search-row"
                onClick={() => {
                  navigate(`/product/${product.slug}`)
                  onClose()
                }}
              >
                <Media
                  src={product.images[0]?.url}
                  alt={product.title}
                  className="header__search-thumb"
                  ratio="1 / 1"
                  rounded="sm"
                  sizes="56px"
                />
                <span style={{ textAlign: 'left', flex: 1 }}>
                  <span className="header__search-title" style={{ display: 'block' }}>
                    {product.title}
                  </span>
                  <span className="header__search-meta">{formatPrice(product.price)}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <p style={{ marginTop: 28, textAlign: 'center', color: 'var(--c-text-muted)' }}>
            Ничего не нашли. Попробуйте другой запрос.
          </p>
        )}
      </div>
    </div>
  )
}
