import { api } from './client'
import type { Product, PaginationParams } from '@/types'

export interface Coupon {
  id: string
  code: string
  name: string
  description?: string | null
  type: 'PERCENTAGE' | 'FIXED_AMOUNT'
  value: number
  minOrderAmount: number
  maxDiscount?: number | null
  usageLimit?: number | null
  perCustomerLimit?: number | null
  startsAt?: string | null
  endsAt?: string | null
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED'
  redemptionCount?: number
  createdAt: string
  updatedAt: string
}

export interface CustomerFavorite {
  id: string
  customerId: string
  productId: string
  notes?: string | null
  product: Product
  createdAt: string
}

export interface ProductReview {
  id: string
  productId: string
  productName?: string
  customerId: string
  firstName?: string
  lastName?: string
  orderId?: string | null
  rating: number
  comment?: string | null
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

export interface EmployeeShift {
  id: string
  employeeId: string
  firstName?: string
  lastName?: string
  clockInAt: string
  clockOutAt?: string | null
  breakMinutes: number
  notes?: string | null
  status: 'OPEN' | 'CLOSED'
}

export interface EmployeePermission {
  permission: string
  enabled: boolean
}

export interface PurchaseOrder {
  id: string
  orderNumber: string
  supplierId?: string | null
  supplierName?: string | null
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
  notes?: string | null
  expectedAt?: string | null
  items: Array<{
    id: string
    ingredientId: string
    ingredientName: string
    unit: string
    quantity: number
    unitCost: number
    receivedQuantity: number
  }>
  createdAt: string
  updatedAt: string
}

export interface Wallet {
  balance: number
  transactions: Array<{ id: string; type: 'CREDIT' | 'DEBIT' | 'ADJUSTMENT'; amount: number; source?: string; note?: string; createdAt: string }>
}

export interface GiftCard {
  id: string
  code: string
  initialValue: number
  remainingValue: number
  status: 'ACTIVE' | 'REDEEMED' | 'CANCELLED' | 'EXPIRED'
  purchaserName?: string | null
  recipientEmail?: string | null
  expiresAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface PayrollSummary {
  period: {
    dateFrom: string
    dateTo: string
    deductionPercent: number
  }
  summary: {
    employees: number
    totalHours: number
    grossPay: number
    deductions: number
    netPay: number
  }
  employees: Array<{
    id: string
    firstName: string
    lastName: string
    position?: string | null
    isActive: boolean
    payrollType: 'HOURLY' | 'MONTHLY'
    hourlyRate: number
    monthlySalary: number
    shiftCount: number
    totalHours: number
    grossPay: number
    deductions: number
    netPay: number
  }>
}

export const couponsApi = {
  getAll: (params?: PaginationParams & { status?: string }) => api.get<Coupon[]>('/coupons', params),
  create: (data: Partial<Coupon>) => api.post<Coupon>('/coupons', data),
  update: (id: string, data: Partial<Coupon>) => api.put<Coupon>(`/coupons/${id}`, data),
  validate: (data: { code: string; subtotal: number }) => api.post<{ coupon: Coupon; discount: number }>('/coupons/validate', data),
}

export const engagementApi = {
  getFavorites: () => api.get<CustomerFavorite[]>('/customer-engagement/favorites'),
  addFavorite: (productId: string, notes?: string) => api.post<CustomerFavorite>('/customer-engagement/favorites', { productId, notes }),
  removeFavorite: (productId: string) => api.delete(`/customer-engagement/favorites/${productId}`),
  getReviews: (params?: PaginationParams & { productId?: string }) => api.get<ProductReview[]>('/customer-engagement/reviews', params),
  createReview: (data: { productId: string; orderId?: string; rating: number; comment?: string }) =>
    api.post<ProductReview>('/customer-engagement/reviews', data),
  getReviewSummary: (productId?: string) => api.get('/customer-engagement/reviews/summary', { productId }),
}

export const employeeOpsApi = {
  getShifts: (params?: PaginationParams & { employeeId?: string; status?: string }) => api.get<EmployeeShift[]>('/employee-ops/shifts', params),
  getCurrentShift: () => api.get<EmployeeShift | null>('/employee-ops/shifts/current'),
  clockIn: (notes?: string) => api.post<EmployeeShift>('/employee-ops/shifts/clock-in', { notes }),
  clockOut: (data: { breakMinutes?: number; notes?: string }) => api.post<EmployeeShift>('/employee-ops/shifts/clock-out', data),
  getPermissions: (employeeId: string) => api.get<EmployeePermission[]>(`/employee-ops/employees/${employeeId}/permissions`),
  setPermissions: (employeeId: string, permissions: EmployeePermission[]) =>
    api.put<EmployeePermission[]>(`/employee-ops/employees/${employeeId}/permissions`, { permissions }),
}

export const purchaseOrdersApi = {
  getAll: (params?: PaginationParams & { status?: string; supplierId?: string }) => api.get<PurchaseOrder[]>('/purchase-orders', params),
  create: (data: { supplierId?: string; expectedAt?: string; notes?: string; items: Array<{ ingredientId: string; quantity: number; unitCost?: number }> }) =>
    api.post<PurchaseOrder>('/purchase-orders', data),
  updateStatus: (id: string, status: PurchaseOrder['status']) => api.put<PurchaseOrder>(`/purchase-orders/${id}/status`, { status }),
  receive: (id: string, items: Array<{ itemId: string; quantity: number }>) => api.post<PurchaseOrder>(`/purchase-orders/${id}/receive`, { items }),
}

export const walletApi = {
  getWallet: () => api.get<Wallet>('/wallet/me'),
  redeemGiftCard: (code: string) => api.post<Wallet>('/wallet/redeem-gift-card', { code }),
  getGiftCards: (params?: PaginationParams & { status?: string }) => api.get<GiftCard[]>('/wallet/gift-cards', params),
  createGiftCard: (data: {
    code?: string
    initialValue: number
    purchaserName?: string
    recipientName?: string
    recipientEmail?: string
    message?: string
    expiresAt?: string
  }) =>
    api.post<GiftCard>('/wallet/gift-cards', data),
}

export const payrollApi = {
  getSummary: (params?: { dateFrom?: string; dateTo?: string; deductionPercent?: number }) =>
    api.get<PayrollSummary>('/payroll/summary', params),
  updateCompensation: (
    employeeId: string,
    data: { payrollType: 'HOURLY' | 'MONTHLY'; hourlyRate: number; monthlySalary: number },
  ) => api.put(`/payroll/employees/${employeeId}/compensation`, data),
}
