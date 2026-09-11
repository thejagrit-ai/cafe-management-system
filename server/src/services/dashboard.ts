import { orderRepository } from '../repositories/order';
import { productRepository } from '../repositories/product';
import { ingredientRepository } from '../repositories/ingredient';
import { userRepository } from '../repositories/user';
import { OrderStatus } from '@prisma/client';
import prisma from '../config/prisma';

/** Local midnight, `n` days back — the same day boundary today's KPIs use. */
function startOfDaysAgo(n: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - n);
  return date;
}

/** `YYYY-MM-DD` in server-local time, so buckets match `startOfDaysAgo`. */
function localDateKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export class DashboardService {
  async getAdminDashboard(days = 30) {
    const validDays = Math.min(Math.max(Number(days) || 30, 7), 90);
    const periodStart = startOfDaysAgo(validDays - 1);
    const [
      todaysStats,
      lowStock,
      totalProducts,
      totalCustomers,
      recentOrders,
      trend,
      popularProducts,
      orderTypeDistribution,
      paymentMethodDistribution,
    ] = await Promise.all([
      orderRepository.getTodaysStats(),
      ingredientRepository.findLowStock(),
      productRepository.count(),
      userRepository.count({ role: 'CUSTOMER' }),
      prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { customer: { include: { user: true } }, items: { include: { product: true } } },
      }),
      this.getTrend(validDays),
      this.getPopularProducts(periodStart),
      // Scoped to the selected window like every other figure on the screen.
      // These two ran unfiltered, so the channel and payment breakdowns showed
      // all-time totals sitting next to a 7-day chart.
      prisma.order.groupBy({
        by: ['type'],
        where: { status: { not: OrderStatus.CANCELLED }, createdAt: { gte: periodStart } },
        _count: { id: true },
        _sum: { total: true },
      }),
      prisma.payment.groupBy({
        by: ['method'],
        where: { status: 'PAID', createdAt: { gte: periodStart } },
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    // Money, so two decimals. Rounding to whole units turned a $12.40 average
    // ticket into $12 and made the figure disagree with the orders it summarises.
    const averageTicket =
      todaysStats.totalOrders > 0
        ? Math.round((todaysStats.totalRevenue / todaysStats.totalOrders) * 100) / 100
        : 0;

    return {
      stats: {
        todaysSales: todaysStats.totalRevenue,
        todaysOrders: todaysStats.totalOrders,
        pendingOrders: todaysStats.pendingOrders,
        completedOrders: todaysStats.completedOrders,
        averageTicket,
        lowStockItems: lowStock.length,
        totalProducts,
        totalCustomers,
      },
      lowStock: lowStock.slice(0, 6).map(ing => ({
        id: ing.id,
        name: ing.name,
        currentStock: Number(ing.currentStock),
        minStock: Number(ing.minStock),
        unit: ing.unit,
      })),
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer ? `${order.customer.firstName} ${order.customer.lastName}`.trim() : 'Cliente en barra',
        type: order.type,
        tableNumber: order.tableNumber,
        itemsCount: order.items?.length || 0,
        status: order.status,
        total: Number(order.total),
        createdAt: order.createdAt,
      })),
      orderTypeDistribution: orderTypeDistribution.map(item => ({
        type: item.type,
        count: item._count.id,
        revenue: Number(item._sum.total || 0),
      })),
      paymentMethodDistribution: paymentMethodDistribution.map(item => ({
        method: item.method,
        count: item._count.id,
        revenue: Number(item._sum.amount || 0),
      })),
      revenueTrend: trend.revenueTrend,
      orderTrend: trend.orderTrend,
      popularProducts,
    };
  }

  async getStaffDashboard() {
    const [pendingOrders, todaysStats] = await Promise.all([
      orderRepository.findPendingOrders(),
      orderRepository.getTodaysStats(),
    ]);

    return {
      stats: {
        todaysOrders: todaysStats.totalOrders,
        pendingOrders: todaysStats.pendingOrders,
        completedOrders: todaysStats.completedOrders,
      },
      pendingOrders: pendingOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        type: order.type,
        tableNumber: order.tableNumber,
        customerName: order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Walk-in',
        status: order.status,
        itemCount: order.items?.length ?? 0,
        createdAt: order.createdAt,
      })),
    };
  }

  /**
   * Revenue and order counts per day, from one pass over the period.
   *
   * These were two methods running two identical queries, each bucketing by
   * `toISOString()` — UTC — while today's KPIs bucket by the server's local
   * midnight. For a café west of Greenwich that put the evening's orders on
   * tomorrow's bar, so the chart and the "Ventas de Hoy" card disagreed every
   * evening. Both series now come from the same rows and the same local-day
   * key, which also guarantees the two arrays line up index-for-index — the
   * admin chart zips them by position.
   */
  private async getTrend(days: number) {
    const startDate = startOfDaysAgo(days - 1);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { not: OrderStatus.CANCELLED },
      },
      select: { total: true, createdAt: true },
    });

    const daily: Record<string, { revenue: number; orders: number }> = {};
    orders.forEach(order => {
      const key = localDateKey(order.createdAt);
      const bucket = daily[key] || (daily[key] = { revenue: 0, orders: 0 });
      bucket.revenue += Number(order.total);
      bucket.orders += 1;
    });

    const revenueTrend = [];
    const orderTrend = [];
    for (let i = days - 1; i >= 0; i--) {
      const dateStr = localDateKey(startOfDaysAgo(i));
      const bucket = daily[dateStr];
      revenueTrend.push({
        date: dateStr,
        revenue: Math.round((bucket?.revenue ?? 0) * 100) / 100,
      });
      orderTrend.push({ date: dateStr, orders: bucket?.orders ?? 0 });
    }

    return { revenueTrend, orderTrend };
  }

  /**
   * Best sellers for the selected window.
   *
   * This used to read the first 1 000 order items the database happened to
   * return, with no ordering and no date filter: once a café passed a thousand
   * line items the "top products" panel was ranking an arbitrary slice of its
   * history rather than what is actually selling now.
   */
  private async getPopularProducts(periodStart: Date) {
    const items = await prisma.orderItem.findMany({
      where: {
        order: { status: { not: OrderStatus.CANCELLED }, createdAt: { gte: periodStart } },
      },
      select: { productId: true, quantity: true, totalPrice: true, product: { select: { name: true, imageUrl: true } } },
    });

    const productMap: Record<string, { name: string; imageUrl: string | null; quantity: number; revenue: number }> = {};
    items.forEach(item => {
      const key = item.productId;
      const name = item.product?.name || 'Unknown Product';
      const imageUrl = item.product?.imageUrl || null;
      if (!productMap[key]) {
        productMap[key] = { name, imageUrl, quantity: 0, revenue: 0 };
      }
      productMap[key].quantity += item.quantity;
      productMap[key].revenue += Number(item.totalPrice);
    });

    return Object.entries(productMap)
      .map(([productId, data]) => ({ productId, ...data, revenue: Math.round(data.revenue * 100) / 100 }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }
}

export const dashboardService = new DashboardService();