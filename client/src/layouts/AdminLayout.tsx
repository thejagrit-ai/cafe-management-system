import React, { useState } from 'react'
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
  Package,
  Tag,
  Boxes,
  BookOpen,
  ShoppingCart,
  CreditCard,
  Users,
  UserCheck,
  Truck,
  Settings,
  BarChart3,
  LogOut,
  Coffee,
  Menu,
  ChevronRight,
  QrCode
} from 'lucide-react'

export default function AdminLayout() {
  const { t } = useTranslation()
  const { logout, user } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Listen to live real-time server events (orders created/updated)
  useRealtimeEvents()

  const navigationGroups = [
    {
      group: t('admin.navPrincipal'),
      items: [
        { href: '/admin', label: t('admin.dashboard'), icon: LayoutDashboard },
      ]
    },
    {
      group: t('admin.navOperation'),
      items: [
        { href: '/admin/orders', label: t('admin.orders'), icon: ShoppingCart },
        { href: '/admin/tables', label: 'Mesas & QR', icon: QrCode },
        { href: '/admin/products', label: t('admin.products'), icon: Package },
        { href: '/admin/categories', label: t('admin.categories'), icon: Tag },
        { href: '/admin/ingredients', label: t('admin.inventory'), icon: Boxes },
        { href: '/admin/recipes', label: t('admin.recipes'), icon: BookOpen },
        { href: '/admin/suppliers', label: t('admin.suppliers'), icon: Truck },
      ]
    },
    {
      group: t('admin.navCustomers'),
      items: [
        { href: '/admin/customers', label: t('admin.customers'), icon: UserCheck },
        { href: '/admin/employees', label: t('admin.employees'), icon: Users },
      ]
    },
    {
      group: t('admin.navFinance'),
      items: [
        { href: '/admin/payments', label: t('admin.payments'), icon: CreditCard },
        { href: '/admin/reports', label: t('admin.reports'), icon: BarChart3 },
      ]
    },
    {
      group: t('admin.navSystem'),
      items: [
        { href: '/admin/settings', label: t('admin.settings'), icon: Settings },
      ]
    },
  ]

  const NavContent = () => (
    <div className="flex flex-col h-full justify-between">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-border/80 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#7C4EEE] text-white flex items-center justify-center font-bold shadow-xs">
              <Coffee className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-base text-foreground block leading-tight">
                Café Origen
              </span>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground">
                SaaS Admin
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-3.5 space-y-5 overflow-y-auto max-h-[calc(100vh-210px)] scrollbar-none">
          {navigationGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {group.group}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all",
                      isActive
                        ? "bg-[#7C4EEE] text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-muted-foreground")} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Profile & Actions */}
      <div className="p-4 border-t border-border/80 space-y-3 bg-card">
        <div className="px-2">
          <p className="text-xs font-semibold text-foreground truncate">
            {user?.email}
          </p>
          <span className="text-[10px] text-[#7C4EEE] uppercase font-bold tracking-wider">
            Administrador
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
    </div>
  )

  return (
    <div className="flex min-h-screen bg-secondary/20 text-foreground font-sans transition-colors duration-200">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-card border-r border-border flex-col shrink-0 sticky top-0 h-screen">
        <NavContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-card border-r border-border z-10 shadow-2xl">
            <NavContent />
          </div>
        </div>
      )}

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-border/80 bg-card/80 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-foreground hover:bg-secondary"
            >
              <Menu className="w-5 h-5" />
            </button>

            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:inline-block">
              {t('admin.panelTitle')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher showIcon={true} />
          </div>
        </header>

        {/* Routed Sub-pages */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full overflow-y-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}