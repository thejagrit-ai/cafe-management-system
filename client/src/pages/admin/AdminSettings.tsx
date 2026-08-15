import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { settingsApi } from '@/api/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Save } from 'lucide-react'
import { toast } from 'sonner'

// Matches the BusinessSettings model. Fields the database does not have
// (name, address, phone, email, minOrderForDelivery, timezone) were previously
// submitted here and made every save fail server-side.
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

const settingsSchema = z.object({
  taxRate: z.number().min(0).max(100),
  currency: z.string().length(3, 'Use un código de 3 letras'),
  deliveryFee: z.number().min(0),
  allowOutOfStockOrders: z.boolean(),
  openingTime: z.string().regex(TIME_PATTERN, 'Formato HH:MM').or(z.literal('')),
  closingTime: z.string().regex(TIME_PATTERN, 'Formato HH:MM').or(z.literal('')),
})

type SettingsFormData = z.infer<typeof settingsSchema>

export default function AdminSettings() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    values: data?.data
      ? {
          taxRate: Number(data.data.taxRate),
          currency: data.data.currency,
          deliveryFee: Number(data.data.deliveryFee),
          allowOutOfStockOrders: data.data.allowOutOfStockOrders,
          openingTime: data.data.openingTime ?? '',
          closingTime: data.data.closingTime ?? '',
        }
      : undefined,
  })

  const updateMutation = useMutation({
    mutationFn: (formData: SettingsFormData) => settingsApi.update(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Configuración guardada correctamente')
    },
    onError: (err: any) => toast.error(err.message || 'Error al guardar configuración'),
  })

  const onSubmit = (formData: SettingsFormData) => {
    updateMutation.mutate(formData)
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="border-b border-border/60 pb-5">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">
          Configuración del Negocio
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Parámetros fiscales, tarifas de domicilio, datos de contacto y políticas operativas.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-xs">
        {/* Business Identity */}
        <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
          <h2 className="font-serif font-bold text-base text-foreground">
            Horario de Atención
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Hora de Apertura (HH:MM)</Label>
              <Input
                {...register('openingTime')}
                placeholder="07:00"
                className="h-9 rounded-xl text-xs font-mono"
              />
              {errors.openingTime && (
                <p className="text-rose-500 text-[10px]">{errors.openingTime.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Hora de Cierre (HH:MM)</Label>
              <Input
                {...register('closingTime')}
                placeholder="21:00"
                className="h-9 rounded-xl text-xs font-mono"
              />
              {errors.closingTime && (
                <p className="text-rose-500 text-[10px]">{errors.closingTime.message}</p>
              )}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground">
            Este horario se muestra en la página pública del café.
          </p>
        </div>

        {/* Pricing & Taxes */}
        <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
          <h2 className="font-serif font-bold text-base text-foreground">
            Tarifas, Impuestos & Moneda
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Impuesto IVA / Impoconsumo (%)</Label>
              <Input
                type="number"
                step="any"
                {...register('taxRate', { valueAsNumber: true })}
                className="h-9 rounded-xl text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Costo Base de Domicilio (COP)</Label>
              <Input
                type="number"
                step="any"
                {...register('deliveryFee', { valueAsNumber: true })}
                className="h-9 rounded-xl text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Código de Moneda</Label>
              <Input {...register('currency')} className="h-9 rounded-xl text-xs font-mono" />
              {errors.currency && (
                <p className="text-rose-500 text-[10px]">{errors.currency.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Operational Policies */}
        <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
          <h2 className="font-serif font-bold text-base text-foreground">
            Políticas Operativas
          </h2>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register('allowOutOfStockOrders')}
              className="mt-0.5 rounded accent-[#7C4EEE]"
            />
            <div>
              <span className="font-semibold text-foreground text-xs block">
                Permitir pedidos de productos sin stock registrado
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Si está desactivado, el sistema impedirá que los clientes agreguen al carrito productos marcados como agotados o sin insumos suficientes.
              </p>
            </div>
          </label>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white px-6 h-11 text-xs font-semibold shadow-sm hover:shadow-violet-glow transition-all"
          >
            <Save className="w-4 h-4 mr-2" />
            <span>Guardar Configuración</span>
          </Button>
        </div>
      </form>
    </div>
  )
}
