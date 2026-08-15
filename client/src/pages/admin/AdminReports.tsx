import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/dashboard'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/utils/lib'
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Layers,
  FileSpreadsheet,
  Download,
  Loader2
} from 'lucide-react'
import { useDownloadCSV } from '@/hooks/useDownloadCSV'
import { toast } from 'sonner'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts'

const VIOLET_COFFEE_PALETTE = ['#7C4EEE', '#956743', '#C48B5C', '#5529BC', '#DBC4A7', '#362217', '#EFE0CF']

export default function AdminReports() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [activeTab, setActiveTab] = useState('sales')
  const { downloadCSV, isExporting } = useDownloadCSV()

  const salesParams = { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, groupBy: 'day' }
  const inventoryParams = { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['sales-report', salesParams],
    queryFn: () => reportsApi.getSalesReport(salesParams)
  })

  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory-report', inventoryParams],
    queryFn: () => reportsApi.getInventoryReport(inventoryParams)
  })

  const sales = salesData?.data
  const inventory = inventoryData?.data

  const handleExport = async () => {
    try {
      const type = activeTab as 'sales' | 'inventory' | 'products'
      const timestamp = new Date().toISOString().slice(0, 10)
      const res = await reportsApi.exportReport({
        type,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })

      const records = res.data || []
      if (records.length === 0) {
        toast.info('No hay registros para exportar en este período')
        return
      }

      if (type === 'sales') {
        const headers = [
          'N° Pedido',
          'Fecha',
          'Tipo de Pedido',
          'Mesa',
          'Cliente',
          'Estado',
          'Cantidad Productos',
          'Subtotal (COP)',
          'Impuestos',
          'Domicilio',
          'Total (COP)',
          'Método de Pago',
          'Estado de Pago',
        ]
        const rows = records.map((r: any) => [
          r.orderNumber,
          formatDate(r.date),
          r.type,
          r.tableNumber,
          r.customer,
          r.status,
          r.itemsCount,
          r.subtotal,
          r.taxAmount,
          r.deliveryFee,
          r.total,
          r.paymentMethod,
          r.paymentStatus,
        ])
        downloadCSV({ filename: `reporte_ventas_${timestamp}`, headers, rows })
      } else if (type === 'inventory') {
        const headers = [
          'SKU',
          'Insumo / Ingrediente',
          'Stock Actual',
          'Stock Mínimo',
          'Stock Máximo',
          'Unidad',
          'Costo Unitario',
          'Valorización Total',
          'Estado',
          'Proveedor',
        ]
        const rows = records.map((r: any) => [
          r.sku,
          r.name,
          r.currentStock,
          r.minStock,
          r.maxStock,
          r.unit,
          r.costPerUnit,
          r.totalValue,
          r.status,
          r.supplier,
        ])
        downloadCSV({ filename: `reporte_inventario_${timestamp}`, headers, rows })
      } else if (type === 'products') {
        const headers = [
          'Producto',
          'Categoría',
          'Precio Unitario',
          'Unidades Vendidas',
          'N° de Comandas',
          'Ingresos Totales (COP)',
        ]
        const rows = records.map((r: any) => [
          r.name,
          r.category,
          r.unitPrice,
          r.quantitySold,
          r.orderCount,
          r.totalRevenue,
        ])
        downloadCSV({ filename: `reporte_productos_${timestamp}`, headers, rows })
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al exportar reporte')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">
            Reportes & Analítica de Negocio
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Métricas consolidadas de ventas, rotación de productos y consumo de inventario.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 text-xs bg-card p-1.5 rounded-xl border border-border/80">
            <Calendar className="w-4 h-4 text-muted-foreground ml-1.5" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 w-32 rounded-lg text-xs"
            />
            <span className="text-muted-foreground">a</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 w-32 rounded-lg text-xs"
            />
          </div>

          <Button
            onClick={handleExport}
            disabled={isExporting}
            variant="outline"
            className="rounded-xl border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-semibold h-10 px-4 flex items-center gap-2 shadow-xs transition-colors"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>Exportar Excel CSV</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-xl p-1 bg-secondary/60 mb-6">
          <TabsTrigger value="sales" className="rounded-lg text-xs font-semibold">
            Ventas & Facturación
          </TabsTrigger>
          <TabsTrigger value="products" className="rounded-lg text-xs font-semibold">
            Rendimiento por Producto
          </TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-lg text-xs font-semibold">
            Inventario & Existencias
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: SALES */}
        <TabsContent value="sales" className="space-y-6">
          {salesLoading ? (
            <div className="grid md:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : sales ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="p-5 rounded-2xl border border-border/80 bg-card flex justify-between items-center shadow-xs">
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold">
                      Ingresos Totales
                    </span>
                    <p className="text-2xl font-bold font-sans text-foreground mt-1">
                      {formatCurrency(Number(sales.summary.totalRevenue))}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-border/80 bg-card flex justify-between items-center shadow-xs">
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold">
                      Total Pedidos
                    </span>
                    <p className="text-2xl font-bold font-mono text-foreground mt-1">
                      {sales.summary.totalOrders}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#7C4EEE]/10 text-[#7C4EEE]">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-border/80 bg-card flex justify-between items-center shadow-xs">
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold">
                      Ticket Promedio
                    </span>
                    <p className="text-2xl font-bold font-sans text-foreground mt-1">
                      {formatCurrency(Number(sales.summary.averageOrderValue))}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
                <h3 className="font-serif font-bold text-base text-foreground">
                  Evolución de Ingresos por Día
                </h3>
                <div className="h-72 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sales.revenueByDay || []}>
                      <defs>
                        <linearGradient id="salesReportGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7C4EEE" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#7C4EEE" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#888" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#888" />
                      <Tooltip
                        formatter={(val: number) => [formatCurrency(val), 'Ingresos']}
                        contentStyle={{
                          backgroundColor: '#1A1824',
                          borderRadius: '12px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '12px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#7C4EEE"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#salesReportGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* TAB 2: PRODUCTS */}
        <TabsContent value="products" className="space-y-6">
          {salesLoading ? (
            <Skeleton className="h-80 rounded-2xl" />
          ) : sales ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
                <h3 className="font-serif font-bold text-base text-foreground">
                  Top Productos por Facturación
                </h3>
                <div className="h-72 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sales.revenueByProduct || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#888" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#888" />
                      <Tooltip
                        formatter={(val: number) => [formatCurrency(val), 'Ventas']}
                        contentStyle={{
                          backgroundColor: '#1A1824',
                          borderRadius: '12px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="revenue" fill="#7C4EEE" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
                <h3 className="font-serif font-bold text-base text-foreground">
                  Facturación por Categoría
                </h3>
                <div className="h-72 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sales.revenueByCategory || []}
                        dataKey="revenue"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={45}
                      >
                        {sales.revenueByCategory?.map((_: any, idx: number) => (
                          <Cell
                            key={`cell-${idx}`}
                            fill={VIOLET_COFFEE_PALETTE[idx % VIOLET_COFFEE_PALETTE.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: number) => [formatCurrency(val), 'Ingresos']}
                        contentStyle={{
                          backgroundColor: '#1A1824',
                          borderRadius: '12px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '12px'
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : null}
        </TabsContent>

        {/* TAB 3: INVENTORY */}
        <TabsContent value="inventory" className="space-y-6">
          {inventoryLoading ? (
            <Skeleton className="h-80 rounded-2xl" />
          ) : inventory ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="p-5 rounded-2xl border border-border/80 bg-card">
                  <span className="text-xs text-muted-foreground font-semibold">Insumos Totales</span>
                  <p className="text-2xl font-bold font-mono text-foreground mt-1">
                    {inventory.summary.totalIngredients}
                  </p>
                </div>
                <div className="p-5 rounded-2xl border border-border/80 bg-card">
                  <span className="text-xs text-muted-foreground font-semibold">Valor Total en Bodega</span>
                  <p className="text-2xl font-bold font-sans text-foreground mt-1">
                    {formatCurrency(Number(inventory.summary.totalInventoryValue))}
                  </p>
                </div>
                <div className="p-5 rounded-2xl border border-border/80 bg-card">
                  <span className="text-xs text-muted-foreground font-semibold">Alertas Stock Bajo</span>
                  <p className="text-2xl font-bold font-mono text-rose-600 mt-1">
                    {inventory.summary.lowStockCount}
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
                <h3 className="font-serif font-bold text-base text-foreground">
                  Inventario General de Insumos
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-secondary/40 border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                      <tr>
                        <th className="p-4">Ingrediente</th>
                        <th className="p-4">SKU</th>
                        <th className="p-4">Stock Actual</th>
                        <th className="p-4">Costo Unitario</th>
                        <th className="p-4">Valor Total</th>
                        <th className="p-4">Proveedor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {inventory.ingredients?.map((item) => (
                        <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="p-4 font-semibold text-foreground">{item.name}</td>
                          <td className="p-4 font-mono text-muted-foreground">{item.sku}</td>
                          <td className="p-4 font-mono font-medium text-foreground">
                            {item.currentStock} {item.unit}
                          </td>
                          <td className="p-4 font-sans text-foreground">
                            {formatCurrency(Number(item.costPerUnit))}
                          </td>
                          <td className="p-4 font-bold font-sans text-foreground">
                            {formatCurrency(Number(item.totalValue))}
                          </td>
                          <td className="p-4 text-muted-foreground">{item.supplier || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
