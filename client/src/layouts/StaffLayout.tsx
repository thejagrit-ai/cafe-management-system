import React, { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ConsoleFooter } from '@/components/ConsoleFooter'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/utils/lib'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  LogOut,
  Coffee,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'

export default function StaffLayout() {
  const { t } = useTranslation()
  const { logout, user } = useAuth()
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cafe_staff_sidebar_collapsed') === 'true'
    }
    return false
  })

  // Real-time SSE updates for live kitchen / staff console
  useRealtimeEvents()

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('cafe_staff_sidebar_collapsed', String(next))
      return next
    })
  }

  const sidebarLinks = [
    { href: '/staff', label: t('staffNav.kds'), icon: LayoutDashboard },
    { href: '/staff/orders', label: t('staffNav.orders'), icon: ShoppingCart },
    { href: '/staff/products', label: t('staffNav.products'), icon: Package },
  ]

  return (
    <div className="flex h-screen w-full overflow-hidden bg-secondary/20 text-foreground font-sans transition-colors duration-200">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex bg-card border-r border-border flex-col justify-between shrink-0 h-full relative z-40 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Floating Edge Toggle Button */}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden md:flex absolute -right-3.5 top-5 z-50 w-7 h-7 rounded-full bg-card border border-border shadow-md text-muted-foreground hover:text-foreground hover:bg-secondary hover:scale-110 active:scale-95 transition-all items-center justify-center cursor-pointer"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4 text-[#7C4EEE]" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div>
          {/* Brand Header */}
          <div className={cn("border-b border-border/80 flex items-center transition-all duration-300", isCollapsed ? "p-3.5 justify-center" : "p-4")}>
            <Link to="/staff" className="flex items-center gap-2.5 min-w-0" title="The Coffee Bean KDS">
              <div className="w-9 h-9 rounded-xl bg-[#7C4EEE] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <Coffee className="h-5 w-5" />
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden min-w-0">
                  <span className="font-bold text-base text-foreground block leading-tight truncate">
                    The Coffee Bean
                  </span>
                  <span className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground block truncate">
                    {t('staffNav.brandTagline')}
                  </span>
                </div>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className={cn("space-y-1.5 transition-all duration-300", isCollapsed ? "p-2" : "p-3.5")}>
            {sidebarLinks.map((link) => {
              const Icon = link.icon
              const isActive = location.pathname === link.href

              if (isCollapsed) {
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    title={link.label}
                    className={cn(
                      "flex items-center justify-center w-11 h-11 mx-auto rounded-xl text-xs font-semibold transition-all",
                      isActive
                        ? "bg-[#7C4EEE] text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-muted-foreground")} />
                  </Link>
                )
              }

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
      </aside>

      {/* Main Screen Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-300">
        {/* Top Header */}
        <header className="h-16 shrink-0 border-b border-border/80 bg-card/90 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#7C4EEE] text-white flex items-center justify-center font-bold md:hidden shadow-xs">
              <ChefHat className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block md:hidden">
                {t('staffNav.mobileTitle')}
              </span>
              <span className="hidden md:inline text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('staffNav.headerTitle')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-800 transition-all flex items-center gap-1.5 shadow-2xs"
              onClick={() => logout()}
              title={t('navigation.logout')}
            >
              <LogOut className="h-3.5 w-3.5 text-rose-600" />
              <span className="hidden sm:inline">{t('navigation.logout')}</span>
            </Button>
          </div>
        </header>

        {/* Page Content with bottom padding on mobile */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 w-full overflow-y-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>

        {/* Extra bottom padding on phones clears the fixed nav bar below. */}
        <div className="pb-20 md:pb-0">
          <ConsoleFooter />
        </div>

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