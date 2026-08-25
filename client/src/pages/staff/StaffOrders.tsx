import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ordersApi } from '@/api/orders'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusLabel,
  getOrderTypeLabel
} from '@/utils/lib'
import { Search, ChevronLeft, ChevronRight, Volume2, VolumeX, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { useOrderNotification } from '@/hooks/useOrderNotification'

export default function StaffOrders() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['staff-orders', page, statusFilter, search],
    queryFn: () =>
      ordersApi.getAll({
        page,
        limit: 20,
        status: statusFilter || undefined,
        search: search || undefined
      }),
    refetchInterval: 5000
  })

  const orders = data?.data || []
  const pagination = data?.pagination

  const { isMuted, toggleMute, testSound } = useOrderNotification({
    orders,
    enabled: true
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.updateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] })
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      toast.success(t('staffOrders.statusUpdated'))
    },
    onError: (err: any) => {
      toast.error(err.message || t('staffOrders.statusUpdateError'))
    }
  })

  const getNextStatus = (current: string) => {
    const flow: Record<string, string> = {
      PENDING: 'CONFIRMED',
      CONFIRMED: 'PREPARING',
      PREPARING: 'READY',
      READY: 'COMPLETED'
    }
    return flow[current]
  }

  // Status names come from the shared label helper so the filter always reads
  // the same as the badge on each row, in whichever language is active.
  const statuses = [
    { value: '', label: t('staffOrders.allStatuses') },
    ...['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'].map(
      (value) => ({ value, label: getStatusLabel(value) })
    ),
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {t('staffOrders.title')}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t('staffOrders.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMute}
            className={`rounded-xl text-xs flex items-center gap-1.5 ${
              isMuted
                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
            }`}
            title={isMuted ? t('staff.enableSound') : t('staff.muteSound')}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 animate-pulse" />}
            <span>{isMuted ? t('staff.soundMutedShort') : t('staff.soundActive')}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={testSound}
            className="rounded-xl text-xs px-2.5"
          >
            <Bell className="w-3.5 h-3.5 mr-1" />
            <span>{t('staff.testSound')}</span>
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('staffOrders.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-card border-border text-foreground placeholder:text-muted-foreground text-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 px-3.5 rounded-xl border border-border bg-card text-foreground text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#7C4EEE]"
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value} className="bg-card text-foreground">
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border border-border text-muted-foreground text-xs shadow-xs">
          {t('staffOrders.emptyFiltered')}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => (
            <div
              key={order.id}
              className="p-5 rounded-2xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-border/80 transition-colors shadow-xs"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-sm text-foreground">
                    #{order.orderNumber}
                  </span>
                  <Badge className={getStatusColor(order.status)}>
                    {getStatusLabel(order.status)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    · {getOrderTypeLabel(order.type)}
                  </span>
                  {order.tableNumber && (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                      {t('staff.tablePrefix')} {order.tableNumber}
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {order.customer ? `${order.customer.firstName} ${order.customer.lastName || ''}` : t('common.walkInCustomer')} · {formatDate(order.createdAt)}
                </p>

                <p className="text-[11px] text-muted-foreground font-medium">
                  {order.items?.map((i: any) => `${i.product?.name || 'Item'} (×${i.quantity})`).join(', ')}
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/80">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-muted-foreground block">{t('common.total')}</span>
                  <span className="font-bold text-base text-foreground font-sans">
                    {formatCurrency(Number(order.total))}
                  </span>
                </div>

                {getNextStatus(order.status) && (
                  <Button
                    size="sm"
                    onClick={() =>
                      updateStatusMutation.mutate({
                        id: order.id,
                        status: getNextStatus(order.status)
                      })
                    }
                    disabled={updateStatusMutation.isPending}
                    className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs font-semibold h-9 px-4"
                  >
                    <span>{t('staffOrders.advanceTo', { status: getStatusLabel(getNextStatus(order.status)) })}</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border/80 text-xs text-muted-foreground">
          <p>
            {t('staffOrders.pageOf', {
              page: pagination.page,
              totalPages: pagination.totalPages,
              total: pagination.total,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-xl border-border"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              <span>{t('common.previous')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.totalPages}
              className="rounded-xl border-border"
            >
              <span>{t('common.next')}</span>
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}