import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { suppliersApi } from '@/api/ingredients'
import type { Supplier } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, Edit2, ChevronLeft, ChevronRight, Truck, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'

const supplierSchema = z.object({
  name: z.string().min(1, 'El nombre del proveedor es obligatorio'),
  contactName: z.string().optional(),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean(),
})

type SupplierFormData = z.infer<typeof supplierSchema>

export default function AdminSuppliers() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const limit = 10

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', { page, limit, search }],
    queryFn: () => suppliersApi.getAll({ page, limit, search }),
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: '', contactName: '', email: '', phone: '', address: '', isActive: true },
  })

  const createMutation = useMutation({
    mutationFn: (data: SupplierFormData) => suppliersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Proveedor registrado')
      setDialogOpen(false)
      reset()
    },
    onError: (err: any) => toast.error(err.message || 'Error al guardar proveedor'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SupplierFormData }) =>
      suppliersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Proveedor actualizado')
      setDialogOpen(false)
      setSelectedSupplier(null)
      reset()
    },
    onError: (err: any) => toast.error(err.message || 'Error al actualizar proveedor'),
  })

  const suppliers = data?.data ?? []
  const pagination = data?.pagination

  const handleEdit = (s: Supplier) => {
    setSelectedSupplier(s)
    setValue('name', s.name)
    setValue('contactName', s.contactName ?? '')
    setValue('email', s.email ?? '')
    setValue('phone', s.phone ?? '')
    setValue('address', s.address ?? '')
    setValue('isActive', s.isActive)
    setDialogOpen(true)
  }

  const onSubmit = (formData: SupplierFormData) => {
    if (selectedSupplier) {
      updateMutation.mutate({ id: selectedSupplier.id, data: formData })
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
            Directorio de Proveedores
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Gestión de aliados comerciales para granos de café, lácteos y repostería.
          </p>
        </div>

        <Button
          onClick={() => {
            setSelectedSupplier(null)
            reset({ name: '', contactName: '', email: '', phone: '', address: '', isActive: true })
            setDialogOpen(true)
          }}
          className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs font-semibold"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          <span>Nuevo Proveedor</span>
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa o contacto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        {suppliers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2 text-xs">
            <Truck className="w-8 h-8 mx-auto text-muted-foreground stroke-[1.5]" />
            <p className="font-semibold text-foreground text-sm">No hay proveedores registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="p-4">Empresa Proveedora</th>
                  <th className="p-4">Persona de Contacto</th>
                  <th className="p-4">Canales de Contacto</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-4 font-semibold text-foreground">
                      {s.name}
                      {s.address && (
                        <span className="text-[10px] text-muted-foreground block font-normal">
                          {s.address}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-foreground font-medium">
                      {s.contactName || 'No registrado'}
                    </td>
                    <td className="p-4 space-y-0.5 text-muted-foreground">
                      {s.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-[#7C4EEE]" />
                          <span>{s.email}</span>
                        </div>
                      )}
                      {s.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{s.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge
                        className={
                          s.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                            : 'bg-zinc-100 text-zinc-600 text-[10px]'
                        }
                      >
                        {s.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(s)}
                        className="rounded-lg text-[11px] h-8 px-2.5"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        <span>Editar</span>
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
            Página {pagination.page} de {pagination.totalPages} ({pagination.total} proveedores)
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              {selectedSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Razón Social / Nombre de la Empresa</Label>
              <Input {...register('name')} placeholder="Ej. Granos del Huila S.A.S" className="h-9 rounded-xl" />
              {errors.name && <p className="text-rose-500 text-[10px]">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nombre del Asesor / Contacto</Label>
              <Input {...register('contactName')} placeholder="Ej. Carlos Mendoza" className="h-9 rounded-xl" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Correo Electrónico</Label>
                <Input type="email" {...register('email')} placeholder="ventas@proveedor.com" className="h-9 rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Teléfono</Label>
                <Input {...register('phone')} placeholder="+57 300 000 0000" className="h-9 rounded-xl" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Dirección / Ciudad</Label>
              <Input {...register('address')} placeholder="Zona Industrial, Manizales" className="h-9 rounded-xl" />
            </div>

            <div className="flex items-center pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('isActive')} className="rounded accent-[#7C4EEE]" />
                <span className="text-xs">Proveedor Activo</span>
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white">
                Guardar Proveedor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
