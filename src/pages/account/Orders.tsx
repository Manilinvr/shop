/* ==========================================================================
   MANILI — МОИ ЗАКАЗЫ (ТЗ §24)
   ========================================================================== */

import { Link } from 'react-router-dom'
import { Media } from '@/components/media/Media'
import { Badge, ButtonLink, EmptyState, Skeleton } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { formatPrice } from '@/domain/money'
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from '@/domain/order-status'
import { formatDateShort, pluralWithCount } from '@/lib/utils'
import { backend } from '@/repositories'
import '../auth.css'

export default function Orders() {
  const orders = useAsync(() => backend.orders.listMine(), [])

  return (
    <>
      <h1 className="account__panel-title">Мои заказы</h1>

      {orders.loading && (
        <div style={{ display: 'grid', gap: 12 }}>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} style={{ height: 150, borderRadius: 'var(--r-lg)' }} />
          ))}
        </div>
      )}

      {!orders.loading && (orders.data?.length ?? 0) === 0 && (
        <EmptyState
          title="Заказов пока нет"
          text="Когда оформите первый заказ, он появится здесь вместе со статусом доставки."
          action={<ButtonLink to="/shop">В каталог</ButtonLink>}
        />
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        {(orders.data ?? []).map((order) => (
          <Link key={order.id} to={`/account/orders/${order.id}`} className="order-row">
            <div className="order-row__head">
              <div>
                <p className="order-row__number">{order.publicOrderNumber}</p>
                <p className="order-row__date">{formatDateShort(order.createdAt)}</p>
              </div>
              <Badge tone={ORDER_STATUS_TONE[order.orderStatus]} dot>
                {ORDER_STATUS_LABELS[order.orderStatus]}
              </Badge>
            </div>

            <div className="order-row__thumbs">
              {order.items.slice(0, 5).map((item) => (
                <div key={item.id} className="order-row__thumb">
                  <Media src={item.productImage} alt="" ratio="3 / 4" rounded="none" sizes="52px" />
                </div>
              ))}
            </div>

            <div className="order-row__foot">
              <span className="order-row__date">
                {pluralWithCount(
                  order.items.reduce((sum, item) => sum + item.quantity, 0),
                  ['товар', 'товара', 'товаров'],
                )}
              </span>
              <span className="order-row__total">{formatPrice(order.total)}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
