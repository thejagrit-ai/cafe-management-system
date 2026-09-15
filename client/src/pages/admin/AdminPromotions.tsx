import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QRCodeCanvas } from 'qrcode.react'
import { couponsApi, walletApi, type Coupon } from '@/api/growth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatDate } from '@/utils/lib'
import { CalendarDays, Copy, Gift, Mail, Percent, Plus, RotateCcw, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

const emptyGiftForm = {
  code: '',
  initialValue: '',
  purchaserName: '',
  recipientName: '',
  recipientEmail: '',
  message: 'Enjoy a premium coffee moment, crafted fresh just for you.',
  expiresAt: '',
}

const PUBLIC_BASE_URL_STORAGE_KEY = 'cafe_public_base_url'

function previewCode(code: string) {
  return code.trim() ? code.trim().toUpperCase() : 'GC-PREMIUM'
}

function expiryToIso(date: string) {
  return date ? new Date(`${date}T23:59:59`).toISOString() : undefined
}

function generateGiftCode() {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  return `GC-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

function publicBaseUrl() {
  if (import.meta.env.VITE_PUBLIC_URL) return import.meta.env.VITE_PUBLIC_URL.replace(/\/+$/, '')
  const saved = typeof window !== 'undefined' ? localStorage.getItem(PUBLIC_BASE_URL_STORAGE_KEY) : ''
  if (saved) return saved.replace(/\/+$/, '')
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

function giftCardRedeemUrl(code: string) {
  const params = new URLSearchParams({ giftCard: code })
  return `${publicBaseUrl()}/account?${params.toString()}`
}

export default function AdminPromotions() {
  const queryClient = useQueryClient()
  const [giftDialogOpen, setGiftDialogOpen] = useState(false)
  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'PERCENTAGE' as Coupon['type'],
    value: '',
    minOrderAmount: '',
    maxDiscount: '',
    usageLimit: '',
  })
  const [giftForm, setGiftForm] = useState(emptyGiftForm)

  const giftValue = Number(giftForm.initialValue) || 0
  const giftCode = useMemo(() => previewCode(giftForm.code), [giftForm.code])
  const giftRedeemUrl = useMemo(() => giftCardRedeemUrl(giftCode), [giftCode])
  const giftRecipient = giftForm.recipientName.trim() || 'A valued guest'
  const giftPurchaser = giftForm.purchaserName.trim() || 'The Coffee Bean'

  const { data, isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: () => couponsApi.getAll({ page: 1, limit: 50 }),
  })

  const { data: giftCardsData, isLoading: giftCardsLoading } = useQuery({
    queryKey: ['gift-cards'],
    queryFn: () => walletApi.getGiftCards({ page: 1, limit: 20 }),
  })

  const createMutation = useMutation({
    mutationFn: () => couponsApi.create({
      code: form.code,
      name: form.name,
      type: form.type,
      value: Number(form.value),
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : 0,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      status: 'ACTIVE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      setForm({ code: '', name: '', type: 'PERCENTAGE', value: '', minOrderAmount: '', maxDiscount: '', usageLimit: '' })
      toast.success('Promotion created')
    },
    onError: (err: any) => toast.error(err?.message || 'Unable to create promotion'),
  })

  const toggleMutation = useMutation({
    mutationFn: (coupon: Coupon) => couponsApi.update(coupon.id, { status: coupon.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coupons'] }),
    onError: (err: any) => toast.error(err?.message || 'Unable to update promotion'),
  })

  const createGiftCardMutation = useMutation({
    mutationFn: () => walletApi.createGiftCard({
      code: giftCode,
      initialValue: giftValue,
      purchaserName: giftForm.purchaserName.trim() || undefined,
      recipientName: giftForm.recipientName.trim() || undefined,
      recipientEmail: giftForm.recipientEmail.trim(),
      message: giftForm.message.trim() || undefined,
      expiresAt: expiryToIso(giftForm.expiresAt),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-cards'] })
      setGiftForm(emptyGiftForm)
      setGiftDialogOpen(false)
      toast.success('Gift card generated and email queued')
    },
    onError: (err: any) => toast.error(err?.message || 'Unable to create gift card'),
  })

  const coupons = data?.data || []
  const giftCards = giftCardsData?.data || []

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.code || !form.name || !form.value) {
      toast.error('Code, name, and value are required')
      return
    }
    createMutation.mutate()
  }

  const submitGiftCard = (event: React.FormEvent) => {
    event.preventDefault()
    if (!giftValue || giftValue <= 0) {
      toast.error('Gift card value is required')
      return
    }
    if (!giftForm.recipientEmail.trim()) {
      toast.error('Recipient email is required to send the gift card')
      return
    }
    createGiftCardMutation.mutate()
  }

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code)
    toast.success('Gift card code copied')
  }

  const openGiftCardComposer = () => {
    setGiftForm((current) => ({ ...current, code: current.code || generateGiftCode() }))
    setGiftDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <Percent className="w-7 h-7 text-[#7C4EEE]" />
            <span>Promotions</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Create coupon codes, premium digital gift cards, and first-order offers.</p>
        </div>
        <Button onClick={openGiftCardComposer} className="h-10 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800">
          <Gift className="w-4 h-4 mr-2" />
          Generate Gift Card
        </Button>
      </div>

      <div className="grid gap-4 rounded-2xl border border-amber-200/80 bg-[linear-gradient(135deg,#fffaf0,#ffffff_48%,#f7efe3)] p-5 shadow-xs lg:grid-cols-[1.15fr_.85fr]">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-amber-200">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-foreground">Online gift card generator</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Create a premium digital gift card, email it to the recipient, and let customers redeem the code from their wallet.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
          <Badge className="border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-700">{giftCards.length} recent cards</Badge>
          <Button variant="outline" onClick={openGiftCardComposer} className="h-10 rounded-xl">
            <Mail className="w-4 h-4 mr-2" />
            Compose & Send
          </Button>
        </div>
      </div>

      <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs lg:grid-cols-[1fr_1fr_150px_120px_120px_120px_auto]">
        <Input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="h-10 rounded-xl text-xs" />
        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10 rounded-xl text-xs" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Coupon['type'] })} className="h-10 rounded-xl border border-border bg-card px-3 text-xs">
          <option value="PERCENTAGE">Percentage</option>
          <option value="FIXED_AMOUNT">Fixed</option>
        </select>
        <Input placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="h-10 rounded-xl text-xs" />
        <Input placeholder="Min order" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} className="h-10 rounded-xl text-xs" />
        <Input placeholder="Max off" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} className="h-10 rounded-xl text-xs" />
        <Button type="submit" disabled={createMutation.isPending} className="h-10 rounded-xl bg-[#7C4EEE] text-white text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Create
        </Button>
      </form>

      <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">No promotions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/70 bg-secondary/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4">Code</th>
                  <th className="p-4">Offer</th>
                  <th className="p-4">Rules</th>
                  <th className="p-4">Used</th>
                  <th className="p-4">Created</th>
                  <th className="p-4">Status</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-secondary/25">
                    <td className="p-4 font-mono font-bold text-foreground">{coupon.code}</td>
                    <td className="p-4">
                      <p className="font-semibold text-foreground">{coupon.name}</p>
                      <p className="text-muted-foreground">{coupon.type === 'PERCENTAGE' ? `${coupon.value}% off` : `${formatCurrency(coupon.value)} off`}</p>
                    </td>
                    <td className="p-4 text-muted-foreground">Min {formatCurrency(Number(coupon.minOrderAmount || 0))}</td>
                    <td className="p-4 font-mono">{coupon.redemptionCount ?? 0}</td>
                    <td className="p-4 text-muted-foreground">{formatDate(coupon.createdAt)}</td>
                    <td className="p-4"><Badge className={coupon.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : 'bg-amber-500/10 text-amber-700 border-amber-500/20'}>{coupon.status}</Badge></td>
                    <td className="p-4">
                      <Button variant="outline" size="sm" onClick={() => toggleMutation.mutate(coupon)} className="rounded-xl text-xs">
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Toggle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/70 bg-secondary/30 p-4">
          <h2 className="font-serif text-base font-bold text-foreground">Gift Cards</h2>
          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">{giftCards.length} shown</Badge>
        </div>
        {giftCardsLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : giftCards.length === 0 ? (
          <div className="p-10 text-center text-xs text-muted-foreground">No gift cards yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/70 bg-secondary/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4">Code</th>
                  <th className="p-4">Value</th>
                  <th className="p-4">Remaining</th>
                  <th className="p-4">Recipient</th>
                  <th className="p-4">Created</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {giftCards.map((card) => (
                  <tr key={card.id} className="hover:bg-secondary/25">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{card.code}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => copyCode(card.code)} className="h-7 w-7 rounded-lg p-0">
                          <Copy className="h-3.5 w-3.5" />
                          <span className="sr-only">Copy code</span>
                        </Button>
                      </div>
                    </td>
                    <td className="p-4">{formatCurrency(Number(card.initialValue))}</td>
                    <td className="p-4 font-semibold">{formatCurrency(Number(card.remainingValue))}</td>
                    <td className="p-4 text-muted-foreground">{card.recipientEmail || '-'}</td>
                    <td className="p-4 text-muted-foreground">{formatDate(card.createdAt)}</td>
                    <td className="p-4"><Badge className={card.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : 'bg-zinc-100 text-zinc-600'}>{card.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={giftDialogOpen} onOpenChange={setGiftDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl border-border bg-card p-0 sm:max-w-5xl">
          <form onSubmit={submitGiftCard}>
            <div className="grid lg:grid-cols-[1fr_.92fr]">
              <div className="space-y-5 p-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 font-serif text-2xl">
                    <Gift className="h-5 w-5 text-amber-600" />
                    Generate premium gift card
                  </DialogTitle>
                  <DialogDescription>Email a luxury digital card with a redeemable wallet code.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Value</Label>
                    <Input inputMode="decimal" placeholder="1000" value={giftForm.initialValue} onChange={(e) => setGiftForm({ ...giftForm, initialValue: e.target.value })} className="h-10 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Custom code</Label>
                    <Input placeholder="Auto-generated" value={giftForm.code} onChange={(e) => setGiftForm({ ...giftForm, code: e.target.value.toUpperCase() })} className="h-10 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Purchaser name</Label>
                    <Input placeholder="Sender name" value={giftForm.purchaserName} onChange={(e) => setGiftForm({ ...giftForm, purchaserName: e.target.value })} className="h-10 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Recipient name</Label>
                    <Input placeholder="Recipient name" value={giftForm.recipientName} onChange={(e) => setGiftForm({ ...giftForm, recipientName: e.target.value })} className="h-10 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs">Recipient email</Label>
                    <Input type="email" placeholder="guest@example.com" value={giftForm.recipientEmail} onChange={(e) => setGiftForm({ ...giftForm, recipientEmail: e.target.value })} className="h-10 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs">Personal message</Label>
                    <Textarea value={giftForm.message} onChange={(e) => setGiftForm({ ...giftForm, message: e.target.value })} className="min-h-[96px] rounded-xl text-sm" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs">Expiry date</Label>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input type="date" value={giftForm.expiresAt} onChange={(e) => setGiftForm({ ...giftForm, expiresAt: e.target.value })} className="h-10 rounded-xl pl-10 text-sm" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#16110c] p-6 text-white">
                <div className="rounded-[1.6rem] border border-amber-200/25 bg-[radial-gradient(circle_at_18%_15%,rgba(255,255,255,.18),transparent_28%),linear-gradient(135deg,#21140c,#5a3320_54%,#b8873f)] p-6 shadow-2xl">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-200">The Coffee Bean</p>
                      <h3 className="mt-3 font-serif text-3xl font-bold leading-none">Premium Gift Card</h3>
                    </div>
                    <Badge className="border-white/20 bg-white/10 text-amber-100">Digital</Badge>
                  </div>
                  <div className="mt-10">
                    <p className="text-xs text-amber-100/80">Gift value</p>
                    <p className="mt-2 font-serif text-5xl font-bold tracking-normal">{formatCurrency(giftValue)}</p>
                  </div>
                  <div className="mt-8 rounded-2xl border border-white/15 bg-black/18 p-4">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-amber-100/70">Redeem code</p>
                    <p className="mt-2 break-all font-mono text-xl font-bold tracking-widest">{giftCode}</p>
                  </div>
                  <div className="mt-6 grid grid-cols-[1fr_auto] items-end gap-4">
                    <div>
                      <p className="text-xs text-amber-100/80">For {giftRecipient}</p>
                      <p className="mt-1 text-sm text-white/75">From {giftPurchaser}</p>
                    </div>
                    <div className="rounded-xl bg-white p-2">
                      <QRCodeCanvas value={giftRedeemUrl} size={96} bgColor="#ffffff" fgColor="#2b1a11" level="H" includeMargin />
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-amber-50/80">{giftForm.message}</p>
                <p className="mt-3 break-all text-[11px] leading-5 text-white/50">{giftRedeemUrl}</p>
                <p className="mt-3 text-xs text-white/50">{giftForm.expiresAt ? `Valid until ${giftForm.expiresAt}` : 'No expiry date selected'}</p>
              </div>
            </div>

            <DialogFooter className="border-t border-border/70 p-4">
              <Button type="button" variant="outline" onClick={() => setGiftDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={createGiftCardMutation.isPending} className="rounded-xl bg-zinc-950 text-white hover:bg-zinc-800">
                <Send className="mr-2 h-4 w-4" />
                Generate & Send Email
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
