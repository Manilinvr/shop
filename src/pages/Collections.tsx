/* ==========================================================================
   MANILI — СПИСОК КОЛЛЕКЦИЙ (ТЗ §27)
   ========================================================================== */

import { Link } from 'react-router-dom'
import { Media } from '@/components/media/Media'
import { Parallax, Reveal } from '@/components/motion'
import { Skeleton } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { backend } from '@/repositories'
import './home.css'
import './shop.css'

export default function Collections() {
  useSeo({
    title: 'Коллекции MANILI',
    description: 'Коллекции MANILI: базовая линия, сезонные дропы и ограниченные релизы.',
    canonical: '/collections',
  })

  const collections = useAsync(() => backend.catalog.listCollections(), [])

  return (
    <>
      <div className="container page-head">
        <nav className="crumbs" aria-label="Хлебные крошки">
          <Link to="/">Главная</Link>
          <span className="crumbs__sep">/</span>
          <span>Коллекции</span>
        </nav>
        <Reveal mode="up">
          <h1 className="page-title">Коллекции</h1>
        </Reveal>
        <Reveal mode="up" delay={80}>
          <p className="page-lead">
            Каждая коллекция — законченная история: базовая линия, сезонный дроп
            или ограниченный релиз малым тиражом.
          </p>
        </Reveal>
      </div>

      <div className="container" style={{ paddingBottom: 'var(--section-y)' }}>
        {collections.loading && (
          <div className="hm-cols">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} style={{ aspectRatio: '3 / 4', borderRadius: 'var(--r-xl)' }} />
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gap: 'clamp(24px, 3vw, 56px)' }}>
          {(collections.data ?? []).map((collection, index) => (
            <Reveal key={collection.id} mode="up" delay={index * 90}>
              <Link
                to={`/collections/${collection.slug}`}
                className="hm-collection"
                style={{ display: 'grid' }}
              >
                <div className="hm-collection__media">
                  <Parallax speed={0.07} scale={1.04}>
                    <Media
                      src={collection.cover}
                      alt={collection.title}
                      ratio="16 / 10"
                      rounded="none"
                      sizes="(max-width: 899px) 92vw, 60vw"
                    />
                  </Parallax>
                </div>
                <div className="hm-collection__text">
                  <p className="eyebrow">
                    {collection.releaseDate
                      ? new Date(collection.releaseDate).getFullYear()
                      : 'Коллекция'}
                  </p>
                  <h2 className="hm-collection__title">{collection.title}</h2>
                  <p className="hm-collection__body">{collection.description}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </>
  )
}
