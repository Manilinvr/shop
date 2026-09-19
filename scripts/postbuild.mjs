#!/usr/bin/env node
/* ==========================================================================
   MANILI — ШАГИ ПОСЛЕ СБОРКИ (ТЗ §29)

   1. 404.html — копия index.html. GitHub Pages отдаёт её на неизвестный путь,
      и SPA-роутер подхватывает адрес. Без этого прямая ссылка вида
      /product/manili-hoodie вернёт 404.
   2. sitemap.xml — статические разделы плюс товары и коллекции из Appwrite,
      если backend настроен.
   3. robots.txt — адрес карты сайта и закрытые разделы. Генерируется здесь,
      потому что зависит от домена и подпапки сборки.
   4. Абсолютные адреса в og:url и og:image: соцсети не понимают '/og-cover.png'.
   ========================================================================== */

import { copyFile, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const DIST = resolve(process.cwd(), 'dist')

/*
   Адрес сайта складывается из двух частей, и путать их нельзя:
     VITE_SITE_URL  — домен, куда смотрят поисковики,
     VITE_BASE_PATH — подпапка сборки ('/' на своём домене,
                      '/shop/' на проектной странице GitHub).

   Из VITE_SITE_URL берём только домен: в проектном режиме он уже содержит
   подпапку, и без этого в адресах получилось бы '/shop/shop/'.
*/
const BASE_PATH = `/${(process.env.VITE_BASE_PATH || '/').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/')
const ORIGIN = new URL(process.env.VITE_SITE_URL || 'http://localhost:4173').origin
/** Корень сайта без завершающего слэша: 'https://example.com' или '...github.io/shop'. */
const SITE_ROOT = `${ORIGIN}${BASE_PATH}`.replace(/\/$/, '')

/** Полный адрес страницы из пути вида '/shop/hoodies'. */
function absolute(path) {
  if (path === '/') return `${SITE_ROOT}/`
  return `${SITE_ROOT}${path.startsWith('/') ? path : `/${path}`}`
}

const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/shop', priority: '0.9', changefreq: 'daily' },
  { path: '/collections', priority: '0.8', changefreq: 'weekly' },
  { path: '/about', priority: '0.6', changefreq: 'monthly' },
  { path: '/contacts', priority: '0.5', changefreq: 'monthly' },
  { path: '/lookbook', priority: '0.6', changefreq: 'weekly' },
  { path: '/delivery', priority: '0.5', changefreq: 'monthly' },
  { path: '/returns', priority: '0.5', changefreq: 'monthly' },
  { path: '/sizes', priority: '0.4', changefreq: 'monthly' },
  { path: '/legal/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/legal/terms', priority: '0.3', changefreq: 'yearly' },
  { path: '/legal/offer', priority: '0.3', changefreq: 'yearly' },
]

/** Товары и коллекции из Appwrite — только если backend уже подключён. */
async function fetchDynamicRoutes() {
  const endpoint = process.env.VITE_APPWRITE_ENDPOINT
  const project = process.env.VITE_APPWRITE_PROJECT_ID
  const database = process.env.VITE_APPWRITE_DATABASE_ID || 'manili'
  if (!endpoint || !project) return []

  const load = async (collection, extraQuery = []) => {
    const params = new URLSearchParams()
    const queries = [JSON.stringify({ method: 'limit', values: [500] }), ...extraQuery]
    queries.forEach((q) => params.append('queries[]', q))

    const response = await fetch(
      `${endpoint}/databases/${database}/collections/${collection}/documents?${params}`,
      { headers: { 'X-Appwrite-Project': project } },
    )
    if (!response.ok) return []
    const data = await response.json()
    return data.documents ?? []
  }

  try {
    const published = JSON.stringify({ method: 'equal', attribute: 'status', values: ['PUBLISHED'] })
    const [products, collections] = await Promise.all([
      load('products', [published]),
      load('collections', [published]),
    ])
    return [
      ...products.map((p) => ({ path: `/product/${p.slug}`, priority: '0.8', changefreq: 'weekly', lastmod: p.$updatedAt })),
      ...collections.map((c) => ({ path: `/collections/${c.slug}`, priority: '0.7', changefreq: 'weekly', lastmod: c.$updatedAt })),
    ]
  } catch (error) {
    console.warn('[postbuild] Не удалось получить товары для sitemap:', error.message)
    return []
  }
}

function buildSitemap(routes) {
  const today = new Date().toISOString().slice(0, 10)
  const entries = routes
    .map(
      (route) => `  <url>
    <loc>${absolute(route.path)}</loc>
    <lastmod>${(route.lastmod ?? today).slice(0, 10)}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`
}

/** Разделы, которым нечего делать в поиске: личные кабинеты и оформление. */
const PRIVATE_ROUTES = ['/admin', '/account', '/checkout', '/cart', '/favorites', '/login']

function buildRobots() {
  const disallow = PRIVATE_ROUTES.map((route) => `Disallow: ${BASE_PATH.replace(/\/$/, '')}${route}`)
  return `User-agent: *
Allow: ${BASE_PATH}

# Личные и служебные разделы в индекс не нужны
${disallow.join('\n')}

Sitemap: ${absolute('/sitemap.xml')}
`
}

/**
 * Соцсети и мессенджеры читают только абсолютные адреса картинок, а Vite
 * подставляет подпапку в href и src, но не в content у <meta>. Дописываем сами.
 */
async function absolutizeMeta() {
  const file = resolve(DIST, 'index.html')
  const html = await readFile(file, 'utf8')
  const patched = html
    .replace(/(<meta property="og:image" content=")([^"]*)"/, (_, head, value) =>
      `${head}${absolute(value.replace(BASE_PATH, '/'))}"`)
    .replace(/(<meta property="og:url" content=")([^"]*)"/, (_, head) => `${head}${absolute('/')}"`)

  if (patched === html) {
    console.warn('[postbuild] og:image / og:url не найдены в index.html — проверьте шаблон')
    return
  }
  await writeFile(file, patched, 'utf8')
  console.log(`[postbuild] og:url и og:image приведены к абсолютным (${SITE_ROOT})`)
}

async function main() {
  // Сначала мета-теги, потом копия: 404.html должна получить те же адреса.
  await absolutizeMeta()

  await copyFile(resolve(DIST, 'index.html'), resolve(DIST, '404.html'))
  console.log('[postbuild] 404.html создан (SPA-фолбэк для GitHub Pages)')

  await writeFile(resolve(DIST, 'robots.txt'), buildRobots(), 'utf8')
  console.log('[postbuild] robots.txt создан')

  const dynamic = await fetchDynamicRoutes()
  const routes = [...STATIC_ROUTES, ...dynamic]
  await writeFile(resolve(DIST, 'sitemap.xml'), buildSitemap(routes), 'utf8')
  console.log(`[postbuild] sitemap.xml: ${routes.length} адресов`)
}

main().catch((error) => {
  console.error('[postbuild]', error)
  process.exit(1)
})
