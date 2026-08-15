import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Coffee, ShoppingBag, Sparkles, User } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { LoyaltyModal } from '@/components/LoyaltyModal'
import { cn } from '@/utils/lib'

export function MobileBottomNav() {
  const location = useLocation()
  const { itemCount } = useCart()
  const { isAuthenticated, user } = useAuth()

  // Hide bottom nav on admin, staff, or auth screens
  const isHidden = location.pathname.startsWith('/admin') || 
                   location.pathname.startsWith('/staff') ||
                   location.pathname.startsWith('/login') ||
                   location.pathname.startsWith('/register')

  if (isHidden) return null

  const getProfileLink = () => {
    if (!isAuthenticated) return '/login'
    if (user?.role === 'ADMIN') return '/admin'
    if (user?.role === 'STAFF') return '/staff'
    return '/orders'
  }

  const isHome = location.pathname === '/'
  const isMenu = location.pathname.startsWith('/menu')
  const isCart = location.pathname === '/cart' || location.pathname === '/checkout'
  const isProfile = location.pathname === '/orders' || location.pathname === '/account'

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/80 shadow-lg px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-5 items-center max-w-md mx-auto text-center">
        {/* 1. Home */}
        <Link
          to="/"
          className={cn(
            "flex flex-col items-center justify-center py-1 transition-all group",
            isHome ? "text-[#7C4EEE] dark:text-[#9A75F0]" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Home className={cn("w-5 h-5 transition-transform group-active:scale-90", isHome && "stroke-[2.5]")} />
          <span className={cn("text-[10px] mt-1 font-medium leading-none tracking-tight", isHome && "font-bold")}>
            Inicio
          </span>
        </Link>

        {/* 2. Menu */}
        <Link
          to="/menu"
          className={cn(
            "flex flex-col items-center justify-center py-1 transition-all group",
            isMenu ? "text-[#7C4EEE] dark:text-[#9A75F0]" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Coffee className={cn("w-5 h-5 transition-transform group-active:scale-90", isMenu && "stroke-[2.5]")} />
          <span className={cn("text-[10px] mt-1 font-medium leading-none tracking-tight", isMenu && "font-bold")}>
            Menú
          </span>
        </Link>

        {/* 3. Cart / Bag */}
        <Link
          to="/cart"
          className={cn(
            "flex flex-col items-center justify-center py-1 transition-all group relative",
            isCart ? "text-[#7C4EEE] dark:text-[#9A75F0]" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="relative">
            <ShoppingBag className={cn("w-5 h-5 transition-transform group-active:scale-90", isCart && "stroke-[2.5]")} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-2 h-4 min-w-4 px-1 rounded-full bg-[#7C4EEE] text-[10px] font-bold text-white flex items-center justify-center shadow-xs">
                {itemCount}
              </span>
            )}
          </div>
          <span className={cn("text-[10px] mt-1 font-medium leading-none tracking-tight", isCart && "font-bold")}>
            Bolsa
          </span>
        </Link>

        {/* 4. Loyalty Points (Modal Trigger styled identically) */}
        <LoyaltyModal>
          <button
            type="button"
            className="flex flex-col items-center justify-center py-1 text-muted-foreground hover:text-[#7C4EEE] transition-all group w-full"
          >
            <Sparkles className="w-5 h-5 transition-transform group-active:scale-90 text-amber-500" />
            <span className="text-[10px] mt-1 font-medium leading-none tracking-tight text-amber-600 dark:text-amber-400">
              Puntos
            </span>
          </button>
        </LoyaltyModal>

        {/* 5. Account / Orders */}
        <Link
          to={getProfileLink()}
          className={cn(
            "flex flex-col items-center justify-center py-1 transition-all group",
            isProfile ? "text-[#7C4EEE] dark:text-[#9A75F0]" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <User className={cn("w-5 h-5 transition-transform group-active:scale-90", isProfile && "stroke-[2.5]")} />
          <span className={cn("text-[10px] mt-1 font-medium leading-none tracking-tight", isProfile && "font-bold")}>
            {isAuthenticated ? 'Perfil' : 'Ingresar'}
          </span>
        </Link>
      </div>
    </nav>
  )
}
