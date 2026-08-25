import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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
  currency: z.string().length(3, 'validation.currencyCode3'),
  deliveryFee: z.number().min(0),
  allowOutOfStockOrders: z.boolean(),
  openingTime: z.string().regex(TIME_PATTERN, 'validation.timeFormat').or(z.literal('')),
  closingTime: z.string().regex(TIME_PATTERN, 'validation.timeFormat').or(z.literal('')),
})

type SettingsFormData = z.infer<typeof settingsSchema>

export default function AdminSettings() {
  const { t } = useTranslation()
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
      toast.success(t('adminSettings.saved'))
    },
    onError: (err: any) => toast.error(err.message || t('adminSettings.saveError')),
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
          {t('adminSettings.title')}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {t('adminSettings.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-xs">
        {/* Business Identity */}
        <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
          <h2 className="font-serif font-bold text-base text-foreground">
            {t('adminSettings.hoursSection')}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">{t('adminSettings.openingTime')}</Label>
              <Input
                {...register('openingTime')}
                placeholder="07:00"
                className="h-9 rounded-xl text-xs font-mono"
              />
              {errors.openingTime && (
                <p className="text-rose-500 text-[10px]">{t(errors.openingTime.message as string)}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t('adminSettings.closingTime')}</Label>
              <Input
                {...register('closingTime')}
                placeholder="21:00"
                className="h-9 rounded-xl text-xs font-mono"
              />
              {errors.closingTime && (
                <p className="text-rose-500 text-[10px]">{t(errors.closingTime.message as string)}</p>
              )}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground">
            {t('adminSettings.hoursNote')}
          </p>
        </div>

        {/* Pricing & Taxes */}
        <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
          <h2 className="font-serif font-bold text-base text-foreground">
            {t('adminSettings.pricingSection')}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">{t('adminSettings.taxRate')}</Label>
              <Input
                type="number"
                step="any"
                {...register('taxRate', { valueAsNumber: true })}
                className="h-9 rounded-xl text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t('adminSettings.deliveryFee')}</Label>
              <Input
                type="number"
                step="any"
                {...register('deliveryFee', { valueAsNumber: true })}
                className="h-9 rounded-xl text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t('adminSettings.currencyCode')}</Label>
              <Input {...register('currency')} className="h-9 rounded-xl text-xs font-mono" />
              {errors.currency && (
                <p className="text-rose-500 text-[10px]">{t(errors.currency.message as string)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Operational Policies */}
        <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
          <h2 className="font-serif font-bold text-base text-foreground">
            {t('adminSettings.policiesSection')}
          </h2>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register('allowOutOfStockOrders')}
              className="mt-0.5 rounded accent-[#7C4EEE]"
            />
            <div>
              <span className="font-semibold text-foreground text-xs block">
                {t('adminSettings.allowOutOfStock')}
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t('adminSettings.allowOutOfStockHelp')}
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
            <span>{t('adminSettings.save')}</span>
          </Button>
        </div>
      </form>
    </div>
  )
}
