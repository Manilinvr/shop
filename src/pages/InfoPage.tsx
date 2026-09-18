/* ==========================================================================
   MANILI — ИНФОРМАЦИОННЫЕ СТРАНИЦЫ
   Доставка и оплата, возврат, таблица размеров.
   ========================================================================== */

import { Link } from 'react-router-dom'
import { Reveal } from '@/components/motion'
import { Accordion, IconCard, IconPackage, IconTruck } from '@/components/ui'
import { useSeo } from '@/hooks/useSeo'
import './shop.css'
import './home.css'
import './product.css'

type PageKey = 'delivery' | 'returns' | 'sizes'

const TITLES: Record<PageKey, { title: string; lead: string; description: string }> = {
  delivery: {
    title: 'Доставка и оплата',
    lead: 'Отправляем по всей России. Собираем заказ 1–2 рабочих дня, дальше — сроки службы доставки.',
    description: 'Способы доставки и оплаты MANILI: СДЭК, Почта России, курьер, самовывоз. Оплата картой и через СБП.',
  },
  returns: {
    title: 'Обмен и возврат',
    lead: '14 дней на возврат, если вещь не подошла и сохранила товарный вид с бирками.',
    description: 'Условия обмена и возврата товаров MANILI.',
  },
  sizes: {
    title: 'Таблица размеров',
    lead: 'Замеры изделия в сантиметрах. Крой свободный: если вы между размерами — берите меньший.',
    description: 'Таблица размеров MANILI: худи, футболки, лонгсливы.',
  },
}

const DELIVERY_OPTIONS = [
  { icon: <IconTruck size={20} />, title: 'СДЭК — пункт выдачи', text: '1–5 дней, от 350 ₽. Более 2000 ПВЗ по России.' },
  { icon: <IconTruck size={20} />, title: 'СДЭК — курьер', text: '1–6 дней, от 400 ₽. Курьер привезёт по адресу.' },
  { icon: <IconPackage size={20} />, title: 'Почта России', text: '3–10 дней, от 300 ₽. Доставка в отделение.' },
  { icon: <IconPackage size={20} />, title: 'Самовывоз в Москве', text: '1–2 дня, бесплатно. Шоурум бренда.' },
]

const PAYMENT_OPTIONS = [
  { icon: <IconCard size={20} />, title: 'Банковская карта', text: 'Visa, Mastercard, МИР. Оплата на стороне банка.' },
  { icon: <IconCard size={20} />, title: 'СБП', text: 'QR-код из приложения вашего банка, без комиссии.' },
]

const SIZE_TABLES = {
  tops: {
    title: 'Худи, свитшоты, лонгсливы',
    headers: ['Размер', 'Грудь', 'Длина', 'Рукав'],
    rows: [
      ['XS', '96', '64', '58'], ['S', '102', '66', '59'], ['M', '108', '68', '61'],
      ['L', '114', '70', '62'], ['XL', '120', '72', '64'], ['XXL', '126', '74', '65'],
    ],
  },
  tshirts: {
    title: 'Футболки',
    headers: ['Размер', 'Грудь', 'Длина', 'Плечо'],
    rows: [
      ['XS', '94', '66', '44'], ['S', '100', '68', '46'], ['M', '106', '70', '48'],
      ['L', '112', '72', '50'], ['XL', '118', '74', '52'], ['XXL', '124', '76', '54'],
    ],
  },
}

