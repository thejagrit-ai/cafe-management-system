import React, { useMemo, useState } from 'react'
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
import { CreditCard, MailCheck, Save, Send, ShieldCheck } from 'lucide-react'
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

const LOCAL_INTEGRATION_KEY = 'cafe_admin_frontend_integrations_v1'
const UPI_PATTERN = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/

type LocalIntegrations = {
  smtp: {
    host: string
    port: string
    secure: boolean
    username: string
    password: string
    fromName: string
    fromEmail: string
    testEmail: string
  }
  payment: {
    provider: string
    environment: 'test' | 'live'
    merchantName: string
    upiId: string
    keyId: string
    apiSecret: string
  }
}

const defaultIntegrations: LocalIntegrations = {
  smtp: {
    host: '',
    port: '587',
    secure: false,
    username: '',
    password: '',
    fromName: 'The Coffee Bean',
    fromEmail: '',
    testEmail: '',
  },
  payment: {
    provider: 'UPI',
    environment: 'test',
    merchantName: 'The Coffee Bean',
    upiId: '',
    keyId: '',
    apiSecret: '',
  },
}

function loadLocalIntegrations(): LocalIntegrations {
  if (typeof window === 'undefined') return defaultIntegrations
  try {
    const raw = localStorage.getItem(LOCAL_INTEGRATION_KEY)
    if (!raw) return defaultIntegrations
    const parsed = JSON.parse(raw)
    return {
      smtp: { ...defaultIntegrations.smtp, ...(parsed.smtp || {}) },
      payment: { ...defaultIntegrations.payment, ...(parsed.payment || {}) },
    }
  } catch {
    return defaultIntegrations
  }
}

