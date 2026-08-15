import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi, type OrderQueryParams } from '@/api/orders'
import type { Order } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusLabel,
  getOrderTypeLabel
} from '@/utils/lib'
import { Search, Eye, ChevronLeft, ChevronRight, Edit3, ShoppingCart, Volume2, VolumeX, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { useOrderNotification } from '@/hooks/useOrderNotification'

export default function AdminOrders() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const limit = 15

  const queryParams: OrderQueryParams = {
    page,
    limit,
    search,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  }
  if (statusFilter) queryParams.status = statusFilter
  if (typeFilter) queryParams.type = typeFilter

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', queryParams],
    queryFn: () => ordersApi.getAll(queryParams),
    refetchInterval: 5000
  })

  const orders = data?.data ?? []
  const pagination = data?.pagination

  const { isMuted, toggleMute, testSound } = useOrderNotification({
    orders,
    enabled: true
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      cancellationReason
    }: {
      id: string
      status: string
      cancellationReason?: string
    }) => ordersApi.updateStatus(id, { status, cancellationReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      toast.success('Estado del pedido actualizado')
      setStatusDialogOpen(false)
      setNewStatus('')
      setCancelReason('')
    },
    onError: (err: any) => toast.error(err.message || 'Error al actualizar pedido')
  })

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order)
    setDetailDialogOpen(true)
  }

  const handleChangeStatus = (order: Order) => {
    setSelectedOrder(order)
    setNewStatus(order.status)
    setCancelReason('')
    setStatusDialogOpen(true)
  }

  const confirmStatusChange = () => {
    if (selectedOrder && newStatus) {
      updateStatusMutation.mutate({
        id: selectedOrder.id,
        status: newStatus,
        cancellationReason: newStatus === 'CANCELLED' ? cancelReason : undefined
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">
            Gestión de Pedidos & Comandas
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Supervisa el ciclo de vida completo de cada orden desde recepción hasta entrega en tiempo real.
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
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por # de pedido o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl text-xs"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-border bg-card text-xs font-medium focus:outline-none"
          >
            <option value="">Todos los Estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="CONFIRMED">Confirmado</option>
            <option value="PREPARING">En preparación</option>
            <option value="READY">Listo</option>
            <option value="DELIVERED">Entregado</option>
            <option value="COMPLETED">Completado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-border bg-card text-xs font-medium focus:outline-none"
          >
            <option value="">Todos los Tipos</option>
            <option value="DINE_IN">Consumo en mesa</option>
            <option value="PICKUP">Recogida en barra</option>
            <option value="DELIVERY">Domicilio</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2 text-xs">
            <ShoppingCart className="w-8 h-8 mx-auto text-muted-foreground stroke-[1.5]" />
            <p className="font-semibold text-foreground text-sm">No se encontraron pedidos</p>
            <p>Los pedidos realizados por clientes y personal aparecerán listados aquí.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="p-4">Pedido #</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-4 font-mono font-bold text-foreground">
                      #{order.orderNumber}
                      {order.tableNumber && (
                        <span className="text-[10px] text-amber-600 block font-sans">
                          Mesa {order.tableNumber}
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-medium text-foreground">
                      {order.customer
                        ? `${order.customer.firstName} ${order.customer.lastName || ''}`
                        : 'Cliente en barra'}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {getOrderTypeLabel(order.type)}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="p-4 font-bold font-sans text-foreground">
                      {formatCurrency(Number(order.total))}
                    </td>
                    <td className="p-4">
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </td>
                    <td className="p-4 text-right space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewOrder(order)}
                        className="rounded-lg text-[11px] h-8 px-2.5"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        <span>Ver</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleChangeStatus(order)}
                        className="rounded-lg text-[11px] h-8 px-2.5 text-[#7C4EEE]"
                      >
                        <Edit3 className="w-3 h-3 mr-1" />
                        <span>Estado</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border/60 text-xs text-muted-foreground">
          <p>
            Página {pagination.page} de {pagination.totalPages} ({pagination.total} pedidos en total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-xl"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              <span>Anterior</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.totalPages}
              className="rounded-xl"
            >
              <span>Siguiente</span>
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg flex items-center justify-between">
              <span>Pedido #{selectedOrder?.orderNumber}</span>
              {selectedOrder && (
                <Badge className={getStatusColor(selectedOrder.status)}>
                  {getStatusLabel(selectedOrder.status)}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-secondary/30">
                <div>
                  <span className="text-muted-foreground block mb-0.5">Cliente:</span>
                  <p className="font-semibold text-foreground">
                    {selectedOrder.customer
                      ? `${selectedOrder.customer.firstName} ${selectedOrder.customer.lastName || ''}`
                      : 'Cliente en barra'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Tipo / Entrega:</span>
                  <p className="font-semibold text-foreground">
                    {getOrderTypeLabel(selectedOrder.type)}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="font-bold uppercase tracking-wider text-muted-foreground block text-[10px]">
                  Productos del Pedido:
                </span>
                <div className="space-y-1.5 divide-y divide-border/60">
                  {selectedOrder.items?.map((item: any) => (
                    <div key={item.id} className="pt-1.5 first:pt-0 flex justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          {item.product?.name} ×{item.quantity}
                        </p>
                        {item.notes && <p className="text-muted-foreground text-[10px]">Nota: {item.notes}</p>}
                      </div>
                      <span className="font-bold font-sans">
                        {formatCurrency(Number(item.totalPrice))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="border-t border-border/60 pt-3 space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(Number(selectedOrder.subtotal))}</span>
                </div>
                {Number(selectedOrder.taxAmount) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>IVA:</span>
                    <span>{formatCurrency(Number(selectedOrder.taxAmount))}</span>
                  </div>
                )}
                {Number(selectedOrder.deliveryFee) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Domicilio:</span>
                    <span>{formatCurrency(Number(selectedOrder.deliveryFee))}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t border-border/60">
                  <span>Total:</span>
                  <span className="text-[#7C4EEE] font-sans">
                    {formatCurrency(Number(selectedOrder.total))}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDetailDialogOpen(false)}
              className="rounded-xl"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status Modal */}
      <Dialog
        open={statusDialogOpen}
        onOpenChange={(open) => {
          setStatusDialogOpen(open)
          if (!open) {
            setNewStatus('')
            setCancelReason('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              <span>Actualizar Estado</span>
            </DialogTitle>
            {selectedOrder && (
              <p className="text-xs text-muted-foreground font-mono">
                <span>Comanda #{selectedOrder.orderNumber}</span>
              </p>
            )}
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Nuevo Estado</Label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full h-9 rounded-xl border border-input bg-card px-3 text-xs focus:outline-none"
              >
                <option value="PENDING">Pendiente</option>
                <option value="CONFIRMED">Confirmado</option>
                <option value="PREPARING">En preparación</option>
                <option value="READY">Listo</option>
                <option value="DELIVERED">Entregado</option>
                <option value="COMPLETED">Completado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>

            {newStatus === 'CANCELLED' && (
              <div className="space-y-1">
                <Label className="text-xs">Motivo de Cancelación</Label>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Explica la razón de cancelación..."
                  className="rounded-xl min-h-[60px]"
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStatusDialogOpen(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={confirmStatusChange}
              disabled={updateStatusMutation.isPending}
              className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white"
            >
              Confirmar Cambio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
