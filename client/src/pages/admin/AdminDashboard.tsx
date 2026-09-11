import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  formatCurrency,
  formatDate,
  formatTime,
  getStatusColor,
  getStatusLabel,
  getOrderTypeLabel
} from '@/utils/lib'
import {
  ShoppingCart,
  Clock,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Coffee,
  IndianRupee,
  RotateCcw,
  Package,
  ChevronRight,
  Receipt
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

export default function AdminDashboard() {
  const { t } = useTranslation()
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(30)
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders'>('revenue')

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['admin-dashboard', { days: timeRange }],
    queryFn: () => dashboardApi.getAdminDashboard({ days: timeRange }),
    refetchInterval: 15000, // Live poll every 15s
  })

  const dashboard = data?.data

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-72 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (isError || !dashboard) {
    return (
      <div className="p-8 sm:p-12 text-center rounded-2xl bg-card border border-border space-y-4 my-6 shadow-xs max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-serif font-bold text-lg text-foreground">
            {t('adminDashboard.loadErrorTitle', { defaultValue: 'Unable to Load Dashboard' })}
          </h3>
          <p className="text-xs text-muted-foreground">
            {error instanceof Error ? error.message : t('adminDashboard.loadErrorDesc', { defaultValue: 'Could not fetch dashboard metrics from the server.' })}
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs font-semibold px-4 py-2"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-2" />
          <span>{t('common.refresh', { defaultValue: 'Refresh' })}</span>
        </Button>
      </div>
    )
  }

  // Calculate totals for period
  const totalPeriodRevenue = (dashboard.revenueTrend || []).reduce((acc, curr) => acc + (curr.revenue || 0), 0)
  const totalPeriodOrders = (dashboard.orderTrend || []).reduce((acc, curr) => acc + (curr.orders || 0), 0)
  // Rounded to cents, not to whole currency units: a café averaging $84.60 a
  // day was being shown $85, which never matched the chart it sits beside.
  const avgDailyRevenue =
    (dashboard.revenueTrend || []).length > 0
      ? Math.round((totalPeriodRevenue / dashboard.revenueTrend.length) * 100) / 100
      : 0

  // Combine trend data for dual chart display
  const combinedTrend = (dashboard.revenueTrend || []).map((item, idx) => {
    const orderItem = dashboard.orderTrend?.[idx]
    return {
      date: item.date,
      displayDate: item.date.slice(5), // MM-DD
      revenue: item.revenue || 0,
      orders: orderItem?.orders || 0,
    }
  })

  const stats = [
    {
      label: t('admin.salesToday'),
      value: formatCurrency(Number(dashboard.stats.todaysSales)),
      subtext: t('adminDashboard.completedOrdersSub', { count: dashboard.stats.completedOrders }),
      icon: IndianRupee,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40',
    },
    {
      label: t('adminDashboard.totalOrders'),
      value: dashboard.stats.todaysOrders,
      subtext: t('adminDashboard.inPrepSub', { count: dashboard.stats.pendingOrders }),
      icon: ShoppingCart,
      color: 'text-[#7C4EEE] bg-[#7C4EEE]/10 border-[#7C4EEE]/20',
    },
    {
      label: t('adminDashboard.averageTicket'),
      value: formatCurrency(Number(dashboard.stats.averageTicket || 0)),
      subtext: t('adminDashboard.averageTicketSub'),
      icon: Receipt,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40',
    },
    {
      label: t('adminDashboard.inKitchen'),
      value: dashboard.stats.pendingOrders,
      subtext: t('adminDashboard.needsAttention'),
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40',
    },
    {
      label: t('adminDashboard.inventoryAlerts'),
      value: dashboard.stats.lowStockItems,
      subtext: dashboard.stats.lowStockItems > 0
        ? t('adminDashboard.belowMinimum')
        : t('adminDashboard.stockHealthy'),
      icon: AlertTriangle,
      color: dashboard.stats.lowStockItems > 0
        ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40'
        : 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700',
    },
  ]

  // Order types for distribution chart
  const orderTypeData = (dashboard.orderTypeDistribution || []).map((item) => ({
    name: getOrderTypeLabel(item.type),
    value: item.count,
    revenue: item.revenue,
  }))

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">
              {t('admin.panelTitle')}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t('adminDashboard.liveOps')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('admin.panelSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time range selector */}
          <div className="flex items-center p-1 rounded-xl bg-secondary/70 border border-border/60">
            {([7, 14, 30] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setTimeRange(days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  timeRange === days
                    ? 'bg-card text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('adminDashboard.daysOption', { count: days })}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl border-border bg-card text-xs h-9 px-3 hover:bg-secondary flex items-center gap-1.5"
            title={t('adminDashboard.refreshTitle')}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#7C4EEE]' : 'text-muted-foreground'}`} />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </Button>

          <Link to="/admin/orders">
            <Button size="sm" className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs h-9 px-4 font-semibold shadow-xs">
              <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
              <span>{t('adminDashboard.viewOrders')}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div
              key={idx}
              className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card flex flex-col justify-between space-y-3 hover:border-[#7C4EEE]/40 hover:shadow-card transition-all"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  {stat.label}
                </span>
                <div className={`p-2 rounded-xl border ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <p className="text-xl sm:text-2xl font-bold font-sans text-foreground tracking-tight">
                  {stat.value}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-muted-foreground font-medium truncate">
                    {stat.subtext}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Visualizations: Revenue/Orders Trend & Top Products/Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart (2 Cols on desktop) */}
        <div className="p-5 sm:p-6 rounded-2xl border border-border/80 bg-card space-y-5 lg:col-span-2 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#7C4EEE]" />
                <h3 className="font-serif font-bold text-base text-foreground">
                  {chartMetric === 'revenue'
                    ? t('adminDashboard.revenueTrendTitle')
                    : t('adminDashboard.ordersVolumeTitle')}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('adminDashboard.trendSubtitle', { count: timeRange })}
              </p>
            </div>

            {/* Toggle metric */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/60 border border-border/50 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartMetric('revenue')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  chartMetric === 'revenue'
                    ? 'bg-[#7C4EEE] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('adminDashboard.metricRevenue')}
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('orders')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  chartMetric === 'orders'
                    ? 'bg-[#7C4EEE] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('adminDashboard.metricOrders')}
              </button>
            </div>
          </div>

          {/* Highlights sub-bar */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-secondary/30 border border-border/40 text-xs">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block">
                {t('adminDashboard.periodTotal')}
              </span>
              <span className="font-bold text-foreground text-sm font-sans">
                {chartMetric === 'revenue'
                  ? formatCurrency(totalPeriodRevenue)
                  : t('adminDashboard.ordersCount', { count: totalPeriodOrders })}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block">
                {t('adminDashboard.dailyAverage')}
              </span>
              <span className="font-bold text-foreground text-sm font-sans">
                {chartMetric === 'revenue'
                  ? formatCurrency(avgDailyRevenue)
                  : t('adminDashboard.ordersCount', {
                      count: Math.round(totalPeriodOrders / (combinedTrend.length || 1)),
                    })}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block">
                {t('adminDashboard.daysEvaluated')}
              </span>
              <span className="font-bold text-foreground text-sm font-sans">
                {t('adminDashboard.daysOption', { count: timeRange })}
              </span>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C4EEE" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#7C4EEE" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 10 }}
                  stroke="currentColor"
                  className="text-muted-foreground"
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  stroke="currentColor"
                  className="text-muted-foreground"
                  tickLine={false}
                  tickFormatter={(v) => (chartMetric === 'revenue' ? `₹${(v / 1000).toFixed(0)}k` : v)}
                />
                <Tooltip
                  formatter={(value: number) => [
                    chartMetric === 'revenue'
                      ? formatCurrency(value)
                      : t('adminDashboard.ordersCount', { count: value }),
                    chartMetric === 'revenue'
                      ? t('adminDashboard.tooltipSales')
                      : t('adminDashboard.tooltipOrders'),
                  ]}
                  labelFormatter={(_label, payload) => {
                    const fullDate = payload?.[0]?.payload?.date
                    return fullDate
                      ? t('adminDashboard.tooltipDate', { date: formatDate(fullDate) })
                      : ''
                  }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '12px',
                    color: 'hsl(var(--foreground))',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={chartMetric}
                  stroke="#7C4EEE"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#areaGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Products / Distribution (1 Col) */}
        <div className="p-5 sm:p-6 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-[#7C4EEE]" />
              <h3 className="font-serif font-bold text-base text-foreground">
                {t('admin.topProductsTitle')}
              </h3>
            </div>
            <Link to="/admin/products" className="text-xs font-semibold text-[#7C4EEE] hover:underline flex items-center">
              <span>{t('adminDashboard.catalogueLink')}</span>
              <ChevronRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>

          <p className="text-xs text-muted-foreground -mt-2">
            {t('adminDashboard.topProductsSub')}
          </p>

          {(!dashboard.popularProducts || dashboard.popularProducts.length === 0) ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              {t('adminDashboard.noSalesData')}
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {dashboard.popularProducts.slice(0, 5).map((prod, idx) => {
                const maxQty = dashboard.popularProducts[0]?.quantity || 1
                const pct = Math.round((prod.quantity / maxQty) * 100)

                return (
                  <div key={prod.productId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${
                          idx === 0
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : idx === 1
                            ? 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                            : 'bg-secondary text-muted-foreground'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-foreground truncate">{prod.name}</span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-foreground font-sans">{t('adminDashboard.unitsShort', { count: prod.quantity })}</span>
                        <span className="text-[10px] text-muted-foreground block">
                          {formatCurrency(Number(prod.revenue))}
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#7C4EEE] to-purple-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Channel / Order Type Mini Breakdown */}
          {orderTypeData.length > 0 && (
            <div className="pt-3 border-t border-border/60">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-2">
                {t('adminDashboard.channels')}
              </span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {orderTypeData.map((item, i) => (
                  <div key={i} className="p-2 rounded-xl bg-secondary/30 border border-border/40">
                    <span className="text-[10px] text-muted-foreground block truncate">{item.name}</span>
                    <span className="font-bold text-foreground">{t('adminDashboard.ordersCount', { count: item.value })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Operational Widgets: Low Stock Alerts & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="p-5 sm:p-6 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-foreground">
                  {t('adminDashboard.stockAlerts')}
                </h3>
                <p className="text-xs text-muted-foreground">{t('adminDashboard.stockAlertsSub')}</p>
              </div>
            </div>

            <Link
              to="/admin/ingredients"
              className="text-xs font-semibold text-[#7C4EEE] hover:underline flex items-center gap-1"
            >
              <span>{t('adminDashboard.viewInventory')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {dashboard.lowStock.length === 0 ? (
            <div className="p-8 text-center bg-secondary/20 rounded-2xl border border-dashed border-border/60 space-y-1">
              <Package className="w-8 h-8 mx-auto text-emerald-600/70" />
              <p className="text-xs font-semibold text-foreground">{t('adminDashboard.inventoryHealthy')}</p>
              <p className="text-[11px] text-muted-foreground">
                {t('adminDashboard.inventoryHealthyDesc')}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {dashboard.lowStock.map((item: any) => {
                const ratio = Math.min(Math.round((item.currentStock / Math.max(item.minStock, 1)) * 100), 100)
                const isVeryLow = ratio < 50

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-rose-200/70 bg-rose-50/40 dark:bg-rose-950/20 dark:border-rose-900/50 flex items-center justify-between text-xs hover:bg-rose-50/70 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <div className="space-y-1 flex-1 pr-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground text-xs">
                          {item.name}
                        </span>
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 font-mono">
                          {item.currentStock} {item.unit}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-rose-200 dark:bg-rose-900/40 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isVeryLow ? 'bg-rose-600 animate-pulse' : 'bg-amber-500'}`}
                            style={{ width: `${Math.max(ratio, 8)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {t('adminDashboard.minLabel', { min: item.minStock, unit: item.unit })}
                        </span>
                      </div>
                    </div>

                    <Link to="/admin/ingredients">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg h-7 text-[10px] border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 px-2"
                      >
                        {t('adminDashboard.adjust')}
                      </Button>
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Orders Feed */}
        <div className="p-5 sm:p-6 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-foreground">
                  {t('admin.recentOrdersTitle')}
                </h3>
                <p className="text-xs text-muted-foreground">{t('adminDashboard.recentOrdersSub')}</p>
              </div>
            </div>

            <Link
              to="/admin/orders"
              className="text-xs font-semibold text-[#7C4EEE] hover:underline flex items-center gap-1"
            >
              <span>{t('common.viewAll')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {(!dashboard.recentOrders || dashboard.recentOrders.length === 0) ? (
            <div className="p-8 text-center bg-secondary/20 rounded-2xl border border-dashed border-border/60 text-xs text-muted-foreground">
              {t('adminDashboard.noRecentOrders')}
            </div>
          ) : (
            <div className="space-y-2.5">
              {dashboard.recentOrders.slice(0, 6).map((order: any) => (
                <div
                  key={order.id}
                  className="p-3.5 rounded-xl border border-border/60 bg-secondary/15 hover:bg-secondary/30 transition-colors flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-foreground">
                        #{order.orderNumber}
                      </span>
                      <Badge className={`text-[10px] ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </Badge>
                      {order.tableNumber && (
                        <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md">
                          {t('adminDashboard.tableNum', { number: order.tableNumber })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{order.customerName || t('common.walkInCustomer')}</span>
                      <span>·</span>
                      <span>{order.itemsCount ? t('adminDashboard.productsCount', { count: order.itemsCount }) : ''}</span>
                      <span>·</span>
                      <span className="font-mono">{formatTime(order.createdAt)}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <span className="font-bold text-sm text-foreground font-sans block">
                      {formatCurrency(Number(order.total))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}