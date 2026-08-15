import { orderRepository } from '../repositories/order';
import { productRepository } from '../repositories/product';
import { ingredientRepository } from '../repositories/ingredient';
import { userRepository } from '../repositories/user';
import { OrderStatus } from '@prisma/client';
import prisma from '../config/prisma';

export class DashboardService {
  async getAdminDashboard(days = 30) {
    const validDays = Math.min(Math.max(Number(days) || 30, 7), 90);
    const [
      todaysStats,
      lowStock,
      totalProducts,
      totalCustomers,
      recentOrders,
      revenueTrend,
      orderTrend,
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
      this.getRevenueTrend(validDays),
      this.getOrderTrend(validDays),
      this.getPopularProducts(),
      prisma.order.groupBy({
        by: ['type'],
        where: { status: { not: OrderStatus.CANCELLED } },
        _count: { id: true },
        _sum: { total: true },
      }),
      prisma.payment.groupBy({
        by: ['method'],
        where: { status: 'PAID' },
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    const averageTicket =
      todaysStats.totalOrders > 0
        ? Math.round(todaysStats.totalRevenue / todaysStats.totalOrders)
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
      revenueTrend,
      orderTrend,
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

  private async getRevenueTrend(days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { not: OrderStatus.CANCELLED },
      },
      select: { total: true, createdAt: true },
    });

    const dailyRevenue: Record<string, number> = {};
    orders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0];
      dailyRevenue[date] = (dailyRevenue[date] || 0) + Number(order.total);
    });

    const result = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      result.unshift({ date: dateStr, revenue: dailyRevenue[dateStr] || 0 });
    }

    return result;
  }

  private async getOrderTrend(days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { not: OrderStatus.CANCELLED },
      },
      select: { createdAt: true },
    });

    const dailyOrders: Record<string, number> = {};
    orders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0];
      dailyOrders[date] = (dailyOrders[date] || 0) + 1;
    });

    const result = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      result.unshift({ date: dateStr, orders: dailyOrders[dateStr] || 0 });
    }

    return result;
  }

  private async getPopularProducts() {
    const items = await prisma.orderItem.findMany({
      where: { order: { status: { not: OrderStatus.CANCELLED } } },
      select: { productId: true, quantity: true, totalPrice: true, product: { select: { name: true, imageUrl: true } } },
      take: 1000,
    });

    const productMap: Record<string, { name: string; imageUrl: string | null; quantity: number; revenue: number }> = {};
    items.forEach(item => {
      const key = item.productId;
      if (!productMap[key]) {
        productMap[key] = { name: item.product.name, imageUrl: item.product.imageUrl, quantity: 0, revenue: 0 };
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