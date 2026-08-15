import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { dashboardApi } from '@/api/dashboard'
import { ordersApi } from '@/api/orders'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTime, getStatusColor, getOrderTypeLabel, cn } from '@/utils/lib'
import {
  Clock,
  CheckCircle2,
  ChefHat,
  PackageCheck,
  RotateCcw,
  UtensilsCrossed,
  Layers,
  ArrowRight,
  Truck,
  Store,
  Volume2,
  VolumeX,
  Bell
} from 'lucide-react'
import { toast } from 'sonner'
import { useOrderNotification } from '@/hooks/useOrderNotification'

export default function StaffDashboard() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  // Live polling for staff console every 5s
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['staff-dashboard'],
    queryFn: () => dashboardApi.getStaffDashboard(),
    refetchInterval: 5000
  })

  const dashboard = data?.data

  // Hook for audio notifications on incoming orders
  const { isMuted, toggleMute, testSound } = useOrderNotification({
    orders: dashboard?.pendingOrders,
    enabled: true
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.updateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      toast.success('Comanda actualizada')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error al actualizar el estado')
    }
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 bg-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl bg-white/5" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl bg-white/5" />
      </div>
    )
  }

  if (!dashboard) return null

  const getNextAction = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { nextStatus: 'CONFIRMED', label: 'Confirmar', icon: CheckCircle2, color: 'bg-blue-600 hover:bg-blue-500' }
      case 'CONFIRMED':
        return { nextStatus: 'PREPARING', label: 'Comenzar Preparación', icon: ChefHat, color: 'bg-[#7C4EEE] hover:bg-[#683BD6]' }
      case 'PREPARING':
        return { nextStatus: 'READY', label: 'Marcar como Listo', icon: PackageCheck, color: 'bg-emerald-600 hover:bg-emerald-500' }
      case 'READY':
        return { nextStatus: 'COMPLETED', label: 'Entregar Comanda', icon: ArrowRight, color: 'bg-teal-600 hover:bg-teal-500' }
      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {t('staff.consoleTitle')}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t('staff.consoleSubtitle')} · {t('staff.refreshNotice')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Notification Control */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMute}
            className={`rounded-xl text-xs flex items-center gap-1.5 ${
              isMuted
                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
            }`}
            title={isMuted ? 'Activar sonido de pedidos' : 'Silenciar sonido de pedidos'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 animate-pulse" />}
            <span>{isMuted ? 'Sonido Silenciado' : 'Sonido Activo'}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={testSound}
            className="rounded-xl text-xs px-2.5"
            title="Probar sonido de timbre"
          >
            <Bell className="w-3.5 h-3.5 mr-1" />
            <span>Probar</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="rounded-xl border-border bg-card text-foreground hover:bg-secondary text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            <span>{t('common.refresh')}</span>
          </Button>
        </div>
      </div>

      {/* Fast KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">{t('admin.pendingOrders')}</span>
            <p className="text-2xl font-bold font-sans text-foreground mt-0.5">
              {dashboard.stats.pendingOrders}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-[#7C4EEE]/10 text-[#7C4EEE] flex items-center justify-center">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">En Preparación</span>
            <p className="text-2xl font-bold font-sans text-foreground mt-0.5">
              {dashboard.pendingOrders.filter((o: any) => o.status === 'PREPARING').length}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">Completados Hoy</span>
            <p className="text-2xl font-bold font-sans text-foreground mt-0.5">
              {dashboard.stats.completedOrders}
            </p>
          </div>
        </div>
      </div>

      {/* Active Orders Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#7C4EEE]" />
            <span>Comandas Activas en Cola</span>
          </h2>
          <span className="text-xs text-muted-foreground">
            {dashboard.pendingOrders.length} comandas en proceso
          </span>
        </div>

        {dashboard.pendingOrders.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-card border border-border space-y-3 shadow-xs">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 stroke-[1.5]" />
            <h3 className="font-semibold text-foreground text-base">¡Todas las comandas al día!</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No hay pedidos pendientes en la cola de preparación en este momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {dashboard.pendingOrders.map((order: any) => {
              const action = getNextAction(order.status)
              const ActionIcon = action?.icon || ArrowRight

              return (
                <div
                  key={order.id}
                  className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between space-y-4 hover:border-border/80 transition-colors shadow-xs"
                >
                  {/* Top Bar */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base text-foreground">
                          #{order.orderNumber}
                        </span>
                        {order.tableNumber && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[11px] font-bold">
                            Mesa {order.tableNumber}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {order.customerName || 'Cliente en barra'} · {formatTime(order.createdAt)}
                      </p>
                    </div>

                    <Badge className={cn("text-xs font-semibold uppercase tracking-wider", getStatusColor(order.status))}>
                      {order.status}
                    </Badge>
                  </div>

                  {/* Delivery / Order Type Indicator */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 p-2 rounded-xl">
                    {order.type === 'DINE_IN' && <UtensilsCrossed className="w-3.5 h-3.5 text-amber-500" />}
                    {order.type === 'PICKUP' && <Store className="w-3.5 h-3.5 text-blue-500" />}
                    {order.type === 'DELIVERY' && <Truck className="w-3.5 h-3.5 text-emerald-500" />}
                    <span className="font-medium text-foreground">{getOrderTypeLabel(order.type)}</span>
                  </div>

                  {/* Action Button */}
                  {action && (
                    <Button
                      size="sm"
                      onClick={() =>
                        updateStatusMutation.mutate({ id: order.id, status: action.nextStatus })
                      }
                      disabled={updateStatusMutation.isPending}
                      className={cn(
                        "w-full h-10 rounded-xl font-semibold text-xs text-white shadow-xs transition-all flex items-center justify-center gap-2",
                        action.color
                      )}
                    >
                      <ActionIcon className="w-4 h-4" />
                      <span>{action.label}</span>
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}