import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation, Trans } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { categoriesApi } from '@/api/categories'
import type { Category } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, Edit2, Trash2, Tag, Coffee } from 'lucide-react'
import { toast } from 'sonner'

const categorySchema = z.object({
  name: z.string().min(1, 'validation.nameRequired'),
  description: z.string().optional(),
  sortOrder: z.number().min(0),
  isActive: z.boolean(),
})

type CategoryFormData = z.infer<typeof categorySchema>

export default function AdminCategories() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['categories', { search }],
    queryFn: () => categoriesApi.getAll({ search }),
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', description: '', sortOrder: 0, isActive: true },
  })

  const createMutation = useMutation({
    mutationFn: (data: CategoryFormData) => categoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success(t('adminCategories.created'))
      setDialogOpen(false)
      reset()
    },
    onError: (err: any) => toast.error(err.message || t('adminCategories.createError')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryFormData }) =>
      categoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success(t('adminCategories.updated'))
      setDialogOpen(false)
      setSelectedCategory(null)
      reset()
    },
    onError: (err: any) => toast.error(err.message || t('adminCategories.updateError')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success(t('adminCategories.deleted'))
      setDeleteDialogOpen(false)
      setSelectedCategory(null)
    },
    onError: (err: any) => toast.error(err.message || t('adminCategories.deleteError')),
  })

  const categories = data?.data ?? []

  const handleEdit = (cat: Category) => {
    setSelectedCategory(cat)
    setValue('name', cat.name)
    setValue('description', cat.description ?? '')
    setValue('sortOrder', cat.sortOrder)
    setValue('isActive', cat.isActive)
    setDialogOpen(true)
  }

  const handleDelete = (cat: Category) => {
    setSelectedCategory(cat)
    setDeleteDialogOpen(true)
  }

  const onSubmit = (formData: CategoryFormData) => {
    if (selectedCategory) {
      updateMutation.mutate({ id: selectedCategory.id, data: formData })
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
            {t('adminCategories.title')}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t('adminCategories.subtitle')}
          </p>
        </div>

        <Button
          onClick={() => {
            setSelectedCategory(null)
            reset({ name: '', description: '', sortOrder: 0, isActive: true })
            setDialogOpen(true)
          }}
          className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs font-semibold"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          <span>{t('adminCategories.newCategory')}</span>
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('adminCategories.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        {categories.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2 text-xs">
            <Tag className="w-8 h-8 mx-auto text-muted-foreground stroke-[1.5]" />
            <p className="font-semibold text-foreground text-sm">{t('adminCategories.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="p-4">{t('adminCategories.colCategory')}</th>
                  <th className="p-4">{t('adminCategories.colDescription')}</th>
                  <th className="p-4">{t('adminCategories.colLinkedProducts')}</th>
                  <th className="p-4">{t('adminCategories.colOrder')}</th>
                  <th className="p-4">{t('common.status')}</th>
                  <th className="p-4 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-4 font-semibold text-foreground flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-[#7C4EEE]" />
                      <span>{cat.name}</span>
                    </td>
                    <td className="p-4 text-muted-foreground max-w-xs truncate">
                      {cat.description || t('common.noDescription')}
                    </td>
                    <td className="p-4 font-mono font-medium text-foreground">
                      {t('adminCategories.itemsCount', { count: cat._count?.products || 0 })}
                    </td>
                    <td className="p-4 text-muted-foreground font-mono">{cat.sortOrder}</td>
                    <td className="p-4">
                      <Badge
                        className={
                          cat.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                            : 'bg-zinc-100 text-zinc-600 text-[10px]'
                        }
                      >
                        {cat.isActive ? t('adminCategories.activeF') : t('adminCategories.inactiveF')}
                      </Badge>
                    </td>
                    <td className="p-4 text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(cat)}
                        className="rounded-lg text-[11px] h-8 px-2.5"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        <span>{t('common.edit')}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(cat)}
                        className="rounded-lg text-[11px] h-8 px-2.5 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              {selectedCategory ? t('adminCategories.editCategory') : t('adminCategories.newCategory')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">{t('adminCategories.fieldName')}</Label>
              <Input {...register('name')} placeholder={t('adminCategories.fieldNamePlaceholder')} className="h-9 rounded-xl" />
              {errors.name && <p className="text-rose-500 text-[10px]">{t(errors.name.message as string)}</p>}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t('adminCategories.colDescription')}</Label>
              <Textarea
                {...register('description')}
                placeholder={t('adminCategories.fieldDescriptionPlaceholder')}
                className="rounded-xl min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t('adminCategories.fieldSortOrder')}</Label>
                <Input
                  type="number"
                  {...register('sortOrder', { valueAsNumber: true })}
                  className="h-9 rounded-xl"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('isActive')}
                    className="rounded accent-[#7C4EEE]"
                  />
                  <span className="text-xs">{t('adminCategories.activeToggle')}</span>
                </label>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="rounded-xl">
                {t('common.cancel')}
              </Button>
              <Button type="submit" size="sm" className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white">
                {t('adminCategories.save')}
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
              {t('adminCategories.deleteTitle')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            <Trans
              i18nKey="common.confirmDeleteNamed"
              values={{ name: selectedCategory?.name ?? '' }}
              components={{ strong: <strong className="text-foreground" /> }}
            />
          </p>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl">
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => selectedCategory && deleteMutation.mutate(selectedCategory.id)}
              className="rounded-xl"
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
