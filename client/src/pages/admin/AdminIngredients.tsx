import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ingredientsApi, type IngredientQueryParams, type StockAdjustmentData } from '@/api/ingredients'
import { suppliersApi } from '@/api/ingredients'
import type { Ingredient } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, cn } from '@/utils/lib'
import { Plus, Search, Edit2, Boxes, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'

const ingredientSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  sku: z.string().min(1, 'El SKU es obligatorio'),
  unit: z.string().min(1, 'La unidad es obligatoria'),
  currentStock: z.number().min(0, 'El stock no puede ser negativo'),
  minStock: z.number().min(0, 'El stock mínimo no puede ser negativo'),
  maxStock: z.number().min(0, 'El stock máximo no puede ser negativo'),
  costPerUnit: z.number().min(0, 'El costo no puede ser negativo'),
  supplierId: z.string().optional(),
  isActive: z.boolean(),
})

type IngredientFormData = z.infer<typeof ingredientSchema>

const stockAdjustmentSchema = z.object({
  type: z.enum([
    'STOCK_RECEIVED',
    'STOCK_ADDED',
    'STOCK_DEDUCTED',
    'MANUAL_ADJUSTMENT',
    'WASTE',
    'DAMAGED',
  ]),
  quantity: z.number().min(0.01, 'La cantidad debe ser mayor a 0'),
  unitCost: z.number().optional(),
  notes: z.string().optional(),
})

type StockAdjustmentFormData = z.infer<typeof stockAdjustmentSchema>

