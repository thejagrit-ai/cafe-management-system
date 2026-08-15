import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { customersApi } from '@/api/customers'
import type { Customer } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/utils/lib'
import { Search, Eye, ChevronLeft, ChevronRight, UserCheck, MapPin } from 'lucide-react'

export default function AdminCustomers() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const limit = 15

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { page, limit, search }],
    queryFn: () => customersApi.getAll({ page, limit, search }),
  })

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['customer-detail', selectedCustomer?.id],
    queryFn: () => customersApi.getById(selectedCustomer!.id),
    enabled: !!selectedCustomer?.id,
  })

  const customers = data?.data ?? []
  const pagination = data?.pagination
  const customerDetail = detailData?.data

  const handleView = (customer: Customer) => {
    setSelectedCustomer(customer)
    setDetailDialogOpen(true)
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
      <div className="border-b border-border/60 pb-5">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">
          Comunidad de Clientes
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Directorio de clientes registrados, historial de consumo y direcciones de entrega.
        </p>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, correo o teléfono..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-10 h-10 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        {customers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2 text-xs">
            <UserCheck className="w-8 h-8 mx-auto text-muted-foreground stroke-[1.5]" />
            <p className="font-semibold text-foreground text-sm">No se encontraron clientes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Correo Electrónico</th>
                  <th className="p-4">Teléfono</th>
                  <th className="p-4">Pedidos Totales</th>
                  <th className="p-4">Registro</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-4 font-semibold text-foreground">
                      {c.firstName} {c.lastName}
                    </td>
                    <td className="p-4 text-muted-foreground font-mono">{c.user?.email}</td>
                    <td className="p-4 text-muted-foreground">{c.phone || '-'}</td>
                    <td className="p-4 font-bold font-mono text-foreground">
                      {c._count?.orders ?? c.orders?.length ?? 0}
                    </td>
                    <td className="p-4 text-muted-foreground">{formatDate(c.createdAt)}</td>
                    <td className="p-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(c)}
                        className="rounded-lg text-[11px] h-8 px-2.5"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        <span>Ver Perfil</span>
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
            Página {pagination.page} de {pagination.totalPages} ({pagination.total} clientes)
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

      {/* Customer Detail Modal */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              Perfil del Cliente · {selectedCustomer?.firstName} {selectedCustomer?.lastName}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-secondary/30 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground text-[10px] block">Correo</span>
                  <p className="font-mono font-medium text-foreground truncate">{selectedCustomer?.user?.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">Teléfono</span>
                  <p className="font-medium text-foreground">{selectedCustomer?.phone || 'No registrado'}</p>
                </div>
              </div>

              {/* Saved Addresses */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Direcciones Registradas ({customerDetail?.addresses?.length || 0})
                </span>
                {customerDetail?.addresses?.length ? (
                  <div className="space-y-1.5">
                    {customerDetail.addresses.map((a: any) => (
                      <div key={a.id} className="p-2.5 rounded-xl border border-border/60 bg-secondary/20 flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#7C4EEE] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-foreground">{a.label || 'Dirección'}: {a.street}</p>
                          <p className="text-muted-foreground text-[11px]">{a.city}, {a.postalCode}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic text-xs">Sin direcciones registradas.</p>
                )}
              </div>

              {/* Recent Orders */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Historial de Pedidos Recientes ({customerDetail?.orders?.length || 0})
                </span>
                {customerDetail?.orders?.length ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {customerDetail.orders.map((o: any) => (
                      <div key={o.id} className="p-2.5 rounded-xl border border-border/60 bg-secondary/20 flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground">#{o.orderNumber}</span>
                            <Badge className={getStatusColor(o.status)}>{getStatusLabel(o.status)}</Badge>
                          </div>
                          <span className="text-muted-foreground text-[11px]">{formatDate(o.createdAt)}</span>
                        </div>
                        <span className="font-bold font-sans text-foreground">{formatCurrency(Number(o.total))}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic text-xs">Aún no tiene pedidos realizados.</p>
                )}
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
    </div>
  )
}
