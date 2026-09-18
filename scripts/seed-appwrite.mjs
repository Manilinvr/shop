#!/usr/bin/env node
/* ==========================================================================
   MANILI — НАПОЛНЕНИЕ БАЗЫ СТАРТОВЫМ СОДЕРЖИМЫМ

   Заливает то, без чего сайт не работает сразу после развёртывания:
     • блоки главной страницы (иначе главная пустая),
     • категории каталога,
     • коллекции,
     • промокоды-примеры.

   Демо-товары НЕ создаются: в боевой базе их пришлось бы удалять руками.
   Если нужен заполненный каталог для показа — добавьте флаг --with-products.

   Запуск:
     APPWRITE_ENDPOINT=... APPWRITE_PROJECT_ID=... APPWRITE_API_KEY=... \
     npm run seed:appwrite

   Скрипт идемпотентен: существующие записи пропускаются.
   ========================================================================== */

import { Client, Databases, ID, Query } from 'node-appwrite'

const endpoint = process.env.APPWRITE_ENDPOINT
const projectId = process.env.APPWRITE_PROJECT_ID
const apiKey = process.env.APPWRITE_API_KEY
const dbId = process.env.APPWRITE_DATABASE_ID || 'manili'
const withProducts = process.argv.includes('--with-products')

if (!endpoint || !projectId || !apiKey) {
  console.error('Нужны APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID и APPWRITE_API_KEY.')
  process.exit(1)
}

const db = new Databases(
  new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey),
)

/* --- Данные ---------------------------------------------------------------- */

const CATEGORIES = [
  { slug: 'hoodies', title: 'Худи', description: 'Плотный хлопок с начёсом, свободный крой.', sortOrder: 1 },
  { slug: 'tshirts', title: 'Футболки', description: 'Базовые и принтованные футболки.', sortOrder: 2 },
  { slug: 'longsleeves', title: 'Лонгсливы', description: 'Лонгсливы из плотного джерси.', sortOrder: 3 },
  { slug: 'pants', title: 'Штаны', description: 'Джоггеры и карго свободной посадки.', sortOrder: 4 },
  { slug: 'caps', title: 'Кепки', description: 'Кепки и шапки с вышивкой логотипа.', sortOrder: 5 },
  { slug: 'bags', title: 'Сумки', description: 'Шопперы и сумки из плотного канваса.', sortOrder: 6 },
  { slug: 'accessories', title: 'Аксессуары', description: 'Мелочи, которые завершают образ.', sortOrder: 7 },
]

const COLLECTIONS = [
  {
    slug: 'basic', title: 'BASIC',
    description: 'Базовая линия MANILI. Вещи, которые носят каждый день.',
    status: 'PUBLISHED', sortOrder: 1,
  },
  {
    slug: 'seasonal', title: 'НОВАЯ КОЛЛЕКЦИЯ',
    description: 'Сезонный дроп. Переименуйте под свой релиз в админке.',
    status: 'PUBLISHED', sortOrder: 2,
  },
  {
    slug: 'limited', title: 'LIMITED',
    description: 'Ограниченные релизы. Малый тираж, без перевыпуска.',
    status: 'PUBLISHED', sortOrder: 3,
  },
]

