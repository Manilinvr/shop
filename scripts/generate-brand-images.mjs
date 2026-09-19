#!/usr/bin/env node
/* ==========================================================================
   MANILI — ВРЕМЕННЫЕ ФИРМЕННЫЕ КАРТИНКИ

   Рисует два файла, на которые ссылается index.html:
     public/apple-touch-icon.png — иконка на домашнем экране iPhone (180×180)
     public/og-cover.png         — превью ссылки в Telegram, VK (1200×630)

   Без них браузер получает 404 на каждой странице, а ссылка на магазин
   в мессенджере приходит без картинки.

   Рисуем кодом, без внешних библиотек: зависимость ради двух картинок —
   лишний вес. Когда появится фирменная графика, просто положите свои файлы
   с теми же именами в public/ — скрипт больше не понадобится.

   Запуск: npm run brand:images
   ========================================================================== */

import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const INK = [0x11, 0x10, 0x10]     // --c-ink-800, фон
const CREAM = [0xf2, 0xeb, 0xdd]   // --c-cream-100, знак

/* --- Холст ----------------------------------------------------------------- */

/** Сглаживание: считаем каждый пиксель по сетке SS×SS подточек. */
const SS = 4

function createCanvas(width, height, [r, g, b]) {
  const pixels = new Uint8Array(width * height * 3)
  for (let i = 0; i < width * height; i += 1) {
    pixels[i * 3] = r
    pixels[i * 3 + 1] = g
    pixels[i * 3 + 2] = b
  }
  return { width, height, pixels }
}

/** Смешивает цвет с тем, что уже на холсте, по прозрачности 0..1. */
function blend(canvas, x, y, [r, g, b], alpha) {
  if (alpha <= 0) return
  const i = (y * canvas.width + x) * 3
  const a = Math.min(1, alpha)
  canvas.pixels[i] = Math.round(canvas.pixels[i] * (1 - a) + r * a)
  canvas.pixels[i + 1] = Math.round(canvas.pixels[i + 1] * (1 - a) + g * a)
  canvas.pixels[i + 2] = Math.round(canvas.pixels[i + 2] * (1 - a) + b * a)
}

/**
 * Заливает область, заданную функцией «точка внутри?».
 * bounds ограничивает перебор, иначе на 1200×630 это миллионы лишних проверок.
 */
function fill(canvas, bounds, color, isInside) {
  const x0 = Math.max(0, Math.floor(bounds.x0))
  const y0 = Math.max(0, Math.floor(bounds.y0))
  const x1 = Math.min(canvas.width - 1, Math.ceil(bounds.x1))
  const y1 = Math.min(canvas.height - 1, Math.ceil(bounds.y1))
  const step = 1 / SS
  const offset = step / 2

  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      let hits = 0
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          if (isInside(x + sx * step + offset, y + sy * step + offset)) hits += 1
        }
      }
      if (hits > 0) blend(canvas, x, y, color, hits / (SS * SS))
    }
  }
}

/* --- Фигуры ---------------------------------------------------------------- */

/** Прямоугольник со скруглёнными углами — как у плитки приложения на iOS. */
function roundedRect(canvas, x, y, w, h, radius, color) {
  const inside = (px, py) => {
    if (px < x || px > x + w || py < y || py > y + h) return false
    const dx = Math.max(x + radius - px, px - (x + w - radius), 0)
    const dy = Math.max(y + radius - py, py - (y + h - radius), 0)
    return dx * dx + dy * dy <= radius * radius
  }
  fill(canvas, { x0: x, y0: y, x1: x + w, y1: y + h }, color, inside)
}

/** Многоугольник по вершинам, заливка по чётности пересечений. */
function polygon(canvas, points, color) {
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const inside = (px, py) => {
    let hit = false
    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
      const [xi, yi] = points[i]
      const [xj, yj] = points[j]
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit
    }
    return hit
  }
  fill(
    canvas,
    { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) },
    color,
    inside,
  )
}

/** Отрезок заданной толщины со скруглёнными концами. */
function stroke(canvas, ax, ay, bx, by, thickness, color) {
  const radius = thickness / 2
  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  const inside = (px, py) => {
    // Расстояние от точки до отрезка: проецируем и зажимаем в [0,1].
    let t = lengthSquared === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lengthSquared
    t = Math.max(0, Math.min(1, t))
    const cx = px - (ax + t * dx)
    const cy = py - (ay + t * dy)
    return cx * cx + cy * cy <= radius * radius
  }
  fill(
    canvas,
    {
      x0: Math.min(ax, bx) - radius,
      y0: Math.min(ay, by) - radius,
      x1: Math.max(ax, bx) + radius,
      y1: Math.max(ay, by) + radius,
    },
    color,
    inside,
  )
}

/* --- Знак и надпись --------------------------------------------------------- */

