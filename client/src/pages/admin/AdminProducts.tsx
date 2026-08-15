import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { productsApi, type ProductQueryParams } from '@/api/products'
import { categoriesApi } from '@/api/categories'
import type { Product } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, cn } from '@/utils/lib'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
  Coffee,
  UploadCloud,
  Link as LinkIcon,
  Image as ImageIcon,
  X,
  Check
} from 'lucide-react'
import { toast } from 'sonner'

const SAMPLE_PHOTOS = [
  { name: 'Americano', url: '/assets/products/americano.jpg' },
  { name: 'Cappuccino', url: '/assets/products/classic-cappuccino.jpg' },
  { name: 'Cold Brew', url: '/assets/products/cold-brew.jpg' },
  { name: 'Double Espresso', url: '/assets/products/double-espresso.jpg' },
  { name: 'Single Espresso', url: '/assets/products/single-espresso.jpg' },
  { name: 'Iced Coffee', url: '/assets/products/iced-coffee.jpg' },
  { name: 'Iced Caramel Latte', url: '/assets/products/iced-caramel-latte.jpg' },
  { name: 'Iced Mocha', url: '/assets/products/iced-mocha.jpg' },
  { name: 'Vanilla Latte', url: '/assets/products/vanilla-latte.jpg' },
  { name: 'Matcha Latte', url: '/assets/products/green-tea-latte.jpg' },
  { name: 'Chai Tea Latte', url: '/assets/products/chai-tea-latte.jpg' },
  { name: 'English Breakfast', url: '/assets/products/english-breakfast-tea.jpg' },
  { name: 'Butter Croissant', url: '/assets/products/butter-croissant.jpg' },
  { name: 'Blueberry Muffin', url: '/assets/products/blueberry-muffin.jpg' },
  { name: 'Cookie', url: '/assets/products/chocolate-chip-cookie.jpg' },
  { name: 'Avocado Toast', url: '/assets/products/avocado-toast.jpg' },
  { name: 'Club Sandwich', url: '/assets/products/turkey-club-sandwich.jpg' },
  { name: 'Mango Smoothie', url: '/assets/products/mango-tropical-smoothie.jpg' },
  { name: 'Berry Smoothie', url: '/assets/products/strawberry-banana-smoothie.jpg' },
]

const productSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  price: z.number().min(0.01, 'El precio debe ser mayor a 0'),
  categoryId: z.string().min(1, 'La categoría es obligatoria'),
  imageUrl: z.string().optional(),
  availability: z.enum(['AVAILABLE', 'UNAVAILABLE', 'LIMITED']),
  isFeatured: z.boolean(),
  isPopular: z.boolean(),
  sortOrder: z.number().min(0)
})

type ProductFormData = z.infer<typeof productSchema>

