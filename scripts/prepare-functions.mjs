#!/usr/bin/env node
/* ==========================================================================
   MANILI — СБОРКА ФУНКЦИЙ К ДЕПЛОЮ

   Функции подключают общие модули относительными путями (../../shared/...).
   Appwrite разворачивает каждую функцию отдельно, поэтому папку shared нужно
   положить внутрь каждой. Скрипт делает это копированием в build/functions/,
   не трогая исходники.

   Запуск:  node scripts/prepare-functions.mjs
   Результат: build/functions/<имя>/ — готовая к деплою папка.
   ========================================================================== */

import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const ROOT = process.cwd()
const SRC = resolve(ROOT, 'functions')
const OUT = resolve(ROOT, 'build/functions')

const IGNORED = new Set(['shared', 'node_modules', 'README.md', 'package.json'])

async function main() {
  await rm(OUT, { recursive: true, force: true })
  await mkdir(OUT, { recursive: true })

  const entries = await readdir(SRC)
  const functionNames = []

  for (const name of entries) {
    if (IGNORED.has(name)) continue
    const path = resolve(SRC, name)
    if (!(await stat(path)).isDirectory()) continue

    const target = resolve(OUT, name)
    await cp(path, target, { recursive: true })

    // Appwrite деплоит только папку самой функции, поэтому shared кладём внутрь.
    await cp(resolve(SRC, 'shared'), resolve(target, 'shared'), { recursive: true })

    // В репозитории shared лежит на уровень выше (functions/shared), после
    // копирования он оказывается рядом — правим путь в импортах.
    const entry = resolve(target, 'src/main.js')
    const code = await readFile(entry, 'utf8')
    const patched = code.replaceAll('../../shared/', '../shared/')
    if (patched === code && code.includes('shared/')) {
      throw new Error(`${name}: не удалось исправить пути к shared`)
    }
    await writeFile(entry, patched, 'utf8')

    functionNames.push(name)
    console.log(`  ✓ ${name}`)
  }

  console.log(`\nГотово: ${functionNames.length} функц. в build/functions/`)
  console.log('\nДеплой через Appwrite CLI:')
  console.log('  appwrite push functions')
  console.log('\nИли вручную: заархивируйте нужную папку и загрузите в консоли Appwrite.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
