import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { couponsApi, walletApi, type Coupon } from '@/api/growth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/utils/lib'
import { Percent, Plus, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminPromotions() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'PERCENTAGE' as Coupon['type'],
    value: '',
    minOrderAmount: '',
    maxDiscount: '',
    usageLimit: '',
  })
  const [giftForm, setGiftForm] = useState({ code: '', initialValue: '', purchaserName: '', recipientEmail: '' })

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
      code: giftForm.code || undefined,
      initialValue: Number(giftForm.initialValue),
      purchaserName: giftForm.purchaserName || undefined,
      recipientEmail: giftForm.recipientEmail || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-cards'] })
      setGiftForm({ code: '', initialValue: '', purchaserName: '', recipientEmail: '' })
      toast.success('Gift card created')
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <Percent className="w-7 h-7 text-[#7C4EEE]" />
            <span>Promotions</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Create coupon codes, happy-hour discounts, and first-order offers.</p>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (!giftForm.initialValue) {
            toast.error('Gift card value is required')
            return
          }
          createGiftCardMutation.mutate()
        }}
        className="grid gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs lg:grid-cols-[140px_120px_1fr_1fr_auto]"
      >
        <Input placeholder="Code optional" value={giftForm.code} onChange={(e) => setGiftForm({ ...giftForm, code: e.target.value.toUpperCase() })} className="h-10 rounded-xl text-xs" />
        <Input placeholder="Value" value={giftForm.initialValue} onChange={(e) => setGiftForm({ ...giftForm, initialValue: e.target.value })} className="h-10 rounded-xl text-xs" />
        <Input placeholder="Purchaser" value={giftForm.purchaserName} onChange={(e) => setGiftForm({ ...giftForm, purchaserName: e.target.value })} className="h-10 rounded-xl text-xs" />
        <Input placeholder="Recipient email" value={giftForm.recipientEmail} onChange={(e) => setGiftForm({ ...giftForm, recipientEmail: e.target.value })} className="h-10 rounded-xl text-xs" />
        <Button type="submit" disabled={createGiftCardMutation.isPending} className="h-10 rounded-xl bg-emerald-600 text-white text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Gift Card
        </Button>
      </form>

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
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {giftCards.map((card) => (
                  <tr key={card.id} className="hover:bg-secondary/25">
                    <td className="p-4 font-mono font-bold">{card.code}</td>
                    <td className="p-4">{formatCurrency(Number(card.initialValue))}</td>
                    <td className="p-4">{formatCurrency(Number(card.remainingValue))}</td>
                    <td className="p-4 text-muted-foreground">{card.recipientEmail || '-'}</td>
                    <td className="p-4"><Badge className={card.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : 'bg-zinc-100 text-zinc-600'}>{card.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
