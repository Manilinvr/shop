/* ==========================================================================
   MANILI — ЗЕРНО И ВИНЬЕТКА (ТЗ §2)

   Аналоговая фактура поверх всего документа. Текстура генерируется один раз
   на canvas и переиспользуется — это дешевле, чем SVG-фильтр feTurbulence,
   который пересчитывается браузером при каждой перерисовке.
   ========================================================================== */

import { useEffect, useState } from 'react'

const GRAIN_SIZE = 180

function generateGrain(): string {
  const canvas = document.createElement('canvas')
  canvas.width = GRAIN_SIZE
  canvas.height = GRAIN_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const image = ctx.createImageData(GRAIN_SIZE, GRAIN_SIZE)
  const { data } = image
  for (let i = 0; i < data.length; i += 4) {
    const value = Math.random() * 255
    data[i] = value
    data[i + 1] = value
    data[i + 2] = value
    // Разная прозрачность даёт «плёночную» неравномерность
    data[i + 3] = Math.random() * 255
  }
  ctx.putImageData(image, 0, 0)
  return canvas.toDataURL('image/png')
}

export function GrainLayer() {
  const [grainUrl, setGrainUrl] = useState<string | null>(null)

  useEffect(() => {
    // Генерируем после первой отрисовки, чтобы не задерживать показ контента.
    const id = requestIdleCallbackShim(() => setGrainUrl(generateGrain()))
    return () => cancelIdleCallbackShim(id)
  }, [])

  return (
    <>
      {grainUrl && (
        <div
          className="grain-layer"
          style={{ ['--grain-url' as string]: `url(${grainUrl})` }}
          aria-hidden="true"
        />
      )}
      <div className="vignette-layer" aria-hidden="true" />
    </>
  )
}

/* requestIdleCallback есть не везде (Safari) — нужен запасной вариант. */
function requestIdleCallbackShim(cb: () => void): number {
  if (typeof requestIdleCallback === 'function') {
    return requestIdleCallback(cb) as unknown as number
  }
  return window.setTimeout(cb, 240)
}

function cancelIdleCallbackShim(id: number): void {
  if (typeof cancelIdleCallback === 'function') {
    cancelIdleCallback(id as unknown as number)
    return
  }
  clearTimeout(id)
}
