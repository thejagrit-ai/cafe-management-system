import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Menu,
  X,
  ShoppingBag,
  User,
  LogOut,
  Coffee,
  ChevronDown,
  LayoutDashboard,
  UtensilsCrossed,
  Sparkles,
  Home,
  Receipt,
  ChevronRight,
  UserPlus,
  LogIn
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import { CartDrawer } from '@/components/CartDrawer'
import { LoyaltyModal } from '@/components/LoyaltyModal'
import { formatCurrency, cn } from '@/utils/lib'

export function Navbar() {
  const { t } = useTranslation()
  const { user, isAuthenticated, logout } = useAuth()
  const { itemCount, subtotal } = useCart()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const location = useLocation()

  const publicLinks = [
    { href: '/', label: t('navigation.home'), icon: Home },
    { href: '/menu', label: t('navigation.menu'), icon: Coffee },
    { href: '/orders', label: t('navigation.orders'), requiresAuth: true, icon: Receipt },
  ]

  const getDashboardLink = () => {
    if (user?.role === 'ADMIN') return '/admin'
    if (user?.role === 'STAFF') return '/staff'
    return '/account'
  }

  const getDashboardLabel = () => {
    if (user?.role === 'ADMIN') return t('navigation.adminPanel')
    if (user?.role === 'STAFF') return t('navigation.staffConsole')
    return t('navigation.account')
  }

  const isHome = location.pathname === '/'

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 w-full transition-all duration-200",
          isHome
            ? "bg-brand-ink/95 border-b border-white/10 text-white backdrop-blur-md"
            : "border-b border-border/70 bg-background/90 backdrop-blur-md"
        )}
      >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex h-16 sm:h-18 items-center justify-between gap-3">
            {/* Logo & Brand Name */}
            <Link
              to="/"
              className="flex items-center gap-2.5 group transition-transform active:scale-[0.98] shrink-0"
              onClick={() => setMobileDrawerOpen(false)}
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-ink border border-brand-gold/30 text-brand-gold flex items-center justify-center transition-colors duration-300 group-hover:bg-brand-gold group-hover:text-brand-ink shadow-xs shrink-0">
                <Coffee className="h-5 w-5 stroke-[1.75]" />
              </div>
              <div className="flex flex-col">
                <span
                  className={cn(
                    "font-serif text-lg sm:text-xl font-bold group-hover:text-brand-gold transition-colors leading-tight whitespace-nowrap",
                    isHome ? "text-white" : "text-foreground"
                  )}
                >
                  The Coffee Bean
                </span>
                <span
                  className={cn(
                    "text-[9px] sm:text-[10px] tracking-[0.2em] uppercase font-semibold leading-none mt-0.5 whitespace-nowrap",
                    isHome ? "text-white/60" : "text-muted-foreground"
                  )}
                >
                  Cafe · Roastery
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-7">
              {publicLinks.map((link) => {
                if (link.requiresAuth && (!isAuthenticated || user?.role !== 'CUSTOMER')) return null
                const isActive = location.pathname === link.href
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={cn(
                      "text-sm font-medium transition-colors relative py-1",
                      isActive
                        ? "text-brand-gold font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {link.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold" />
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              <LanguageSwitcher />

              {isAuthenticated && user?.role === 'CUSTOMER' && (
                <LoyaltyModal />
              )}

              {/* Cart Trigger */}
              <button
                type="button"
                onClick={() => setCartDrawerOpen(true)}
                className="relative flex items-center gap-2 p-2 px-3 rounded-full border border-border/80 bg-secondary/40 hover:bg-secondary transition-colors group"
                aria-label="Abrir carrito de compras"
              >
                <ShoppingBag className="h-4 w-4 text-foreground group-hover:text-brand-gold transition-colors" />
                {itemCount > 0 ? (
                  <span className="text-xs font-semibold text-foreground">
                    {formatCurrency(subtotal)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground font-medium">0</span>
                )}
                {itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-brand-gold text-[11px] font-bold text-brand-ink flex items-center justify-center shadow-xs">
                    {itemCount}
                  </span>
                )}
              </button>

              {/* User Menu / Auth */}
              {isAuthenticated ? (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 hover:bg-secondary text-sm font-medium"
                  >
                    <User className="h-4 w-4 text-brand-gold" />
                    <span className="max-w-[120px] truncate">
                      {user?.customer?.firstName || user?.employee?.firstName || user?.email.split('@')[0]}
                    </span>
                    <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", userMenuOpen && "rotate-180")} />
                  </Button>

                  {userMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-1.5 shadow-xl animate-fade-in z-50"
                      onMouseLeave={() => setUserMenuOpen(false)}
                    >
                      <div className="px-3 py-2 border-b border-border/60 mb-1">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {user?.customer ? `${user.customer.firstName} ${user.customer.lastName || ''}` : user?.email}
                        </p>
                        <span className="text-[11px] text-brand-gold font-medium uppercase tracking-wider">
                          {user?.role}
                        </span>
                      </div>

                      {user?.role === 'CUSTOMER' && (
                        <div className="p-1">
                          <LoyaltyModal>
                            <button
                              type="button"
                              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 transition-colors"
                              onClick={() => setUserMenuOpen(false)}
                            >
                              <span>Mis Puntos & Beneficios</span>
                              <span>✨</span>
                            </button>
                          </LoyaltyModal>
                        </div>
                      )}

                      <Link
                        to={getDashboardLink()}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-secondary text-foreground transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {user?.role === 'ADMIN' && <LayoutDashboard className="h-4 w-4 text-brand-gold" />}
                        {user?.role === 'STAFF' && <UtensilsCrossed className="h-4 w-4 text-brand-gold" />}
                        {user?.role === 'CUSTOMER' && <User className="h-4 w-4 text-brand-gold" />}
                        <span>{getDashboardLabel()}</span>
                      </Link>

                      {user?.role === 'CUSTOMER' && (
                        <Link
                          to="/orders"
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-secondary text-foreground transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                          <span>{t('navigation.orders')}</span>
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          logout()
                          setUserMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 transition-colors mt-1"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{t('navigation.logout')}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login">
                    <Button variant="ghost" size="sm" className="rounded-full text-sm font-medium">
                      {t('navigation.login')}
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm" className="rounded-full bg-brand-gold hover:bg-brand-gold-dark text-brand-ink text-sm font-medium shadow-xs">
                      {t('navigation.register')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Top Header Controls */}
            <div className="flex md:hidden items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setCartDrawerOpen(true)}
                className="relative p-2 rounded-xl border border-border/80 bg-secondary/40 text-foreground active:scale-95 transition-transform"
                aria-label="Abrir carrito"
              >
                <ShoppingBag className="h-4 w-4" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-brand-gold text-[10px] font-bold text-brand-ink flex items-center justify-center shadow-xs">
                    {itemCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="p-2 rounded-xl border border-border/80 bg-secondary/30 text-foreground hover:bg-secondary active:scale-95 transition-transform"
                aria-label="Toggle Navigation Drawer"
              >
                <Menu className="h-5 w-5 text-brand-gold" />
              </button>
            </div>
          </div>
        </div>

        {/* Full-Height Mobile Slide-Out Drawer (True Sidebar from Right) */}
        {mobileDrawerOpen && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[99999] md:hidden flex justify-end">
            {/* Backdrop overlay */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
              onClick={() => setMobileDrawerOpen(false)}
            />

            {/* Slide-out Drawer Panel */}
            <div className="relative w-[85%] max-w-sm bg-card border-l border-border/80 shadow-2xl h-full flex flex-col justify-between p-5 z-10 overflow-y-auto animate-in slide-in-from-right duration-300">
              
              <div className="space-y-6">
                {/* Drawer Header with Close Button */}
                <div className="flex items-center justify-between border-b border-border/70 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-brand-ink text-brand-gold flex items-center justify-center shadow-xs">
                      <Coffee className="h-4 w-4 stroke-[1.75]" />
                    </div>
                    <div>
                      <span className="font-serif font-bold text-base text-foreground block leading-none">
                        The Coffee Bean
                      </span>
                      <span className="text-[9px] tracking-[0.18em] uppercase text-muted-foreground font-semibold">
                        Menu & Lounge
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 transition-all"
                    aria-label="Cerrar Menú"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* User Card / Sign In & Sign Up Section */}
                {isAuthenticated ? (
                  <div className="p-4 rounded-2xl bg-secondary/40 border border-border/80 space-y-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-gold text-brand-ink flex items-center justify-center font-serif font-bold text-base shadow-xs">
                        {user?.customer?.firstName?.[0] || user?.employee?.firstName?.[0] || user?.email[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-serif font-bold text-sm text-foreground leading-tight truncate">
                          {user?.customer ? `${user.customer.firstName} ${user.customer.lastName || ''}` : user?.email}
                        </h4>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-brand-gold">
                          {user?.role === 'CUSTOMER' ? 'Cliente Preferencial' : user?.role}
                        </span>
                      </div>
                    </div>

                    {/* Loyalty points modal trigger */}
                    {user?.role === 'CUSTOMER' && (
                      <LoyaltyModal>
                        <button
                          type="button"
                          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-semibold hover:bg-amber-500/20 transition-all"
                          onClick={() => setMobileDrawerOpen(false)}
                        >
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span>Club de Lealtad & Beneficios</span>
                          </span>
                          <ChevronRight className="w-4 h-4 text-amber-500/70" />
                        </button>
                      </LoyaltyModal>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-secondary/30 border border-border/80 space-y-3.5 shadow-xs">
                    <div className="space-y-1">
                      <h4 className="font-serif font-bold text-sm text-foreground">
                        Bienvenido a The Coffee Bean
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Inicia sesión para ordenar en mesa y acumular puntos.
                      </p>
                    </div>

                    {/* Sleek Sign In & Sign Up Buttons */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <Link to="/login" onClick={() => setMobileDrawerOpen(false)}>
                        <Button
                          variant="outline"
                          className="w-full rounded-xl text-xs h-10 font-semibold border-border hover:bg-secondary flex items-center justify-center gap-1.5"
                        >
                          <LogIn className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{t('navigation.login')}</span>
                        </Button>
                      </Link>
                      <Link to="/register" onClick={() => setMobileDrawerOpen(false)}>
                        <Button
                          className="w-full rounded-xl bg-brand-gold hover:bg-brand-gold-dark text-brand-ink text-xs h-10 font-semibold shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{t('navigation.register')}</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Main Navigation Links */}
                <div className="space-y-1.5 font-sans">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
                    Navegación
                  </span>
                  
                  <Link
                    to="/"
                    onClick={() => setMobileDrawerOpen(false)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-colors",
                      location.pathname === '/' ? "bg-brand-gold/15 text-brand-gold font-bold" : "text-foreground hover:bg-secondary/60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Home className="w-4 h-4" />
                      <span>{t('navigation.home')}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                  </Link>

                  <Link
                    to="/menu"
                    onClick={() => setMobileDrawerOpen(false)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-colors",
                      location.pathname.startsWith('/menu') ? "bg-brand-gold/15 text-brand-gold font-bold" : "text-foreground hover:bg-secondary/60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Coffee className="w-4 h-4" />
                      <span>{t('navigation.menu')} (Carta Completa)</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                  </Link>

                  <Link
                    to="/cart"
                    onClick={() => setMobileDrawerOpen(false)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-colors",
                      location.pathname === '/cart' ? "bg-brand-gold/15 text-brand-gold font-bold" : "text-foreground hover:bg-secondary/60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="w-4 h-4" />
                      <span>Mi Carrito / Bolsa</span>
                    </div>
                    {itemCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-brand-gold text-[10px] font-bold text-brand-ink">
                        {itemCount} items ({formatCurrency(subtotal)})
                      </span>
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                    )}
                  </Link>

                  {/* Loyalty Modal Trigger */}
                  <LoyaltyModal>
                    <button
                      type="button"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold text-foreground hover:bg-secondary/60 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Club de Lealtad & Recompensas</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                    </button>
                  </LoyaltyModal>

                  {isAuthenticated && user?.role === 'CUSTOMER' && (
                    <Link
                      to="/orders"
                      onClick={() => setMobileDrawerOpen(false)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-colors",
                        location.pathname === '/orders' ? "bg-brand-gold/15 text-brand-gold font-bold" : "text-foreground hover:bg-secondary/60"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Receipt className="w-4 h-4" />
                        <span>Historial de Pedidos</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                    </Link>
                  )}

                  {/* Admin / Staff Dashboards */}
                  {user?.role === 'ADMIN' && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl text-xs font-semibold text-[#7C4EEE] bg-[#7C4EEE]/10 hover:bg-[#7C4EEE]/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Panel de Administración SaaS</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  {user?.role === 'STAFF' && (
                    <Link
                      to="/staff"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl text-xs font-semibold text-[#7C4EEE] bg-[#7C4EEE]/10 hover:bg-[#7C4EEE]/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <UtensilsCrossed className="w-4 h-4" />
                        <span>Consola Baristas & KDS</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Drawer Footer: Language + Theme + Logout */}
              <div className="pt-4 border-t border-border/80 space-y-3 mt-6 font-sans">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">Idioma & Tema</span>
                  <div className="flex items-center gap-2">
                    <LanguageSwitcher showIcon={true} />
                    <ThemeToggle />
                  </div>
                </div>

                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => {
                      logout()
                      setMobileDrawerOpen(false)
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('navigation.logout')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
      </header>

      {/* Slide-over Cart Drawer */}
      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
    </>
  )
}