import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ingredientsApi } from '@/api/ingredients'
import type { Recipe } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Edit2, Trash2, BookOpen, Info } from 'lucide-react'
import { api } from '@/api/client'
import { toast } from 'sonner'

const recipeSchema = z.object({
  productId: z.string().min(1, 'El producto es obligatorio'),
  instructions: z.string().optional(),
  prepTime: z.number().int().min(0),
  cookTime: z.number().int().min(0),
  servings: z.number().int().min(1),
  ingredients: z
    .array(
      z.object({
        ingredientId: z.string().min(1, 'Ingrediente obligatorio'),
        quantity: z.number().min(0.01, 'Cantidad > 0'),
        unit: z.string().min(1, 'Unidad requerida'),
        notes: z.string().optional(),
      })
    )
    .min(1, 'Agrega al menos un ingrediente'),
})

type RecipeFormData = z.infer<typeof recipeSchema>

export default function AdminRecipes() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [search] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)

  const { data: recipesData, isLoading } = useQuery({
    queryKey: ['recipes', { search }],
    queryFn: () => api.get<Recipe[]>('/recipes', { search }),
  })

  const { data: ingredientsData } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => ingredientsApi.getAll(),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => api.get<any>('/products?limit=100'),
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      productId: '',
      instructions: '',
      prepTime: 1,
      cookTime: 2,
      servings: 1,
      ingredients: [{ ingredientId: '', quantity: 1, unit: 'gramos', notes: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'ingredients' })

  const createMutation = useMutation({
    mutationFn: (data: RecipeFormData) => api.post('/recipes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      toast.success('Receta creada con éxito')
      setDialogOpen(false)
      reset()
    },
    onError: (err: any) => toast.error(err.message || 'Error al guardar la receta'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RecipeFormData }) => api.put(`/recipes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      toast.success('Receta actualizada')
      setDialogOpen(false)
      setSelectedRecipe(null)
      reset()
    },
    onError: (err: any) => toast.error(err.message || 'Error al actualizar receta'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/recipes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      toast.success('Receta eliminada')
    },
  })

  const recipes = Array.isArray(recipesData?.data) ? recipesData.data : []
  const ingredientsList = ingredientsData?.data ?? []
  const rawProducts = productsData?.data
  const productsList = Array.isArray(rawProducts) ? rawProducts : (rawProducts as any)?.data || []

  const handleEdit = (recipe: Recipe) => {
    setSelectedRecipe(recipe)
    setValue('productId', recipe.productId)
    setValue('instructions', recipe.instructions || '')
    setValue('prepTime', recipe.prepTime)
    setValue('cookTime', recipe.cookTime)
    setValue('servings', recipe.servings)
    setValue(
      'ingredients',
      recipe.ingredients?.map((ri) => ({
        ingredientId: ri.ingredientId,
        quantity: Number(ri.quantity),
        unit: ri.unit,
        notes: ri.notes || '',
      })) || [{ ingredientId: '', quantity: 1, unit: 'gramos', notes: '' }]
    )
    setDialogOpen(true)
  }

  const onSubmit = (formData: RecipeFormData) => {
    if (selectedRecipe) {
      updateMutation.mutate({ id: selectedRecipe.id, data: formData })
    } else {
      createMutation.mutate(formData)
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
            Fórmulas & Recetas
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Composición de insumos y reglas de consumo automático de inventario.
          </p>
        </div>

        <Button
          onClick={() => {
            setSelectedRecipe(null)
            reset({
              productId: '',
              instructions: '',
              prepTime: 1,
              cookTime: 2,
              servings: 1,
              ingredients: [{ ingredientId: '', quantity: 1, unit: 'gramos', notes: '' }],
            })
            setDialogOpen(true)
          }}
          className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs font-semibold"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          <span>Nueva Receta</span>
        </Button>
      </div>

      {/* Info Notice */}
      <div className="p-4 rounded-2xl bg-[#7C4EEE]/5 border border-[#7C4EEE]/20 flex items-start gap-3 text-xs text-foreground">
        <Info className="w-4 h-4 text-[#7C4EEE] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {t('admin.recipeExplanation')} Cada vez que una orden pasa a estado confirmado, los ingredientes indicados son descontados del inventario en una única transacción de base de datos.
        </p>
      </div>

      {/* Recipes Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {recipes.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-2xl border border-border/80 bg-card text-muted-foreground space-y-2 text-xs">
            <BookOpen className="w-8 h-8 mx-auto stroke-[1.5]" />
            <p className="font-semibold text-foreground text-sm">No hay recetas registradas</p>
            <p>Vincula productos a ingredientes para activar la deducción automática.</p>
          </div>
        ) : (
          recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="p-5 rounded-2xl border border-border/80 bg-card flex flex-col justify-between space-y-4 hover:shadow-card transition-all"
            >
              <div>
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-serif font-bold text-base text-foreground">
                    {recipe.product?.name || 'Producto vinculado'}
                  </h3>
                  <Badge variant="outline" className="text-[10px]">
                    {recipe.servings} porción
                  </Badge>
                </div>

                <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Ingredientes requeridos:
                  </span>
                  <div className="space-y-1">
                    {recipe.ingredients?.map((ri) => (
                      <div key={ri.id} className="flex justify-between text-xs text-muted-foreground">
                        <span>{ri.ingredient?.name}</span>
                        <span className="font-semibold text-foreground font-mono">
                          {ri.quantity} {ri.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {recipe.instructions && (
                  <p className="text-[11px] text-muted-foreground mt-3 italic line-clamp-2">
                    "{recipe.instructions}"
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(recipe)}
                  className="rounded-lg text-xs h-8"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" />
                  <span>Editar</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(recipe.id)}
                  className="rounded-lg text-xs h-8 text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recipe Builder Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl rounded-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              {selectedRecipe ? 'Editar Receta' : 'Nueva Receta de Producto'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Producto del Menú</Label>
              <select
                {...register('productId')}
                className="w-full h-9 rounded-xl border border-input bg-card px-3 text-xs focus:outline-none"
              >
                <option value="">Selecciona el producto...</option>
                {productsList.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.category?.name || 'General'})
                  </option>
                ))}
              </select>
              {errors.productId && <p className="text-rose-500 text-[10px]">{errors.productId.message}</p>}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tiempo Prep (min)</Label>
                <Input type="number" {...register('prepTime', { valueAsNumber: true })} className="h-9 rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tiempo Cocción (min)</Label>
                <Input type="number" {...register('cookTime', { valueAsNumber: true })} className="h-9 rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Porciones</Label>
                <Input type="number" {...register('servings', { valueAsNumber: true })} className="h-9 rounded-xl" />
              </div>
            </div>

            {/* Dynamic Ingredients List */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Fórmula de Insumos / Ingredientes
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ ingredientId: '', quantity: 1, unit: 'gramos', notes: '' })}
                  className="rounded-lg text-[11px] h-7 px-2"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  <span>Añadir insumo</span>
                </Button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {fields.map((field, idx) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-center bg-secondary/30 p-2 rounded-xl border border-border/60">
                    <div className="col-span-5">
                      <select
                        {...register(`ingredients.${idx}.ingredientId`)}
                        className="w-full h-8 rounded-lg border border-input bg-card px-2 text-[11px]"
                      >
                        <option value="">Ingrediente...</option>
                        {ingredientsList.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3">
                      <Input
                        type="number"
                        step="any"
                        placeholder="Cant"
                        {...register(`ingredients.${idx}.quantity`, { valueAsNumber: true })}
                        className="h-8 rounded-lg text-xs"
                      />
                    </div>

                    <div className="col-span-3">
                      <Input
                        placeholder="Unidad"
                        {...register(`ingredients.${idx}.unit`)}
                        className="h-8 rounded-lg text-xs"
                      />
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Instrucciones de Preparación</Label>
              <Textarea
                {...register('instructions')}
                placeholder="Pasos para el barista o cocinero..."
                className="rounded-xl min-h-[60px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white">
                Guardar Receta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