/** Монограмма M из favicon.svg, координаты в сетке 64×64. */
const MONOGRAM = [
  [15, 45], [15, 19], [21.6, 19], [32, 35.4], [42.4, 19], [49, 19],
  [49, 45], [42.8, 45], [42.8, 30.3], [33, 45], [31, 45], [21.2, 30.3], [21.2, 45],
]

function drawMonogram(canvas, x, y, size, color) {
  const scale = size / 64
  polygon(canvas, MONOGRAM.map(([mx, my]) => [x + mx * scale, y + my * scale]), color)
}

/**
 * Буквы как ломаные линии в квадрате 0..1 (y=0 — верх).
 * Такой «трафаретный» рисунок держит фирменный дух и не требует шрифта.
 */
const GLYPHS = {
  M: { width: 0.86, strokes: [[0, 1, 0, 0], [0, 0, 0.43, 0.6], [0.43, 0.6, 0.86, 0], [0.86, 0, 0.86, 1]] },
  A: { width: 0.8, strokes: [[0, 1, 0.4, 0], [0.4, 0, 0.8, 1], [0.16, 0.6, 0.64, 0.6]] },
  N: { width: 0.8, strokes: [[0, 1, 0, 0], [0, 0, 0.8, 1], [0.8, 1, 0.8, 0]] },
  // Ширина I задана по толщине штриха, иначе просветы вокруг неё уже прочих.
  I: { width: 0.15, strokes: [[0.075, 0, 0.075, 1]] },
  L: { width: 0.68, strokes: [[0, 0, 0, 1], [0, 1, 0.68, 1]] },
}

/** Рисует надпись; возвращает её ширину, чтобы вызывающий мог отцентрировать. */
function drawWord(canvas, word, x, y, size, thickness, tracking, color, dryRun = false) {
  let cursor = x
  for (const letter of word) {
    const glyph = GLYPHS[letter]
    if (!glyph) continue
    if (!dryRun) {
      for (const [ax, ay, bx, by] of glyph.strokes) {
        stroke(
          canvas,
          cursor + ax * size, y + ay * size,
          cursor + bx * size, y + by * size,
          thickness, color,
        )
      }
    }
    cursor += glyph.width * size + tracking
  }
  return cursor - x - tracking
}

/* --- PNG ------------------------------------------------------------------- */

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body) >>> 0)
  return Buffer.concat([length, body, crc])
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let c = -1
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8)
  return c ^ -1
}

function toPng({ width, height, pixels }) {
  // Каждая строка PNG начинается с байта фильтра; 0 — «без фильтра».
  const raw = Buffer.alloc(height * (width * 3 + 1))
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 3 + 1)
    raw[rowStart] = 0
    Buffer.from(pixels.buffer, y * width * 3, width * 3).copy(raw, rowStart + 1)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8   // бит на канал
  ihdr[9] = 2   // truecolor RGB
  ihdr[10] = 0  // сжатие deflate
  ihdr[11] = 0  // фильтрация стандартная
  ihdr[12] = 0  // без чересстрочности

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* --- Сборка файлов ---------------------------------------------------------- */

function buildAppleTouchIcon() {
  const size = 180
  const canvas = createCanvas(size, size, CREAM)
  // iOS сам скругляет углы, но свои скругления защищают от светлой каймы.
  roundedRect(canvas, 0, 0, size, size, size * 0.28, INK)
  drawMonogram(canvas, 0, 0, size, CREAM)
  return canvas
}

function buildOgCover() {
  const width = 1200
  const height = 630
  const canvas = createCanvas(width, height, INK)

  const size = 150
  const thickness = size * 0.15
  const tracking = size * 0.2
  const wordWidth = drawWord(canvas, 'MANILI', 0, 0, size, thickness, tracking, CREAM, true)

  const x = (width - wordWidth) / 2
  const y = (height - size) / 2 - 10
  drawWord(canvas, 'MANILI', x, y, size, thickness, tracking, CREAM)

  // Две линии обрамляют надпись — как в шапке сайта.
  const rule = wordWidth * 0.34
  stroke(canvas, (width - rule) / 2, y - size * 0.42, (width + rule) / 2, y - size * 0.42, 3, CREAM)
  stroke(canvas, (width - rule) / 2, y + size * 1.42, (width + rule) / 2, y + size * 1.42, 3, CREAM)

  return canvas
}

const targets = [
  ['public/apple-touch-icon.png', buildAppleTouchIcon()],
  ['public/og-cover.png', buildOgCover()],
]

for (const [path, canvas] of targets) {
  const png = toPng(canvas)
  writeFileSync(resolve(process.cwd(), path), png)
  console.log(`${path} — ${canvas.width}×${canvas.height}, ${(png.length / 1024).toFixed(1)} КБ`)
}
