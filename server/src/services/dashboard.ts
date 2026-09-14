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
      todaysCancelled,
      lowStock,
      totalProducts,
      totalCustomers,
      recentOrders,
      trend,
      popularProducts,
      orderTypeDistribution,
      paymentMethodDistribution,
      profitSnapshot,
      inventoryForecast,
      tablePerformance,
      customerInsights,
      refundStats,
    ] = await Promise.all([
      orderRepository.getTodaysStats(),
      orderRepository.getTodaysCancelledCount(),
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
      this.getProfitSnapshot(periodStart),
      this.getInventoryForecast(periodStart, validDays),
      this.getTablePerformance(periodStart),
      this.getCustomerInsights(periodStart),
      this.getRefundStats(periodStart),
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
        cancelledOrders: todaysCancelled,
        refundRate: refundStats.refundRate,
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
      profitSnapshot,
      inventoryForecast,
      tablePerformance,
      customerInsights,
      refundStats,
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
        items: order.items?.map((item: any) => ({
          id: item.id,
          name: item.product?.name || 'Item',
          quantity: item.quantity,
          notes: item.notes,
        })) ?? [],
        notes: order.notes,
        createdAt: order.createdAt,
        prepAgeMinutes: Math.max(0, Math.round((Date.now() - order.createdAt.getTime()) / 60000)),
      })),
    };
  }

  private async getProfitSnapshot(periodStart: Date) {
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: { status: { not: OrderStatus.CANCELLED }, createdAt: { gte: periodStart } },
      },
      select: {
        quantity: true,
        totalPrice: true,
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            recipe: {
              select: {
                ingredients: {
                  select: {
                    quantity: true,
                    ingredient: { select: { costPerUnit: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const byProduct: Record<string, { productId: string; name: string; revenue: number; cost: number; quantity: number }> = {};
    let revenue = 0;
    let ingredientCost = 0;

    orderItems.forEach((item) => {
      const product = item.product;
      const productCost = product.recipe?.ingredients.reduce(
        (sum, ri) => sum + Number(ri.quantity) * Number(ri.ingredient.costPerUnit),
        0,
      ) ?? 0;
      const lineRevenue = Number(item.totalPrice);
      const lineCost = productCost * item.quantity;
      revenue += lineRevenue;
      ingredientCost += lineCost;

      const row = byProduct[product.id] || (byProduct[product.id] = {
        productId: product.id,
        name: product.name,
        revenue: 0,
        cost: 0,
        quantity: 0,
      });
      row.revenue += lineRevenue;
      row.cost += lineCost;
      row.quantity += item.quantity;
    });

    const products = Object.values(byProduct)
      .map((item) => ({
        ...item,
        grossProfit: Math.round((item.revenue - item.cost) * 100) / 100,
        marginPercent: item.revenue > 0 ? Math.round(((item.revenue - item.cost) / item.revenue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.grossProfit - a.grossProfit);

    const grossProfit = revenue - ingredientCost;
    return {
      revenue: Math.round(revenue * 100) / 100,
      ingredientCost: Math.round(ingredientCost * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossMarginPercent: revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0,
      bestMarginProducts: [...products].sort((a, b) => b.marginPercent - a.marginPercent).slice(0, 5),
      lowMarginProducts: [...products].filter((p) => p.revenue > 0).sort((a, b) => a.marginPercent - b.marginPercent).slice(0, 5),
    };
  }

  private async getInventoryForecast(periodStart: Date, days: number) {
    const ingredients = await prisma.ingredient.findMany({
      where: { isActive: true },
      include: {
        supplier: true,
        inventoryTransactions: {
          where: {
            type: 'ORDER_CONSUMPTION',
            createdAt: { gte: periodStart },
          },
          select: { quantity: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return ingredients
      .map((ingredient) => {
        const consumed = ingredient.inventoryTransactions.reduce((sum, tx) => sum + Number(tx.quantity), 0);
        const dailyUse = consumed / Math.max(days, 1);
        const currentStock = Number(ingredient.currentStock);
        const minStock = Number(ingredient.minStock);
        const maxStock = Number(ingredient.maxStock);
        const daysUntilLow = dailyUse > 0 ? Math.max(0, Math.floor((currentStock - minStock) / dailyUse)) : null;
        const suggestedOrderQty = Math.max(0, maxStock > 0 ? maxStock - currentStock : minStock * 2 - currentStock);

        return {
          id: ingredient.id,
          name: ingredient.name,
          unit: ingredient.unit,
          currentStock,
          minStock,
          dailyUse: Math.round(dailyUse * 1000) / 1000,
          daysUntilLow,
          suggestedOrderQty: Math.round(suggestedOrderQty * 1000) / 1000,
          supplier: ingredient.supplier?.name ?? null,
        };
      })
      .filter((item) => item.daysUntilLow !== null || item.currentStock <= item.minStock)
      .sort((a, b) => (a.daysUntilLow ?? 9999) - (b.daysUntilLow ?? 9999))
      .slice(0, 8);
  }

  private async getTablePerformance(periodStart: Date) {
    const [rows, activeOrders, completedOrders] = await Promise.all([
      prisma.order.groupBy({
        by: ['tableNumber'],
        where: {
          tableNumber: { not: null },
          status: { not: OrderStatus.CANCELLED },
          createdAt: { gte: periodStart },
        },
        _count: { id: true },
        _sum: { total: true },
        _avg: { total: true },
      }),
      prisma.order.groupBy({
        by: ['tableNumber'],
        where: {
          tableNumber: { not: null },
          status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY] },
        },
        _count: { id: true },
      }),
      prisma.order.findMany({
        where: {
          tableNumber: { not: null },
          completedAt: { not: null },
          status: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] },
          createdAt: { gte: periodStart },
        },
        select: { tableNumber: true, createdAt: true, completedAt: true },
      }),
    ]);

    const activeMap = new Map(activeOrders.map((row) => [row.tableNumber, row._count.id]));
    const timeMap = new Map<number, { total: number; count: number }>();
    completedOrders.forEach((order) => {
      if (!order.tableNumber || !order.completedAt) return;
      const minutes = Math.max(0, Math.round((order.completedAt.getTime() - order.createdAt.getTime()) / 60000));
      const row = timeMap.get(order.tableNumber) ?? { total: 0, count: 0 };
      row.total += minutes;
      row.count += 1;
      timeMap.set(order.tableNumber, row);
    });

    return rows
      .map((row) => {
        const tableNumber = row.tableNumber ?? 0;
        const time = timeMap.get(tableNumber);
        return {
          tableNumber: row.tableNumber,
          orders: row._count.id,
          revenue: Number(row._sum.total || 0),
          averageTicket: Number(row._avg.total || 0),
          activeOrders: activeMap.get(row.tableNumber) ?? 0,
          occupied: (activeMap.get(row.tableNumber) ?? 0) > 0,
          averageTableMinutes: time && time.count > 0 ? Math.round(time.total / time.count) : null,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }

  private async getCustomerInsights(periodStart: Date) {
    const [newCustomers, topCustomers] = await Promise.all([
      prisma.customer.count({ where: { createdAt: { gte: periodStart } } }),
      prisma.order.groupBy({
        by: ['customerId'],
        where: {
          customerId: { not: null },
          status: { not: OrderStatus.CANCELLED },
          createdAt: { gte: periodStart },
        },
        _count: { id: true },
        _sum: { total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
    ]);

    const customers = await prisma.customer.findMany({
      where: { id: { in: topCustomers.map((c) => c.customerId).filter(Boolean) as string[] } },
      include: { user: true },
    });
    const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

    return {
      newCustomers,
      topCustomers: topCustomers.map((row) => {
        const customer = row.customerId ? customerMap.get(row.customerId) : null;
        return {
          customerId: row.customerId,
          name: customer ? `${customer.firstName} ${customer.lastName ?? ''}`.trim() : 'Customer',
          email: customer?.user.email ?? null,
          orders: row._count.id,
          totalSpent: Number(row._sum.total || 0),
        };
      }),
    };
  }

  private async getRefundStats(periodStart: Date) {
    const [paid, refunded, cancelled] = await Promise.all([
      prisma.payment.count({ where: { status: 'PAID', createdAt: { gte: periodStart } } }),
      prisma.payment.count({ where: { status: 'REFUNDED', createdAt: { gte: periodStart } } }),
      prisma.order.count({ where: { status: OrderStatus.CANCELLED, createdAt: { gte: periodStart } } }),
    ]);

    return {
      paidPayments: paid,
      refundedPayments: refunded,
      cancelledOrders: cancelled,
      refundRate: paid + refunded > 0 ? Math.round((refunded / (paid + refunded)) * 1000) / 10 : 0,
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
