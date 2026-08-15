import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Search, ChevronLeft, ChevronRight, X, UtensilsCrossed } from 'lucide-react'
import { productsApi } from '@/api/products'
import { categoriesApi } from '@/api/categories'
import { ProductCard } from '@/components/ProductCard'
import { Skeleton } from '@/components/ui/skeleton'
import Separator from '@/components/home/Separator'
import { cn } from '@/utils/lib'
import type { Product } from '@/types'

const PAGE_SIZE = 9

export default function MenuPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  const tableParam = searchParams.get('table')
  const [activeTable, setActiveTable] = useState<string | null>(() => {
    return tableParam || sessionStorage.getItem('cafe_active_table')
  })

  useEffect(() => {
    if (tableParam) {
      sessionStorage.setItem('cafe_active_table', tableParam)
      setActiveTable(tableParam)
    }
  }, [tableParam])

  const categoryId = searchParams.get('category') ?? ''
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('featured')
  const [page, setPage] = useState(1)

  const { data: categoriesData } = useQuery({
    queryKey: ['menu-categories'],
    queryFn: () => categoriesApi.getAll({ limit: 50, sortBy: 'sortOrder', sortOrder: 'asc' }),
  })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['menu-products', { page, categoryId, search, sort }],
    queryFn: () =>
      productsApi.getAll({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        categoryId: categoryId || undefined,
        // `featured` is the default ordering and needs no sort parameters.
        ...(sort === 'priceAsc' ? { sortBy: 'price', sortOrder: 'asc' as const } : {}),
        ...(sort === 'priceDesc' ? { sortBy: 'price', sortOrder: 'desc' as const } : {}),
        ...(sort === 'name' ? { sortBy: 'name', sortOrder: 'asc' as const } : {}),
        ...(sort === 'featured' ? { sortBy: 'sortOrder', sortOrder: 'asc' as const } : {}),
      }),
  })

  const products: Product[] = data?.data ?? []
  const pagination = data?.pagination
  const categories = useMemo(
    () => (categoriesData?.data ?? []).filter((c) => c.isActive),
    [categoriesData]
  )

  const setCategory = (id: string) => {
    setPage(1)
    const newParams: Record<string, string> = {}
    if (id) newParams.category = id
    if (tableParam) newParams.table = tableParam
    setSearchParams(newParams)
  }

  const hasFilters = Boolean(search || categoryId)

  const clearFilters = () => {
    setSearch('')
    setPage(1)
    if (tableParam) {
      setSearchParams({ table: tableParam })
    } else {
      setSearchParams({})
    }
  }

  return (
    <div className="pb-24">
      {/* Page header */}
      <section className="on-dark bg-brand-ink py-20 text-center text-white">
        <div className="container mx-auto flex flex-col items-center">
          <span className="eyebrow">{t('menu.badge')}</span>
          <h1 className="h2 mt-3 text-white">{t('menu.title')}</h1>
          <Separator className="mt-6" />
          <p className="lead mt-6 max-w-[560px] text-white/70">{t('menu.subtitle')}</p>

          {/* Active Table Banner */}
          {activeTable && (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-gold text-brand-ink text-xs font-bold shadow-md animate-fade-in">
              <UtensilsCrossed className="w-4 h-4" />
              <span>Estás ordenando en Mesa #{activeTable}</span>
            </div>
          )}
        </div>
      </section>

      <div className="container mx-auto">
        {/* Filters */}
        <div className="py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder={t('menu.searchPlaceholder')}
                aria-label={t('menu.searchPlaceholder')}
                className="h-12 w-full rounded-sm border border-border bg-card pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand-gold"
              />
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="menu-sort" className="sr-only">
                {t('menu.sortBy')}
              </label>
              <select
                id="menu-sort"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value)
                  setPage(1)
                }}
                className="h-12 rounded-sm border border-border bg-card px-3 text-sm outline-none transition-colors focus:border-brand-gold"
              >
                <option value="featured">{t('menu.sortFeatured')}</option>
                <option value="priceAsc">{t('menu.sortPriceAsc')}</option>
                <option value="priceDesc">{t('menu.sortPriceDesc')}</option>
                <option value="name">{t('menu.sortName')}</option>
              </select>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex h-12 items-center gap-1.5 rounded-sm border border-border px-3 text-sm text-muted-foreground transition-colors hover:border-brand-gold hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  {t('menu.clearFilters')}
                </button>
              )}
            </div>
          </div>

          {/* Category pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory('')}
              className={cn(
                'px-4 py-2 text-[12px] uppercase tracking-[0.14em] transition-colors',
                !categoryId
                  ? 'bg-brand-gold text-brand-ink'
                  : 'border border-border text-muted-foreground hover:border-brand-gold hover:text-foreground'
              )}
            >
              {t('menu.allCategories')}
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategory(category.id)}
                className={cn(
                  'px-4 py-2 text-[12px] uppercase tracking-[0.14em] transition-colors',
                  categoryId === category.id
                    ? 'bg-brand-gold text-brand-ink'
                    : 'border border-border text-muted-foreground hover:border-brand-gold hover:text-foreground'
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {isError ? (
          <div className="py-24 text-center">
            <h2 className="font-serif text-2xl">{t('errors.genericTitle')}</h2>
            <p className="mt-2 text-muted-foreground">{t('errors.genericDesc')}</p>
            <button type="button" onClick={() => refetch()} className="btn-cafe mt-6">
              {t('errors.retryButton')}
            </button>
          </div>
        ) : isLoading ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <Skeleton key={i} className="h-[380px] rounded-sm" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-24 text-center">
            <h2 className="font-serif text-2xl">{t('menu.noProductsFound')}</h2>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="btn-cafe mt-6">
                {t('menu.clearFilters')}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-14 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-sm border border-border p-2.5 transition-colors hover:border-brand-gold disabled:opacity-40 disabled:hover:border-border"
                  aria-label={t('common.back')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="text-sm text-muted-foreground">
                  {pagination.page} / {pagination.totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="rounded-sm border border-border p-2.5 transition-colors hover:border-brand-gold disabled:opacity-40 disabled:hover:border-border"
                  aria-label={t('common.viewAll')}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
