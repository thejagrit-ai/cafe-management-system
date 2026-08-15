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
}

export interface StaffDashboard {
  stats: {
    todaysOrders: number;
    pendingOrders: number;
    completedOrders: number;
  };
  pendingOrders: Array<{ id: string; orderNumber: string; type: string; tableNumber: number | null; customerName: string; status: string; itemCount: number; createdAt: string }>;
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