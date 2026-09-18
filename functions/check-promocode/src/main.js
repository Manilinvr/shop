/* ==========================================================================
   MANILI — ПРОВЕРКА ПРОМОКОДА (ТЗ §13)
   Скидку считает сервер. Браузер получает только готовый результат.
   ========================================================================== */

import { fail, ok, parseBody } from '../../shared/errors.js'
import { evaluatePromocode } from '../../shared/promocode.js'

export default async ({ req, res, log, error }) => {
  try {
    const { code, subtotal } = parseBody(req)
    const amount = Number.isFinite(Number(subtotal)) ? Number(subtotal) : 0
    const result = await evaluatePromocode(code, amount)
    // promoId наружу не отдаём — фронту он не нужен.
    const { promoId, ...publicResult } = result
    return res.json(ok(publicResult))
  } catch (e) {
    error(String(e?.stack || e))
    return res.json(fail(e, log))
  }
}
