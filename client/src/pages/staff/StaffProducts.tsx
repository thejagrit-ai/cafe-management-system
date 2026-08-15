import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { productsApi } from '@/api/products'
import { categoriesApi } from '@/api/categories'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, cn } from '@/utils/lib'
import { Search, Coffee, Tag, PackageCheck, AlertCircle } from 'lucide-react'

export default function StaffProducts() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getActive(),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['staff-products', search, categoryFilter],
    queryFn: () =>
      productsApi.getAll({ search, categoryId: categoryFilter || undefined, limit: 100 }),
  })

  const products = data?.data || []
  const categories = categoriesData?.data || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">
              Catálogo de Barra & Cocina
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#7C4EEE]/10 text-[#7C4EEE] border border-[#7C4EEE]/20">
              {products.length} Productos
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Consulta rápida de disponibilidad, recetas y precios vigentes en el punto de venta.
          </p>
        </div>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar producto por nombre o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-card border-border/80 text-foreground placeholder:text-muted-foreground text-xs shadow-xs"
          />
        </div>

        {/* Category Selector */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-11 px-4 rounded-xl border border-border/80 bg-card text-foreground text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#7C4EEE] shadow-xs cursor-pointer"
        >
          <option value="">Todas las categorías ({categories.length})</option>
          {categories.map((cat: any) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Quick Category Filter Pills */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setCategoryFilter('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
              categoryFilter === ''
                ? 'bg-[#7C4EEE] text-white shadow-xs'
                : 'bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            }`}
          >
            Todos
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                categoryFilter === cat.id
                  ? 'bg-[#7C4EEE] text-white shadow-xs'
                  : 'bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-secondary/40'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border border-dashed border-border/80 text-muted-foreground text-xs space-y-2">
          <Coffee className="w-8 h-8 mx-auto text-muted-foreground/60" />
          <p className="font-semibold text-foreground">No se encontraron productos</p>
          <p className="text-[11px]">Intenta buscar con otros términos o cambia la categoría seleccionada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product: any) => {
            const isAvailable = product.availability === 'AVAILABLE'

            return (
              <div
                key={product.id}
                className={cn(
                  "p-4 rounded-2xl bg-card border border-border/80 flex items-center justify-between gap-4 transition-all hover:border-[#7C4EEE]/40 hover:shadow-card",
                  !isAvailable && 'opacity-65 bg-secondary/15'
                )}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-13 h-13 rounded-xl object-cover border border-border/60 shrink-0 bg-secondary/30"
                    />
                  ) : (
                    <div className="w-13 h-13 rounded-xl bg-[#7C4EEE]/10 border border-[#7C4EEE]/20 flex items-center justify-center text-[#7C4EEE] shrink-0">
                      <Coffee className="w-6 h-6 stroke-[1.75]" />
                    </div>
                  )}

                  <div className="min-w-0 space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate tracking-wider">
                      {product.category?.name || 'General'}
                    </span>
                    <h3 className="font-semibold text-sm text-foreground truncate" title={product.name}>
                      {product.name}
                    </h3>
                    <span className="text-sm font-bold text-[#7C4EEE] font-sans block">
                      {formatCurrency(Number(product.price))}
                    </span>
                  </div>
                </div>

                <Badge
                  className={cn(
                    "text-[10px] font-semibold shrink-0 uppercase border px-2 py-0.5 rounded-lg",
                    isAvailable
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                  )}
                >
                  {isAvailable ? 'Disponible' : 'Agotado'}
                </Badge>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}