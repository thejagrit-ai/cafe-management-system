import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { loyaltyApi } from '@/api/loyalty'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/utils/lib'
import { Award, Gift, Sparkles, Star, ChevronRight, CheckCircle2, TrendingUp, LogIn, UserPlus } from 'lucide-react'

export function LoyaltyModal({ children }: { children?: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['my-loyalty'],
    queryFn: () => loyaltyApi.getMyLoyalty(),
    enabled: !!user?.id && user?.role === 'CUSTOMER',
    retry: false
  })

  const loyalty = data?.data

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-semibold px-3 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{loyalty ? `${loyalty.points} Puntos` : 'Club Lealtad'}</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg rounded-2xl p-6 bg-card border-border shadow-2xl">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{loyalty?.tierDetails?.badge || '☕'}</span>
            <DialogTitle className="font-serif text-xl font-bold text-foreground">
              Programa de Lealtad Café Origin
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Gana puntos con cada compra y canjéalos por descuentos exclusivos y bebidas de cortesía.
          </p>
        </DialogHeader>

        {!isAuthenticated ? (
          <div className="py-6 space-y-4 text-center">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-xs">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-lg text-foreground">
                ¡Recibe 50 Puntos de Bienvenida!
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Crea tu cuenta o inicia sesión para comenzar a ganar beneficios, bebidas gratis y descuentos VIP.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link to="/login">
                <Button variant="outline" className="w-full rounded-xl text-xs h-10 font-semibold flex items-center justify-center gap-1.5">
                  <LogIn className="w-4 h-4" />
                  <span>Iniciar Sesión</span>
                </Button>
              </Link>
              <Link to="/register">
                <Button className="w-full rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs h-10 font-semibold shadow-xs flex items-center justify-center gap-1.5">
                  <UserPlus className="w-4 h-4" />
                  <span>Crear Cuenta</span>
                </Button>
              </Link>
            </div>
          </div>
        ) : isLoading ? (
          <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
            Cargando tus beneficios de lealtad...
          </div>
        ) : loyalty ? (
          <div className="space-y-5 pt-2">
            {/* Main Balance & Tier Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#7C4EEE] to-purple-800 text-white shadow-md relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/80 uppercase tracking-wider">
                  Nivel de Membresía
                </span>
                <Badge className="bg-white/20 hover:bg-white/30 text-white text-xs border-none font-bold">
                  {loyalty.tierDetails.badge} Nivel {loyalty.tierDetails.name}
                </Badge>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-sans tracking-tight">
                    {loyalty.points}
                  </span>
                  <span className="text-sm text-white/80 font-semibold">Puntos Acumulados</span>
                </div>
                <p className="text-xs text-white/70 mt-0.5">
                  Equivalen a <strong className="text-white">{formatCurrency(loyalty.monetaryValue)}</strong> en descuentos directos.
                </p>
              </div>

              {/* Next Tier Progress */}
              {loyalty.nextTier.nextTier && (
                <div className="mt-4 pt-3 border-t border-white/20 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-white/90">
                    <span>Progreso a Nivel {loyalty.nextTier.nextTier}</span>
                    <span className="font-bold">Faltan {loyalty.nextTier.pointsNeeded} pts</span>
                  </div>
                  <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${loyalty.nextTier.progressPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Current Tier Perks */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-[#7C4EEE]" />
                Tus Beneficios Activos
              </span>
              <div className="grid grid-cols-1 gap-2">
                {loyalty.tierDetails.perks.map((perk, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/40 border border-border/50 text-xs text-foreground"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{perk}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Points History */}
            {loyalty.transactions && loyalty.transactions.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/60">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#7C4EEE]" />
                  Historial de Puntos
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {loyalty.transactions.slice(0, 5).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/20 border border-border/40"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-semibold text-foreground truncate block">
                          {tx.description}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(tx.createdAt)}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-bold shrink-0 ${
                          tx.points > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                        }`}
                      >
                        {tx.points > 0 ? `+${tx.points}` : tx.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
