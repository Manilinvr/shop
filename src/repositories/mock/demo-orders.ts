/* ==========================================================================
   MANILI — ДЕМО-ЗАКАЗЫ ДЛЯ MOCK-РЕЖИМА
   Витрина-портфолио без backend: чтобы дашборд, список заказов, клиенты
   и аналитика не были пустыми, при первом запуске генерируем правдоподобную
   историю продаж за последний месяц. Даты считаются от текущего момента,
   генератор детерминирован (фиксированный seed) — у всех посетителей
   одинаковая картина.
   ========================================================================== */

import type {
  DeliveryMethod,
  DeliveryStatus,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistoryEntry,
  PaymentMethod,
  PaymentStatus,
  Product,
  User,
} from '@/domain/types'
import { FREE_DELIVERY_THRESHOLD } from './seed'

const DAY = 24 * 60 * 60 * 1000

/** Mulberry32 — маленький детерминированный PRNG. */
function createRandom(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CUSTOMERS: Array<Pick<User, 'firstName' | 'lastName' | 'phone' | 'email'> & { city: string; daysAgo: number }> = [
  { firstName: 'Алина', lastName: 'Соколова', phone: '+79161234501', email: 'alina.sokolova@mail.ru', city: 'Москва', daysAgo: 58 },
  { firstName: 'Максим', lastName: 'Орлов', phone: '+79219876502', email: 'max.orlov@yandex.ru', city: 'Санкт-Петербург', daysAgo: 44 },
  { firstName: 'Дарья', lastName: 'Кузнецова', phone: '+79031112203', email: 'dasha.k@gmail.com', city: 'Казань', daysAgo: 37 },
  { firstName: 'Артём', lastName: 'Волков', phone: '+79265554404', email: null, city: 'Москва', daysAgo: 29 },
  { firstName: 'София', lastName: 'Лебедева', phone: '+79117778805', email: 'sofia.lebedeva@mail.ru', city: 'Екатеринбург', daysAgo: 24 },
  { firstName: 'Никита', lastName: 'Морозов', phone: '+79852223306', email: 'n.morozov@yandex.ru', city: 'Новосибирск', daysAgo: 19 },
  { firstName: 'Полина', lastName: 'Новикова', phone: '+79099990007', email: 'polina.nov@gmail.com', city: 'Нижний Новгород', daysAgo: 13 },
  { firstName: 'Егор', lastName: 'Смирнов', phone: '+79154446608', email: 'egor.smirnov@mail.ru', city: 'Краснодар', daysAgo: 8 },
  { firstName: 'Вероника', lastName: 'Павлова', phone: '+79213335509', email: 'veronika.p@yandex.ru', city: 'Санкт-Петербург', daysAgo: 4 },
]

const STREETS = ['ул. Тверская', 'Невский проспект', 'ул. Баумана', 'ул. Ленина', 'пр. Мира', 'ул. Большая Покровская', 'ул. Красная']

/** Цепочка статусов заказа от оформления до завершения. */
const HAPPY_PATH: OrderStatus[] = ['NEW', 'PAID', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED']

const DELIVERY_BY_STATUS: Partial<Record<OrderStatus, DeliveryStatus>> = {
  READY_TO_SHIP: 'READY',
  SHIPPED: 'HANDED_OVER',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'DELIVERED',
}

/** Насколько далеко по цепочке продвинулся заказ, исходя из его «возраста». */
function statusForAge(daysAgo: number, random: () => number): OrderStatus {
  if (daysAgo < 1) return random() < 0.5 ? 'NEW' : 'PAID'
  if (daysAgo < 2) return 'PROCESSING'
  if (daysAgo < 3) return 'READY_TO_SHIP'
  if (daysAgo < 5) return 'SHIPPED'
  if (daysAgo < 8) return 'IN_TRANSIT'
  if (daysAgo < 12) return 'DELIVERED'
  return 'COMPLETED'
}

export interface DemoData {
  users: User[]
  orders: Order[]
  orderHistory: OrderStatusHistoryEntry[]
  orderCounter: number
}

export function buildDemoData(products: Product[], existingCustomer: User, now = Date.now()): DemoData {
  const random = createRandom(20260926)
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(random() * list.length)]

  const users: User[] = CUSTOMERS.map((c, i) => ({
    id: `usr-demo-${i + 1}`,
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.phone,
    email: c.email,
    role: 'CUSTOMER',
    createdAt: new Date(now - c.daysAgo * DAY).toISOString(),
    notificationSettings: { email: Boolean(c.email), sms: true, telegram: i % 3 === 0, marketing: i % 2 === 0 },
  }))

  const buyers = [
    ...users.map((u, i) => ({ user: u, city: CUSTOMERS[i].city })),
    { user: existingCustomer, city: 'Москва' },
  ]

  // Популярные позиции чаще попадают в корзину — топ продаж выглядит живым.
  const weighted = products.flatMap((p) => {
    const weight = p.slug.startsWith('hoodie') ? 4 : p.slug.startsWith('tshirt') ? 3 : 2
    return Array.from({ length: weight }, () => p)
  })

  const orders: Order[] = []
  const orderHistory: OrderStatusHistoryEntry[] = []
  const ORDER_COUNT = 34

  for (let n = 0; n < ORDER_COUNT; n++) {
    // Больше заказов в последние дни — график растёт.
    const daysAgo = Math.pow(random(), 1.35) * 30
    const createdAtMs = now - daysAgo * DAY - random() * 3 * 60 * 60 * 1000
    const buyer = n < 2 ? buyers[buyers.length - 1] : buyers[Math.floor(random() * buyers.length)]
    const id = `ord-demo-${n + 1}`

    const itemCount = random() < 0.55 ? 1 : random() < 0.8 ? 2 : 3
    const items: OrderItem[] = []
    for (let k = 0; k < itemCount; k++) {
      const product = pick(weighted)
      if (items.some((item) => item.productId === product.id)) continue
      const variant = pick(product.variants.filter((v) => v.isActive))
      const quantity = random() < 0.85 ? 1 : 2
      const price = product.price + variant.priceModifier
      items.push({
        id: `${id}-item-${k + 1}`,
        orderId: id,
        productId: product.id,
        variantId: variant.id,
        productTitle: product.title,
        productSlug: product.slug,
        productImage: product.images[0]?.url ?? null,
        size: variant.size,
        sku: variant.sku,
        quantity,
        price,
        total: price * quantity,
      })
    }

    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const promocode = random() < 0.18 ? 'WELCOME10' : null
    const discount = promocode ? Math.round(subtotal * 0.1 / 100) * 100 : 0
    const deliveryMethod: DeliveryMethod = pick(['PICKUP_POINT', 'PICKUP_POINT', 'COURIER', 'POST'] as const)
    const deliveryPrice =
      subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : deliveryMethod === 'COURIER' ? 55000 : deliveryMethod === 'POST' ? 30000 : 35000
    const paymentMethod: PaymentMethod = pick(['CARD', 'CARD', 'SBP', 'SBP', 'CASH_ON_DELIVERY'] as const)

    let orderStatus = statusForAge(daysAgo, random)
    // Оплата при получении: статуса «Оплачен» до вручения не бывает.
    const payOnDelivery = paymentMethod === 'CASH_ON_DELIVERY'
    if (payOnDelivery && orderStatus === 'PAID') orderStatus = 'NEW'
    const cancelled = n % 11 === 5
    if (cancelled) orderStatus = 'CANCELLED'

    const reachedPaid = orderStatus !== 'NEW' && orderStatus !== 'CANCELLED'
    const paymentStatus: PaymentStatus = cancelled
      ? 'CANCELLED'
      : payOnDelivery
        ? (orderStatus === 'DELIVERED' || orderStatus === 'COMPLETED' ? 'PAID' : 'PENDING')
        : reachedPaid ? 'PAID' : 'PENDING'
    const deliveryStatus: DeliveryStatus = DELIVERY_BY_STATUS[orderStatus] ?? 'NOT_SHIPPED'
    const shipped = ['SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(orderStatus)

    const provider = deliveryMethod === 'POST' ? 'POST_RF' : 'CDEK'
    const createdAt = new Date(createdAtMs).toISOString()

    // История: проходим по цепочке до текущего статуса, шаг — несколько часов/дней.
    const path = cancelled
      ? (['NEW', 'CANCELLED'] as OrderStatus[])
      : HAPPY_PATH.slice(0, HAPPY_PATH.indexOf(orderStatus) + 1).filter((s) => !(payOnDelivery && s === 'PAID'))
    let stepAt = createdAtMs
    let updatedAtMs = createdAtMs
    path.forEach((status, index) => {
      if (index > 0) {
        stepAt = Math.min(now - 10 * 60 * 1000, stepAt + (index === 1 ? 0.02 : 0.4 + random() * 1.2) * DAY)
      }
      updatedAtMs = stepAt
      orderHistory.push({
        id: `${id}-h${index + 1}`,
        orderId: id,
        field: 'orderStatus',
        oldValue: index === 0 ? null : path[index - 1],
        newValue: status,
        changedBy: index <= 1 ? 'system' : 'usr-admin',
        changedByName: index <= 1 ? 'Система' : 'Владелец MANILI',
        comment: status === 'CANCELLED' ? 'Покупатель передумал' : null,
        createdAt: new Date(stepAt).toISOString(),
      })
    })

    orders.push({
      id,
      publicOrderNumber: '',
      userId: buyer.user.id,
      customerName: `${buyer.user.firstName} ${buyer.user.lastName}`,
      phone: buyer.user.phone ?? '',
      email: buyer.user.email,
      items,
      subtotal,
      discount,
      promocode,
      deliveryPrice,
      total: subtotal - discount + deliveryPrice,
      paymentMethod,
      paymentStatus,
      deliveryStatus,
      orderStatus,
      deliveryMethod,
      deliveryProvider: provider,
      shippingAddress:
        deliveryMethod === 'PICKUP_POINT'
          ? null
          : {
              city: buyer.city,
              street: pick(STREETS),
              house: String(3 + Math.floor(random() * 90)),
              apartment: String(1 + Math.floor(random() * 200)),
              postalCode: null,
              comment: null,
            },
      pickupPoint:
        deliveryMethod === 'PICKUP_POINT'
          ? {
              id: `CDEK-${n % 6 + 1}`,
              provider: 'CDEK',
              code: `CDEK${100 + (n % 6)}`,
              name: `Пункт выдачи №${n % 6 + 1}`,
              address: `${buyer.city}, ${pick(STREETS)}, д. ${10 + (n % 6) * 3}`,
              city: buyer.city,
              workHours: 'Пн–Вс 10:00–21:00',
              lat: 55.75,
              lng: 37.61,
            }
          : null,
      trackingNumber: shipped ? `${provider === 'CDEK' ? '10' : 'RP'}${String(48213000 + n * 977).padStart(10, '0')}` : null,
      paymentId: paymentStatus === 'PAID' ? `pay-demo-${n + 1}` : null,
      deliveryId: shipped ? `dlv-demo-${n + 1}` : null,
      comment: n % 7 === 3 ? 'Позвоните за час до доставки, пожалуйста' : null,
      createdAt,
      updatedAt: new Date(updatedAtMs).toISOString(),
    })
  }

  // Номера заказов идут по времени оформления, как в настоящем магазине.
  orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  orders.forEach((order, index) => {
    order.publicOrderNumber = `MANILI #${1001 + index}`
  })
  orders.reverse()

  return { users, orders, orderHistory, orderCounter: 1000 + orders.length }
}
