export type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export interface User {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  customer?: Customer;
  employee?: Employee;
}

export interface Customer {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  avatar?: string;
  createdAt: string;
  user: User;
  addresses: Address[];
  orders?: Order[];
  _count?: { orders: number };
  totalSpent?: number;
}

export interface Employee {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  position?: string;
  hireDate: string;
  isActive: boolean;
  user: User;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  _count?: { products: number };
  products?: Product[];
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  categoryId: string;
  availability: 'AVAILABLE' | 'UNAVAILABLE' | 'LIMITED';
  isFeatured: boolean;
  isPopular: boolean;
  sortOrder: number;
  category?: Category;
  recipe?: Recipe;
}

export interface Ingredient {
  id: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  costPerUnit: number;
  supplierId?: string;
  isActive: boolean;
  supplier?: Supplier;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
}

export interface Recipe {
  id: string;
  productId: string;
  instructions?: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  product?: Product;
  ingredients?: RecipeIngredient[];
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  notes?: string;
  ingredient: Ingredient;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  employeeId?: string;
  type: 'DINE_IN' | 'PICKUP' | 'DELIVERY';
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
  tableNumber?: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  deliveryFee: number;
  total: number;
  notes?: string;
  addressId?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
  customer?: Customer;
  employee?: Employee & { user: User };
  address?: Address;
  items?: OrderItem[];
  payments?: Payment[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  product: Product;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: 'CASH' | 'CARD' | 'UPI' | 'ONLINE';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIAL';
  transactionId?: string;
  referenceNumber?: string;
  paidAt?: string;
  createdAt: string;
}

export interface Address {
  id: string;
  customerId: string;
  label: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  instructions?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}