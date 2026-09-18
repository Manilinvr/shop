/* ==========================================================================
   MANILI — LOOKBOOK
   Журнальный разворот: крупные кадры со скроллом и параллаксом.
   ========================================================================== */

import { Link } from 'react-router-dom'
import { Media } from '@/components/media/Media'
import { Marquee, Parallax, Reveal, TextReveal } from '@/components/motion'
import { ButtonLink, IconArrowRight } from '@/components/ui'
import { useSeo } from '@/hooks/useSeo'
import './home.css'
import './shop.css'

const SHOTS = [
  { src: 'placeholder:editorial/1', ratio: '4 / 5', caption: 'Same city — different energy' },
  { src: 'placeholder:editorial/4', ratio: '16 / 10', caption: 'Autumn / Winter 26' },
  { src: 'placeholder:editorial/2', ratio: '3 / 4', caption: 'Basic line' },
  { src: 'placeholder:editorial/6', ratio: '4 / 3', caption: 'Street' },
  { src: 'placeholder:editorial/3', ratio: '4 / 5', caption: 'Limited run' },
  { src: 'placeholder:editorial/7', ratio: '16 / 9', caption: 'Real people' },
]

export default function Lookbook() {
  useSeo({
    title: 'Lookbook MANILI',
    description: 'Съёмки MANILI: как вещи выглядят в движении, на улице и на реальных людях.',
    canonical: '/lookbook',
  })

  return (
    <>
      <div className="container page-head">
        <nav className="crumbs" aria-label="Хлебные крошки">
          <Link to="/">Главная</Link>
          <span className="crumbs__sep">/</span>
          <span>Lookbook</span>
        </nav>
        <TextReveal as="h1" className="page-title" text={['Clothes for', 'real people']} stagger={120} />
      </div>

      <section className="hm-marquee" style={{ marginBottom: 'clamp(32px, 5vw, 72px)' }}>
        <Marquee
          duration={46}
          items={['REAL STYLE', 'NO RULES', 'SAME CITY', 'DIFFERENT ENERGY'].flatMap((text, i) => [
            <span key={`t${i}`} className="hm-marquee__item">{text}</span>,
            <span key={`d${i}`} className="hm-marquee__dot" />,
          ])}
        />
      </section>

      <div className="container" style={{ display: 'grid', gap: 'clamp(24px, 4vw, 72px)', paddingBottom: 'var(--section-y)' }}>
        {SHOTS.map((shot, index) => (
          <Reveal
            key={shot.src}
            mode="mask"
            className="hm-editorial__shot"
            style={{
              maxWidth: index % 3 === 0 ? '100%' : index % 3 === 1 ? '78%' : '62%',
              marginLeft: index % 2 === 0 ? 0 : 'auto',
            }}
          >
            <Parallax speed={0.05 + (index % 3) * 0.03}>
              <Media
                src={shot.src}
                alt={shot.caption}
                ratio={shot.ratio}
                rounded="none"
                priority={index === 0}
                sizes="(max-width: 899px) 92vw, 70vw"
              />
            </Parallax>
            <p className="eyebrow" style={{ marginTop: 14 }}>
              {shot.caption}
            </p>
          </Reveal>
        ))}
      </div>

      <section className="section container" style={{ textAlign: 'center', paddingTop: 0 }}>
        <Reveal mode="up">
          <ButtonLink to="/shop" size="lg" iconRight={<IconArrowRight size={17} />}>
            Купить из съёмки
          </ButtonLink>
        </Reveal>
      </section>
    </>
  )
}
