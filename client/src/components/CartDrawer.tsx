import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, cn } from '@/utils/lib'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

/** Slide-over cart, opened from the navbar. */
export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { t } = useTranslation()
  const { items, subtotal, itemCount, updateQuantity, removeItem } = useCart()
  const { isAuthenticated } = useAuth()

  // Close on Escape and lock background scrolling while the panel is open.
  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, onClose])

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-50 bg-brand-ink/60 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('navigation.cart')}
        className={cn(
          'theme-cafe fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-2xl transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <header className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="font-serif text-2xl text-foreground">{t('navigation.cart')}</h2>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {itemCount} {itemCount === 1 ? t('common.item') : t('common.items')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingBag className="h-12 w-12 text-brand-gold/40" />
            <p className="text-muted-foreground">{t('cart.empty')}</p>
            <Link to="/menu" onClick={onClose} className="btn-cafe mt-2">
              {t('home.exploreMenu')}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 divide-y divide-border overflow-y-auto px-6">
              {items.map((entry) => (
                <div key={entry.product.id} className="flex gap-4 py-5">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-sm bg-secondary">
                    {entry.product.imageUrl ? (
                      <img
                        src={entry.product.imageUrl}
                        alt={entry.product.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-brand-gold/50">
                        <ShoppingBag className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-serif text-lg leading-tight text-foreground">
                      {entry.product.name}
                    </h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {formatCurrency(Number(entry.product.price))}
                    </p>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex items-center border border-border">
                        <button
                          type="button"
                          onClick={() => updateQuantity(entry.product.id, entry.quantity - 1)}
                          className="p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={t('common.quantity')}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-8 text-center text-sm font-semibold">
                          {entry.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(entry.product.id, entry.quantity + 1)}
                          className="p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={t('common.quantity')}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(entry.product.id)}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="shrink-0 text-right font-semibold">
                    {formatCurrency(Number(entry.product.price) * entry.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <footer className="space-y-4 border-t border-border px-6 py-5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
                  {t('common.subtotal')}
                </span>
                <span className="font-serif text-2xl">{formatCurrency(subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t('cart.taxesAtCheckout')}</p>

              <Link
                to={isAuthenticated ? '/checkout' : '/login'}
                onClick={onClose}
                className="btn-cafe w-full"
              >
                {isAuthenticated ? t('checkout.title') : t('navigation.login')}
              </Link>
              <Link
                to="/cart"
                onClick={onClose}
                className="block text-center text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
              >
                {t('cart.viewCart')}
              </Link>
            </footer>
          </>
        )}
      </aside>
    </>
  )
}
