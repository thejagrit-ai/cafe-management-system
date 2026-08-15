import { paymentRepository } from '../repositories/payment';
import { ingredientRepository } from '../repositories/ingredient';
import prisma from '../config/prisma';

export class ReportService {
  async getSalesReport(params: { dateFrom?: Date; dateTo?: Date; groupBy?: 'day' | 'week' | 'month' }) {
    const where: any = {
      status: { not: 'CANCELLED' },
    };
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) where.createdAt.gte = params.dateFrom;
      if (params.dateTo) where.createdAt.lte = params.dateTo;
    }

    const [orders, totalRevenue, paymentMethods] = await Promise.all([
      prisma.order.findMany({
        where,
        select: { id: true, total: true, createdAt: true, status: true, type: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.order.aggregate({
        where,
        _sum: { total: true },
        _count: true,
      }),
      paymentRepository.getTotalByMethod(params.dateFrom, params.dateTo),
    ]);

    const totalOrders = totalRevenue._count;
    const revenue = Number(totalRevenue._sum.total ?? 0);
    const averageOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;

    const revenueByDay: Record<string, number> = {};
    orders.forEach((order: { createdAt: Date; total: any }) => {
      const date = order.createdAt.toISOString().split('T')[0];
      revenueByDay[date] = (revenueByDay[date] || 0) + Number(order.total);
    });

    const revenueByProduct = await this.getRevenueByProduct(params.dateFrom, params.dateTo);
    const revenueByCategory = await this.getRevenueByCategory(params.dateFrom, params.dateTo);

    return {
      summary: {
        totalOrders,
        totalRevenue: revenue,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      },
      revenueByDay: Object.entries(revenueByDay).map(([date, revenue]) => ({ date, revenue })),
      revenueByProduct,
      revenueByCategory,
      paymentMethods,
    };
  }

  private async getRevenueByProduct(dateFrom?: Date, dateTo?: Date) {
    const where: any = { status: { not: 'CANCELLED' } };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const items = await prisma.orderItem.findMany({
      where: { order: where },
      select: { productId: true, totalPrice: true, quantity: true, product: { select: { name: true, category: { select: { name: true } } } } },
    });

    const productMap: Record<string, { name: string; category: string; revenue: number; quantity: number }> = {};
    items.forEach(item => {
      const key = item.productId;
      if (!productMap[key]) {
        productMap[key] = { name: item.product.name, category: item.product.category.name, revenue: 0, quantity: 0 };
      }
      productMap[key].revenue += Number(item.totalPrice);
      productMap[key].quantity += item.quantity;
    });

    return Object.entries(productMap)
      .map(([productId, data]) => ({ productId, ...data, revenue: Math.round(data.revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private async getRevenueByCategory(dateFrom?: Date, dateTo?: Date) {
    const where: any = { status: { not: 'CANCELLED' } };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const items = await prisma.orderItem.findMany({
      where: { order: where },
      select: { productId: true, totalPrice: true, quantity: true, product: { select: { categoryId: true, category: { select: { name: true } } } } },
    });

    const categoryMap: Record<string, { name: string; revenue: number; quantity: number }> = {};
    items.forEach(item => {
      const key = item.product.categoryId;
      if (!categoryMap[key]) {
        categoryMap[key] = { name: item.product.category.name, revenue: 0, quantity: 0 };
      }
      categoryMap[key].revenue += Number(item.totalPrice);
      categoryMap[key].quantity += item.quantity;
    });

    return Object.entries(categoryMap)
      .map(([categoryId, data]) => ({ categoryId, ...data, revenue: Math.round(data.revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  async getInventoryReport(params: { dateFrom?: Date; dateTo?: Date }) {
    const [ingredients, lowStock, stockMovements, waste] = await Promise.all([
      ingredientRepository.findWithSupplier({ limit: 1000 }),
      ingredientRepository.findLowStock(),
      this.getStockMovements(params.dateFrom, params.dateTo),
      this.getWaste(params.dateFrom, params.dateTo),
    ]);

    const totalValue = ingredients.data.reduce((sum, ing) => sum + Number(ing.currentStock) * Number(ing.costPerUnit), 0);

    return {
      summary: {
        totalIngredients: ingredients.total,
        lowStockCount: lowStock.length,
        totalInventoryValue: Math.round(totalValue * 100) / 100,
      },
      ingredients: ingredients.data.map(ing => ({
        id: ing.id,
        name: ing.name,
        sku: ing.sku,
        currentStock: Number(ing.currentStock),
        minStock: Number(ing.minStock),
        maxStock: Number(ing.maxStock),
        unit: ing.unit,
        costPerUnit: Number(ing.costPerUnit),
        totalValue: Math.round(Number(ing.currentStock) * Number(ing.costPerUnit) * 100) / 100,
        isLowStock: Number(ing.currentStock) <= Number(ing.minStock),
        supplier: ing.supplier?.name,
      })),
      lowStock: lowStock.map(ing => ({
        id: ing.id,
        name: ing.name,
        currentStock: Number(ing.currentStock),
        minStock: Number(ing.minStock),
        difference: Number(ing.minStock) - Number(ing.currentStock),
        unit: ing.unit,
      })),
      stockMovements,
      waste,
    };
  }

  private async getStockMovements(dateFrom?: Date, dateTo?: Date) {
    const where: any = {};
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const movements = await prisma.inventoryTransaction.groupBy({
      by: ['type'],
      where,
      _sum: { quantity: true },
      _count: true,
    });

    return movements.map(m => ({
      type: m.type,
      totalQuantity: Number(m._sum.quantity ?? 0),
      count: m._count,
    }));
  }

  private async getWaste(dateFrom?: Date, dateTo?: Date) {
    const where: any = { type: 'WASTE' };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const waste = await prisma.inventoryTransaction.findMany({
      where,
      include: { ingredient: { select: { name: true, unit: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return waste.map(w => ({
      id: w.id,
      ingredient: w.ingredient.name,
      quantity: Number(w.quantity),
      unit: w.ingredient.unit,
      notes: w.notes,
      createdAt: w.createdAt,
    }));
  }

  async getProductReport(params: { dateFrom?: Date; dateTo?: Date; limit?: number }) {
    const where: any = { status: { not: 'CANCELLED' } };
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) where.createdAt.gte = params.dateFrom;
      if (params.dateTo) where.createdAt.lte = params.dateTo;
    }

    const items = await prisma.orderItem.findMany({
      where: { order: where },
      select: { productId: true, totalPrice: true, quantity: true, product: { select: { name: true, category: { select: { name: true } }, price: true } } },
    });

    const productMap: Record<string, { name: string; category: string; price: number; revenue: number; quantity: number; orderCount: number }> = {};
    items.forEach(item => {
      const key = item.productId;
      if (!productMap[key]) {
        productMap[key] = { name: item.product.name, category: item.product.category.name, price: Number(item.product.price), revenue: 0, quantity: 0, orderCount: 0 };
      }
      productMap[key].revenue += Number(item.totalPrice);
      productMap[key].quantity += item.quantity;
      productMap[key].orderCount += 1;
    });

    const products = Object.entries(productMap)
      .map(([productId, data]) => ({ productId, ...data, revenue: Math.round(data.revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      bestSelling: products.slice(0, params.limit || 10),
      leastSelling: products.slice(-(params.limit || 10)).reverse(),
      all: products,
    };
  }

  async exportReport(params: { type: 'sales' | 'inventory' | 'products'; dateFrom?: Date; dateTo?: Date }) {
    if (params.type === 'sales') {
      const where: any = { status: { not: 'CANCELLED' } };
      if (params.dateFrom || params.dateTo) {
        where.createdAt = {};
        if (params.dateFrom) where.createdAt.gte = params.dateFrom;
        if (params.dateTo) where.createdAt.lte = params.dateTo;
      }

      const orders = await prisma.order.findMany({
        where,
        include: {
          customer: true,
          items: { include: { product: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return orders.map((order) => ({
        orderNumber: order.orderNumber,
        date: order.createdAt.toISOString(),
        type: order.type,
        tableNumber: order.tableNumber ? `Mesa #${order.tableNumber}` : '-',
        customer: order.customer ? `${order.customer.firstName} ${order.customer.lastName}`.trim() : 'Cliente General',
        status: order.status,
        itemsCount: order.items.length,
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.taxAmount),
        deliveryFee: Number(order.deliveryFee),
        total: Number(order.total),
        paymentMethod: order.payments?.[0]?.method || 'N/A',
        paymentStatus: order.payments?.[0]?.status || 'N/A',
      }));
    }

    if (params.type === 'inventory') {
      const ingredients = await ingredientRepository.findWithSupplier({ limit: 5000 });
      return ingredients.data.map((ing) => ({
        sku: ing.sku || '-',
        name: ing.name,
        currentStock: Number(ing.currentStock),
        minStock: Number(ing.minStock),
        maxStock: Number(ing.maxStock),
        unit: ing.unit,
        costPerUnit: Number(ing.costPerUnit),
        totalValue: Math.round(Number(ing.currentStock) * Number(ing.costPerUnit) * 100) / 100,
        status: Number(ing.currentStock) <= Number(ing.minStock) ? 'STOCK BAJO' : 'ÓPTIMO',
        supplier: ing.supplier?.name || 'N/A',
      }));
    }

    if (params.type === 'products') {
      const report = await this.getProductReport({ dateFrom: params.dateFrom, dateTo: params.dateTo, limit: 1000 });
      return report.all.map((prod) => ({
        name: prod.name,
        category: prod.category,
        unitPrice: prod.price,
        quantitySold: prod.quantity,
        orderCount: prod.orderCount,
        totalRevenue: prod.revenue,
      }));
    }

    throw new Error('Invalid report type');
  }
}

export const reportService = new ReportService();