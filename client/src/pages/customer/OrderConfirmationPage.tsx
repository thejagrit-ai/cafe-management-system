import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CheckCircle, Coffee, MapPin, UtensilsCrossed, Sparkles, UserPlus } from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { authApi } from '@/api/auth'
import { useAuth } from '@/contexts/AuthContext'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDate, getOrderTypeLabel, getStatusColor, cn } from '@/utils/lib'
import Separator from '@/components/home/Separator'
import { toast } from 'sonner'

/** Ordered steps used to draw the tracker; CANCELLED is handled separately. */
const STEPS = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'] as const

export default function OrderConfirmationPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const { t } = useTranslation()
  const { user, isAuthenticated, register } = useAuth()

  const [password, setPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [registeredSuccess, setRegisteredSuccess] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['order-by-number', orderNumber],
    queryFn: () => ordersApi.getByOrderNumber(orderNumber!),
    enabled: Boolean(orderNumber),
    refetchInterval: 10_000,
  })

  const order = data?.data

  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }

    try {
      setIsRegistering(true)
      const guestEmail = order?.customer?.user?.email || `cliente_${Date.now()}@origen.cafe`
      const firstName = order?.customer?.firstName || 'Cliente'
      const lastName = order?.customer?.lastName || 'Mesa'

      await register({
        email: guestEmail,
        password,
        firstName,
        lastName,
      })

      setRegisteredSuccess(true)
      toast.success('¡Cuenta creada con éxito! Se han acreditado +50 Puntos de Bienvenida 🎉')
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo crear la cuenta')
    } finally {
      setIsRegistering(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl py-20">
        <Skeleton className="mx-auto h-16 w-16 rounded-full" />
        <Skeleton className="mx-auto mt-6 h-10 w-2/3" />
        <Skeleton className="mt-10 h-64 w-full" />
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="container mx-auto py-24 text-center">
        <h1 className="h3">{t('errors.pageNotFoundTitle')}</h1>
        <p className="mt-3 text-muted-foreground">{t('errors.pageNotFoundDesc')}</p>
        <Link to="/menu" className="btn-cafe mt-8">
          {t('checkout.backToMenu')}
        </Link>
      </div>
    )
  }

  const isCancelled = order.status === 'CANCELLED'
  const currentStep = STEPS.indexOf(order.status as (typeof STEPS)[number])
  const effectiveStep = order.status === 'COMPLETED' ? STEPS.length - 1 : currentStep

  const stepCopy: Record<string, { title: string; desc: string }> = {
    PENDING: { title: t('orders.stepPending'), desc: t('orders.stepPendingDesc') },
    CONFIRMED: { title: t('orders.stepConfirmed'), desc: t('orders.stepConfirmedDesc') },
    PREPARING: { title: t('orders.stepPreparing'), desc: t('orders.stepPreparingDesc') },
    READY: { title: t('orders.stepReady'), desc: t('orders.stepReadyDesc') },
    DELIVERED: { title: t('orders.stepDelivered'), desc: t('orders.stepDeliveredDesc') },
  }

  return (
    <div className="container mx-auto max-w-3xl py-16 px-4">
      <div className="flex flex-col items-center text-center">
        <CheckCircle className="h-16 w-16 text-[#7C4EEE]" aria-hidden="true" />
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground mt-4 tracking-tight">
          {t('checkout.orderSuccessTitle')}
        </h1>
        <Separator className="mt-4" />
        <p className="mt-3 max-w-lg text-xs sm:text-sm text-muted-foreground">
          {t('checkout.orderSuccessDesc')}
        </p>

        {order.tableNumber && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7C4EEE]/10 border border-[#7C4EEE]/20 text-[#7C4EEE] font-bold text-sm">
            <UtensilsCrossed className="w-4 h-4" />
            <span>Servicio a Mesa #{order.tableNumber}</span>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-border/80 bg-card px-8 py-4 shadow-xs">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
            {t('checkout.orderNumber')}
          </div>
          <div className="mt-1 font-mono font-bold text-2xl text-[#7C4EEE]">
            #{order.orderNumber}
          </div>
        </div>
      </div>

      {/* 1-Click Guest Conversion to Loyalty Account (if not authenticated) */}
      {!isAuthenticated && !registeredSuccess && (
        <div className="mt-10 p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-transparent shadow-xs space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-foreground">
                ¡Guarda tu pedido y gana 50 Puntos de Bienvenida!
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Crea tu cuenta en un solo paso con tu contraseña para acumular puntos y canjear café gratis en tus próximas visitas.
              </p>
            </div>
          </div>

          <form onSubmit={handleQuickRegister} className="flex flex-col sm:flex-row gap-3 pt-1">
            <Input
              type="password"
              placeholder="Crea una contraseña (mín. 8 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl bg-card text-xs flex-1 border-border/80"
            />
            <Button
              type="submit"
              disabled={isRegistering}
              className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white font-semibold text-xs h-11 px-5 shrink-0 shadow-xs"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              <span>{isRegistering ? 'Creando cuenta...' : 'Reclamar 50 Puntos'}</span>
            </Button>
          </form>
        </div>
      )}

      {/* Tracker */}
      <section className="mt-14 p-6 sm:p-8 rounded-2xl border border-border/80 bg-card shadow-xs">
        <h2 className="font-serif text-xl font-bold text-foreground">
          {t('orders.trackingTitle')}
        </h2>

        {isCancelled ? (
          <div className="mt-6 border border-destructive/40 bg-destructive/5 p-6 rounded-xl">
            <div className="font-semibold text-destructive">{t('orders.stepCancelled')}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {order.cancellationReason || t('orders.stepCancelledDesc')}
            </p>
          </div>
        ) : (
          <ol className="mt-6 space-y-0">
            {STEPS.map((step, index) => {
              const done = index <= effectiveStep
              const isCurrent = index === effectiveStep
              return (
                <li key={step} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                        done
                          ? 'bg-[#7C4EEE] text-white'
                          : 'border border-border text-muted-foreground',
                        isCurrent && 'ring-4 ring-[#7C4EEE]/20'
                      )}
                    >
                      {index + 1}
                    </span>
                    {index < STEPS.length - 1 && (
                      <span
                        className={cn(
                          'my-1 h-8 w-0.5 transition-colors',
                          index < effectiveStep ? 'bg-[#7C4EEE]' : 'bg-border'
                        )}
                      />
                    )}
                  </div>
                  <div className="pb-6">
                    <div
                      className={cn(
                        'font-medium text-sm',
                        isCurrent ? 'text-[#7C4EEE] font-bold' : done ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {stepCopy[step]?.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {stepCopy[step]?.desc}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {/* Summary */}
      <section className="mt-8 p-6 sm:p-8 rounded-2xl border border-border/80 bg-card shadow-xs">
        <h2 className="font-serif text-xl font-bold text-foreground">
          {t('checkout.orderSummary')}
        </h2>

        <ul className="mt-4 divide-y divide-border/60">
          {order.items?.map((item: any) => (
            <li key={item.id} className="flex items-center gap-4 py-3 text-xs">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/60">
                <Coffee className="h-5 w-5 text-[#7C4EEE]" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-sm text-foreground">{item.product?.name}</div>
                <div className="text-xs text-muted-foreground">
                  {item.quantity} × {formatCurrency(Number(item.unitPrice))}
                </div>
              </div>
              <div className="shrink-0 font-bold font-sans text-sm text-foreground">
                {formatCurrency(Number(item.totalPrice))}
              </div>
            </li>
          ))}
        </ul>

        <dl className="mt-6 space-y-2.5 text-xs border-t border-border/60 pt-4">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t('common.subtotal')}</dt>
            <dd className="font-semibold">{formatCurrency(Number(order.subtotal))}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t('common.tax')}</dt>
            <dd className="font-semibold">{formatCurrency(Number(order.taxAmount))}</dd>
          </div>
          {Number(order.deliveryFee) > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t('common.deliveryFee')}</dt>
              <dd className="font-semibold">{formatCurrency(Number(order.deliveryFee))}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-border/60 pt-3">
            <dt className="uppercase tracking-wider font-bold text-muted-foreground text-xs">
              {t('common.total')}
            </dt>
            <dd className="font-serif text-2xl font-bold text-[#7C4EEE]">
              {formatCurrency(Number(order.total))}
            </dd>
          </div>
        </dl>
      </section>

      {/* Meta */}
      <section className="mt-8 grid gap-4 p-5 rounded-2xl border border-border/80 bg-card shadow-xs sm:grid-cols-3 text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
            {t('orders.type')}
          </div>
          <div className="mt-1 font-semibold text-foreground">{getOrderTypeLabel(order.type)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
            {t('orders.date')}
          </div>
          <div className="mt-1 font-semibold text-foreground">{formatDate(order.createdAt)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
            {t('orders.status')}
          </div>
          <span
            className={cn(
              'mt-1 inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold',
              getStatusColor(order.status)
            )}
          >
            {order.status}
          </span>
        </div>
      </section>

      {order.address && (
        <section className="mt-6 flex items-start gap-3 p-5 rounded-2xl border border-border/80 bg-card text-xs">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#7C4EEE]" aria-hidden="true" />
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              {t('orders.deliveryInfo')}
            </div>
            <p className="mt-1 font-medium text-foreground">
              {order.address.street}, {order.address.city}, {order.address.state}{' '}
              {order.address.postalCode}
            </p>
          </div>
        </section>
      )}

      <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
        <Link to="/orders">
          <Button variant="outline" className="w-full sm:w-auto rounded-xl">
            {t('orders.title')}
          </Button>
        </Link>
        <Link to="/menu">
          <Button className="w-full sm:w-auto rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white font-semibold">
            {t('checkout.backToMenu')}
          </Button>
        </Link>
      </div>
    </div>
  )
}
