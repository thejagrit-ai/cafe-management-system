import { api } from './client';

export interface AdminDashboard {
  stats: {
    todaysSales: number;
    todaysOrders: number;
    pendingOrders: number;
    completedOrders: number;
    averageTicket?: number;
    lowStockItems: number;
    totalProducts: number;
    totalCustomers: number;
    cancelledOrders?: number;
    refundRate?: number;
  };
  lowStock: Array<{ id: string; name: string; currentStock: number; minStock: number; unit: string }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    type?: string;
    tableNumber?: number | null;
    itemsCount?: number;
    status: string;
    total: number;
    createdAt: string;
  }>;
  revenueTrend: Array<{ date: string; revenue: number }>;
  orderTrend: Array<{ date: string; orders: number }>;
  popularProducts: Array<{ productId: string; name: string; imageUrl?: string | null; quantity: number; revenue: number }>;
  orderTypeDistribution?: Array<{ type: string; count: number; revenue: number }>;
  paymentMethodDistribution?: Array<{ method: string; count: number; revenue: number }>;
  profitSnapshot?: {
    revenue: number;
    ingredientCost: number;
    grossProfit: number;
    grossMarginPercent: number;
    bestMarginProducts: Array<{ productId: string; name: string; revenue: number; cost: number; quantity: number; grossProfit: number; marginPercent: number }>;
    lowMarginProducts: Array<{ productId: string; name: string; revenue: number; cost: number; quantity: number; grossProfit: number; marginPercent: number }>;
  };
  inventoryForecast?: Array<{ id: string; name: string; unit: string; currentStock: number; minStock: number; dailyUse: number; daysUntilLow: number | null; suggestedOrderQty: number; supplier: string | null }>;
  tablePerformance?: Array<{ tableNumber: number | null; orders: number; revenue: number; averageTicket: number; activeOrders?: number; occupied?: boolean; averageTableMinutes?: number | null }>;
  customerInsights?: {
    newCustomers: number;
    topCustomers: Array<{ customerId: string | null; name: string; email: string | null; orders: number; totalSpent: number }>;
  };
  refundStats?: { paidPayments: number; refundedPayments: number; cancelledOrders: number; refundRate: number };
}

export interface StaffDashboard {
  stats: {
    todaysOrders: number;
    pendingOrders: number;
    completedOrders: number;
  };
  pendingOrders: Array<{ id: string; orderNumber: string; type: string; tableNumber: number | null; customerName: string; status: string; itemCount: number; items?: Array<{ id: string; name: string; quantity: number; notes?: string }>; notes?: string; createdAt: string; prepAgeMinutes?: number }>;
}

export interface SalesReport {
  summary: { totalOrders: number; totalRevenue: number; averageOrderValue: number };
  revenueByDay: Array<{ date: string; revenue: number }>;
  revenueByProduct: Array<{ productId: string; name: string; revenue: number; quantity: number }>;
  revenueByCategory: Array<{ categoryId: string; name: string; revenue: number }>;
  paymentMethods: Record<string, number>;
}

export interface InventoryReport {
  summary: { totalIngredients: number; lowStockCount: number; totalInventoryValue: number };
  ingredients: Array<{ id: string; name: string; sku: string; currentStock: number; minStock: number; unit: string; costPerUnit: number; totalValue: number; isLowStock: boolean; supplier: string }>;
  lowStock: Array<{ id: string; name: string; currentStock: number; minStock: number; difference: number; unit: string }>;
}

export const dashboardApi = {
  getAdminDashboard: (params?: { days?: number }) => api.get<AdminDashboard>('/dashboard/admin', params),

  getStaffDashboard: () => api.get<StaffDashboard>('/dashboard/staff'),
};

export const reportsApi = {
  getSalesReport: (params?: { dateFrom?: string; dateTo?: string; groupBy?: string }) =>
    api.get<SalesReport>('/reports/sales', params),

  getInventoryReport: (params?: { dateFrom?: string; dateTo?: string }) =>
    api.get<InventoryReport>('/reports/inventory', params),

  getProductReport: (params?: { dateFrom?: string; dateTo?: string; limit?: number }) =>
    api.get('/reports/products', params),

  exportReport: (params: { type: 'sales' | 'inventory' | 'products'; dateFrom?: string; dateTo?: string }) =>
    api.get<any[]>('/reports/export', params),
};

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldData?: unknown;
  newData?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export const auditLogsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; entity?: string; action?: string }) =>
    api.get<AuditLog[]>('/audit-logs', params),
};
