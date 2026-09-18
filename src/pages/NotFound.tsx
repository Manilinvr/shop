import { ButtonLink } from '@/components/ui'
import { Reveal } from '@/components/motion'
import { useSeo } from '@/hooks/useSeo'
import './shop.css'

export default function NotFound() {
  useSeo({ title: 'Страница не найдена', noIndex: true })

  return (
    <div
      className="container"
      style={{
        minHeight: '70svh',
        display: 'grid',
        placeContent: 'center',
        textAlign: 'center',
        gap: 24,
        paddingTop: 'calc(var(--header-h) + 60px)',
        paddingBottom: 'var(--section-y)',
      }}
    >
      <Reveal mode="up">
        <p
          className="display"
          style={{ fontSize: 'var(--fs-4xl)', color: 'var(--c-cream-100)', lineHeight: 0.85 }}
        >
          404
        </p>
      </Reveal>
      <Reveal mode="up" delay={100}>
        <h1 className="page-title" style={{ fontSize: 'var(--fs-xl)' }}>
          Такой страницы нет
        </h1>
      </Reveal>
      <Reveal mode="up" delay={160}>
        <p style={{ color: 'var(--c-text-dim)', maxWidth: '42ch', marginInline: 'auto', lineHeight: 1.7 }}>
          Возможно, вещь распродана, а ссылка устарела. Загляните в каталог — там точно есть что-то ваше.
        </p>
      </Reveal>
      <Reveal mode="up" delay={220}>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <ButtonLink to="/shop" size="lg">
            В каталог
          </ButtonLink>
          <ButtonLink to="/" size="lg" variant="secondary">
            На главную
          </ButtonLink>
        </div>
      </Reveal>
    </div>
  )
}
