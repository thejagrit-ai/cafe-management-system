import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Coffee, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { formatCurrency } from '@/utils/lib'
import Separator from '@/components/home/Separator'

export default function CartPage() {
  const { t } = useTranslation()
  const { items, subtotal, itemCount, updateQuantity, removeItem, clearCart } = useCart()

  if (items.length === 0) {
    return (
      <div className="container mx-auto flex flex-col items-center py-28 text-center">
        <ShoppingBag className="h-16 w-16 text-brand-gold/40" aria-hidden="true" />
        <h1 className="h3 mt-6">{t('cart.empty')}</h1>
        <p className="mt-3 max-w-md text-muted-foreground">{t('cart.emptyDesc')}</p>
        <Link to="/menu" className="btn-cafe mt-8">
          {t('home.exploreMenu')}
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-12 xl:py-16">
      <Link
        to="/menu"
        className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('cart.continueShopping')}
      </Link>

      <div className="mt-8 flex flex-col items-center text-center">
        <h1 className="h2">{t('cart.title')}</h1>
        <Separator className="mt-5" />
        <p className="mt-4 text-sm uppercase tracking-[0.18em] text-muted-foreground">
          {itemCount} {itemCount === 1 ? t('common.item') : t('common.items')}
        </p>
      </div>

      <div className="mt-14 grid gap-12 lg:grid-cols-3">
        {/* Lines */}
        <div className="lg:col-span-2">
          <ul className="divide-y divide-border border-y border-border">
            {items.map((entry) => (
              <li key={entry.product.id} className="flex gap-5 py-6">
                <Link
                  to={`/menu/${entry.product.id}`}
                  className="h-24 w-24 shrink-0 overflow-hidden rounded-sm bg-secondary"
                >
                  {entry.product.imageUrl ? (
                    <img
                      src={entry.product.imageUrl}
                      alt={entry.product.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Coffee className="h-8 w-8 text-brand-gold/40" aria-hidden="true" />
                    </div>
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link to={`/menu/${entry.product.id}`}>
                    <h2 className="font-serif text-xl leading-tight transition-colors hover:text-brand-gold">
                      {entry.product.name}
                    </h2>
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatCurrency(Number(entry.product.price))}
                  </p>
                  {entry.notes && (
                    <p className="mt-2 text-sm italic text-muted-foreground">“{entry.notes}”</p>
                  )}

                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex items-center border border-border">
                      <button
                        type="button"
                        onClick={() => updateQuantity(entry.product.id, entry.quantity - 1)}
                        className="p-2 text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={t('common.quantity')}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-10 text-center text-sm font-semibold">
                        {entry.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(entry.product.id, entry.quantity + 1)}
                        className="p-2 text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={t('common.quantity')}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(entry.product.id)}
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t('cart.remove')}
                    </button>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="font-serif text-xl text-brand-gold">
                    {formatCurrency(Number(entry.product.price) * entry.quantity)}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={clearCart}
            className="mt-6 text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-destructive"
          >
            {t('common.delete')}
          </button>
        </div>

        {/* Summary */}
        <aside className="lg:col-span-1">
          <div className="sticky top-28 border border-border p-7">
            <h2 className="font-serif text-2xl">{t('checkout.orderSummary')}</h2>

            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('common.subtotal')}</dt>
                <dd className="font-semibold">{formatCurrency(subtotal)}</dd>
              </div>
            </dl>

            <p className="mt-4 text-xs text-muted-foreground">{t('cart.taxesAtCheckout')}</p>

            <Link to="/checkout" className="btn-cafe mt-7 w-full">
              {t('cart.proceedToCheckout')}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
