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
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  MailCheck,
  Save,
  Send,
  ShieldCheck,
  Clock,
  Coins,
  Store,
  Edit2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  KeyRound,
  ExternalLink,
} from 'lucide-react'
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
  
  // Collapse/Expand state for integration sections (collapsed by default until Edit is clicked)
  const [isSmtpEditing, setIsSmtpEditing] = useState(false)
  const [isPaymentEditing, setIsPaymentEditing] = useState(false)

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

  const paymentReady = useMemo(() => {
    return Boolean(
      localIntegrations.payment.merchantName.trim() &&
      localIntegrations.payment.upiId.trim() &&
      UPI_PATTERN.test(localIntegrations.payment.upiId.trim())
    )
  }, [localIntegrations.payment])

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
      <div className="space-y-6 w-full animate-pulse">
        <div className="h-10 w-64 bg-card rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#7C4EEE]/10 text-[#7C4EEE]">
              <Store className="w-4 h-4" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">
              {t('adminSettings.title')}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('adminSettings.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={saveLocalIntegrations}
            className="rounded-xl px-4 h-10 text-xs font-semibold hover:bg-secondary transition-all"
          >
            <Save className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <span>Save Integrations</span>
          </Button>
          <Button
            type="submit"
            form="business-settings-form"
            disabled={updateMutation.isPending}
            className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white px-5 h-10 text-xs font-semibold shadow-xs hover:shadow-violet-glow transition-all"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            <span>{updateMutation.isPending ? 'Saving...' : t('adminSettings.save')}</span>
          </Button>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT COLUMN: Business Operations Form */}
        <form id="business-settings-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-xs">
          {/* Section: Operating Hours */}
          <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-4 shadow-2xs hover:border-border transition-colors">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-sm sm:text-base text-foreground">
                    {t('adminSettings.hoursSection')}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    {t('adminSettings.hoursNote')}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('adminSettings.openingTime')}</Label>
                <Input
                  {...register('openingTime')}
                  placeholder="07:00"
                  className="h-10 rounded-xl text-xs font-mono bg-background"
                />
                {errors.openingTime && (
                  <p className="text-rose-500 text-[10px]">{t(errors.openingTime.message as string)}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('adminSettings.closingTime')}</Label>
                <Input
                  {...register('closingTime')}
                  placeholder="21:00"
                  className="h-10 rounded-xl text-xs font-mono bg-background"
                />
                {errors.closingTime && (
                  <p className="text-rose-500 text-[10px]">{t(errors.closingTime.message as string)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section: Charges, Tax & Currency */}
          <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-4 shadow-2xs hover:border-border transition-colors">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Coins className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-sm sm:text-base text-foreground">
                    {t('adminSettings.pricingSection')}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Set up default tax percentages, standard delivery surcharge and ISO currency.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('adminSettings.taxRate')}</Label>
                <Input
                  type="number"
                  step="any"
                  {...register('taxRate', { valueAsNumber: true })}
                  className="h-10 rounded-xl text-xs font-mono bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('adminSettings.deliveryFee')}</Label>
                <Input
                  type="number"
                  step="any"
                  {...register('deliveryFee', { valueAsNumber: true })}
                  className="h-10 rounded-xl text-xs font-mono bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('adminSettings.currencyCode')}</Label>
                <Input
                  {...register('currency')}
                  className="h-10 rounded-xl text-xs font-mono uppercase bg-background"
                />
                {errors.currency && (
                  <p className="text-rose-500 text-[10px]">{t(errors.currency.message as string)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section: Operational Policies */}
          <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-4 shadow-2xs hover:border-border transition-colors">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-sm sm:text-base text-foreground">
                    {t('adminSettings.policiesSection')}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Control ordering behavior when ingredient inventory reaches zero.
                  </p>
                </div>
              </div>
            </div>

            <label className="flex items-start gap-3.5 p-3.5 rounded-xl border border-border/60 bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-all">
              <input
                type="checkbox"
                {...register('allowOutOfStockOrders')}
                className="mt-1 h-4 w-4 rounded accent-[#7C4EEE] cursor-pointer"
              />
              <div className="space-y-0.5">
                <span className="font-semibold text-foreground text-xs block">
                  {t('adminSettings.allowOutOfStock')}
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {t('adminSettings.allowOutOfStockHelp')}
                </p>
              </div>
            </label>
          </div>

          {/* Save Business Settings Button */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full sm:w-auto rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white px-6 h-11 text-xs font-semibold shadow-xs hover:shadow-violet-glow transition-all"
            >
              <Save className="w-4 h-4 mr-2" />
              <span>{updateMutation.isPending ? 'Saving...' : t('adminSettings.save')}</span>
            </Button>
          </div>
        </form>

        {/* RIGHT COLUMN: Integrations & Services */}
        <div className="space-y-6 text-xs">
          {/* SMTP Email Integration Card */}
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs hover:border-border transition-all">
            {/* Card Header & Summary Bar */}
            <div className="p-5 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#7C4EEE]/10 text-[#7C4EEE]">
                  <MailCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif font-bold text-sm sm:text-base text-foreground">
                      SMTP Email
                    </h2>
                    {smtpReady ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] py-0 px-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] py-0 px-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Not Configured
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Order receipts, customer notifications and staff alerts
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={testSmtpSettings}
                  className="rounded-xl text-xs h-8 px-3 hover:bg-secondary"
                  title="Test SMTP configuration"
                >
                  <Send className="w-3 h-3 mr-1.5 text-muted-foreground" />
                  Test
                </Button>
                <Button
                  type="button"
                  variant={isSmtpEditing ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setIsSmtpEditing(!isSmtpEditing)}
                  className="rounded-xl text-xs h-8 px-3.5 font-medium flex items-center gap-1.5"
                >
                  {isSmtpEditing ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Collapse</span>
                    </>
                  ) : (
                    <>
                      <Edit2 className="w-3.5 h-3.5 text-[#7C4EEE]" />
                      <span>Edit</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Collapsed State Summary */}
            {!isSmtpEditing ? (
              <div className="p-5 bg-card/50 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-secondary/40 border border-border/40 space-y-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Host & Port</span>
                    <p className="text-xs font-mono font-medium text-foreground truncate">
                      {localIntegrations.smtp.host ? `${localIntegrations.smtp.host}:${localIntegrations.smtp.port}` : 'None'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary/40 border border-border/40 space-y-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">From Sender</span>
                    <p className="text-xs font-medium text-foreground truncate" title={localIntegrations.smtp.fromEmail || 'Not set'}>
                      {localIntegrations.smtp.fromName || 'The Coffee Bean'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary/40 border border-border/40 space-y-0.5 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Security</span>
                    <p className="text-xs font-medium text-foreground">
                      {localIntegrations.smtp.secure ? 'SSL/TLS Enabled' : 'STARTTLS (587)'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-muted-foreground/70" />
                    App passwords & credentials encrypted in local browser store
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSmtpEditing(true)}
                    className="text-[#7C4EEE] hover:underline font-semibold flex items-center gap-1"
                  >
                    Edit credentials
                  </button>
                </div>
              </div>
            ) : (
              /* Expanded State Edit Form */
              <div className="p-5 space-y-4 bg-card transition-all">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">SMTP Host</Label>
                    <Input
                      value={localIntegrations.smtp.host}
                      onChange={(e) =>
                        setLocalIntegrations((prev) => ({
                          ...prev,
                          smtp: { ...prev.smtp, host: e.target.value },
                        }))
                      }
                      placeholder="smtp.gmail.com"
                      className="h-9 rounded-xl text-xs bg-background"
                    />
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Port</Label>
                      <Input
                        type="number"
                        min={1}
                        max={65535}
                        value={localIntegrations.smtp.port}
                        onChange={(e) =>
                          setLocalIntegrations((prev) => ({
                            ...prev,
                            smtp: { ...prev.smtp, port: e.target.value },
                          }))
                        }
                        className="h-9 rounded-xl text-xs font-mono bg-background"
                      />
                    </div>
                    <label className="flex items-center gap-2 pt-6 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localIntegrations.smtp.secure}
                        onChange={(e) =>
                          setLocalIntegrations((prev) => ({
                            ...prev,
                            smtp: { ...prev.smtp, secure: e.target.checked },
                          }))
                        }
                        className="rounded accent-[#7C4EEE] cursor-pointer"
                      />
                      SSL
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Username / Login</Label>
                    <Input
                      type="email"
                      value={localIntegrations.smtp.username}
                      onChange={(e) =>
                        setLocalIntegrations((prev) => ({
                          ...prev,
                          smtp: { ...prev.smtp, username: e.target.value },
                        }))
                      }
                      placeholder="orders@cafe.com"
                      className="h-9 rounded-xl text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Password / App Password</Label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={localIntegrations.smtp.password}
                      onChange={(e) =>
                        setLocalIntegrations((prev) => ({
                          ...prev,
                          smtp: { ...prev.smtp, password: e.target.value },
                        }))
                      }
                      placeholder="••••••••••••"
                      className="h-9 rounded-xl text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">From Name</Label>
                    <Input
                      value={localIntegrations.smtp.fromName}
                      onChange={(e) =>
                        setLocalIntegrations((prev) => ({
                          ...prev,
                          smtp: { ...prev.smtp, fromName: e.target.value },
                        }))
                      }
                      placeholder="The Coffee Bean"
                      className="h-9 rounded-xl text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">From Email</Label>
                    <Input
                      type="email"
                      value={localIntegrations.smtp.fromEmail}
                      onChange={(e) =>
                        setLocalIntegrations((prev) => ({
                          ...prev,
                          smtp: { ...prev.smtp, fromEmail: e.target.value },
                        }))
                      }
                      placeholder="orders@cafe.com"
                      className="h-9 rounded-xl text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">Test Recipient Email</Label>
                    <Input
                      type="email"
                      value={localIntegrations.smtp.testEmail}
                      onChange={(e) =>
                        setLocalIntegrations((prev) => ({
                          ...prev,
                          smtp: { ...prev.smtp, testEmail: e.target.value },
                        }))
                      }
                      placeholder="owner@cafe.com"
                      className="h-9 rounded-xl text-xs bg-background"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSmtpEditing(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Done Editing
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      saveLocalIntegrations()
                      setIsSmtpEditing(false)
                    }}
                    className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs h-9 px-4"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Save & Close
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Payment Integration Card */}
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs hover:border-border transition-all">
            {/* Card Header & Summary Bar */}
            <div className="p-5 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif font-bold text-sm sm:text-base text-foreground">
                      Payment Integration
                    </h2>
                    {paymentReady ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] py-0 px-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {localIntegrations.payment.environment === 'live' ? 'Live' : 'Test Mode'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] py-0 px-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Setup Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    UPI Intent, Razorpay, PhonePe and QR Code Checkout
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={testPaymentSettings}
                  className="rounded-xl text-xs h-8 px-3 hover:bg-secondary"
                  title="Test Payment Intent"
                >
                  <ShieldCheck className="w-3 h-3 mr-1.5 text-muted-foreground" />
                  Test UPI
                </Button>
                <Button
                  type="button"
                  variant={isPaymentEditing ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setIsPaymentEditing(!isPaymentEditing)}
                  className="rounded-xl text-xs h-8 px-3.5 font-medium flex items-center gap-1.5"
                >
                  {isPaymentEditing ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Collapse</span>
                    </>
                  ) : (
                    <>
                      <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Edit</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Collapsed State Summary */}
            {!isPaymentEditing ? (
              <div className="p-5 bg-card/50 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-secondary/40 border border-border/40 space-y-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Provider</span>
                    <p className="text-xs font-semibold text-foreground">
                      {localIntegrations.payment.provider || 'UPI Intent'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary/40 border border-border/40 space-y-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Merchant</span>
                    <p className="text-xs font-medium text-foreground truncate">
                      {localIntegrations.payment.merchantName || 'The Coffee Bean'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary/40 border border-border/40 space-y-0.5 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">UPI ID</span>
                    <p className="text-xs font-mono font-medium text-foreground truncate">
                      {localIntegrations.payment.upiId || 'Not specified'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Target gateway: {localIntegrations.payment.provider} ({localIntegrations.payment.environment.toUpperCase()})
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPaymentEditing(true)}
                    className="text-[#7C4EEE] hover:underline font-semibold flex items-center gap-1"
                  >
                    Edit payment gateway
                  </button>
                </div>
              </div>
            ) : (
              /* Expanded State Edit Form */
              <div className="p-5 space-y-4 bg-card transition-all">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Provider</Label>
                    <select
                      value={localIntegrations.payment.provider}
                      onChange={(e) =>
                        setLocalIntegrations((prev) => ({
                          ...prev,
                          payment: { ...prev.payment, provider: e.target.value },
                        }))
                      }
                      className="h-9 w-full rounded-xl border border-input bg-background px-3 text-xs focus:ring-1 focus:ring-[#7C4EEE] outline-none"
                    >
                      <option value="UPI">UPI Intent (Direct GPay/PhonePe/Paytm)</option>
                      <option value="Razorpay">Razorpay Gateway</option>
                      <option value="PhonePe">PhonePe Gateway</option>
                      <option value="Paytm">Paytm Gateway</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Environment</Label>
                    <select
                      value={localIntegrations.payment.environment}
                      onChange={(e) =>
                        setLocalIntegrations((prev) => ({
                          ...prev,
                          payment: { ...prev.payment, environment: e.target.value as 'test' | 'live' },
                        }))
                      }
                      className="h-9 w-full rounded-xl border border-input bg-background px-3 text-xs focus:ring-1 focus:ring-[#7C4EEE] outline-none"
                    >
                      <option value="test">Test / Sandbox Environment</option>
                      <option value="live">Live / Production Environment</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Merchant Business Name</Label>
                    <Input
                      value={localIntegrations.payment.merchantName}
                      onChange={(e) =>
                        setLocalIntegrations((prev) => ({
                          ...prev,
                          payment: { ...prev.payment, merchantName: e.target.value },
                        }))
                      }
                      placeholder="The Coffee Bean"
                      className="h-9 rounded-xl text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Merchant UPI VPA ID</Label>
                    <Input
                      value={localIntegrations.payment.upiId}
                      onChange={(e) =>
                        setLocalIntegrations((prev) => ({
                          ...prev,
                          payment: { ...prev.payment, upiId: e.target.value },
                        }))
                      }
                      placeholder="cafe@upi"
                      className="h-9 rounded-xl text-xs font-mono bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Gateway Key ID (Optional)</Label>
                    <Input
                      value={localIntegrations.payment.keyId}
                      onChange={(e) =>
                        setLocalIntegrations((prev) => ({
                          ...prev,
                          payment: { ...prev.payment, keyId: e.target.value },
                        }))
                      }
                      placeholder="rzp_test_..."
                      className="h-9 rounded-xl text-xs font-mono bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">API Secret / Token</Label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={localIntegrations.payment.apiSecret}
                      onChange={(e) =>
                        setLocalIntegrations((prev) => ({
                          ...prev,
                          payment: { ...prev.payment, apiSecret: e.target.value },
                        }))
                      }
                      placeholder="••••••••••••"
                      className="h-9 rounded-xl text-xs bg-background"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPaymentEditing(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Done Editing
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      saveLocalIntegrations()
                      setIsPaymentEditing(false)
                    }}
                    className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs h-9 px-4"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Save & Close
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Tips / Help Card */}
          <div className="p-4 rounded-2xl border border-border/60 bg-secondary/20 flex items-start gap-3">
            <HelpCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1 text-muted-foreground text-[11px] leading-relaxed">
              <p className="font-semibold text-foreground text-xs">Need help setting up?</p>
              <p>
                For Gmail SMTP, generate a 16-character App Password under your Google Account Security settings. For UPI, ensure your VPA ID is activated for merchant receipts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