export default function AdminSettings() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [localIntegrations, setLocalIntegrations] = useState<LocalIntegrations>(() => loadLocalIntegrations())

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

  const smtpReady = useMemo(() => {
    const port = Number(localIntegrations.smtp.port)
    return Boolean(
      localIntegrations.smtp.host.trim() &&
        Number.isInteger(port) &&
        port > 0 &&
        port <= 65535 &&
        z.string().email().safeParse(localIntegrations.smtp.username).success &&
        z.string().email().safeParse(localIntegrations.smtp.fromEmail).success &&
        z.string().email().safeParse(localIntegrations.smtp.testEmail).success
    )
  }, [localIntegrations.smtp])

  const saveLocalIntegrations = () => {
    localStorage.setItem(LOCAL_INTEGRATION_KEY, JSON.stringify(localIntegrations))
    toast.success('Frontend integration settings saved')
  }

  const testSmtpSettings = () => {
    if (!smtpReady) {
      toast.error('Fill valid SMTP host, port, sender, username, and test email')
      return
    }
    toast.success(`SMTP settings look valid for ${localIntegrations.smtp.host}:${localIntegrations.smtp.port}`)
  }

  const testPaymentSettings = () => {
    const upiId = localIntegrations.payment.upiId.trim()
    if (!UPI_PATTERN.test(upiId)) {
      toast.error('Enter a valid UPI ID, for example cafe@upi')
      return
    }
    const url = new URL('upi://pay')
    url.searchParams.set('pa', upiId)
    url.searchParams.set('pn', localIntegrations.payment.merchantName.trim() || 'Cafe')
    url.searchParams.set('am', '1.00')
    url.searchParams.set('cu', 'INR')
    window.location.href = url.toString()
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

        <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif font-bold text-base text-foreground flex items-center gap-2">
              <MailCheck className="h-4 w-4 text-[#7C4EEE]" />
              SMTP Email
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={testSmtpSettings} className="rounded-xl text-xs">
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Test
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">SMTP Host</Label>
              <Input value={localIntegrations.smtp.host} onChange={(e) => setLocalIntegrations((prev) => ({ ...prev, smtp: { ...prev.smtp, host: e.target.value } }))} placeholder="smtp.gmail.com" className="h-9 rounded-xl text-xs" />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Port</Label>
                <Input type="number" min={1} max={65535} value={localIntegrations.smtp.port} onChange={(e) => setLocalIntegrations((prev) => ({ ...prev, smtp: { ...prev.smtp, port: e.target.value } }))} className="h-9 rounded-xl text-xs font-mono" />
              </div>
              <label className="flex items-center gap-2 pt-6 text-xs font-semibold">
                <input type="checkbox" checked={localIntegrations.smtp.secure} onChange={(e) => setLocalIntegrations((prev) => ({ ...prev, smtp: { ...prev.smtp, secure: e.target.checked } }))} className="rounded accent-[#7C4EEE]" />
                SSL
              </label>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Username</Label>
              <Input type="email" value={localIntegrations.smtp.username} onChange={(e) => setLocalIntegrations((prev) => ({ ...prev, smtp: { ...prev.smtp, username: e.target.value } }))} placeholder="orders@cafe.com" className="h-9 rounded-xl text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Password / App Password</Label>
              <Input type="password" autoComplete="new-password" value={localIntegrations.smtp.password} onChange={(e) => setLocalIntegrations((prev) => ({ ...prev, smtp: { ...prev.smtp, password: e.target.value } }))} placeholder="••••••••" className="h-9 rounded-xl text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From Name</Label>
              <Input value={localIntegrations.smtp.fromName} onChange={(e) => setLocalIntegrations((prev) => ({ ...prev, smtp: { ...prev.smtp, fromName: e.target.value } }))} className="h-9 rounded-xl text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From Email</Label>
              <Input type="email" value={localIntegrations.smtp.fromEmail} onChange={(e) => setLocalIntegrations((prev) => ({ ...prev, smtp: { ...prev.smtp, fromEmail: e.target.value } }))} placeholder="orders@cafe.com" className="h-9 rounded-xl text-xs" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Test Email</Label>
              <Input type="email" value={localIntegrations.smtp.testEmail} onChange={(e) => setLocalIntegrations((prev) => ({ ...prev, smtp: { ...prev.smtp, testEmail: e.target.value } }))} placeholder="owner@cafe.com" className="h-9 rounded-xl text-xs" />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif font-bold text-base text-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              Payment Integration
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={testPaymentSettings} className="rounded-xl text-xs">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              Test UPI
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Provider</Label>
              <select value={localIntegrations.payment.provider} onChange={(e) => setLocalIntegrations((prev) => ({ ...prev, payment: { ...prev.payment, provider: e.target.value } }))} className="h-9 w-full rounded-xl border border-input bg-background px-3 text-xs">
                <option value="UPI">UPI Intent</option>
                <option value="Razorpay">Razorpay UPI</option>
                <option value="PhonePe">PhonePe</option>
                <option value="Paytm">Paytm</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Environment</Label>
              <select value={localIntegrations.payment.environment} onChange={(e) => setLocalIntegrations((prev) => ({ ...prev, payment: { ...prev.payment, environment: e.target.value as 'test' | 'live' } }))} className="h-9 w-full rounded-xl border border-input bg-background px-3 text-xs">
                <option value="test">Test</option>
                <option value="live">Live</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Merchant Name</Label>
              <Input value={localIntegrations.payment.merchantName} onChange={(e) => setLocalIntegrations((prev) => ({ ...prev, payment: { ...prev.payment, merchantName: e.target.value } }))} className="h-9 rounded-xl text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">UPI ID</Label>
              <Input value={localIntegrations.payment.upiId} onChange={(e) => setLocalIntegrations((prev) => ({ ...prev, payment: { ...prev.payment, upiId: e.target.value } }))} placeholder="cafe@upi" className="h-9 rounded-xl text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Gateway Key ID</Label>
              <Input value={localIntegrations.payment.keyId} onChange={(e) => setLocalIntegrations((prev) => ({ ...prev, payment: { ...prev.payment, keyId: e.target.value } }))} className="h-9 rounded-xl text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">API Secret</Label>
              <Input type="password" autoComplete="new-password" value={localIntegrations.payment.apiSecret} onChange={(e) => setLocalIntegrations((prev) => ({ ...prev, payment: { ...prev.payment, apiSecret: e.target.value } }))} placeholder="••••••••" className="h-9 rounded-xl text-xs" />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={saveLocalIntegrations}
            className="mr-3 rounded-xl px-6 h-11 text-xs font-semibold"
          >
            <Save className="w-4 h-4 mr-2" />
            <span>Save integrations</span>
          </Button>
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
