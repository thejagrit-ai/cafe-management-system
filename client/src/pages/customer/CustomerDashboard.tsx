import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Package, MapPin, User, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ordersApi } from '@/api/orders'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate, getStatusColor, cn } from '@/utils/lib'
import Separator from '@/components/home/Separator'

export default function CustomerDashboard() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders', 'recent'],
    queryFn: () => ordersApi.getMyOrders({ page: 1, limit: 3 }),
  })

  const recentOrders = data?.data ?? []
  const customer = user?.customer

  return (
    <div className="container mx-auto py-16">
      <div className="flex flex-col items-center text-center">
        <h1 className="h2">
          {customer?.firstName ? `${customer.firstName}` : t('navigation.account')}
        </h1>
        <Separator className="mt-5" />
        <p className="mt-5 text-muted-foreground">{user?.email}</p>
      </div>

      <div className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-3">
        <Link
          to="/orders"
          className="group border border-border p-7 transition-colors hover:border-brand-gold"
        >
          <Package className="h-7 w-7 text-brand-gold" aria-hidden="true" />
          <h2 className="mt-4 font-serif text-xl transition-colors group-hover:text-brand-gold">
            {t('orders.title')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('orders.subtitle')}</p>
        </Link>

        <div className="border border-border p-7">
          <User className="h-7 w-7 text-brand-gold" aria-hidden="true" />
          <h2 className="mt-4 font-serif text-xl">{t('checkout.customerInfoTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {customer ? `${customer.firstName} ${customer.lastName ?? ''}` : user?.email}
          </p>
          {customer?.phone && (
            <p className="text-sm text-muted-foreground">{customer.phone}</p>
          )}
        </div>

        <div className="border border-border p-7">
          <MapPin className="h-7 w-7 text-brand-gold" aria-hidden="true" />
          <h2 className="mt-4 font-serif text-xl">{t('checkout.addressTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {customer?.addresses?.length
              ? `${customer.addresses.length}`
              : t('common.none')}
          </p>
        </div>
      </div>

      {/* Recent orders */}
      <section className="mx-auto mt-16 max-w-4xl">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl">{t('orders.title')}</h2>
          <Link
            to="/orders"
            className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            {t('common.viewAll')}
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-sm" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="mt-6 border border-border p-10 text-center">
            <p className="text-muted-foreground">{t('orders.emptyHistory')}</p>
            <Link to="/menu" className="btn-cafe mt-6">
              {t('orders.exploreMenu')}
            </Link>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-border border-y border-border">
            {recentOrders.map((order) => (
              <li key={order.id}>
                <Link
                  to={`/order-confirmation/${order.orderNumber}`}
                  className="flex flex-wrap items-center justify-between gap-4 py-5 transition-colors hover:text-brand-gold"
                >
                  <div>
                    <div className="font-medium">{order.orderNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={cn(
                        'px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em]',
                        getStatusColor(order.status)
                      )}
                    >
                      {order.status}
                    </span>
                    <span className="font-serif text-xl">
                      {formatCurrency(Number(order.total))}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-16 flex justify-center">
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          {t('navigation.logout')}
        </button>
      </div>
    </div>
  )
}
