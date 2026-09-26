/* ==========================================================================
   MANILI — SEED-ДАННЫЕ
   Демонстрационный каталог для разработки и превью до подключения Appwrite.
   Изображения — процедурные плейсхолдеры (`placeholder:<вид>/<n>`),
   их заменяет реальная съёмка бренда без правок кода.
   ========================================================================== */

import type {
  Category,
  Collection,
  HomepageBlock,
  Product,
  ProductColor,
  ProductImage,
  ProductVariant,
  Promocode,
  Size,
} from '@/domain/types'

const BLACK: ProductColor = { code: 'black', title: 'Чёрный', hex: '#14120f' }
const CREAM: ProductColor = { code: 'cream', title: 'Кремовый', hex: '#e6dcc8' }
const GRAPHITE: ProductColor = { code: 'graphite', title: 'Графит', hex: '#3b3833' }
const SAND: ProductColor = { code: 'sand', title: 'Песочный', hex: '#b3a68c' }

export const CATEGORIES: Category[] = [
  { id: 'cat-hoodies', slug: 'hoodies', title: 'Худи', description: 'Плотный хлопок с начёсом, свободный крой.', image: 'placeholder:hoodie/1/black', sortOrder: 1, isActive: true },
  { id: 'cat-tshirts', slug: 'tshirts', title: 'Футболки', description: 'Базовые и принтованные футболки.', image: 'placeholder:tshirt/1/cream', sortOrder: 2, isActive: true },
  { id: 'cat-longsleeves', slug: 'longsleeves', title: 'Лонгсливы', description: 'Лонгсливы из плотного джерси.', image: 'placeholder:longsleeve/1/graphite', sortOrder: 3, isActive: true },
  { id: 'cat-pants', slug: 'pants', title: 'Штаны', description: 'Джоггеры и карго свободной посадки.', image: 'placeholder:pants/1/graphite', sortOrder: 4, isActive: true },
  { id: 'cat-caps', slug: 'caps', title: 'Кепки', description: 'Кепки и шапки с вышивкой логотипа.', image: 'placeholder:cap/1/black', sortOrder: 5, isActive: true },
  { id: 'cat-bags', slug: 'bags', title: 'Сумки', description: 'Шопперы и сумки из плотного канваса.', image: 'placeholder:bag/1/cream', sortOrder: 6, isActive: true },
  { id: 'cat-accessories', slug: 'accessories', title: 'Аксессуары', description: 'Мелочи, которые завершают образ.', image: 'placeholder:beanie/1/black', sortOrder: 7, isActive: true },
]

export const COLLECTIONS: Collection[] = [
  {
    id: 'col-basic', slug: 'basic', title: 'BASIC',
    description: 'Базовая линия MANILI. Вещи, которые носят каждый день и которые не выходят из ротации.',
    cover: 'placeholder:editorial/1', banner: 'placeholder:editorial/4',
    releaseDate: '2025-02-01T00:00:00.000Z', status: 'PUBLISHED', sortOrder: 1,
  },
  {
    id: 'col-aw26', slug: 'autumn-winter-26', title: 'AUTUMN / WINTER 26',
    description: 'Осенне-зимний дроп: плотные ткани, тяжёлый хлопок, приглушённая палитра города.',
    cover: 'placeholder:editorial/2', banner: 'placeholder:editorial/5',
    releaseDate: '2026-09-01T00:00:00.000Z', status: 'PUBLISHED', sortOrder: 2,
  },
  {
    id: 'col-limited', slug: 'limited', title: 'LIMITED',
    description: 'Ограниченные релизы. Малый тираж, отдельная нумерация, без перевыпуска.',
    cover: 'placeholder:editorial/3', banner: 'placeholder:editorial/6',
    releaseDate: '2026-06-15T00:00:00.000Z', status: 'PUBLISHED', sortOrder: 3,
  },
]

