import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { categoriesApi } from '@/api/categories'
import { Skeleton } from '@/components/ui/skeleton'
import { useReveal } from '@/hooks/useReveal'
import Separator from './Separator'

export default function Explore() {
  const { t } = useTranslation()
  const headerReveal = useReveal<HTMLDivElement>()
  const gridReveal = useReveal<HTMLDivElement>()

  const { data, isLoading } = useQuery({
    queryKey: ['home-categories'],
    queryFn: () => categoriesApi.getAll({ limit: 8, sortBy: 'sortOrder', sortOrder: 'asc' }),
  })

  const categories = (data?.data ?? []).filter((c) => c.isActive).slice(0, 6)

  return (
    <section className="py-20 xl:py-32 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6">
        <div ref={headerReveal} className="reveal flex flex-col items-center text-center">
          <span className="eyebrow">{t('landing.exploreEyebrow')}</span>
          <h2 className="h2 mt-3">{t('landing.exploreTitle')}</h2>
          <Separator className="mt-6" />
          <p className="lead mt-6 max-w-[560px] text-muted-foreground">
            {t('landing.exploreSubtitle')}
          </p>
        </div>

        <div
          ref={gridReveal}
          className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 reveal"
        >
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-xl" />
              ))
            : categories.map((category, index) => (
                <Link
                  key={category.id}
                  to={`/menu?category=${category.id}`}
                  className="on-dark group relative flex h-60 flex-col justify-end overflow-hidden rounded-2xl border border-border/80 bg-brand-ink p-7 text-white transition-all duration-500 hover:border-brand-gold hover:-translate-y-1.5 hover:shadow-2xl"
                  style={{ transitionDelay: `${index * 80}ms` }}
                >
                  {category.imageUrl ? (
                    <img
                      src={category.imageUrl}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover opacity-50 transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          'radial-gradient(ellipse at 70% 10%, rgba(199,161,122,0.30) 0%, transparent 60%)',
                      }}
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 group-hover:opacity-90" />

                  <div className="relative z-10">
                    <h3 className="font-serif text-2xl sm:text-[26px] font-bold leading-tight text-white group-hover:text-brand-gold transition-colors">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="mt-1.5 line-clamp-2 text-xs text-white/70">
                        {category.description}
                      </p>
                    )}
                    <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-gold">
                      <span>{category._count?.products ?? 0} ITEMS</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </span>
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </section>
  )
}
