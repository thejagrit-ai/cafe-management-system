import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { productsApi } from '@/api/products'
import { ProductCard } from '@/components/ProductCard'
import { Skeleton } from '@/components/ui/skeleton'
import { useReveal } from '@/hooks/useReveal'
import Separator from './Separator'

export default function MenuPreview() {
  const { t } = useTranslation()
  const headerReveal = useReveal<HTMLDivElement>()
  const gridReveal = useReveal<HTMLDivElement>()

  const { data, isLoading } = useQuery({
    queryKey: ['home-featured'],
    queryFn: () => productsApi.getFeatured(6),
  })

  const products = data?.data ?? []

  return (
    <section className="bg-secondary/40 py-20 xl:py-32 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6">
        <div ref={headerReveal} className="reveal flex flex-col items-center text-center">
          <span className="eyebrow">{t('landing.menuEyebrow')}</span>
          <h2 className="h2 mt-3">{t('landing.menuTitle')}</h2>
          <Separator className="mt-6" />
          <p className="lead mt-6 max-w-[560px] text-muted-foreground">
            {t('landing.menuSubtitle')}
          </p>
        </div>

        <div
          ref={gridReveal}
          className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 reveal"
        >
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[380px] rounded-2xl" />
              ))
            : products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>

        {!isLoading && products.length === 0 && (
          <p className="mt-10 text-center text-muted-foreground">{t('menu.noProductsFound')}</p>
        )}

        <div className="mt-14 flex justify-center">
          <Link to="/menu" className="btn-cafe-outline">
            {t('landing.menuCta')}
          </Link>
        </div>
      </div>
    </section>
  )
}
