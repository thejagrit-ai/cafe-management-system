import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { SmoothScroll } from '@/components/SmoothScroll'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBoundary } from '@/components/ErrorBoundary'

import HomePage from '@/pages/customer/HomePage'
import MenuPage from '@/pages/customer/MenuPage'
import ProductDetailPage from '@/pages/customer/ProductDetailPage'
import CartPage from '@/pages/customer/CartPage'
import CheckoutPage from '@/pages/customer/CheckoutPage'
import OrderConfirmationPage from '@/pages/customer/OrderConfirmationPage'
import OrderHistoryPage from '@/pages/customer/OrderHistoryPage'
import CustomerDashboard from '@/pages/customer/CustomerDashboard'

import AuthPage from '@/pages/auth/AuthPage'

import AdminLayout from '@/layouts/AdminLayout'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminProducts from '@/pages/admin/AdminProducts'
import AdminCategories from '@/pages/admin/AdminCategories'
import AdminIngredients from '@/pages/admin/AdminIngredients'
import AdminRecipes from '@/pages/admin/AdminRecipes'
import AdminOrders from '@/pages/admin/AdminOrders'
import AdminTables from '@/pages/admin/AdminTables'
import AdminPayments from '@/pages/admin/AdminPayments'
import AdminEmployees from '@/pages/admin/AdminEmployees'
import AdminCustomers from '@/pages/admin/AdminCustomers'
import AdminSuppliers from '@/pages/admin/AdminSuppliers'
import AdminSettings from '@/pages/admin/AdminSettings'
import AdminReports from '@/pages/admin/AdminReports'

import StaffLayout from '@/layouts/StaffLayout'
import StaffDashboard from '@/pages/staff/StaffDashboard'
import StaffOrders from '@/pages/staff/StaffOrders'
import StaffProducts from '@/pages/staff/StaffProducts'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="space-y-4">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
  )
}

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user?.role || '')) return <Navigate to="/" replace />
  
  return <>{children}</>
}

function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScroll>
      {/* `theme-cafe` scopes the coffee-shop palette to the public site. Admin
          and staff routes render outside this wrapper and keep their own look. */}
      <div className="theme-cafe min-h-screen flex flex-col font-sans">
        <Navbar />
        {/* Scoped to the page body so a failing page keeps the header and
            footer instead of blanking the whole document. */}
        <main className="flex-1">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
        <Footer />
      </div>
    </SmoothScroll>
  )
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <LoadingScreen />
  if (isAuthenticated) {
    if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />
    if (user?.role === 'STAFF') return <Navigate to="/staff" replace />
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

export default function App() {
  const { isLoading } = useAuth()

  if (isLoading) return <LoadingScreen />

  return (
    <Routes>
      <Route path="/" element={<CustomerLayout><HomePage /></CustomerLayout>} />
      <Route path="/menu" element={<CustomerLayout><MenuPage /></CustomerLayout>} />
      <Route path="/menu/:id" element={<CustomerLayout><ProductDetailPage /></CustomerLayout>} />
      {/* Auth screens render outside CustomerLayout: they are a full-viewport
          split panel with their own "back to site" link, so a navbar and
          footer would only compete with the card. */}
      <Route path="/login" element={<ErrorBoundary><AuthRoute><AuthPage /></AuthRoute></ErrorBoundary>} />
      <Route path="/register" element={<ErrorBoundary><AuthRoute><AuthPage /></AuthRoute></ErrorBoundary>} />
      
      {/* Public cart, checkout and confirmation for all customers & guests */}
      <Route path="/cart" element={<CustomerLayout><CartPage /></CustomerLayout>} />
      <Route path="/checkout" element={<CustomerLayout><CheckoutPage /></CustomerLayout>} />
      <Route path="/order-confirmation/:orderNumber" element={<CustomerLayout><OrderConfirmationPage /></CustomerLayout>} />

      {/* Authenticated Customer routes */}
      <Route path="/orders" element={<CustomerLayout><ProtectedRoute roles={['CUSTOMER']}><OrderHistoryPage /></ProtectedRoute></CustomerLayout>} />
      <Route path="/account" element={<CustomerLayout><ProtectedRoute roles={['CUSTOMER']}><CustomerDashboard /></ProtectedRoute></CustomerLayout>} />

      <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="ingredients" element={<AdminIngredients />} />
        <Route path="recipes" element={<AdminRecipes />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="tables" element={<AdminTables />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="employees" element={<AdminEmployees />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="suppliers" element={<AdminSuppliers />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="reports" element={<AdminReports />} />
      </Route>

      <Route path="/staff" element={<ProtectedRoute roles={['ADMIN', 'STAFF']}><StaffLayout /></ProtectedRoute>}>
        <Route index element={<StaffDashboard />} />
        <Route path="orders" element={<StaffOrders />} />
        <Route path="products" element={<StaffProducts />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}