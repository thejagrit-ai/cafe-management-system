import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { paymentsApi, type PaymentExportRecord } from '@/api/payments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusLabel,
  getPaymentMethodLabel,
  getOrderTypeLabel
} from '@/utils/lib'
import { Search, ChevronLeft, ChevronRight, CreditCard, Download, Loader2, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminPayments() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [methodFilter, setMethodFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const limit = 15

  const { data, isLoading } = useQuery({
    queryKey: ['payments', { page, limit, search, method: methodFilter, status: statusFilter }],
    queryFn: () =>
      paymentsApi.getAll({
        page,
        limit,
        search: search || undefined,
        method: methodFilter || undefined,
        status: statusFilter || undefined,
      }),
  })

  const payments = Array.isArray(data?.data) ? data.data : []
  const pagination = data?.pagination

  const handleExportCsv = async () => {
    try {
      setIsExporting(true)
      const res = await paymentsApi.exportAll({
        search: search || undefined,
        method: methodFilter || undefined,
        status: statusFilter || undefined,
      })

      const allRecords: PaymentExportRecord[] = Array.isArray(res.data) ? res.data : []

      if (allRecords.length === 0) {
        toast.info('No hay registros de pagos para exportar con los filtros seleccionados')
        setIsExporting(false)
        return
      }

      const headers = [
        'ID Transacción',
        'ID Pago',
        'N° Pedido',
        'Tipo de Pedido',
        'Mesa',
        'Cliente',
        'Correo Cliente',
        'Teléfono Cliente',
        'Monto',
        'Método de Pago',
        'Estado',
        'N° Referencia',
        'Fecha de Creación',
        'Fecha de Pago',
      ]

      const escapeCell = (val: any) => {
        if (val === null || val === undefined) return '""'
        const s = String(val).replace(/"/g, '""')
        return `"${s}"`
      }

      const rows = allRecords.map((p) => {
        const order = p.order
        const customer = order?.customer
        const customerName = customer ? `${customer.firstName} ${customer.lastName}`.trim() : 'Cliente General'
        const customerEmail = customer?.user?.email || '-'
        const customerPhone = customer?.phone || '-'
        const table = order?.tableNumber ? `Mesa #${order.tableNumber}` : '-'
        const orderType = order?.type ? getOrderTypeLabel(order.type) : '-'
        const method = getPaymentMethodLabel(p.method)
        const status = getStatusLabel(p.status)
        const createdDate = p.createdAt ? formatDate(p.createdAt) : '-'
        const paidDate = p.paidAt ? formatDate(p.paidAt) : '-'
        const transaction = p.transactionId || p.id.slice(0, 12)

        return [
          escapeCell(transaction),
          escapeCell(p.id),
          escapeCell(order?.orderNumber || '-'),
          escapeCell(orderType),
          escapeCell(table),
          escapeCell(customerName),
          escapeCell(customerEmail),
          escapeCell(customerPhone),
          escapeCell(Number(p.amount)),
          escapeCell(method),
          escapeCell(status),
          escapeCell(p.referenceNumber || '-'),
          escapeCell(createdDate),
          escapeCell(paidDate),
        ].join(',')
      })

      // Include UTF-8 Byte Order Mark (\uFEFF) for native Excel UTF-8 compatibility
      const csvString = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().slice(0, 10)
      link.setAttribute('href', url)
      link.setAttribute('download', `reporte_pagos_cafe_origen_${timestamp}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`Se exportaron ${allRecords.length} pagos exitosamente en formato Excel CSV`)
    } catch (err: any) {
      toast.error(err?.message || 'Error al exportar los registros de pagos')
    } finally {
      setIsExporting(false)
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
            Gestión de Pagos & Transacciones
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Registro de transacciones, estados de cobro y métodos de pago utilizados.
          </p>
        </div>

        <Button
          onClick={handleExportCsv}
          disabled={isExporting}
          variant="outline"
          className="rounded-xl border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-semibold h-10 px-4 flex items-center gap-2 shadow-xs transition-colors"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          ) : (
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          )}
          <span>{isExporting ? 'Generando CSV...' : 'Descargar Excel CSV'}</span>
        </Button>
      </div>

      {/* Filter & Search */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID transacción o pedido..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-10 h-10 rounded-xl text-xs"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <select
            className="h-10 px-3 rounded-xl border border-border bg-card text-xs font-medium focus:outline-none"
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Todos los Métodos</option>
            <option value="CASH">Efectivo</option>
            <option value="CARD">Tarjeta Débito/Crédito</option>
            <option value="ONLINE">Nequi / Daviplata / En línea</option>
            <option value="UPI">UPI</option>
          </select>

          <Tabs
            value={statusFilter || 'all'}
            onValueChange={(v) => {
              setStatusFilter(v === 'all' ? '' : v)
              setPage(1)
            }}
          >
            <TabsList className="rounded-xl p-1 bg-secondary/60">
              <TabsTrigger value="all" className="rounded-lg text-xs font-semibold">
                Todos
              </TabsTrigger>
              <TabsTrigger value="PAID" className="rounded-lg text-xs font-semibold text-emerald-700">
                Pagados
              </TabsTrigger>
              <TabsTrigger value="PENDING" className="rounded-lg text-xs font-semibold text-amber-700">
                Pendientes
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        {payments.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2 text-xs">
            <CreditCard className="w-8 h-8 mx-auto text-muted-foreground stroke-[1.5]" />
            <p className="font-semibold text-foreground text-sm">No se encontraron pagos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="p-4">ID Transacción</th>
                  <th className="p-4">Pedido / Cliente</th>
                  <th className="p-4">Monto (COP)</th>
                  <th className="p-4">Método</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {payments.map((p) => {
                  const order = p.order
                  const customer = order?.customer
                  const customerName = customer ? `${customer.firstName} ${customer.lastName}`.trim() : null

                  return (
                    <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="p-4 font-mono font-medium text-foreground">
                        <div>{p.transactionId || p.id.slice(0, 12)}</div>
                        {p.referenceNumber && (
                          <div className="text-[10px] text-muted-foreground font-sans">
                            Ref: {p.referenceNumber}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {order ? (
                          <div>
                            <span className="font-mono font-semibold text-foreground">
                              {order.orderNumber}
                            </span>
                            {customerName && (
                              <div className="text-[11px] text-muted-foreground">{customerName}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4 font-bold font-sans text-foreground">
                        {formatCurrency(Number(p.amount))}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {getPaymentMethodLabel(p.method)}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {formatDate(p.createdAt)}
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusColor(p.status)}>
                          {getStatusLabel(p.status)}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border/60 text-xs text-muted-foreground">
          <p>
            Página {pagination.page} de {pagination.totalPages} ({pagination.total} pagos)
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
    </div>
  )
}
