import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { SmoothScroll } from '@/components/SmoothScroll'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// The landing page is the most common entry point, so it stays in the initial
// bundle. Everything else is split into its own chunk and fetched on demand:
// without this a visitor reading the menu still downloaded recharts, the admin
// console and every staff screen before the first paint.
import HomePage from '@/pages/customer/HomePage'

const MenuPage = lazy(() => import('@/pages/customer/MenuPage'))
const ProductDetailPage = lazy(() => import('@/pages/customer/ProductDetailPage'))
const CartPage = lazy(() => import('@/pages/customer/CartPage'))
const CheckoutPage = lazy(() => import('@/pages/customer/CheckoutPage'))
const OrderConfirmationPage = lazy(() => import('@/pages/customer/OrderConfirmationPage'))
const OrderHistoryPage = lazy(() => import('@/pages/customer/OrderHistoryPage'))
const CustomerDashboard = lazy(() => import('@/pages/customer/CustomerDashboard'))

const AuthPage = lazy(() => import('@/pages/auth/AuthPage'))

const AdminLayout = lazy(() => import('@/layouts/AdminLayout'))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts'))
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories'))
const AdminIngredients = lazy(() => import('@/pages/admin/AdminIngredients'))
const AdminRecipes = lazy(() => import('@/pages/admin/AdminRecipes'))
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders'))
const AdminTables = lazy(() => import('@/pages/admin/AdminTables'))
const AdminPayments = lazy(() => import('@/pages/admin/AdminPayments'))
const AdminEmployees = lazy(() => import('@/pages/admin/AdminEmployees'))
const AdminCustomers = lazy(() => import('@/pages/admin/AdminCustomers'))
const AdminSuppliers = lazy(() => import('@/pages/admin/AdminSuppliers'))
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'))
const AdminReports = lazy(() => import('@/pages/admin/AdminReports'))

const StaffLayout = lazy(() => import('@/layouts/StaffLayout'))
const StaffDashboard = lazy(() => import('@/pages/staff/StaffDashboard'))
const StaffOrders = lazy(() => import('@/pages/staff/StaffOrders'))
const StaffProducts = lazy(() => import('@/pages/staff/StaffProducts'))

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

/** Placeholder shown while a route chunk downloads. */
function RouteFallback() {
  return (
    <div className="container mx-auto space-y-4 py-24">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-4 w-full max-w-sm" />
    </div>
  )
}

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, isAuthenticated, isSessionResolved } = useAuth()

  // Only the routes whose outcome depends on the answer wait for the session
  // probe. Public pages render immediately, even while the API is waking up.
  if (!isSessionResolved) return <LoadingScreen />
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
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>{children}</Suspense>
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
    </SmoothScroll>
  )
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isSessionResolved } = useAuth()
  if (!isSessionResolved) return <LoadingScreen />
  if (isAuthenticated) {
    if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />
    if (user?.role === 'STAFF') return <Navigate to="/staff" replace />
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CustomerLayout><HomePage /></CustomerLayout>} />
      <Route path="/menu" element={<CustomerLayout><MenuPage /></CustomerLayout>} />
      <Route path="/menu/:id" element={<CustomerLayout><ProductDetailPage /></CustomerLayout>} />
      {/* Auth screens render outside CustomerLayout: they are a full-viewport
          split panel with their own "back to site" link, so a navbar and
          footer would only compete with the card. */}
      <Route
        path="/login"
        element={
          <ErrorBoundary>
            <Suspense fallback={<LoadingScreen />}>
              <AuthRoute><AuthPage /></AuthRoute>
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/register"
        element={
          <ErrorBoundary>
            <Suspense fallback={<LoadingScreen />}>
              <AuthRoute><AuthPage /></AuthRoute>
            </Suspense>
          </ErrorBoundary>
        }
      />

      {/* Public cart, checkout and confirmation for all customers & guests */}
      <Route path="/cart" element={<CustomerLayout><CartPage /></CustomerLayout>} />
      <Route path="/checkout" element={<CustomerLayout><CheckoutPage /></CustomerLayout>} />
      <Route path="/order-confirmation/:orderNumber" element={<CustomerLayout><OrderConfirmationPage /></CustomerLayout>} />

      {/* Authenticated Customer routes */}
      <Route path="/orders" element={<CustomerLayout><ProtectedRoute roles={['CUSTOMER']}><OrderHistoryPage /></ProtectedRoute></CustomerLayout>} />
      <Route path="/account" element={<CustomerLayout><ProtectedRoute roles={['CUSTOMER']}><CustomerDashboard /></ProtectedRoute></CustomerLayout>} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <Suspense fallback={<LoadingScreen />}><AdminLayout /></Suspense>
          </ProtectedRoute>
        }
      >
        <Route index element={<Suspense fallback={<RouteFallback />}><AdminDashboard /></Suspense>} />
        <Route path="products" element={<Suspense fallback={<RouteFallback />}><AdminProducts /></Suspense>} />
        <Route path="categories" element={<Suspense fallback={<RouteFallback />}><AdminCategories /></Suspense>} />
        <Route path="ingredients" element={<Suspense fallback={<RouteFallback />}><AdminIngredients /></Suspense>} />
        <Route path="recipes" element={<Suspense fallback={<RouteFallback />}><AdminRecipes /></Suspense>} />
        <Route path="orders" element={<Suspense fallback={<RouteFallback />}><AdminOrders /></Suspense>} />
        <Route path="tables" element={<Suspense fallback={<RouteFallback />}><AdminTables /></Suspense>} />
        <Route path="payments" element={<Suspense fallback={<RouteFallback />}><AdminPayments /></Suspense>} />
        <Route path="employees" element={<Suspense fallback={<RouteFallback />}><AdminEmployees /></Suspense>} />
        <Route path="customers" element={<Suspense fallback={<RouteFallback />}><AdminCustomers /></Suspense>} />
        <Route path="suppliers" element={<Suspense fallback={<RouteFallback />}><AdminSuppliers /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<RouteFallback />}><AdminSettings /></Suspense>} />
        <Route path="reports" element={<Suspense fallback={<RouteFallback />}><AdminReports /></Suspense>} />
      </Route>

      <Route
        path="/staff"
        element={
          <ProtectedRoute roles={['ADMIN', 'STAFF']}>
            <Suspense fallback={<LoadingScreen />}><StaffLayout /></Suspense>
          </ProtectedRoute>
        }
      >
        <Route index element={<Suspense fallback={<RouteFallback />}><StaffDashboard /></Suspense>} />
        <Route path="orders" element={<Suspense fallback={<RouteFallback />}><StaffOrders /></Suspense>} />
        <Route path="products" element={<Suspense fallback={<RouteFallback />}><StaffProducts /></Suspense>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
