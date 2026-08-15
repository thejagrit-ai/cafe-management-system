import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Package, ChevronLeft, ChevronRight } from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate, getStatusColor, getOrderTypeLabel, cn } from '@/utils/lib'
import Separator from '@/components/home/Separator'

const PAGE_SIZE = 10

export default function OrderHistoryPage() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-orders', page],
    queryFn: () => ordersApi.getMyOrders({ page, limit: PAGE_SIZE }),
  })

  const orders = data?.data ?? []
  const pagination = data?.pagination

  return (
    <div className="container mx-auto py-16">
      <div className="flex flex-col items-center text-center">
        <h1 className="h2">{t('orders.title')}</h1>
        <Separator className="mt-5" />
        <p className="lead mt-5 max-w-lg text-muted-foreground">{t('orders.subtitle')}</p>
      </div>

      <div className="mx-auto mt-14 max-w-4xl">
        {isError ? (
          <div className="py-20 text-center">
            <h2 className="font-serif text-2xl">{t('errors.genericTitle')}</h2>
            <p className="mt-2 text-muted-foreground">{t('errors.genericDesc')}</p>
            <button type="button" onClick={() => refetch()} className="btn-cafe mt-6">
              {t('errors.retryButton')}
            </button>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-sm" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Package className="h-14 w-14 text-brand-gold/40" aria-hidden="true" />
            <h2 className="h3 mt-6">{t('orders.emptyHistory')}</h2>
            <p className="mt-3 max-w-md text-muted-foreground">{t('orders.emptyHistoryDesc')}</p>
            <Link to="/menu" className="btn-cafe mt-8">
              {t('orders.exploreMenu')}
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-4">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    to={`/order-confirmation/${order.orderNumber}`}
                    className="block border border-border p-6 transition-colors hover:border-brand-gold"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-serif text-xl">{order.orderNumber}</span>
                          <span
                            className={cn(
                              'px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em]',
                              getStatusColor(order.status)
                            )}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {formatDate(order.createdAt)} · {getOrderTypeLabel(order.type)} ·{' '}
                          {order.items?.length ?? 0}{' '}
                          {(order.items?.length ?? 0) === 1 ? t('common.item') : t('common.items')}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="font-serif text-2xl text-brand-gold">
                          {formatCurrency(Number(order.total))}
                        </div>
                        <span className="text-xs text-muted-foreground underline underline-offset-4">
                          {t('orders.viewDetails')}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-sm border border-border p-2.5 transition-colors hover:border-brand-gold disabled:opacity-40 disabled:hover:border-border"
                  aria-label={t('common.back')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-muted-foreground">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="rounded-sm border border-border p-2.5 transition-colors hover:border-brand-gold disabled:opacity-40 disabled:hover:border-border"
                  aria-label={t('common.viewAll')}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
