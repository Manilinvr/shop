/* ==========================================================================
   MANILI — БАЗОВЫЕ ТАРИФЫ БЕЗ ИНТЕГРАЦИИ
   Работает, пока договор со службой не подключён: владелец задаёт цены
   переменными окружения, магазин остаётся рабочим.
   ========================================================================== */

import { FREE_DELIVERY_THRESHOLD } from '../constants.js'

const price = (value, subtotal) => (subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : value)

const CITIES = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
  'Нижний Новгород', 'Челябинск', 'Самара', 'Уфа', 'Ростов-на-Дону',
  'Краснодар', 'Омск', 'Воронеж', 'Пермь', 'Волгоград', 'Сочи', 'Тюмень',
]

export function createManualProvider() {
  return {
    name: 'MANUAL',

    async quote({ city, subtotal }) {
      const isLocal = String(city || '').toLowerCase().includes('москв')
      const options = [
        {
          id: 'pvz', provider: 'MANUAL', method: 'PICKUP_POINT',
          title: 'Пункт выдачи', description: 'Забрать в удобном ПВЗ',
          price: price(Number(process.env.DELIVERY_PRICE_PVZ || 35000), subtotal),
          minDays: isLocal ? 1 : 2, maxDays: isLocal ? 2 : 5,
        },
        {
          id: 'courier', provider: 'MANUAL', method: 'COURIER',
          title: 'Курьер до двери', description: 'Курьер привезёт по адресу',
          price: price(Number(process.env.DELIVERY_PRICE_COURIER || 45000), subtotal),
          minDays: isLocal ? 1 : 2, maxDays: isLocal ? 2 : 6,
        },
        {
          id: 'post', provider: 'MANUAL', method: 'POST',
          title: 'Почта России', description: 'Доставка в отделение',
          price: price(Number(process.env.DELIVERY_PRICE_POST || 30000), subtotal),
          minDays: 3, maxDays: 10,
        },
      ]
      if (isLocal && process.env.DELIVERY_SELF_PICKUP_ADDRESS) {
        options.push({
          id: 'self', provider: 'MANILI', method: 'SELF_PICKUP',
          title: 'Самовывоз',
          description: process.env.DELIVERY_SELF_PICKUP_ADDRESS,
          price: 0, minDays: 1, maxDays: 2,
        })
      }
      return options
    },

    async pickupPoints() { return [] },
    async suggestCities(query) {
      const q = String(query || '').trim().toLowerCase()
      if (!q) return CITIES.slice(0, 8)
      return CITIES.filter((c) => c.toLowerCase().includes(q)).slice(0, 8)
    },
    async createShipment() { return { deliveryId: null, trackingNumber: null } },
    async track() { return { status: 'UNKNOWN', events: [] } },
  }
}