/** Блоки главной. Без них главная страница пустая. */
const HOMEPAGE_BLOCKS = [
  {
    type: 'HERO', sortOrder: 1, isEnabled: true,
    data: {
      eyebrow: 'MANILI — STREETWEAR BRAND',
      title: 'Одежда для тех, кто в движении',
      subtitle: 'Same city — different energy',
      ctaLabel: 'Смотреть коллекцию', ctaHref: '/shop',
      image: 'placeholder:editorial/1',
      images: ['placeholder:editorial/2', 'placeholder:editorial/3'],
    },
  },
  {
    type: 'MARQUEE', sortOrder: 2, isEnabled: true,
    data: { items: ['REAL STYLE', 'NO RULES', 'MADE IN RUSSIA', 'SAME CITY', 'DIFFERENT ENERGY'] },
  },
  {
    type: 'NEW_COLLECTION', sortOrder: 3, isEnabled: true,
    data: {
      eyebrow: 'New collection', title: 'Новая коллекция',
      text: 'Расскажите о свежем дропе: ткани, крой, настроение. Текст меняется в админке.',
      ctaLabel: 'Открыть коллекцию', ctaHref: '/collections/seasonal',
      image: 'placeholder:editorial/4',
    },
  },
  {
    type: 'CATEGORIES', sortOrder: 4, isEnabled: true,
    data: { eyebrow: 'Категории', title: 'Выбирай своё' },
  },
  {
    type: 'FEATURED_PRODUCTS', sortOrder: 5, isEnabled: true,
    data: {
      eyebrow: 'Избранное', title: 'Что берут чаще всего',
      ctaLabel: 'Весь каталог', ctaHref: '/shop',
    },
  },
  {
    type: 'EDITORIAL', sortOrder: 6, isEnabled: true,
    data: {
      eyebrow: 'Editorial', title: 'Clothes for real people',
      text: 'MANILI — это не про подиум. Это про улицу, движение и людей вокруг.',
      images: ['placeholder:editorial/5', 'placeholder:editorial/6', 'placeholder:editorial/7'],
    },
  },
  {
    type: 'STORY', sortOrder: 7, isEnabled: true,
    data: {
      eyebrow: 'О бренде', title: 'Одежда, культура, люди',
      text: 'MANILI — это не просто одежда. Это сообщество, идея, движение. Мы создаём вещи для тех, кто ценит свободу, культуру и людей вокруг.',
      ctaLabel: 'Узнать больше', ctaHref: '/about',
      image: 'placeholder:editorial/8',
    },
  },
  {
    type: 'NEW_ARRIVALS', sortOrder: 8, isEnabled: true,
    data: { eyebrow: 'Новинки', title: 'Только что приехало', ctaLabel: 'Все новинки', ctaHref: '/shop?new=1' },
  },
  {
    type: 'COLLECTIONS', sortOrder: 9, isEnabled: true,
    data: { eyebrow: 'Коллекции', title: 'Собранные истории' },
  },
  {
    type: 'CTA', sortOrder: 10, isEnabled: true,
    data: {
      title: 'Будь в курсе новых поступлений',
      text: 'Подпишись — расскажем о дропах раньше остальных.',
      ctaLabel: 'Подписаться', ctaHref: '#subscribe',
    },
  },
]

const PROMOCODES = [
  { code: 'WELCOME10', discountType: 'PERCENT', discountValue: 10, minOrderTotal: 300000, usageCount: 0, isActive: true },
  { code: 'FREESHIP', discountType: 'FREE_DELIVERY', discountValue: 0, minOrderTotal: 500000, usageCount: 0, isActive: true },
]

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const DEMO_PRODUCTS = [
  { slug: 'hoodie-classic', title: 'Худи MANILI Classic', price: 690000, sku: 'MNL-HD-001', category: 'hoodies', collection: 'basic', shape: 'hoodie' },
  { slug: 'tshirt-logo', title: 'Футболка MANILI Logo', price: 390000, sku: 'MNL-TS-001', category: 'tshirts', collection: 'basic', shape: 'tshirt' },
  { slug: 'cap-classic', title: 'Кепка MANILI', price: 290000, sku: 'MNL-CP-001', category: 'caps', collection: 'basic', shape: 'cap', oneSize: true },
  { slug: 'tote-canvas', title: 'Шоппер MANILI', price: 190000, sku: 'MNL-BG-001', category: 'bags', collection: 'basic', shape: 'bag', oneSize: true },
]

/* --- Помощники -------------------------------------------------------------- */

async function exists(collection, field, value) {
  const res = await db.listDocuments(dbId, collection, [Query.equal(field, value), Query.limit(1)])
  return res.documents[0] ?? null
}