export default function AdminProducts() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [imageTab, setImageTab] = useState<'upload' | 'url' | 'presets'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const limit = 12

  const queryParams: ProductQueryParams = {
    page,
    limit,
    search,
    sortBy: 'sortOrder',
    sortOrder: 'asc'
  }
  if (categoryFilter) queryParams.categoryId = categoryFilter

  const { data, isLoading } = useQuery({
    queryKey: ['products', queryParams],
    queryFn: () => productsApi.getAll(queryParams)
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll()
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      categoryId: '',
      imageUrl: '',
      availability: 'AVAILABLE',
      isFeatured: false,
      isPopular: false,
      sortOrder: 0
    }
  })

  const currentImageUrl = watch('imageUrl')

  const createMutation = useMutation({
    mutationFn: (data: ProductFormData) => productsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['menu-products'] })
      toast.success('Producto creado con éxito')
      setDialogOpen(false)
      reset()
    },
    onError: (err: any) => toast.error(err.message || 'Error al crear producto')
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductFormData }) =>
      productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['menu-products'] })
      toast.success('Producto actualizado')
      setDialogOpen(false)
      setSelectedProduct(null)
      reset()
    },
    onError: (err: any) => toast.error(err.message || 'Error al actualizar producto')
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['menu-products'] })
      toast.success('Producto eliminado')
      setDeleteDialogOpen(false)
      setSelectedProduct(null)
    },
    onError: (err: any) => toast.error(err.message || 'Error al eliminar producto')
  })

  const products = data?.data ?? []
  const categories = categoriesData?.data ?? []
  const pagination = data?.pagination

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setValue('imageUrl', result, { shouldValidate: true })
      toast.success('Foto cargada correctamente')
    }
    reader.readAsDataURL(file)
  }

  const handleEdit = (prod: Product) => {
    setSelectedProduct(prod)
    setValue('name', prod.name)
    setValue('description', prod.description ?? '')
    setValue('price', Number(prod.price))
    setValue('categoryId', prod.categoryId)
    setValue('imageUrl', prod.imageUrl ?? '')
    setValue('availability', prod.availability)
    setValue('isFeatured', prod.isFeatured)
    setValue('isPopular', prod.isPopular)
    setValue('sortOrder', prod.sortOrder)
    setImageTab(prod.imageUrl?.startsWith('data:') ? 'upload' : prod.imageUrl?.startsWith('/assets/') ? 'presets' : 'url')
    setDialogOpen(true)
  }

  const handleDelete = (prod: Product) => {
    setSelectedProduct(prod)
    setDeleteDialogOpen(true)
  }

  const onSubmit = (formData: ProductFormData) => {
    const payload = {
      ...formData,
      imageUrl: formData.imageUrl?.trim() || null
    }
    if (selectedProduct) {
      updateMutation.mutate({ id: selectedProduct.id, data: payload as any })
    } else {
      createMutation.mutate(payload as any)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">
            Catálogo de Productos
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Administra fotos, precios, descripciones, categorías y disponibilidad del menú.
          </p>
        </div>

        <Button
          onClick={() => {
            setSelectedProduct(null)
            reset({
              name: '',
              description: '',
              price: 0,
              categoryId: categories[0]?.id || '',
              imageUrl: '',
              availability: 'AVAILABLE',
              isFeatured: false,
              isPopular: false,
              sortOrder: 0
            })
            setImageTab('presets')
            setDialogOpen(true)
          }}
          className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs font-semibold shadow-sm"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          <span>Nuevo Producto</span>
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl text-xs"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 px-3.5 rounded-xl border border-border bg-card text-xs font-medium focus:outline-none"
        >
          <option value="">Todas las Categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        {products.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2 text-xs">
            <Package className="w-8 h-8 mx-auto text-muted-foreground stroke-[1.5]" />
            <p className="font-semibold text-foreground text-sm">No se encontraron productos</p>
            <p>Comienza creando nuevos productos para mostrarlos en el menú público.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="p-4">Producto</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4">Precio</th>
                  <th className="p-4">Disponibilidad</th>
                  <th className="p-4">Etiquetas</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-11 h-11 rounded-xl object-cover border border-border/80 shrink-0 bg-secondary"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-secondary border border-border/80 flex items-center justify-center text-muted-foreground shrink-0">
                            <Coffee className="w-5 h-5 opacity-60" />
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-foreground block text-sm">
                            {prod.name}
                          </span>
                          {prod.description && (
                            <span className="text-[11px] text-muted-foreground line-clamp-1 max-w-xs">
                              {prod.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-foreground">
                      {prod.category?.name || 'Sin categoría'}
                    </td>
                    <td className="p-4 font-bold font-sans text-foreground text-sm">
                      {formatCurrency(Number(prod.price))}
                    </td>
                    <td className="p-4">
                      <Badge
                        className={cn(
                          "text-[10px] font-semibold",
                          prod.availability === 'AVAILABLE'
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                            : prod.availability === 'LIMITED'
                            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                            : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                        )}
                      >
                        {prod.availability === 'AVAILABLE' ? 'Disponible' : prod.availability === 'LIMITED' ? 'Limitado' : 'Agotado'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1.5">
                        {prod.isFeatured && (
                          <Badge className="bg-[#7C4EEE]/10 text-[#7C4EEE] border-[#7C4EEE]/20 text-[10px]">
                            Destacado
                          </Badge>
                        )}
                        {prod.isPopular && (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 text-[10px]">
                            Popular
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right space-x-1 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(prod)}
                        className="rounded-lg text-[11px] h-8 px-2.5 hover:bg-secondary"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1 text-[#7C4EEE]" />
                        <span>Editar</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(prod)}
                        className="rounded-lg text-[11px] h-8 px-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border/60 text-xs text-muted-foreground">
          <p>
            Página {pagination.page} de {pagination.totalPages} ({pagination.total} productos en total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-xl"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              <span>Anterior</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.totalPages}
              className="rounded-xl"
            >
              <span>Siguiente</span>
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-card border-border p-6 scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold">
              {selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs mt-2">
            {/* Name */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nombre del Producto *</Label>
              <Input
                {...register('name')}
                placeholder="Ej. Cappuccino Vainilla Francesa"
                className="h-10 rounded-xl"
              />
              {errors.name && <p className="text-rose-500 text-[10px]">{errors.name.message}</p>}
            </div>

            {/* Price & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Precio ($) *</Label>
                <Input
                  type="number"
                  step="any"
                  {...register('price', { valueAsNumber: true })}
                  className="h-10 rounded-xl"
                  placeholder="Ej. 5.50"
                />
                {errors.price && <p className="text-rose-500 text-[10px]">{errors.price.message}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Categoría *</Label>
                <select
                  {...register('categoryId')}
                  className="w-full h-10 rounded-xl border border-input bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#7C4EEE]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && <p className="text-rose-500 text-[10px]">{errors.categoryId.message}</p>}
              </div>
            </div>

            {/* Photo Section with Live Preview & Multi-Option Select */}
            <div className="p-4 rounded-2xl border border-border/80 bg-secondary/30 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#7C4EEE]" />
                  <span>Foto del Producto</span>
                </Label>
                {currentImageUrl && (
                  <button
                    type="button"
                    onClick={() => setValue('imageUrl', '')}
                    className="text-[11px] text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    <span>Quitar foto</span>
                  </button>
                )}
              </div>

              {/* Photo Preview */}
              {currentImageUrl ? (
                <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border bg-card group">
                  <img
                    src={currentImageUrl}
                    alt="Vista previa"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => setValue('imageUrl', '')}
                      className="rounded-lg h-8 text-xs"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      <span>Eliminar Foto</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-24 rounded-xl border border-dashed border-border/80 flex flex-col items-center justify-center text-muted-foreground bg-card/50">
                  <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                  <span className="text-[11px]">Sin foto seleccionada</span>
                </div>
              )}

              {/* Photo selection tabs */}
              <div className="grid grid-cols-3 gap-1 bg-secondary/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setImageTab('upload')}
                  className={cn(
                    "py-1.5 text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
                    imageTab === 'upload' ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Subir Foto</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab('url')}
                  className={cn(
                    "py-1.5 text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
                    imageTab === 'url' ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Pegar URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab('presets')}
                  className={cn(
                    "py-1.5 text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
                    imageTab === 'presets' ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>Galería Muestras</span>
                </button>
              </div>

              {/* Tab 1: Upload */}
              {imageTab === 'upload' && (
                <div className="space-y-2 pt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-11 rounded-xl border-dashed border-border hover:border-[#7C4EEE] hover:bg-[#7C4EEE]/5 text-xs flex items-center justify-center gap-2"
                  >
                    <UploadCloud className="w-4 h-4 text-[#7C4EEE]" />
                    <span>Seleccionar imagen desde tu computadora</span>
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Formatos admitidos: JPG, PNG, WEBP (Máx. 5MB)
                  </p>
                </div>
              )}

              {/* Tab 2: URL Input */}
              {imageTab === 'url' && (
                <div className="space-y-1 pt-1">
                  <Input
                    type="text"
                    placeholder="https://images.unsplash.com/... o /assets/products/..."
                    {...register('imageUrl')}
                    className="h-10 rounded-xl bg-card text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Pega un enlace web directo a la imagen.
                  </p>
                </div>
              )}

              {/* Tab 3: Preset Sample Gallery */}
              {imageTab === 'presets' && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] text-muted-foreground">
                    Haz clic en una foto de la colección del café para asignarla:
                  </p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1 border border-border/60 rounded-xl bg-card scrollbar-thin">
                    {SAMPLE_PHOTOS.map((photo, idx) => {
                      const isSelected = currentImageUrl === photo.url
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setValue('imageUrl', photo.url, { shouldValidate: true })}
                          title={photo.name}
                          className={cn(
                            "relative aspect-square rounded-lg overflow-hidden border transition-all group",
                            isSelected ? "border-[#7C4EEE] ring-2 ring-[#7C4EEE]/40" : "border-border/60 hover:border-[#7C4EEE]/60"
                          )}
                        >
                          <img
                            src={photo.url}
                            alt={photo.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#7C4EEE]/60 flex items-center justify-center text-white">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Descripción del Producto</Label>
              <Textarea
                {...register('description')}
                placeholder="Detalles sobre notas de sabor, preparación, ingredientes especiales..."
                className="rounded-xl min-h-[70px] text-xs"
              />
            </div>

            {/* Availability & Sort Order */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Disponibilidad</Label>
                <select
                  {...register('availability')}
                  className="w-full h-10 rounded-xl border border-input bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#7C4EEE]"
                >
                  <option value="AVAILABLE">Disponible</option>
                  <option value="LIMITED">Limitado</option>
                  <option value="UNAVAILABLE">Agotado</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Orden de Clasificación</Label>
                <Input
                  type="number"
                  {...register('sortOrder', { valueAsNumber: true })}
                  className="h-10 rounded-xl"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Flags */}
            <div className="flex flex-wrap gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  {...register('isFeatured')}
                  className="rounded accent-[#7C4EEE] w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-medium">Destacado en Menú Principal</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  {...register('isPopular')}
                  className="rounded accent-[#7C4EEE] w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-medium">Más Popular</span>
              </label>
            </div>

            <DialogFooter className="pt-3 border-t border-border/60 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white px-5 shadow-sm"
              >
                {selectedProduct ? 'Actualizar Producto' : 'Guardar Producto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-rose-600">
              ¿Eliminar producto?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            ¿Estás seguro de eliminar <strong className="text-foreground">{selectedProduct?.name}</strong>? Esta acción no se puede deshacer.
          </p>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => selectedProduct && deleteMutation.mutate(selectedProduct.id)}
              disabled={deleteMutation.isPending}
              className="rounded-xl"
            >
              Eliminar Definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