export default function AdminIngredients() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [lowStockFilter, setLowStockFilter] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [stockDialogOpen, setStockDialogOpen] = useState(false)
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)

  const queryParams: IngredientQueryParams = { search }
  if (lowStockFilter) queryParams.lowStock = true

  const { data, isLoading } = useQuery({
    queryKey: ['ingredients', queryParams],
    queryFn: () => ingredientsApi.getAll(queryParams),
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.getActive(),
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<IngredientFormData>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      name: '',
      sku: '',
      unit: 'gramos',
      currentStock: 0,
      minStock: 0,
      maxStock: 0,
      costPerUnit: 0,
      supplierId: '',
      isActive: true,
    },
  })

  const {
    register: registerStock,
    handleSubmit: handleStockSubmit,
    reset: resetStock,
    formState: { errors: stockErrors },
  } = useForm<StockAdjustmentFormData>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: { type: 'STOCK_RECEIVED', quantity: 0, notes: '' },
  })

  const createMutation = useMutation({
    mutationFn: (data: IngredientFormData) => ingredientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      toast.success('Ingrediente registrado')
      setDialogOpen(false)
      reset()
    },
    onError: (err: any) => toast.error(err.message || 'Error al guardar'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: IngredientFormData }) =>
      ingredientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      toast.success('Ingrediente actualizado')
      setDialogOpen(false)
      setSelectedIngredient(null)
      reset()
    },
    onError: (err: any) => toast.error(err.message || 'Error al actualizar'),
  })

  const adjustStockMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: StockAdjustmentData }) =>
      ingredientsApi.adjustStock(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      toast.success('Inventario ajustado correctamente')
      setStockDialogOpen(false)
      setSelectedIngredient(null)
      resetStock()
    },
    onError: (err: any) => toast.error(err.message || 'Error al ajustar stock'),
  })

  const ingredients = data?.data ?? []
  const suppliers = suppliersData?.data ?? []

  const handleEdit = (ing: Ingredient) => {
    setSelectedIngredient(ing)
    setValue('name', ing.name)
    setValue('sku', ing.sku)
    setValue('unit', ing.unit)
    setValue('currentStock', Number(ing.currentStock))
    setValue('minStock', Number(ing.minStock))
    setValue('maxStock', Number(ing.maxStock))
    setValue('costPerUnit', Number(ing.costPerUnit))
    setValue('supplierId', ing.supplierId ?? '')
    setValue('isActive', ing.isActive)
    setDialogOpen(true)
  }

  const handleStockAdjust = (ing: Ingredient) => {
    setSelectedIngredient(ing)
    resetStock()
    setStockDialogOpen(true)
  }

  const isLowStock = (ing: Ingredient) => ing.currentStock <= ing.minStock

  const onSubmit = (formData: IngredientFormData) => {
    if (selectedIngredient) {
      updateMutation.mutate({ id: selectedIngredient.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const onStockAdjust = (formData: StockAdjustmentFormData) => {
    if (selectedIngredient) {
      adjustStockMutation.mutate({ id: selectedIngredient.id, data: formData })
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
            Inventario & Materias Primas
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Control de existencias, ajustes de stock y catálogo de ingredientes.
          </p>
        </div>

        <Button
          onClick={() => {
            setSelectedIngredient(null)
            reset()
            setDialogOpen(true)
          }}
          className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs font-semibold"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          <span>Nuevo Ingrediente</span>
        </Button>
      </div>

      {/* Filter & Search */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl text-xs"
          />
        </div>

        <Tabs
          value={lowStockFilter ? 'low' : 'all'}
          onValueChange={(v) => setLowStockFilter(v === 'low')}
        >
          <TabsList className="rounded-xl p-1 bg-secondary/60">
            <TabsTrigger value="all" className="rounded-lg text-xs font-semibold">
              Todos ({ingredients.length})
            </TabsTrigger>
            <TabsTrigger value="low" className="rounded-lg text-xs font-semibold text-rose-600">
              Stock Bajo
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Ingredients Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        {ingredients.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2 text-xs">
            <Boxes className="w-8 h-8 mx-auto text-muted-foreground stroke-[1.5]" />
            <p className="font-semibold text-foreground text-sm">No se encontraron ingredientes</p>
            <p>Registra nuevos insumos para comenzar a descontar recetas automáticamente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="p-4">Ingrediente</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4">Existencia</th>
                  <th className="p-4">Mínimo / Máx</th>
                  <th className="p-4">Costo Unitario</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {ingredients.map((ing) => {
                  const low = isLowStock(ing)
                  return (
                    <tr key={ing.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="p-4 font-semibold text-foreground">
                        {ing.name}
                        {ing.supplier && (
                          <span className="text-[10px] text-muted-foreground block font-normal">
                            Prov: {ing.supplier.name}
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-muted-foreground">{ing.sku}</td>
                      <td className="p-4 font-bold font-sans">
                        <span className={cn(low ? "text-rose-600" : "text-foreground")}>
                          {ing.currentStock} {ing.unit}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {ing.minStock} / {ing.maxStock} {ing.unit}
                      </td>
                      <td className="p-4 font-sans text-foreground">
                        {formatCurrency(Number(ing.costPerUnit))}
                      </td>
                      <td className="p-4">
                        {low ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Stock bajo
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            Disponible
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStockAdjust(ing)}
                          className="rounded-lg text-[11px] h-8 px-2.5"
                        >
                          <ArrowUpDown className="w-3 h-3 mr-1" />
                          <span>Ajustar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(ing)}
                          className="rounded-lg text-[11px] h-8 px-2.5"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ingredient Create/Edit Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              {selectedIngredient ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Nombre del Ingrediente</Label>
                <Input {...register('name')} placeholder="Ej. Café Arábica Grano" className="h-9 rounded-xl" />
                {errors.name && <p className="text-rose-500 text-[10px]">{errors.name.message}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">SKU</Label>
                <Input {...register('sku')} placeholder="ING-001" className="h-9 rounded-xl" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Unidad de Medida</Label>
                <Input {...register('unit')} placeholder="gramos, ml, unidades" className="h-9 rounded-xl" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Stock Actual</Label>
                <Input type="number" step="any" {...register('currentStock', { valueAsNumber: true })} className="h-9 rounded-xl" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Stock Mínimo (Alerta)</Label>
                <Input type="number" step="any" {...register('minStock', { valueAsNumber: true })} className="h-9 rounded-xl" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Stock Máximo</Label>
                <Input type="number" step="any" {...register('maxStock', { valueAsNumber: true })} className="h-9 rounded-xl" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Costo Unitario ($)</Label>
                <Input type="number" step="any" {...register('costPerUnit', { valueAsNumber: true })} className="h-9 rounded-xl" />
              </div>

              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Proveedor Asignado</Label>
                <select
                  {...register('supplierId')}
                  className="w-full h-9 rounded-xl border border-input bg-card px-3 text-xs focus:outline-none"
                >
                  <option value="">Sin proveedor específico</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white">
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Modal */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              Ajustar Existencia · {selectedIngredient?.name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleStockSubmit(onStockAdjust)} className="space-y-4 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Tipo de Movimiento</Label>
              <select
                {...registerStock('type')}
                className="w-full h-9 rounded-xl border border-input bg-card px-3 text-xs focus:outline-none"
              >
                <option value="STOCK_RECEIVED">Entrada de Proveedor (STOCK_RECEIVED)</option>
                <option value="STOCK_ADDED">Adición Manual (+ Stock)</option>
                <option value="STOCK_DEDUCTED">Deducción Manual (- Stock)</option>
                <option value="MANUAL_ADJUSTMENT">Ajuste de Conteo Físico</option>
                <option value="WASTE">Merma / Desperdicio</option>
                <option value="DAMAGED">Insumo Dañado</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Cantidad ({selectedIngredient?.unit})</Label>
              <Input
                type="number"
                step="any"
                {...registerStock('quantity', { valueAsNumber: true })}
                className="h-9 rounded-xl"
              />
              {stockErrors.quantity && (
                <p className="text-rose-500 text-[10px]">{stockErrors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notas / Justificación</Label>
              <Textarea
                {...registerStock('notes')}
                placeholder="Motivo del ajuste..."
                className="rounded-xl resize-none min-h-[60px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setStockDialogOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white">
                Confirmar Ajuste
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