async function ensure(collection, field, value, payload, label) {
  const found = await exists(collection, field, value)
  if (found) {
    console.log(`  = ${label} (уже есть)`)
    return found
  }
  const created = await db.createDocument(dbId, collection, ID.unique(), payload)
  console.log(`  + ${label}`)
  return created
}

/* --- Основной сценарий ------------------------------------------------------ */

async function main() {
  console.log(`\nMANILI — наполнение базы\n  проект: ${projectId}\n  база:   ${dbId}\n`)

  console.log('Категории')
  const categoryIds = {}
  for (const category of CATEGORIES) {
    const doc = await ensure('categories', 'slug', category.slug, {
      ...category, image: null, isActive: true,
    }, category.title)
    categoryIds[category.slug] = doc.$id
  }

  console.log('\nКоллекции')
  const collectionIds = {}
  for (const collection of COLLECTIONS) {
    const doc = await ensure('collections', 'slug', collection.slug, {
      ...collection, cover: null, banner: null, releaseDate: new Date().toISOString(),
    }, collection.title)
    collectionIds[collection.slug] = doc.$id
  }

  console.log('\nБлоки главной страницы')
  for (const block of HOMEPAGE_BLOCKS) {
    const found = await exists('homepage_blocks', 'type', block.type)
    if (found) {
      console.log(`  = ${block.type} (уже есть)`)
      continue
    }
    await db.createDocument(dbId, 'homepage_blocks', ID.unique(), {
      type: block.type,
      sortOrder: block.sortOrder,
      isEnabled: block.isEnabled,
      data: JSON.stringify(block.data),
    })
    console.log(`  + ${block.type}`)
  }

  console.log('\nПромокоды')
  for (const promo of PROMOCODES) {
    await ensure('promocodes', 'code', promo.code, {
      ...promo, startsAt: null, expiresAt: null, usageLimit: null,
    }, promo.code)
  }

  if (withProducts) {
    console.log('\nДемо-товары')
    for (const product of DEMO_PRODUCTS) {
      const found = await exists('products', 'slug', product.slug)
      if (found) {
        console.log(`  = ${product.title} (уже есть)`)
        continue
      }

      const doc = await db.createDocument(dbId, 'products', ID.unique(), {
        slug: product.slug,
        title: product.title,
        subtitle: null,
        description: 'Описание товара. Замените в админке.',
        composition: '100% хлопок. Сделано в России.',
        price: product.price,
        oldPrice: null,
        sku: product.sku,
        categoryId: categoryIds[product.category],
        collectionId: collectionIds[product.collection] ?? null,
        colorCode: 'black', colorTitle: 'Чёрный', colorHex: '#14120f',
        images: [`placeholder:${product.shape}/1`, `placeholder:${product.shape}/2`],
        videoUrl: null,
        tags: [],
        status: 'PUBLISHED',
        isNew: true, isLimited: false, popularity: 50,
        seoTitle: `${product.title} — MANILI`,
        seoDescription: null,
      })

      const sizes = product.oneSize ? ['ONE_SIZE'] : SIZES
      for (const size of sizes) {
        await db.createDocument(dbId, 'product_variants', ID.unique(), {
          productId: doc.$id,
          size,
          sku: `${product.sku}-${size}`,
          stock: 10, reserved: 0, priceModifier: 0,
          isActive: true, version: 0,
        })
      }
      console.log(`  + ${product.title}`)
    }
  }

  console.log(`
Готово.

${withProducts ? '' : 'Товары не создавались — добавьте свои в админке (/admin/products).\n'}Дальше:
  1. Откройте сайт и войдите — создастся ваш профиль.
  2. В коллекции profiles найдите свой документ и поставьте role = ADMIN.
  3. Зайдите в /admin и загрузите товары с фотографиями.
`)
}

main().catch((error) => {
  console.error(`\nОшибка: ${error.message}`)
  if (error.code === 404) {
    console.error('Похоже, схема ещё не развёрнута. Сначала: npm run setup:appwrite\n')
  }
  process.exit(1)
})
