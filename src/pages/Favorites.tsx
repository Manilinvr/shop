/* ==========================================================================
   MANILI — ИЗБРАННОЕ (ТЗ §11)
   ========================================================================== */

import { Link } from 'react-router-dom'
import { ProductCard } from '@/components/shop/ProductCard'
import { Reveal } from '@/components/motion'
import { ButtonLink, EmptyState, Skeleton } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { pluralWithCount } from '@/lib/utils'
import { backend } from '@/repositories'
import { useAuth } from '@/store/auth'
import { useFavorites } from '@/store/favorites'
import './shop.css'

export default function Favorites() {
  useSeo({ title: 'Избранное', canonical: '/favorites', noIndex: true })

  const ids = useFavorites((state) => state.ids)
  const user = useAuth((state) => state.user)

  const products = useAsync(
    () => backend.catalog.getProductsByIds(ids),
    [ids.join(',')],
    { skip: ids.length === 0 },
  )

  return (
    <>
      <div className="container page-head">
        <nav className="crumbs" aria-label="Хлебные крошки">
          <Link to="/">Главная</Link>
          <span className="crumbs__sep">/</span>
          <span>Избранное</span>
        </nav>
        <Reveal mode="up">
          <h1 className="page-title">Избранное</h1>
        </Reveal>
        {ids.length > 0 && (
          <Reveal mode="up" delay={80}>
            <p className="page-lead">
              {pluralWithCount(ids.length, ['вещь', 'вещи', 'вещей'])} в списке.
              {!user && ' Войдите, чтобы избранное сохранилось на всех устройствах.'}
            </p>
          </Reveal>
        )}
      </div>

      <div className="container" style={{ paddingBottom: 'var(--section-y)' }}>
        {ids.length === 0 ? (
          <EmptyState
            title="Пока ничего не отложено"
            text="Нажимайте на сердечко в карточке товара — вещи будут собираться здесь."
            action={<ButtonLink to="/shop">В каталог</ButtonLink>}
          />
        ) : products.loading ? (
          <div className="pgrid">
            {ids.slice(0, 8).map((id) => (
              <Skeleton key={id} style={{ aspectRatio: '3 / 4', borderRadius: 'var(--r-lg)' }} />
            ))}
          </div>
        ) : (
          <div className="pgrid">
            {(products.data ?? []).map((product, index) => (
              <Reveal key={product.id} mode="up" delay={Math.min(index, 7) * 60}>
                <ProductCard product={product} priority={index < 4} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
