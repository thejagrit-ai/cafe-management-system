import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency dynamically respecting clean numerical values
 * Example: 5.5 -> "$5.50"
 * Example: 18 -> "$18.00"
 * Example: 2500 -> "$2,500.00"
 */
export function formatCurrency(amount: number | string, currency: string = 'INR'): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200/80',
    CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200/80',
    PREPARING: 'bg-violet-50 text-violet-700 border-violet-200/80',
    READY: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    DELIVERED: 'bg-teal-50 text-teal-700 border-teal-200/80',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200/80',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    FAILED: 'bg-rose-50 text-rose-700 border-rose-200/80',
    REFUNDED: 'bg-purple-50 text-purple-700 border-purple-200/80',
    PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200/80',
  }
  return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    PREPARING: 'Preparing',
    READY: 'Ready',
    DELIVERED: 'Delivered',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    PAID: 'Paid',
    FAILED: 'Failed',
    REFUNDED: 'Refunded',
    PARTIAL: 'Partial',
  }
  return labels[status] || status
}

export function getOrderTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    DINE_IN: 'Dine-in',
    PICKUP: 'Pickup',
    DELIVERY: 'Delivery',
  }
  return labels[type] || type
}

export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    CASH: 'Cash',
    CARD: 'Card',
    UPI: 'UPI',
    ONLINE: 'Online Payment',
  }
  return labels[method] || method
}

export function generateOrderNumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `ORD-${year}${month}${day}-${random}`
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function calculatePagination(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const endIndex = Math.min(startIndex + limit, total)
  return { totalPages, startIndex, endIndex }
}