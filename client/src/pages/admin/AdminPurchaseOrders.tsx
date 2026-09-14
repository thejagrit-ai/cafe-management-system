import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { purchaseOrdersApi, type PurchaseOrder } from '@/api/growth'
import { ingredientsApi, suppliersApi } from '@/api/ingredients'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/utils/lib'
import { PackageCheck, Plus, Truck } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminPurchaseOrders() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ supplierId: '', ingredientId: '', quantity: '', unitCost: '', notes: '' })

  const { data: poData, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => purchaseOrdersApi.getAll({ page: 1, limit: 50 }),
  })
  const { data: suppliersData } = useQuery({ queryKey: ['suppliers-active'], queryFn: () => suppliersApi.getActive() })
  const { data: ingredientsData } = useQuery({ queryKey: ['ingredients-for-po'], queryFn: () => ingredientsApi.getAll({ page: 1, limit: 100 }) })

  const createMutation = useMutation({
    mutationFn: () => purchaseOrdersApi.create({
      supplierId: form.supplierId || undefined,
      notes: form.notes || undefined,
      items: [{ ingredientId: form.ingredientId, quantity: Number(form.quantity), unitCost: Number(form.unitCost || 0) }],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      setForm({ supplierId: '', ingredientId: '', quantity: '', unitCost: '', notes: '' })
      toast.success('Purchase order created')
    },
    onError: (err: any) => toast.error(err?.message || 'Unable to create purchase order'),
  })

  const receiveMutation = useMutation({
    mutationFn: (order: PurchaseOrder) => purchaseOrdersApi.receive(order.id, order.items.map((item) => ({
      itemId: item.id,
      quantity: Math.max(0, Number(item.quantity) - Number(item.receivedQuantity)),
    })).filter((item) => item.quantity > 0)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['ingredients-for-po'] })
      toast.success('Stock received')
    },
    onError: (err: any) => toast.error(err?.message || 'Unable to receive stock'),
  })

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.ingredientId || !form.quantity) {
      toast.error('Ingredient and quantity are required')
      return
    }
    createMutation.mutate()
  }

  const orders = poData?.data || []
  const suppliers = suppliersData?.data || []
  const ingredients = ingredientsData?.data || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-[#7C4EEE]" />
            <span>Purchase Orders</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Turn low-stock alerts into supplier orders and receive stock into inventory.</p>
        </div>
      </div>

      <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs lg:grid-cols-[1fr_1fr_120px_120px_1fr_auto]">
        <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="h-10 rounded-xl border border-border bg-card px-3 text-xs">
          <option value="">No supplier</option>
          {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
        </select>
        <select value={form.ingredientId} onChange={(e) => setForm({ ...form, ingredientId: e.target.value })} className="h-10 rounded-xl border border-border bg-card px-3 text-xs">
          <option value="">Ingredient</option>
          {ingredients.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name} ({ingredient.unit})</option>)}
        </select>
        <Input placeholder="Qty" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="h-10 rounded-xl text-xs" />
        <Input placeholder="Unit cost" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} className="h-10 rounded-xl text-xs" />
        <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="h-10 rounded-xl text-xs" />
        <Button type="submit" disabled={createMutation.isPending} className="h-10 rounded-xl bg-[#7C4EEE] text-white text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Create
        </Button>
      </form>

      <div className="grid gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-border/80 bg-card p-12 text-center text-xs text-muted-foreground">No purchase orders yet.</div>
        ) : orders.map((order) => {
          const total = order.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitCost), 0)
          const canReceive = !['RECEIVED', 'CANCELLED'].includes(order.status)
          return (
            <div key={order.id} className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono font-bold text-foreground">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">{order.supplierName || 'No supplier'} · {formatDate(order.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={order.status === 'RECEIVED' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : 'bg-amber-500/10 text-amber-700 border-amber-500/20'}>{order.status}</Badge>
                  {canReceive && (
                    <Button type="button" variant="outline" size="sm" onClick={() => receiveMutation.mutate(order)} className="rounded-xl text-xs">
                      <PackageCheck className="w-3.5 h-3.5 mr-1" />
                      Receive all
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-4 divide-y divide-border/60 border-y border-border/60">
                {order.items.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                    <span className="font-semibold text-foreground">{item.ingredientName}</span>
                    <span className="text-muted-foreground">{item.receivedQuantity}/{item.quantity} {item.unit}</span>
                    <span className="font-bold text-foreground">{formatCurrency(Number(item.quantity) * Number(item.unitCost))}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-right text-sm font-bold text-foreground">Total {formatCurrency(total)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
