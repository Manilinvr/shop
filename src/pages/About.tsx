/* ==========================================================================
   MANILI — О БРЕНДЕ
   ========================================================================== */

import { Link } from 'react-router-dom'
import { Media } from '@/components/media/Media'
import { Parallax, Reveal, TextReveal } from '@/components/motion'
import { ButtonLink, IconArrowRight } from '@/components/ui'
import { useSeo } from '@/hooks/useSeo'
import './home.css'
import './shop.css'

const PRINCIPLES = [
  {
    title: 'Ткань решает всё',
    text: 'Плотный хлопок, который держит форму после десятка стирок. Мы не экономим на граммаже — вещь должна жить годами, а не сезон.',
  },
  {
    title: 'Малые партии',
    text: 'Мы не шьём тысячами. Небольшой тираж позволяет проверять каждую единицу и не сливать остатки скидками.',
  },
  {
    title: 'Люди, а не манекены',
    text: 'В съёмках участвуют те, кто реально носит MANILI. Поэтому на фото видно, как вещь ведёт себя в движении.',
  },
  {
    title: 'Производство в России',
    text: 'Своё производство и короткая цепочка: от лекала до отправки мы контролируем каждый шаг.',
  },
]

export default function About() {
  useSeo({
    title: 'О бренде MANILI',
    description:
      'MANILI — российский бренд одежды. Плотный хлопок, свободный крой, малые партии, производство в России.',
    canonical: '/about',
  })

  return (
    <>
      <div className="container page-head">
        <nav className="crumbs" aria-label="Хлебные крошки">
          <Link to="/">Главная</Link>
          <span className="crumbs__sep">/</span>
          <span>О нас</span>
        </nav>
        <TextReveal
          as="h1"
          className="page-title"
          text={['Одежда,', 'культура,', 'люди']}
          stagger={110}
        />
        <Reveal mode="up" delay={340}>
          <p className="page-lead">
            MANILI — это не просто одежда. Это сообщество, идея, движение. Мы создаём вещи
            для тех, кто ценит свободу, культуру и людей вокруг. Мы не следуем трендам —
            мы создаём их вместе с вами.
          </p>
        </Reveal>
      </div>

      <div className="container">
        <Reveal mode="mask" className="hm-collection__media">
          <Parallax speed={0.08} scale={1.05}>
            <Media
              src="placeholder:editorial/2"
              alt="MANILI"
              ratio="21 / 9"
              rounded="none"
              priority
              sizes="96vw"
            />
          </Parallax>
        </Reveal>
      </div>

      <section className="section container">
        <div className="hm-editorial__grid">
          <div className="hm-editorial__sticky">
            <Reveal mode="up">
              <p className="eyebrow">Как мы работаем</p>
            </Reveal>
            <Reveal mode="up" delay={80}>
              <h2 className="hm-editorial__title">Принципы</h2>
            </Reveal>
            <Reveal mode="up" delay={160}>
              <p className="hm-editorial__body">
                Четыре правила, по которым мы отбираем ткани, кроим и отправляем заказы.
                Они не менялись с первого дропа.
              </p>
            </Reveal>
          </div>

          <div style={{ display: 'grid', gap: 'clamp(14px, 1.8vw, 24px)' }}>
            {PRINCIPLES.map((principle, index) => (
              <Reveal key={principle.title} mode="up" delay={index * 80}>
                <div className="hm-perk" style={{ gap: 14 }}>
                  <span className="eyebrow">0{index + 1}</span>
                  <span className="hm-perk__title" style={{ fontSize: 'var(--fs-lg)' }}>
                    {principle.title}
                  </span>
                  <span className="hm-perk__text" style={{ fontSize: 'var(--fs-md)', lineHeight: 1.7 }}>
                    {principle.text}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="hm-editorial__stack" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', display: 'grid' }}>
          {['placeholder:editorial/5', 'placeholder:editorial/6', 'placeholder:editorial/7'].map((image, index) => (
            <Reveal key={image} mode="mask" delay={index * 110} className="hm-editorial__shot">
              <Media src={image} alt="" ratio="3 / 4" rounded="none" sizes="(max-width: 899px) 92vw, 31vw" />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section container" style={{ textAlign: 'center' }}>
        <Reveal mode="up">
          <h2 className="sec-head__title" style={{ maxWidth: '20ch', marginInline: 'auto' }}>
            Смотрите, что есть сейчас
          </h2>
        </Reveal>
        <Reveal mode="up" delay={100}>
          <div style={{ marginTop: 'var(--s-6)' }}>
            <ButtonLink to="/shop" size="lg" iconRight={<IconArrowRight size={17} />}>
              В каталог
            </ButtonLink>
          </div>
        </Reveal>
      </section>
    </>
  )
}
