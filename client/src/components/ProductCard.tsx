import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Coffee, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useCart } from '@/contexts/CartContext'
import { formatCurrency, cn } from '@/utils/lib'
import type { Product } from '@/types'

/** Menu card in the coffee-shop style: image, name, dotted leader, price. */
export function ProductCard({ product, className }: { product: Product; className?: string }) {
  const { t } = useTranslation()
  const { addItem } = useCart()

  const isUnavailable = product.availability === 'UNAVAILABLE'
  const isLimited = product.availability === 'LIMITED'

  const handleAdd = () => {
    addItem(product, 1)
    toast.success(t('menu.addedToCart'), { description: product.name })
  }

  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-sm border border-border bg-card transition-colors hover:border-brand-gold',
        isUnavailable && 'opacity-60',
        className
      )}
    >
      <Link
        to={`/menu/${product.id}`}
        className="relative block aspect-[4/3] overflow-hidden bg-secondary"
        tabIndex={isUnavailable ? -1 : undefined}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              backgroundImage:
                'radial-gradient(ellipse at 50% 30%, rgba(199,161,122,0.22) 0%, transparent 65%)',
            }}
          >
            <Coffee className="h-12 w-12 text-brand-gold/40" aria-hidden="true" />
          </div>
        )}

        {(isUnavailable || isLimited) && (
          <span
            className={cn(
              'absolute left-3 top-3 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em]',
              isUnavailable ? 'bg-brand-ink text-white' : 'bg-brand-gold text-brand-ink'
            )}
          >
            {isUnavailable ? t('menu.outOfStock') : t('menu.lowStock')}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-baseline gap-3">
          <Link to={`/menu/${product.id}`} className="min-w-0">
            <h3 className="truncate font-serif text-xl leading-tight transition-colors group-hover:text-brand-gold">
              {product.name}
            </h3>
          </Link>
          {/* Dotted leader running to the price, as on a printed menu. */}
          <span
            className="mt-1 h-px flex-1 self-center border-b border-dotted border-border"
            aria-hidden="true"
          />
          <span className="shrink-0 font-serif text-xl text-brand-gold">
            {formatCurrency(Number(product.price))}
          </span>
        </div>

        {product.description && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        )}

        <button
          type="button"
          onClick={handleAdd}
          disabled={isUnavailable}
          className="btn-cafe mt-5 w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          {isUnavailable ? t('menu.outOfStock') : t('menu.addToCart')}
        </button>
      </div>
    </article>
  )
}
