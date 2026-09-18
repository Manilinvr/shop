/* ==========================================================================
   MANILI — СДЭК
   Документация: https://api-docs.cdek.ru
   ========================================================================== */

import { FREE_DELIVERY_THRESHOLD } from '../constants.js'
import { PublicError } from '../errors.js'

const API = process.env.DELIVERY_API_URL || 'https://api.cdek.ru/v2'

let tokenCache = { value: null, expiresAt: 0 }

async function token() {
  if (tokenCache.value && Date.now() < tokenCache.expiresAt) return tokenCache.value

  const account = process.env.DELIVERY_ACCOUNT
  const secret = process.env.DELIVERY_API_KEY
  if (!account || !secret) {
    throw new PublicError(
      'DELIVERY_NOT_CONFIGURED',
      'Расчёт доставки временно недоступен.',
      'Нет DELIVERY_ACCOUNT / DELIVERY_API_KEY',
    )
  }

  const response = await fetch(`${API}/oauth/token?parameters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: account,
      client_secret: secret,
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.access_token) {
    throw new PublicError(
      'DELIVERY_ERROR',
      'Не удалось рассчитать доставку. Попробуйте позже.',
      `СДЭК auth ${response.status}`,
    )
  }

  tokenCache = {
    value: data.access_token,
    // Обновляем чуть раньше истечения, чтобы не поймать 401 в середине заказа.
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }
  return tokenCache.value
}

async function request(path, { method = 'GET', body, query } = {}) {
  const url = new URL(`${API}${path}`)
  if (query) Object.entries(query).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, v))

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${await token()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new PublicError(
      'DELIVERY_ERROR',
      'Не удалось рассчитать доставку. Попробуйте позже.',
      `СДЭК ${response.status}: ${JSON.stringify(data).slice(0, 300)}`,
    )
  }
  return data
}

/** Тарифы СДЭК: посылка склад-склад и склад-дверь. */
const TARIFFS = [
  { code: 136, method: 'PICKUP_POINT', title: 'СДЭК — пункт выдачи', description: 'Забрать в удобном ПВЗ' },
  { code: 137, method: 'COURIER', title: 'СДЭК — курьер до двери', description: 'Курьер привезёт по адресу' },
]

export function createCdekProvider() {
  return {
    name: 'CDEK',

    async quote({ city, items, subtotal }) {
      const toCity = await resolveCityCode(city)
      const packages = [{
        weight: Math.max(300, items.reduce((sum, i) => sum + i.quantity * 400, 0)),
      }]

      const results = await Promise.all(
        TARIFFS.map(async (tariff) => {
          try {
            const data = await request('/calculator/tariff', {
              method: 'POST',
              body: {
                tariff_code: tariff.code,
                from_location: { code: Number(process.env.DELIVERY_FROM_CITY_CODE || 44) },
                to_location: { code: toCity },
                packages,
              },
            })
            const raw = Math.round(Number(data.total_sum || 0) * 100)
            return {
              id: `cdek-${tariff.code}`,
              provider: 'CDEK',
              method: tariff.method,
              title: tariff.title,
              description: tariff.description,
              price: subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : raw,
              minDays: Number(data.period_min || 2),
              maxDays: Number(data.period_max || 7),
            }
          } catch {
            // Один недоступный тариф не должен ломать весь checkout.
            return null
          }
        }),
      )

      return results.filter(Boolean)
    },

    async pickupPoints(city) {
      const code = await resolveCityCode(city)
      const data = await request('/deliverypoints', { query: { city_code: code, type: 'PVZ', size: 30 } })
      return (Array.isArray(data) ? data : []).map((point) => ({
        id: point.code,
        provider: 'CDEK',
        code: point.code,
        name: point.name,
        address: point.location?.address_full || point.location?.address || '',
        city: point.location?.city || city,
        workHours: point.work_time || null,
        lat: point.location?.latitude ?? 0,
        lng: point.location?.longitude ?? 0,
      }))
    },

    async suggestCities(query) {
      const data = await request('/location/cities', { query: { city: query, size: 10, country_codes: 'RU' } })
      return [...new Set((Array.isArray(data) ? data : []).map((c) => c.city))]
    },

    async createShipment({ order }) {
      const data = await request('/orders', {
        method: 'POST',
        body: {
          number: order.publicOrderNumber,
          tariff_code: order.deliveryMethod === 'COURIER' ? 137 : 136,
          recipient: { name: order.customerName, phones: [{ number: order.phone }] },
          from_location: { code: Number(process.env.DELIVERY_FROM_CITY_CODE || 44) },
          to_location: order.pickupPointCode
            ? undefined
            : { address: order.shippingAddressText },
          delivery_point: order.pickupPointCode || undefined,
          packages: [{
            number: order.publicOrderNumber,
            weight: Math.max(300, order.items.reduce((s, i) => s + i.quantity * 400, 0)),
            items: order.items.map((item) => ({
              name: item.productTitle,
              ware_key: item.sku,
              payment: { value: 0 },
              cost: item.price / 100,
              amount: item.quantity,
              weight: 400,
            })),
          }],
        },
      })
      return { deliveryId: data.entity?.uuid ?? null, trackingNumber: null }
    },

    async track(deliveryId) {
      const data = await request(`/orders/${deliveryId}`)
      const statuses = data.entity?.statuses ?? []
      return {
        status: statuses[0]?.code ?? 'UNKNOWN',
        trackingNumber: data.entity?.cdek_number ?? null,
        events: statuses.map((s) => ({ date: s.date_time, text: s.name })),
      }
    },
  }
}

async function resolveCityCode(city) {
  const data = await request('/location/cities', { query: { city, size: 1, country_codes: 'RU' } })
  const found = Array.isArray(data) ? data[0] : null
  if (!found) {
    throw new PublicError('CITY_NOT_FOUND', 'Не нашли такой город. Проверьте написание.')
  }
  return found.code
}
