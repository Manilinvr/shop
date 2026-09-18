/* ==========================================================================
   MANILI — ГЛАВНАЯ (ТЗ §7, §8)

   Состав и порядок блоков приходят из CMS (homepage_blocks), поэтому
   владелец меняет главную из админки, не трогая код.
   ========================================================================== */

import { Link } from 'react-router-dom'
import { Media } from '@/components/media/Media'
import { Marquee, Parallax, Reveal, TextReveal } from '@/components/motion'
import { ProductCard } from '@/components/shop/ProductCard'
import {
  Badge,
  ButtonLink,
  IconArrowRight,
  IconArrowUpRight,
  IconPackage,
  IconShield,
  IconTruck,
  Skeleton,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { backend } from '@/repositories'
import type { Category, Collection, HomepageBlock, Product } from '@/domain/types'
import './home.css'

export default function Home() {
  useSeo({
    title: 'MANILI — одежда для тех, кто в движении',
    description:
      'MANILI — российский бренд одежды. Худи, футболки, кепки и аксессуары. Доставка по всей России.',
    canonical: '/',
  })

  const blocks = useAsync(() => backend.homepage.getBlocks(), [])
  const categories = useAsync(() => backend.catalog.listCategories(), [])
  const collections = useAsync(() => backend.catalog.listCollections(), [])
  const featured = useAsync(
    () => backend.catalog.listProducts({ sort: 'popular', pageSize: 8 }),
    [],
  )
  const fresh = useAsync(
    () => backend.catalog.listProducts({ sort: 'new', pageSize: 4 }),
    [],
  )

  const enabled = (blocks.data ?? []).filter((block) => block.isEnabled)
  const find = (type: HomepageBlock['type']) => enabled.find((block) => block.type === type)

  const hero = find('HERO')
  const marquee = find('MARQUEE')
  const newCollection = find('NEW_COLLECTION')
  const categoriesBlock = find('CATEGORIES')
  const featuredBlock = find('FEATURED_PRODUCTS')
  const editorial = find('EDITORIAL')
  const story = find('STORY')
  const arrivals = find('NEW_ARRIVALS')
  const collectionsBlock = find('COLLECTIONS')

  return (
    <>
      {hero && <HeroSection block={hero} categories={categories.data ?? []} />}

      {marquee && (
        <section className="hm-marquee" aria-label="Слоганы бренда">
          <Marquee
            duration={42}
            items={(marquee.data.items ?? []).flatMap((item, index) => [
              <span key={`t-${index}`} className="hm-marquee__item">
                {item}
              </span>,
              <span key={`d-${index}`} className="hm-marquee__dot" />,
            ])}
          />
        </section>
      )}

      {newCollection && (
        <section className="section container">
          <div className="hm-collection">
            <Reveal mode="mask" className="hm-collection__media">
              <Parallax speed={0.1} scale={1.05}>
                <Media
                  src={newCollection.data.image}
                  alt={newCollection.data.title ?? 'Новая коллекция'}
                  ratio="4 / 5"
                  rounded="none"
                  sizes="(max-width: 899px) 92vw, 55vw"
                />
              </Parallax>
            </Reveal>

            <div className="hm-collection__text">
              <Reveal mode="up">
                <p className="eyebrow">{newCollection.data.eyebrow}</p>
              </Reveal>
              <TextReveal
                as="h2"
                className="hm-collection__title"
                text={newCollection.data.title ?? ''}
                maxChars={14}
                delay={80}
              />
              <Reveal mode="up" delay={180}>
                <p className="hm-collection__body">{newCollection.data.text}</p>
              </Reveal>
              <Reveal mode="up" delay={260}>
                <ButtonLink
                  to={newCollection.data.ctaHref ?? '/collections'}
                  size="lg"
                  iconRight={<IconArrowRight size={17} />}
                >
                  {newCollection.data.ctaLabel ?? 'Смотреть'}
                </ButtonLink>
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {categoriesBlock && (
        <section className="section container">
          <SectionHead
            eyebrow={categoriesBlock.data.eyebrow}
            title={categoriesBlock.data.title}
            action={{ to: '/shop', label: 'Все товары' }}
          />
          <div className="hm-cats">
            {categories.loading &&
              Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} style={{ aspectRatio: '3 / 4', borderRadius: 'var(--r-xl)' }} />
              ))}
            {(categories.data ?? [])
              .filter((category) =>
                categoriesBlock.data.categoryIds?.length
                  ? categoriesBlock.data.categoryIds.includes(category.id)
                  : true,
              )
              .slice(0, 4)
              .map((category, index) => (
                <Reveal key={category.id} mode="up" delay={index * 90}>
                  <CategoryCard category={category} />
                </Reveal>
              ))}
          </div>
        </section>
      )}

      {featuredBlock && (
        <section className="section container">
          <SectionHead
            eyebrow={featuredBlock.data.eyebrow}
            title={featuredBlock.data.title}
            action={{
              to: featuredBlock.data.ctaHref ?? '/shop',
              label: featuredBlock.data.ctaLabel ?? 'Весь каталог',
            }}
          />
          <div className="prail">
            {featured.loading &&
              Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} style={{ aspectRatio: '3 / 4', borderRadius: 'var(--r-lg)' }} />
              ))}
            {(featured.data?.items ?? []).map((product) => (
              <ProductCard key={product.id} product={product} sizes="(max-width: 899px) 60vw, 26vw" />
            ))}
          </div>
        </section>
      )}

      {editorial && <EditorialSection block={editorial} />}

      <section className="section container">
        <div className="hm-perks">
          {PERKS.map((perk, index) => (
            <Reveal key={perk.title} mode="up" delay={index * 70}>
              <div className="hm-perk">
                <span className="hm-perk__icon">{perk.icon}</span>
                <span className="hm-perk__title">{perk.title}</span>
                <span className="hm-perk__text">{perk.text}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {story && <StorySection block={story} />}

      {arrivals && (
        <section className="section container">
          <SectionHead
            eyebrow={arrivals.data.eyebrow}
            title={arrivals.data.title}
            action={{
              to: arrivals.data.ctaHref ?? '/shop?new=1',
              label: arrivals.data.ctaLabel ?? 'Все новинки',
            }}
          />
          <div className="pgrid">
            {fresh.loading &&
              Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} style={{ aspectRatio: '3 / 4', borderRadius: 'var(--r-lg)' }} />
              ))}
            {(fresh.data?.items ?? []).map((product, index) => (
              <Reveal key={product.id} mode="up" delay={index * 80}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {collectionsBlock && (
        <section className="section container">
          <SectionHead
            eyebrow={collectionsBlock.data.eyebrow}
            title={collectionsBlock.data.title}
            action={{ to: '/collections', label: 'Все коллекции' }}
          />
          <div className="hm-cols">
            {(collections.data ?? []).map((collection, index) => (
              <Reveal key={collection.id} mode="up" delay={index * 100}>
                <CollectionCard collection={collection} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

/* --- Блоки --------------------------------------------------------------- */

function HeroSection({ block, categories }: { block: HomepageBlock; categories: Category[] }) {

  return (
    <section className="hero">
      <p className="hero__meta hero__meta--tl">
        {block.data.eyebrow}
        <br />
        55.7558° N / 37.6173° E
      </p>

      <div className="container hero__inner">
        <div>
          <Reveal mode="up">
            <Badge tone="outline">{block.data.subtitle}</Badge>
          </Reveal>
          <TextReveal
            as="h1"
            className="hero__title"
            text={(block.data.title ?? '').replace(/,/g, '')}
            maxChars={9}
            delay={120}
            stagger={130}
          />
          <Reveal mode="up" delay={520}>
            <p className="hero__sub">
              Плотный хлопок, свободный крой и приглушённая палитра города.
              Вещи, которые носят каждый день, а не достают по случаю.
            </p>
          </Reveal>
          <Reveal mode="up" delay={620}>
            <div className="hero__actions">
              <ButtonLink
                to={block.data.ctaHref ?? '/shop'}
                size="lg"
                iconRight={<IconArrowRight size={17} />}
              >
                {block.data.ctaLabel ?? 'Смотреть коллекцию'}
              </ButtonLink>
              <ButtonLink to="/about" size="lg" variant="secondary">
                О бренде
              </ButtonLink>
            </div>
          </Reveal>
        </div>

        <Reveal mode="mask" className="hero__stage" delay={200}>
          <Parallax speed={0.08} scale={1.06}>
            <Media
              src={block.data.image}
              alt="MANILI — новая коллекция"
              ratio="3 / 4"
              rounded="none"
              priority
              sizes="(max-width: 999px) 96vw, 46vw"
            />
          </Parallax>
        </Reveal>

        <div className="hero__side">
          {(block.data.images ?? []).slice(0, 2).map((image, index) => (
            <Reveal key={image} mode="up" delay={340 + index * 120} className="hero__blob-wrap">
              <span className="hero__blob">
                <Media src={image} alt="" ratio="4 / 3" rounded="none" sizes="24vw" />
              </span>
              <span className="hero__blob-label">
                {index === 0 ? 'New drop' : 'Lookbook'}
              </span>
            </Reveal>
          ))}

          <Reveal mode="up" delay={580}>
            <div className="hero__pill">
              <div className="hero__pill-list">
                {categories.slice(0, 4).map((category) => (
                  <Link key={category.id} to={`/shop/${category.slug}`} className="hero__pill-item">
                    {category.title}
                  </Link>
                ))}
              </div>
              <Link
                to="/shop"
                className="hm-cat__arrow"
                aria-label="Перейти в каталог"
                style={{ borderColor: 'var(--c-line-strong)' }}
              >
                <IconArrowUpRight size={16} />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>

      <p className="hero__meta hero__meta--br">
        Real style
        <br />
        No rules
      </p>

      <div className="hero__scroll" aria-hidden="true">
        <span className="hero__scroll-label">Scroll</span>
        <span className="hero__scroll-line" />
      </div>
    </section>
  )
}

function EditorialSection({ block }: { block: HomepageBlock }) {
  const images = block.data.images ?? []
  return (
    <section className="section container hm-editorial">
      <div className="hm-editorial__grid">
        <div className="hm-editorial__sticky">
          <Reveal mode="up">
            <p className="eyebrow">{block.data.eyebrow}</p>
          </Reveal>
          <TextReveal
            as="h2"
            className="hm-editorial__title"
            text={block.data.title ?? ''}
            maxChars={12}
            stagger={90}
          />
          <Reveal mode="up" delay={200}>
            <p className="hm-editorial__body">{block.data.text}</p>
          </Reveal>
          <Reveal mode="up" delay={280}>
            <div style={{ marginTop: 'var(--s-6)' }}>
              <ButtonLink to="/lookbook" variant="secondary" iconRight={<IconArrowUpRight size={16} />}>
                Смотреть lookbook
              </ButtonLink>
            </div>
          </Reveal>
        </div>

        <div className="hm-editorial__stack">
          {images.map((image, index) => (
            <Reveal key={image} mode="mask" delay={index * 120} className="hm-editorial__shot">
              <Parallax speed={0.06 + index * 0.03}>
                <Media
                  src={image}
                  alt=""
                  ratio={index === 1 ? '4 / 3' : '3 / 4'}
                  rounded="none"
                  sizes="(max-width: 899px) 92vw, 52vw"
                />
              </Parallax>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function StorySection({ block }: { block: HomepageBlock }) {
  return (
    <div className="container">
      <section className="section section--inverse hm-story-panel">
        <div className="hm-story">
        <div>
          <Reveal mode="up">
            <p className="eyebrow">{block.data.eyebrow}</p>
          </Reveal>
          <TextReveal
            as="h2"
            className="hm-story__title"
            text={(block.data.title ?? '').replace(/,/g, '')}
            maxChars={12}
            stagger={100}
          />
          <Reveal mode="up" delay={200}>
            <p className="hm-story__body">{block.data.text}</p>
          </Reveal>
          <Reveal mode="up" delay={280}>
            <ButtonLink
              to={block.data.ctaHref ?? '/about'}
              variant="dark"
              size="lg"
              iconRight={<IconArrowRight size={17} />}
            >
              {block.data.ctaLabel ?? 'Узнать больше'}
            </ButtonLink>
          </Reveal>

          <Reveal mode="up" delay={340}>
            <div className="hm-story__stats">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <p className="hm-story__stat-value">{stat.value}</p>
                  <p className="hm-story__stat-label">{stat.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

          <Reveal mode="mask" className="hm-story__media" delay={140}>
            <Media
              src={block.data.image}
              alt=""
              ratio="4 / 5"
              rounded="none"
              sizes="(max-width: 899px) 92vw, 46vw"
            />
          </Reveal>
        </div>
      </section>
    </div>
  )
}

function CategoryCard({ category }: { category: Category }) {
  return (
    <Link to={`/shop/${category.slug}`} className="hm-cat">
      <Media
        src={category.image}
        alt={category.title}
        ratio="3 / 4"
        rounded="none"
        sizes="(max-width: 899px) 46vw, 24vw"
      />
      <span className="hm-cat__overlay" />
      <span className="hm-cat__foot">
        <span className="hm-cat__name">{category.title}</span>
        <span className="hm-cat__arrow">
          <IconArrowUpRight size={16} />
        </span>
      </span>
    </Link>
  )
}

function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <Link to={`/collections/${collection.slug}`} className="hm-col">
      <Media
        src={collection.cover}
        alt={collection.title}
        ratio="3 / 4"
        rounded="none"
        sizes="(max-width: 759px) 92vw, 31vw"
      />
      <span className="hm-col__body">
        <span className="hm-col__name">{collection.title}</span>
        <span className="hm-col__desc">{collection.description}</span>
      </span>
    </Link>
  )
}

function SectionHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string
  title?: string
  action?: { to: string; label: string }
}) {
  return (
    <div className="sec-head">
      <div>
        {eyebrow && (
          <Reveal mode="up">
            <p className="eyebrow sec-head__eyebrow">{eyebrow}</p>
          </Reveal>
        )}
        {title && (
          <Reveal mode="up" delay={80}>
            <h2 className="sec-head__title">{title}</h2>
          </Reveal>
        )}
      </div>
      {action && (
        <Reveal mode="up" delay={160}>
          <ButtonLink
            to={action.to}
            variant="secondary"
            size="sm"
            iconRight={<IconArrowRight size={15} />}
          >
            {action.label}
          </ButtonLink>
        </Reveal>
      )}
    </div>
  )
}

const PERKS = [
  {
    icon: <IconTruck size={20} />,
    title: 'Доставка по России',
    text: 'СДЭК, Почта России и курьер. Бесплатно при заказе от 10 000 ₽.',
  },
  {
    icon: <IconShield size={20} />,
    title: 'Безопасная оплата',
    text: 'Карта или СБП. Данные не хранятся на сайте.',
  },
  {
    icon: <IconPackage size={20} />,
    title: 'Обмен и возврат',
    text: '14 дней на возврат, если вещь не подошла.',
  },
  {
    icon: <IconArrowUpRight size={20} />,
    title: 'Сделано в России',
    text: 'Своё производство, малые партии, контроль качества.',
  },
]

const STATS = [
  { value: '2 500+', label: 'отправленных заказов' },
  { value: '14 дней', label: 'на обмен и возврат' },
  { value: '100%', label: 'хлопок в базовой линии' },
]

export type { Product }
