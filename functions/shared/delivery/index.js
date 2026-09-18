/* ==========================================================================
   MANILI — DELIVERY PROVIDER ADAPTER (ТЗ §16)

   Единый интерфейс поверх служб доставки:
     quote() / pickupPoints() / suggestCities() / createShipment() / track()

   Магазин не привязан к одной службе: добавление Яндекс Доставки — это новый
   файл рядом и переменная окружения.
   ========================================================================== */

import { createCdekProvider } from './cdek.js'
import { createManualProvider } from './manual.js'

export function getDeliveryProvider() {
  const name = (process.env.DELIVERY_PROVIDER || '').toLowerCase()
  switch (name) {
    case 'cdek':
      return createCdekProvider()
    default:
      // Пока служба не подключена, работают базовые тарифы из настроек.
      return createManualProvider()
  }
}
