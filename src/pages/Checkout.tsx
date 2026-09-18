/* ==========================================================================
   MANILI — ОФОРМЛЕНИЕ ЗАКАЗА (ТЗ §14)

   Четыре шага: контакты → доставка → оплата → подтверждение.
   Итоговую сумму, наличие и промокод пересчитывает сервер при создании
   заказа: всё, что видно здесь, — предварительный расчёт (ТЗ §15, §37).
   ========================================================================== */

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Media } from '@/components/media/Media'
import {
  Button,
  ButtonLink,
  Checkbox,
  EmptyState,
  IconArrowLeft,
  IconCard,
  IconCheck,
  IconTruck,
  Input,
  RadioCard,
  Spinner,
  Textarea,
  showToast,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import { formatPrice } from '@/domain/money'
import { SIZE_LABELS } from '@/domain/stock'
import type { DeliveryOption, PaymentMethod, PickupPoint } from '@/domain/types'
import { cx, formatPhone, isValidEmail, isValidPhone, normalizePhone, uid } from '@/lib/utils'
import { backend, toUserMessage } from '@/repositories'
import { useAuth } from '@/store/auth'
import { useCart } from '@/store/cart'
import './checkout.css'
import './shop.css'

type Step = 1 | 2 | 3 | 4

const STEP_LABELS: Record<Step, string> = {
  1: 'Контакты',
  2: 'Доставка',
  3: 'Оплата',
  4: 'Подтверждение',
}

interface ContactForm {
  firstName: string
  lastName: string
  phone: string
  email: string
}

interface AddressForm {
  city: string
  street: string
  house: string
  apartment: string
  postalCode: string
  comment: string
}

export default function Checkout() {
  useSeo({ title: 'Оформление заказа', canonical: '/checkout', noIndex: true })

  const navigate = useNavigate()
  const user = useAuth((state) => state.user)
  const items = useCart((state) => state.items)
  const promocode = useCart((state) => state.promocode)
  const promoDiscount = useCart((state) => state.promoDiscount)
  const promoFreeDelivery = useCart((state) => state.promoFreeDelivery)
  const clearCart = useCart((state) => state.clear)

  const [step, setStep] = useState<Step>(1)
  const [submitting, setSubmitting] = useState(false)

  const [contact, setContact] = useState<ContactForm>({
    firstName: '', lastName: '', phone: '', email: '',
  })
  const [address, setAddress] = useState<AddressForm>({
    city: '', street: '', house: '', apartment: '', postalCode: '', comment: '',
  })
  const [cityQuery, setCityQuery] = useState('')
  const [citySuggestOpen, setCitySuggestOpen] = useState(false)
  const [deliveryOptionId, setDeliveryOptionId] = useState<string | null>(null)
  const [pickupPointId, setPickupPointId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD')
  const [agreed, setAgreed] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  /** Ключ идемпотентности живёт всю сессию оформления: двойной клик
   *  по «Оплатить» не создаст второй заказ (ТЗ §32). */
  const [idempotencyKey] = useState(() => uid('idem'))

  // Подставляем данные из профиля — не заставляем вводить их заново.
  useEffect(() => {
    if (!user) return
    setContact((prev) => ({
      firstName: prev.firstName || user.firstName,
      lastName: prev.lastName || user.lastName,
      phone: prev.phone || (user.phone ? formatPhone(user.phone) : ''),
      email: prev.email || (user.email ?? ''),
    }))
  }, [user])

  const products = useAsync(
    () => backend.catalog.getProductsByIds(items.map((item) => item.productId)),
    [items.map((item) => item.productId).join(',')],
    { skip: items.length === 0 },
  )
  const byId = Object.fromEntries((products.data ?? []).map((p) => [p.id, p]))

  const subtotal = items.reduce((sum, item) => {
    const product = byId[item.productId]
    return sum + (product ? product.price : item.priceSnapshot) * item.quantity
  }, 0)

  const cities = useAsync(
    () => backend.delivery.suggestCities(cityQuery),
    [cityQuery],
    { skip: !citySuggestOpen },
  )

  const deliveryOptions = useAsync(
    () =>
      backend.delivery.getOptions({
        city: address.city || 'Москва',
        items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
        subtotal,
      }),
    [address.city, subtotal, items.length],
    { skip: step < 2 },
  )

  const selectedOption: DeliveryOption | undefined = (deliveryOptions.data ?? []).find(
    (option) => option.id === deliveryOptionId,
  )

  const pickupPoints = useAsync(
    () =>
      selectedOption
        ? backend.delivery.findPickupPoints(address.city || 'Москва', selectedOption.provider)
        : Promise.resolve([]),
    [address.city, selectedOption?.provider],
    { skip: selectedOption?.method !== 'PICKUP_POINT' },
  )

  const deliveryPrice = promoFreeDelivery ? 0 : selectedOption?.price ?? 0
  const total = Math.max(0, subtotal - promoDiscount) + deliveryPrice

  const needsAddress = selectedOption?.method === 'COURIER' || selectedOption?.method === 'POST'
  const needsPickupPoint = selectedOption?.method === 'PICKUP_POINT'

  const validateStep = (target: Step): boolean => {
    const next: Record<string, string> = {}

    if (target >= 2) {
      if (!contact.firstName.trim()) next.firstName = 'Укажите имя'
      if (!contact.phone.trim()) next.phone = 'Укажите телефон'
      else if (!isValidPhone(contact.phone)) next.phone = 'Проверьте номер телефона'
      if (contact.email.trim() && !isValidEmail(contact.email)) next.email = 'Проверьте адрес почты'
    }

    if (target >= 3) {
      if (!address.city.trim()) next.city = 'Выберите город'
      if (!deliveryOptionId) next.delivery = 'Выберите способ доставки'
      if (needsAddress) {
        if (!address.street.trim()) next.street = 'Укажите улицу'
        if (!address.house.trim()) next.house = 'Укажите дом'
      }
      if (needsPickupPoint && !pickupPointId) next.pickupPoint = 'Выберите пункт выдачи'
    }

    setErrors(next)
    if (Object.keys(next).length > 0) {
      showToast('Проверьте выделенные поля.', { tone: 'error' })
      return false
    }
    return true
  }

  const goToStep = (target: Step) => {
    if (target > step && !validateStep(target)) return
    setStep(target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = async () => {
    if (!validateStep(4)) return
    if (!agreed) {
      showToast('Нужно согласие с условиями оферты.', { tone: 'error' })
      return
    }

    setSubmitting(true)
    try {
      const result = await backend.orders.create({
        customerName: `${contact.firstName} ${contact.lastName}`.trim(),
        phone: normalizePhone(contact.phone),
        email: contact.email.trim() || null,
        items,
        promocode,
        deliveryMethod: selectedOption!.method,
        deliveryOptionId: deliveryOptionId!,
        shippingAddress: {
          city: address.city,
          street: address.street,
          house: address.house,
          apartment: address.apartment || null,
          postalCode: address.postalCode || null,
          comment: address.comment || null,
        },
        pickupPointId,
        paymentMethod,
        comment: address.comment || null,
        idempotencyKey,
      })

      clearCart()
      navigate(`/checkout/success/${result.order.id}`, {
        state: { order: result.order, confirmationUrl: result.confirmationUrl },
      })
    } catch (error) {
      showToast(toUserMessage(error, 'Не удалось оформить заказ. Попробуйте ещё раз.'), {
        tone: 'error',
        title: 'Заказ не создан',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const summaryItems = useMemo(
    () =>
      items.map((item) => {
        const product = byId[item.productId]
        return {
          key: item.variantId,
          title: product?.title ?? 'Товар',
          image: product?.images[0]?.url,
          size: SIZE_LABELS[item.size],
          quantity: item.quantity,
          total: (product ? product.price : item.priceSnapshot) * item.quantity,
        }
      }),
    [items, byId],
  )

  if (items.length === 0) {
    return (
      <div className="container" style={{ paddingTop: 'calc(var(--header-h) + 80px)', paddingBottom: 'var(--section-y)' }}>
        <EmptyState
          title="Корзина пуста"
          text="Добавьте что-нибудь в корзину, чтобы оформить заказ."
          action={<ButtonLink to="/shop">В каталог</ButtonLink>}
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
          <Link to="/cart">Корзина</Link>
          <span className="crumbs__sep">/</span>
          <span>Оформление</span>
        </nav>
        <h1 className="page-title">Оформление заказа</h1>
      </div>

      <div className="container" style={{ paddingBottom: 'var(--section-y)' }}>
        <div className="steps" role="list">
          {([1, 2, 3, 4] as Step[]).map((value, index) => (
            <div key={value} style={{ display: 'contents' }}>
              {index > 0 && <span className="steps__line" />}
              <button
                type="button"
                role="listitem"
                className="step"
                data-state={step === value ? 'active' : step > value ? 'done' : 'todo'}
                disabled={value > step}
                onClick={() => goToStep(value)}
              >
                <span className="step__num">
                  {step > value ? <IconCheck size={12} /> : value}
                </span>
                {STEP_LABELS[value]}
              </button>
            </div>
          ))}
        </div>

        <div className="checkout-grid">
          <div>
            {step === 1 && (
              <div className="checkout-block">
                <h2 className="checkout-block__title">Контактные данные</h2>
                <div className="form-row form-row--2">
                  <Input
                    label="Имя"
                    value={contact.firstName}
                    error={errors.firstName}
                    autoComplete="given-name"
                    onChange={(event) => setContact({ ...contact, firstName: event.target.value })}
                  />
                  <Input
                    label="Фамилия"
                    value={contact.lastName}
                    autoComplete="family-name"
                    onChange={(event) => setContact({ ...contact, lastName: event.target.value })}
                  />
                </div>
                <div className="form-row form-row--2">
                  <Input
                    label="Телефон"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+7 999 123-45-67"
                    value={contact.phone}
                    error={errors.phone}
                    onChange={(event) =>
                      setContact({ ...contact, phone: formatPhone(event.target.value) })
                    }
                  />
                  <Input
                    label="Email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="Для чека и статуса заказа"
                    value={contact.email}
                    error={errors.email}
                    onChange={(event) => setContact({ ...contact, email: event.target.value })}
                  />
                </div>

                {!user && (
                  <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-muted)' }}>
                    Уже есть аккаунт?{' '}
                    <Link to="/login" style={{ textDecoration: 'underline', color: 'var(--c-cream-200)' }}>
                      Войдите
                    </Link>
                    , чтобы данные подставились автоматически.
                  </p>
                )}

                <div className="checkout-nav">
                  <Button size="lg" onClick={() => goToStep(2)}>
                    К доставке
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="checkout-block">
                <h2 className="checkout-block__title">Доставка</h2>

                <div className="city-suggest">
                  <Input
                    label="Город"
                    value={address.city}
                    error={errors.city}
                    autoComplete="address-level2"
                    placeholder="Начните вводить название"
                    onFocus={() => setCitySuggestOpen(true)}
                    onBlur={() => setTimeout(() => setCitySuggestOpen(false), 160)}
                    onChange={(event) => {
                      setAddress({ ...address, city: event.target.value })
                      setCityQuery(event.target.value)
                      setCitySuggestOpen(true)
                      setDeliveryOptionId(null)
                      setPickupPointId(null)
                    }}
                  />
                  {citySuggestOpen && (cities.data?.length ?? 0) > 0 && (
                    <div className="city-suggest__list">
                      {(cities.data ?? []).map((city) => (
                        <button
                          key={city}
                          type="button"
                          className="city-suggest__item"
                          onMouseDown={() => {
                            setAddress({ ...address, city })
                            setCityQuery(city)
                            setCitySuggestOpen(false)
                            setDeliveryOptionId(null)
                          }}
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {address.city && (
                  <div className="checkout-block">
                    <p className="pdp-section__title">Способ доставки</p>
                    {deliveryOptions.loading && <Spinner center />}
                    <div className="option-list">
                      {(deliveryOptions.data ?? []).map((option) => (
                        <RadioCard
                          key={option.id}
                          selected={option.id === deliveryOptionId}
                          onSelect={() => {
                            setDeliveryOptionId(option.id)
                            setPickupPointId(null)
                          }}
                          title={option.title}
                          meta={`${option.description ?? ''} · ${option.minDays}–${option.maxDays} дн.`}
                          price={option.price === 0 ? 'Бесплатно' : formatPrice(option.price)}
                        />
                      ))}
                    </div>
                    {errors.delivery && (
                      <p style={{ color: '#d98e86', fontSize: 'var(--fs-xs)' }}>{errors.delivery}</p>
                    )}
                  </div>
                )}

                {needsPickupPoint && (
                  <div className="checkout-block">
                    <p className="pdp-section__title">Пункт выдачи</p>
                    {pickupPoints.loading && <Spinner center />}
                    <div className="pickup-list">
                      {(pickupPoints.data ?? []).map((point: PickupPoint) => (
                        <RadioCard
                          key={point.id}
                          selected={point.id === pickupPointId}
                          onSelect={() => setPickupPointId(point.id)}
                          title={point.name}
                          meta={`${point.address}${point.workHours ? ` · ${point.workHours}` : ''}`}
                        />
                      ))}
                    </div>
                    {errors.pickupPoint && (
                      <p style={{ color: '#d98e86', fontSize: 'var(--fs-xs)' }}>{errors.pickupPoint}</p>
                    )}
                  </div>
                )}

                {needsAddress && (
                  <div className="checkout-block">
                    <p className="pdp-section__title">Адрес</p>
                    <Input
                      label="Улица"
                      value={address.street}
                      error={errors.street}
                      autoComplete="address-line1"
                      onChange={(event) => setAddress({ ...address, street: event.target.value })}
                    />
                    <div className="form-row form-row--3">
                      <Input
                        label="Дом"
                        value={address.house}
                        error={errors.house}
                        onChange={(event) => setAddress({ ...address, house: event.target.value })}
                      />
                      <Input
                        label="Квартира"
                        value={address.apartment}
                        onChange={(event) => setAddress({ ...address, apartment: event.target.value })}
                      />
                      <Input
                        label="Индекс"
                        value={address.postalCode}
                        inputMode="numeric"
                        autoComplete="postal-code"
                        onChange={(event) => setAddress({ ...address, postalCode: event.target.value })}
                      />
                    </div>
                  </div>
                )}

                <Textarea
                  label="Комментарий к заказу"
                  placeholder="Например: позвонить за час до доставки"
                  value={address.comment}
                  onChange={(event) => setAddress({ ...address, comment: event.target.value })}
                />

                <div className="checkout-nav">
                  <Button variant="secondary" size="lg" onClick={() => setStep(1)} iconLeft={<IconArrowLeft size={16} />}>
                    Назад
                  </Button>
                  <Button size="lg" onClick={() => goToStep(3)}>
                    К оплате
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="checkout-block">
                <h2 className="checkout-block__title">Оплата</h2>
                <div className="option-list">
                  <RadioCard
                    selected={paymentMethod === 'CARD'}
                    onSelect={() => setPaymentMethod('CARD')}
                    title="Банковская карта"
                    meta="Visa, Mastercard, МИР — через защищённую форму банка"
                  />
                  <RadioCard
                    selected={paymentMethod === 'SBP'}
                    onSelect={() => setPaymentMethod('SBP')}
                    title="СБП"
                    meta="Оплата по QR-коду из приложения вашего банка"
                  />
                </div>

                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-muted)', lineHeight: 1.7 }}>
                  Оплата проходит на стороне банка. Данные карты не попадают на сайт MANILI
                  и нигде у нас не сохраняются.
                </p>

                <div className="checkout-nav">
                  <Button variant="secondary" size="lg" onClick={() => setStep(2)} iconLeft={<IconArrowLeft size={16} />}>
                    Назад
                  </Button>
                  <Button size="lg" onClick={() => goToStep(4)}>
                    К подтверждению
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="checkout-block">
                <h2 className="checkout-block__title">Проверьте заказ</h2>

                <div className="checkout-review">
                  <div className="review-block">
                    <div className="review-block__head">
                      <span className="review-block__title">Получатель</span>
                      <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                        Изменить
                      </Button>
                    </div>
                    <div className="review-block__body">
                      <strong>{contact.firstName} {contact.lastName}</strong>
                      <br />
                      {contact.phone}
                      {contact.email && (
                        <>
                          <br />
                          {contact.email}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="review-block">
                    <div className="review-block__head">
                      <span className="review-block__title">Доставка</span>
                      <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                        Изменить
                      </Button>
                    </div>
                    <div className="review-block__body">
                      <strong>{selectedOption?.title}</strong>
                      <br />
                      {address.city}
                      {needsAddress && `, ${address.street}, д. ${address.house}`}
                      {address.apartment && `, кв. ${address.apartment}`}
                      {needsPickupPoint && pickupPointId && (
                        <>
                          <br />
                          {(pickupPoints.data ?? []).find((p) => p.id === pickupPointId)?.address}
                        </>
                      )}
                      <br />
                      {selectedOption ? `${selectedOption.minDays}–${selectedOption.maxDays} дн.` : ''}
                    </div>
                  </div>

                  <div className="review-block">
                    <div className="review-block__head">
                      <span className="review-block__title">Оплата</span>
                      <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
                        Изменить
                      </Button>
                    </div>
                    <div className="review-block__body">
                      <strong>{paymentMethod === 'CARD' ? 'Банковская карта' : 'СБП'}</strong>
                    </div>
                  </div>
                </div>

                <Checkbox checked={agreed} onChange={(event) => setAgreed(event.target.checked)}>
                  Я согласен с{' '}
                  {/* Новая вкладка: иначе переход по ссылке стирает заполненный checkout */}
                  <Link to="/legal/offer" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
                    условиями оферты
                  </Link>{' '}
                  и{' '}
                  <Link to="/legal/privacy" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
                    обработкой персональных данных
                  </Link>
                </Checkbox>

                <div className="checkout-nav">
                  <Button variant="secondary" size="lg" onClick={() => setStep(3)} iconLeft={<IconArrowLeft size={16} />}>
                    Назад
                  </Button>
                  <Button size="lg" loading={submitting} onClick={() => void submit()}>
                    Оплатить {formatPrice(total)}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <aside className="checkout-summary">
            <h2 className="checkout-summary__title">Ваш заказ</h2>

            <div className="checkout-summary__items">
              {summaryItems.map((item) => (
                <div key={item.key} className="checkout-summary__item">
                  <Media src={item.image} alt="" ratio="3 / 4" rounded="sm" sizes="54px" />
                  <div style={{ minWidth: 0 }}>
                    <p className="checkout-summary__item-title">{item.title}</p>
                    <p className="checkout-summary__item-meta">
                      {item.size} × {item.quantity}
                    </p>
                  </div>
                  <span className="checkout-summary__item-price">{formatPrice(item.total)}</span>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <div className="cart-summary__row">
                <span>Товары</span>
                <span className="cart-summary__value">{formatPrice(subtotal)}</span>
              </div>
              {promocode && promoDiscount > 0 && (
                <div className="cart-summary__row">
                  <span>Скидка · {promocode}</span>
                  <span className="cart-summary__value">−{formatPrice(promoDiscount)}</span>
                </div>
              )}
              <div className="cart-summary__row">
                <span>Доставка</span>
                <span className="cart-summary__value">
                  {selectedOption ? (
                    deliveryPrice === 0 ? <span className="cart-summary__free">Бесплатно</span> : formatPrice(deliveryPrice)
                  ) : (
                    '—'
                  )}
                </span>
              </div>
              <div className="cart-summary__row cart-summary__row--total">
                <span>Итого</span>
                <span className="cart-summary__value">{formatPrice(total)}</span>
              </div>
            </div>

            <div className={cx('review-block')} style={{ marginTop: 20, background: 'var(--c-ink-800)' }}>
              <div className="review-block__body" style={{ display: 'grid', gap: 10 }}>
                <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <IconTruck size={17} /> Отправим в течение 1–2 рабочих дней
                </span>
                <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <IconCard size={17} /> Оплата на стороне банка
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