const APPAREL_SIZES: Size[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const ONE: Size[] = ['ONE_SIZE']

interface SeedProductInput {
  slug: string
  title: string
  subtitle: string
  description: string
  composition: string
  price: number
  oldPrice?: number
  sku: string
  categoryId: string
  collectionId: string | null
  color: ProductColor
  shape: string
  sizes: Size[]
  stock: number[]
  tags: string[]
  isNew?: boolean
  isLimited?: boolean
  popularity: number
  createdAt: string
}

function buildImages(shape: string, count: number, color: string): ProductImage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${shape}-${color}-img-${i + 1}`,
    // Цвет третьим сегментом: карточка рисует вещь в цвете товара,
    // а не одинаково-серой для всего каталога.
    url: `placeholder:${shape}/${i + 1}/${color}`,
    alt: null,
    sortOrder: i,
    isPrimary: i === 0,
  }))
}

function buildVariants(productId: string, sku: string, sizes: Size[], stock: number[]): ProductVariant[] {
  return sizes.map((size, i) => ({
    id: `${productId}-${size.toLowerCase()}`,
    productId,
    size,
    sku: `${sku}-${size}`,
    stock: stock[i] ?? 0,
    reserved: 0,
    priceModifier: 0,
    isActive: true,
  }))
}

function buildProduct(input: SeedProductInput): Product {
  const id = `prd-${input.slug}`
  return {
    id,
    slug: input.slug,
    title: input.title,
    subtitle: input.subtitle,
    description: input.description,
    composition: input.composition,
    price: input.price * 100,
    oldPrice: input.oldPrice ? input.oldPrice * 100 : null,
    sku: input.sku,
    categoryId: input.categoryId,
    collectionId: input.collectionId,
    color: input.color,
    images: buildImages(input.shape, 4, input.color.code),
    videoUrl: null,
    variants: buildVariants(id, input.sku, input.sizes, input.stock),
    tags: input.tags,
    status: 'PUBLISHED',
    isNew: input.isNew ?? false,
    isLimited: input.isLimited ?? false,
    popularity: input.popularity,
    seoTitle: `${input.title} — MANILI`,
    seoDescription: input.subtitle,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  }
}

const SEED: SeedProductInput[] = [
  {
    slug: 'hoodie-classic', title: 'Худи MANILI Classic', subtitle: 'Плотный хлопок с начёсом, свободный крой',
    description: 'Худи из плотного хлопка с начёсом. Свободный крой, спущенное плечо, двойной капюшон и вышивка логотипа на груди. Базовая вещь коллекции, которая держит форму после стирок.',
    composition: '80% хлопок, 20% полиэстер. Плотность 380 г/м². Сделано в России.',
    price: 6900, sku: 'MNL-HD-001', categoryId: 'cat-hoodies', collectionId: 'col-basic',
    color: BLACK, shape: 'hoodie', sizes: APPAREL_SIZES, stock: [4, 12, 18, 14, 7, 2],
    tags: ['базовое', 'хлопок', 'оверсайз'], popularity: 98, createdAt: '2026-02-10T10:00:00.000Z',
  },
  {
    slug: 'hoodie-oversize-cream', title: 'Худи MANILI Oversize', subtitle: 'Увеличенный объём, кремовый оттенок',
    description: 'Худи увеличенного объёма в кремовом оттенке. Низкая пройма, удлинённый корпус, широкая резинка по низу. Логотип нанесён плотной пуф-печатью.',
    composition: '100% хлопок. Плотность 420 г/м². Сделано в России.',
    price: 7900, sku: 'MNL-HD-002', categoryId: 'cat-hoodies', collectionId: 'col-aw26',
    color: CREAM, shape: 'hoodie', sizes: APPAREL_SIZES, stock: [2, 6, 9, 5, 3, 0],
    tags: ['оверсайз', 'новинка'], isNew: true, popularity: 91, createdAt: '2026-09-02T10:00:00.000Z',
  },
  {
    slug: 'hoodie-limited-run', title: 'Худи MANILI Limited Run', subtitle: 'Ограниченный тираж, нумерация на бирке',
    description: 'Ограниченный релиз: 120 единиц с индивидуальной нумерацией на внутренней бирке. Плотный хлопок, контрастная вышивка, усиленные швы. Перевыпуска не будет.',
    composition: '100% хлопок. Плотность 450 г/м². Ограниченный тираж 120 шт.',
    price: 9900, sku: 'MNL-HD-003', categoryId: 'cat-hoodies', collectionId: 'col-limited',
    color: GRAPHITE, shape: 'hoodie', sizes: APPAREL_SIZES, stock: [0, 3, 5, 3, 1, 0],
    tags: ['limited', 'нумерация'], isLimited: true, isNew: true, popularity: 87, createdAt: '2026-08-20T10:00:00.000Z',
  },
  {
    slug: 'tshirt-logo', title: 'Футболка MANILI Logo', subtitle: 'Плотный джерси, фирменный принт',
    description: 'Футболка прямого кроя из плотного джерси. Фирменный логотип на груди, минималистичная бирка. Не тянется в горловине.',
    composition: '100% хлопок. Плотность 240 г/м². Сделано в России.',
    price: 3900, oldPrice: 4900, sku: 'MNL-TS-001', categoryId: 'cat-tshirts', collectionId: 'col-basic',
    color: BLACK, shape: 'tshirt', sizes: APPAREL_SIZES, stock: [8, 20, 24, 19, 11, 4],
    tags: ['базовое', 'принт'], popularity: 95, createdAt: '2026-02-10T10:00:00.000Z',
  },
  {
    slug: 'tshirt-basic-cream', title: 'Футболка MANILI Basic', subtitle: 'Базовая футболка без принта',
    description: 'Максимально простая футболка кремового оттенка. Без принта, только тканая бирка на боковом шве. База, к которой возвращаешься.',
    composition: '100% хлопок. Плотность 220 г/м².',
    price: 2900, sku: 'MNL-TS-002', categoryId: 'cat-tshirts', collectionId: 'col-basic',
    color: CREAM, shape: 'tshirt', sizes: APPAREL_SIZES, stock: [10, 22, 26, 20, 9, 5],
    tags: ['базовое'], popularity: 82, createdAt: '2026-03-01T10:00:00.000Z',
  },
  {
    slug: 'tshirt-street', title: 'Футболка MANILI Street', subtitle: 'Крупный принт на спине',
    description: 'Футболка свободного кроя с крупным принтом на спине. Спущенное плечо, удлинённый корпус.',
    composition: '100% хлопок. Плотность 260 г/м².',
    price: 4200, sku: 'MNL-TS-003', categoryId: 'cat-tshirts', collectionId: 'col-aw26',
    color: GRAPHITE, shape: 'tshirt', sizes: APPAREL_SIZES, stock: [3, 9, 14, 10, 6, 1],
    tags: ['принт', 'оверсайз'], isNew: true, popularity: 78, createdAt: '2026-09-05T10:00:00.000Z',
  },
  {
    slug: 'longsleeve-classic', title: 'Лонгслив MANILI', subtitle: 'Плотное джерси, манжеты в рубчик',
    description: 'Лонгслив из плотного джерси с манжетами в рубчик. Логотип на рукаве, аккуратная посадка по плечу.',
    composition: '95% хлопок, 5% эластан. Плотность 260 г/м².',
    price: 4900, sku: 'MNL-LS-001', categoryId: 'cat-longsleeves', collectionId: 'col-basic',
    color: BLACK, shape: 'longsleeve', sizes: APPAREL_SIZES, stock: [5, 11, 15, 12, 6, 2],
    tags: ['базовое'], popularity: 74, createdAt: '2026-04-12T10:00:00.000Z',
  },
  {
    slug: 'pants-cargo', title: 'Штаны MANILI Cargo', subtitle: 'Свободная посадка, накладные карманы',
    description: 'Карго свободной посадки из плотного хлопка. Накладные карманы, кулиска по низу, усиленные швы.',
    composition: '98% хлопок, 2% эластан. Плотность 300 г/м².',
    price: 6500, sku: 'MNL-PT-001', categoryId: 'cat-pants', collectionId: 'col-aw26',
    color: GRAPHITE, shape: 'pants', sizes: APPAREL_SIZES, stock: [2, 7, 10, 8, 4, 1],
    tags: ['карго'], isNew: true, popularity: 71, createdAt: '2026-09-08T10:00:00.000Z',
  },
  {
    slug: 'cap-classic', title: 'Кепка MANILI', subtitle: 'Вышивка логотипа, регулируемый ремешок',
    description: 'Классическая шестипанельная кепка с вышивкой логотипа. Металлическая застёжка, изогнутый козырёк.',
    composition: '100% хлопок, твил. Регулируемый размер.',
    price: 2900, sku: 'MNL-CP-001', categoryId: 'cat-caps', collectionId: 'col-basic',
    color: BLACK, shape: 'cap', sizes: ONE, stock: [26],
    tags: ['базовое', 'вышивка'], popularity: 88, createdAt: '2026-02-10T10:00:00.000Z',
  },
  {
    slug: 'cap-distressed', title: 'Кепка MANILI Distressed', subtitle: 'Состаренный козырёк, потёртая ткань',
    description: 'Кепка с намеренно состаренным козырьком и потёртой тканью. Каждая единица получается немного разной.',
    composition: '100% хлопок с эффектом стирки. Регулируемый размер.',
    price: 3200, sku: 'MNL-CP-002', categoryId: 'cat-caps', collectionId: 'col-aw26',
    color: SAND, shape: 'cap', sizes: ONE, stock: [3],
    tags: ['состаренная', 'новинка'], isNew: true, popularity: 84, createdAt: '2026-09-06T10:00:00.000Z',
  },
  {
    slug: 'beanie-classic', title: 'Шапка MANILI', subtitle: 'Плотная вязка, отворот',
    description: 'Шапка плотной вязки с отворотом и тканым лейблом. Держит форму, не колется.',
    composition: '50% шерсть, 50% акрил.',
    price: 2500, sku: 'MNL-BN-001', categoryId: 'cat-accessories', collectionId: 'col-aw26',
    color: BLACK, shape: 'beanie', sizes: ONE, stock: [14],
    tags: ['зима'], popularity: 69, createdAt: '2026-09-01T10:00:00.000Z',
  },
  {
    slug: 'tote-canvas', title: 'Шоппер MANILI', subtitle: 'Плотный канвас, длинные ручки',
    description: 'Шоппер из плотного канваса с фирменной печатью. Длинные ручки, внутренний карман, держит форму.',
    composition: '100% хлопок, канвас 340 г/м².',
    price: 1900, sku: 'MNL-BG-001', categoryId: 'cat-bags', collectionId: 'col-basic',
    color: CREAM, shape: 'bag', sizes: ONE, stock: [31],
    tags: ['базовое'], popularity: 76, createdAt: '2026-02-10T10:00:00.000Z',
  },
]

export const PRODUCTS: Product[] = SEED.map(buildProduct)

export const PROMOCODES: Promocode[] = [
  {
    id: 'promo-welcome', code: 'WELCOME10', discountType: 'PERCENT', discountValue: 10,
    minOrderTotal: 300000, startsAt: null, expiresAt: null,
    usageLimit: null, usageCount: 42, isActive: true,
  },
  {
    id: 'promo-drop', code: 'DROP26', discountType: 'FIXED', discountValue: 100000,
    minOrderTotal: 700000, startsAt: null, expiresAt: '2026-12-31T23:59:59.000Z',
    usageLimit: 200, usageCount: 17, isActive: true,
  },
  {
    id: 'promo-free-delivery', code: 'FREESHIP', discountType: 'FREE_DELIVERY', discountValue: 0,
    minOrderTotal: 500000, startsAt: null, expiresAt: null,
    usageLimit: null, usageCount: 88, isActive: true,
  },
]

/** Бесплатная доставка от этой суммы (ТЗ §12). */
export const FREE_DELIVERY_THRESHOLD = 1_000_000

export const HOMEPAGE_BLOCKS: HomepageBlock[] = [
  {
    id: 'blk-hero', type: 'HERO', sortOrder: 1, isEnabled: true,
    data: {
      eyebrow: 'MANILI — STREETWEAR BRAND',
      title: 'Одежда для тех, кто в движении',
      subtitle: 'Same city — different energy',
      ctaLabel: 'Смотреть коллекцию',
      ctaHref: '/shop',
      image: 'placeholder:editorial/1',
      images: ['placeholder:editorial/2', 'placeholder:editorial/3'],
    },
  },
  {
    id: 'blk-marquee', type: 'MARQUEE', sortOrder: 2, isEnabled: true,
    data: { items: ['REAL STYLE', 'NO RULES', 'MADE IN RUSSIA', 'SAME CITY', 'DIFFERENT ENERGY'] },
  },
  {
    id: 'blk-new-collection', type: 'NEW_COLLECTION', sortOrder: 3, isEnabled: true,
    data: {
      eyebrow: 'New collection',
      title: 'Autumn / Winter 26',
      text: 'Плотные ткани, тяжёлый хлопок и приглушённая палитра города. Дроп собран вокруг вещей, которые носят каждый день.',
      ctaLabel: 'Открыть коллекцию',
      ctaHref: '/collections/autumn-winter-26',
      collectionId: 'col-aw26',
      image: 'placeholder:editorial/4',
    },
  },
  {
    id: 'blk-categories', type: 'CATEGORIES', sortOrder: 4, isEnabled: true,
    data: {
      eyebrow: 'Категории',
      title: 'Выбирай своё',
      categoryIds: ['cat-hoodies', 'cat-tshirts', 'cat-caps', 'cat-bags'],
    },
  },
  {
    id: 'blk-featured', type: 'FEATURED_PRODUCTS', sortOrder: 5, isEnabled: true,
    data: {
      eyebrow: 'Избранное',
      title: 'Что берут чаще всего',
      productIds: ['prd-hoodie-classic', 'prd-tshirt-logo', 'prd-cap-classic', 'prd-tote-canvas'],
      ctaLabel: 'Весь каталог', ctaHref: '/shop',
    },
  },
  {
    id: 'blk-editorial', type: 'EDITORIAL', sortOrder: 6, isEnabled: true,
    data: {
      eyebrow: 'Editorial',
      title: 'Clothes for real people',
      text: 'MANILI — это не про подиум. Это про улицу, движение и людей вокруг. Мы снимаем тех, кто носит наши вещи каждый день, а не моделей на белом фоне.',
      images: ['placeholder:editorial/5', 'placeholder:editorial/6', 'placeholder:editorial/7'],
    },
  },
  {
    id: 'blk-story', type: 'STORY', sortOrder: 7, isEnabled: true,
    data: {
      eyebrow: 'О бренде',
      title: 'Одежда, культура, люди',
      text: 'MANILI — это не просто одежда. Это сообщество, идея, движение. Мы создаём вещи для тех, кто ценит свободу, культуру и людей вокруг. Мы не следуем трендам — мы создаём их вместе с вами.',
      ctaLabel: 'Узнать больше', ctaHref: '/about',
      image: 'placeholder:editorial/8',
    },
  },
  {
    id: 'blk-new-arrivals', type: 'NEW_ARRIVALS', sortOrder: 8, isEnabled: true,
    data: { eyebrow: 'Новинки', title: 'Только что приехало', ctaLabel: 'Все новинки', ctaHref: '/shop?new=1' },
  },
  {
    id: 'blk-collections', type: 'COLLECTIONS', sortOrder: 9, isEnabled: true,
    data: { eyebrow: 'Коллекции', title: 'Собранные истории' },
  },
  {
    id: 'blk-cta', type: 'CTA', sortOrder: 10, isEnabled: true,
    data: {
      title: 'Будь в курсе новых поступлений',
      text: 'Подпишись — расскажем о дропах раньше остальных.',
      ctaLabel: 'Подписаться', ctaHref: '#subscribe',
    },
  },
]
