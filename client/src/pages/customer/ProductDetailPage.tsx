import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Coffee, Plus, Minus, Clock, Users } from 'lucide-react'
import { toast } from 'sonner'
import { productsApi } from '@/api/products'
import { useCart } from '@/contexts/CartContext'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, cn } from '@/utils/lib'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addItem } = useCart()

  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getById(id!),
    enabled: Boolean(id),
  })

  const product = data?.data

  if (isLoading) {
    return (
      <div className="container mx-auto py-16">
        <div className="grid gap-12 lg:grid-cols-2">
          <Skeleton className="aspect-square rounded-sm" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-14 w-40" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !product) {
    return (
      <div className="container mx-auto py-24 text-center">
        <h1 className="h3">{t('errors.pageNotFoundTitle')}</h1>
        <p className="mt-3 text-muted-foreground">{t('errors.pageNotFoundDesc')}</p>
        <Link to="/menu" className="btn-cafe mt-8">
          {t('checkout.backToMenu')}
        </Link>
      </div>
    )
  }

  const isUnavailable = product.availability === 'UNAVAILABLE'
  const isLimited = product.availability === 'LIMITED'
  const recipe = product.recipe

  const handleAdd = () => {
    addItem(product, quantity, notes || undefined)
    toast.success(t('menu.addedToCart'), { description: product.name })
    navigate('/cart')
  }

  return (
    <div className="container mx-auto py-12 xl:py-16">
      <Link
        to="/menu"
        className="mb-10 inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('checkout.backToMenu')}
      </Link>

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-sm bg-secondary">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{
                backgroundImage:
                  'radial-gradient(ellipse at 50% 35%, rgba(199,161,122,0.25) 0%, transparent 65%)',
              }}
            >
              <Coffee className="h-28 w-28 text-brand-gold/35" aria-hidden="true" />
            </div>
          )}

          {(isUnavailable || isLimited) && (
            <span
              className={cn(
                'absolute left-4 top-4 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em]',
                isUnavailable ? 'bg-brand-ink text-white' : 'bg-brand-gold text-brand-ink'
              )}
            >
              {isUnavailable ? t('menu.outOfStock') : t('menu.lowStock')}
            </span>
          )}
        </div>

        {/* Detail */}
        <div>
          {product.category && (
            <span className="eyebrow">{product.category.name}</span>
          )}

          <h1 className="h2 mt-3">{product.name}</h1>

          <p className="mt-5 font-serif text-4xl text-brand-gold">
            {formatCurrency(Number(product.price))}
          </p>

          {product.description && (
            <p className="lead mt-6 text-muted-foreground">{product.description}</p>
          )}

          {recipe && (recipe.prepTime > 0 || recipe.cookTime > 0 || recipe.servings > 0) && (
            <div className="mt-8 flex flex-wrap gap-6 border-y border-border py-5 text-sm">
              {recipe.prepTime + recipe.cookTime > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-brand-gold" aria-hidden="true" />
                  <span className="text-muted-foreground">
                    {recipe.prepTime + recipe.cookTime} min
                  </span>
                </div>
              )}
              {recipe.servings > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-brand-gold" aria-hidden="true" />
                  <span className="text-muted-foreground">
                    {t('common.quantity')}: {recipe.servings}
                  </span>
                </div>
              )}
            </div>
          )}

          {recipe?.ingredients && recipe.ingredients.length > 0 && (
            <div className="mt-8">
              <h2 className="font-serif text-xl">{t('menu.ingredients')}</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {recipe.ingredients.map((entry) => (
                  <li
                    key={entry.id}
                    className="border border-border px-3 py-1.5 text-sm text-muted-foreground"
                  >
                    {entry.ingredient?.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quantity + notes */}
          <div className="mt-10 space-y-5">
            <div className="flex items-center gap-4">
              <span className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
                {t('common.quantity')}
              </span>
              <div className="flex items-center border border-border">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="p-3 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                  aria-label={t('common.quantity')}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-12 text-center font-semibold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="p-3 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={t('common.quantity')}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="product-notes"
                className="text-sm uppercase tracking-[0.18em] text-muted-foreground"
              >
                {t('common.notes')} <span className="normal-case">({t('common.optional')})</span>
              </label>
              <textarea
                id="product-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('checkout.notesPlaceholder')}
                className="mt-2 w-full rounded-sm border border-border bg-card p-3 text-sm outline-none transition-colors focus:border-brand-gold"
              />
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={isUnavailable}
              className="btn-cafe w-full sm:w-auto"
            >
              {isUnavailable ? t('menu.outOfStock') : t('menu.addToCart')}
            </button>

            {isUnavailable && (
              <p className="text-sm text-muted-foreground">{t('menu.outOfStock')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
