/* ==========================================================================
   MANILI — СТРАНИЦА КОЛЛЕКЦИИ
   ========================================================================== */

import { Link, useParams } from 'react-router-dom'
import { Media } from '@/components/media/Media'
import { Parallax, Reveal, TextReveal } from '@/components/motion'
import { ProductCard } from '@/components/shop/ProductCard'
import { ButtonLink, EmptyState, Skeleton } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { formatDate } from '@/lib/utils'
import { backend } from '@/repositories'
import './home.css'
import './shop.css'

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>()

  const collection = useAsync(() => backend.catalog.getCollectionBySlug(slug ?? ''), [slug])
  const products = useAsync(
    () =>
      backend.catalog.listProducts({
        filters: { collectionSlugs: slug ? [slug] : undefined },
        pageSize: 48,
      }),
    [slug],
  )

  useSeo({
    title: collection.data ? `${collection.data.title} — MANILI` : 'Коллекция',
    description: collection.data?.description ?? undefined,
    canonical: `/collections/${slug}`,
  })

  if (!collection.loading && !collection.data) {
    return (
      <div className="container" style={{ paddingTop: 'calc(var(--header-h) + 80px)', paddingBottom: 'var(--section-y)' }}>
        <EmptyState
          title="Коллекция не найдена"
          text="Возможно, ссылка устарела."
          action={<ButtonLink to="/collections">Все коллекции</ButtonLink>}
        />
      </div>
    )
  }

  return (
    <>
      <div className="container page-head">
        <nav className="crumbs" aria-label="Хлебные крошки">
          <Link to="/">Главная</Link>
          <span className="crumbs__sep">/</span>
          <Link to="/collections">Коллекции</Link>
          <span className="crumbs__sep">/</span>
          <span>{collection.data?.title ?? '…'}</span>
        </nav>
      </div>

      {collection.data && (
        <div className="container" style={{ marginBottom: 'clamp(40px, 6vw, 90px)' }}>
          <Reveal mode="mask" className="hm-collection__media">
            <Parallax speed={0.08} scale={1.05}>
              <Media
                src={collection.data.banner ?? collection.data.cover}
                alt={collection.data.title}
                ratio="21 / 9"
                rounded="none"
                priority
                sizes="96vw"
              />
            </Parallax>
          </Reveal>

          <div style={{ marginTop: 'clamp(24px, 3vw, 44px)', maxWidth: '58ch' }}>
            <Reveal mode="up">
              <p className="eyebrow">
                {collection.data.releaseDate ? formatDate(collection.data.releaseDate) : 'Коллекция'}
              </p>
            </Reveal>
            <TextReveal
              as="h1"
              className="page-title"
              text={collection.data.title.split(' / ')}
              delay={80}
            />
            <Reveal mode="up" delay={180}>
              <p className="page-lead">{collection.data.description}</p>
            </Reveal>
          </div>
        </div>
      )}

      <div className="container" style={{ paddingBottom: 'var(--section-y)' }}>
        {products.loading ? (
          <div className="pgrid">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} style={{ aspectRatio: '3 / 4', borderRadius: 'var(--r-lg)' }} />
            ))}
          </div>
        ) : (products.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            title="Коллекция готовится"
            text="Товары появятся здесь ближе к релизу."
            action={<ButtonLink to="/shop">Весь каталог</ButtonLink>}
          />
        ) : (
          <div className="pgrid">
            {(products.data?.items ?? []).map((product, index) => (
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