export default function InfoPage({ page }: { page: PageKey }) {
  const meta = TITLES[page]
  useSeo({ title: meta.title, description: meta.description, canonical: `/${page}` })

  return (
    <>
      <div className="container page-head">
        <nav className="crumbs" aria-label="Хлебные крошки">
          <Link to="/">Главная</Link>
          <span className="crumbs__sep">/</span>
          <span>{meta.title}</span>
        </nav>
        <Reveal mode="up">
          <h1 className="page-title">{meta.title}</h1>
        </Reveal>
        <Reveal mode="up" delay={80}>
          <p className="page-lead">{meta.lead}</p>
        </Reveal>
      </div>

      <div className="container" style={{ paddingBottom: 'var(--section-y)' }}>
        {page === 'delivery' && (
          <>
            <h2 className="sec-head__title" style={{ fontSize: 'var(--fs-xl)', marginBottom: 'var(--s-5)' }}>
              Способы доставки
            </h2>
            <div className="hm-perks" style={{ marginBottom: 'clamp(40px, 5vw, 72px)' }}>
              {DELIVERY_OPTIONS.map((option, index) => (
                <Reveal key={option.title} mode="up" delay={index * 70}>
                  <div className="hm-perk">
                    <span className="hm-perk__icon">{option.icon}</span>
                    <span className="hm-perk__title">{option.title}</span>
                    <span className="hm-perk__text">{option.text}</span>
                  </div>
                </Reveal>
              ))}
            </div>

            <h2 className="sec-head__title" style={{ fontSize: 'var(--fs-xl)', marginBottom: 'var(--s-5)' }}>
              Способы оплаты
            </h2>
            <div className="hm-perks" style={{ marginBottom: 'clamp(40px, 5vw, 72px)' }}>
              {PAYMENT_OPTIONS.map((option, index) => (
                <Reveal key={option.title} mode="up" delay={index * 70}>
                  <div className="hm-perk">
                    <span className="hm-perk__icon">{option.icon}</span>
                    <span className="hm-perk__title">{option.title}</span>
                    <span className="hm-perk__text">{option.text}</span>
                  </div>
                </Reveal>
              ))}
            </div>

            <div className="container-narrow" style={{ paddingInline: 0 }}>
              <Accordion
                items={[
                  {
                    id: 'free',
                    title: 'Когда доставка бесплатная',
                    content: <p>При заказе от 10 000 ₽ доставка по России бесплатна — скидка применится автоматически на шаге оформления.</p>,
                  },
                  {
                    id: 'time',
                    title: 'Сколько собирается заказ',
                    content: <p>1–2 рабочих дня. После передачи в службу доставки вы получите трек-номер на почту и в SMS.</p>,
                  },
                  {
                    id: 'track',
                    title: 'Как отследить заказ',
                    content: (
                      <p>
                        В{' '}
                        <Link to="/account/orders" style={{ textDecoration: 'underline' }}>личном кабинете</Link>{' '}
                        или по{' '}
                        <Link to="/order-lookup" style={{ textDecoration: 'underline' }}>номеру заказа и телефону</Link>.
                      </p>
                    ),
                  },
                ]}
              />
            </div>
          </>
        )}

        {page === 'returns' && (
          <div className="container-narrow" style={{ paddingInline: 0 }}>
            <Accordion
              defaultOpenId="terms"
              items={[
                {
                  id: 'terms',
                  title: 'Условия возврата',
                  content: (
                    <div style={{ display: 'grid', gap: 12 }}>
                      <p>Вернуть вещь можно в течение 14 дней с момента получения.</p>
                      <p>Вещь должна сохранить товарный вид, ярлыки и бирки, не быть в носке и стирке.</p>
                      <p>Возврат денег — на ту же карту, с которой прошла оплата, в течение 10 рабочих дней.</p>
                    </div>
                  ),
                },
                {
                  id: 'how',
                  title: 'Как оформить возврат',
                  content: (
                    <div style={{ display: 'grid', gap: 12 }}>
                      <p>1. Напишите нам на почту с номером заказа и причиной возврата.</p>
                      <p>2. Мы пришлём бланк и адрес для отправки.</p>
                      <p>3. Отправьте посылку — после получения и проверки вернём деньги.</p>
                    </div>
                  ),
                },
                {
                  id: 'exchange',
                  title: 'Обмен на другой размер',
                  content: <p>Обмен оформляется как возврат и новый заказ — так быстрее и вы точно не останетесь без нужного размера.</p>,
                },
                {
                  id: 'defect',
                  title: 'Если пришёл брак',
                  content: <p>Пришлите фото на почту — заменим или вернём деньги и оплатим обратную пересылку.</p>,
                },
              ]}
            />
          </div>
        )}

        {page === 'sizes' && (
          <div style={{ display: 'grid', gap: 'clamp(32px, 4vw, 56px)', maxWidth: 760 }}>
            {Object.values(SIZE_TABLES).map((table) => (
              <Reveal key={table.title} mode="up">
                <div>
                  <h2
                    className="sec-head__title"
                    style={{ fontSize: 'var(--fs-lg)', marginBottom: 'var(--s-4)' }}
                  >
                    {table.title}
                  </h2>
                  <table className="size-table">
                    <thead>
                      <tr>
                        {table.headers.map((header) => (
                          <th key={header}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row) => (
                        <tr key={row[0]}>
                          {row.map((cell, i) => (
                            <td key={i}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Reveal>
            ))}
            <p style={{ color: 'var(--c-text-muted)', fontSize: 'var(--fs-sm)', lineHeight: 1.7 }}>
              Сомневаетесь в размере — напишите нам рост и обычный размер, подскажем.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
