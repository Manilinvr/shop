#!/usr/bin/env node
/* ==========================================================================
   MANILI — СВЕРКА ИМПОРТОВ С ЗАВИСИМОСТЯМИ

   Библиотека, которую код импортирует, но package.json не объявляет,
   ставится случайно — как побочная зависимость чего-то ещё. На чистой
   машине и в CI, где ставится ровно объявленное, такой импорт падает.

   Именно это случилось с node-appwrite: functions/package.json его объявлял,
   а корневой — нет, и скрипты настройки базы не могли отработать никогда.
   Обнаружилось только на живом запуске, спустя несколько неудачных попыток.

   tsc ловит это в .ts, но не в .mjs и .js — а вся серверная часть на них.

   Запуск:  npm run check:deps
   ========================================================================== */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const SKIP = new Set(['node_modules', '.git', 'dist', 'build'])

function walk(dir, found = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, found)
    else if (/\.(mjs|cjs|js|ts|tsx)$/.test(name)) found.push(full)
  }
  return found
}

function declaredIn(manifest) {
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, manifest), 'utf8'))
    return new Set([
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ])
  } catch {
    return new Set()
  }
}

const rootDeps = declaredIn('package.json')
// Функции разворачиваются отдельной папкой и ставят свои зависимости сами.
const functionDeps = declaredIn('functions/package.json')

/**
 * Комментарии выбрасываем до разбора: иначе пример импорта, написанный
 * в документации, засчитывается как настоящий — эта проверка первым делом
 * поймала так саму себя.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|\s)\/\/[^\n]*/g, '$1')
}

const PATTERNS = [
  /(?:^|\n)\s*import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g,
  /(?:^|\n)\s*export\s+[^'"]*?\s+from\s+['"]([^'"]+)['"]/g,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
]

/** Пакет из пути импорта: 'foo/bar' → 'foo', '@scope/pkg/x' → '@scope/pkg'. */
function packageOf(specifier) {
  const parts = specifier.split('/')
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

function isLocal(specifier) {
  return (
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    specifier.startsWith('@/') ||  // алиас на src/, настроен в vite.config.ts
    specifier.startsWith('node:')
  )
}

const missing = new Map()

for (const file of walk(ROOT)) {
  const source = stripComments(readFileSync(file, 'utf8'))
  const shown = relative(ROOT, file)
  const deps = shown.startsWith(`functions${'/'}`) ? functionDeps : rootDeps

  for (const pattern of PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1]
      if (isLocal(specifier)) continue
      const pkg = packageOf(specifier)
      if (deps.has(pkg)) continue
      if (!missing.has(pkg)) missing.set(pkg, new Set())
      missing.get(pkg).add(shown)
    }
  }
}

if (missing.size > 0) {
  console.error('\nИмпорт есть, а зависимости нет:\n')
  for (const [pkg, files] of missing) {
    console.error(`  ${pkg}`)
    for (const file of files) console.error(`      ${file}`)
  }
  const where = [...missing.values()].flatMap((f) => [...f])
  const manifest = where.every((f) => f.startsWith('functions/'))
    ? 'functions/package.json'
    : 'package.json'
  console.error(`\nДобавьте пакеты в ${manifest} — иначе на чистой установке будет ERR_MODULE_NOT_FOUND.\n`)
  process.exit(1)
}

console.log('Импорты и зависимости сходятся.')
