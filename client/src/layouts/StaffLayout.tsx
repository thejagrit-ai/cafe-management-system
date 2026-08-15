import React from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/utils/lib'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  LogOut,
  Coffee,
  ChefHat
} from 'lucide-react'

export default function StaffLayout() {
  const { t } = useTranslation()
  const { logout, user } = useAuth()
  const location = useLocation()

  // Real-time SSE updates for live kitchen / staff console
  useRealtimeEvents()

  const sidebarLinks = [
    { href: '/staff', label: 'KDS Cocina', icon: LayoutDashboard },
    { href: '/staff/orders', label: 'Comandas', icon: ShoppingCart },
    { href: '/staff/products', label: 'Productos', icon: Package },
  ]

  return (
    <div className="flex min-h-screen bg-secondary/20 text-foreground font-sans transition-colors duration-200">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-card border-r border-border flex-col justify-between shrink-0 sticky top-0 h-screen">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-border/80 flex items-center justify-between">
            <Link to="/staff" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#7C4EEE] text-white flex items-center justify-center font-bold shadow-xs">
                <Coffee className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-base text-foreground block leading-tight">
                  Café Origen
                </span>
                <span className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground">
                  Consola Baristas
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="p-3.5 space-y-1.5">
            {sidebarLinks.map((link) => {
              const Icon = link.icon
              const isActive = location.pathname === link.href
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                    isActive
                      ? "bg-[#7C4EEE] text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Bottom Profile & Actions */}
        <div className="p-4 border-t border-border/80 space-y-3 bg-card">
          <div className="px-2">
            <p className="text-xs font-semibold text-foreground truncate">
              {user?.employee ? `${user.employee.firstName} ${user.employee.lastName || ''}` : user?.email}
            </p>
            <span className="text-[10px] text-[#7C4EEE] uppercase tracking-widest font-mono font-bold">
              Staff Activo
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-xl text-xs hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 transition-colors"
            onClick={() => logout()}
          >
            <LogOut className="h-3.5 w-3.5 mr-2" />
            <span>{t('navigation.logout')}</span>
          </Button>
        </div>
      </aside>

      {/* Main Screen Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-border/80 bg-card/90 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#7C4EEE] text-white flex items-center justify-center font-bold md:hidden shadow-xs">
              <ChefHat className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block md:hidden">
                Barista KDS
              </span>
              <span className="hidden md:inline text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Consola de Operaciones & Cocina
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <LanguageSwitcher showIcon={true} />
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden h-8 w-8 p-0 rounded-lg text-rose-600 hover:bg-rose-50"
              onClick={() => logout()}
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page Content with bottom padding on mobile */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 w-full overflow-y-auto pb-24 md:pb-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>

        {/* Mobile Bottom Navigation for Staff on Phones */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/80 shadow-lg px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-around max-w-md mx-auto">
            {sidebarLinks.map((link) => {
              const Icon = link.icon
              const isActive = location.pathname === link.href
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "flex flex-col items-center justify-center flex-1 py-1 relative transition-colors",
                    isActive
                      ? "text-[#7C4EEE] font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                  <span className="text-[10px] mt-1 leading-none font-medium">
                    {link.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}