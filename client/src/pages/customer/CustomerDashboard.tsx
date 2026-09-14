import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Gift, Heart, LogOut, MapPin, Package, Plus, RotateCcw, Star, Trash2, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { ordersApi } from '@/api/orders'
import { customersApi } from '@/api/customers'
import { engagementApi, walletApi } from '@/api/growth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate, getStatusColor, cn } from '@/utils/lib'
import Separator from '@/components/home/Separator'
import { VerifyEmailNotice } from '@/components/VerifyEmailNotice'
import { toast } from 'sonner'
import type { Address, Order } from '@/types'
import { useMemo, useState, type FormEvent } from 'react'

const ORDER_STEPS = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED']

function progressFor(status: string) {
  if (status === 'DELIVERED') return 4
  return Math.max(0, ORDER_STEPS.indexOf(status))
}

export default function CustomerDashboard() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { addItem, clearCart } = useCart()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [addressForm, setAddressForm] = useState({
    label: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    instructions: '',
  })
  const [reviewDraft, setReviewDraft] = useState<Record<string, { rating: number; comment: string }>>({})
  const [giftCardCode, setGiftCardCode] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders', 'recent'],
    queryFn: () => ordersApi.getMyOrders({ page: 1, limit: 6 }),
    refetchInterval: 10000,
  })

  const { data: addressData, isLoading: addressesLoading } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: () => customersApi.getAddresses(),
  })

  const { data: favoritesData } = useQuery({
    queryKey: ['my-favorites'],
    queryFn: () => engagementApi.getFavorites(),
  })

  const { data: walletData } = useQuery({
    queryKey: ['my-wallet'],
    queryFn: () => walletApi.getWallet(),
  })

  const recentOrders = data?.data ?? []
  const addresses = addressData?.data ?? []
  const favorites = favoritesData?.data ?? []
  const favoriteIds = favorites.map((favorite) => favorite.productId)
  const wallet = walletData?.data
  const customer = user?.customer
  const activeOrders = recentOrders.filter((order) => !['COMPLETED', 'CANCELLED'].includes(order.status)).slice(0, 2)
  const favoriteProducts = useMemo(() => favorites.map((favorite) => favorite.product), [favorites])

  const createAddressMutation = useMutation({
    mutationFn: () => customersApi.createAddress({ ...addressForm, isDefault: addresses.length === 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] })
      setAddressForm({ label: '', street: '', city: '', state: '', postalCode: '', instructions: '' })
      toast.success('Address saved')
    },
    onError: (err: any) => toast.error(err?.message || 'Unable to save address'),
  })

  const deleteAddressMutation = useMutation({
    mutationFn: (id: string) => customersApi.deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] })
      toast.success('Address removed')
    },
    onError: (err: any) => toast.error(err?.message || 'Unable to remove address'),
  })

  const setDefaultAddressMutation = useMutation({
    mutationFn: (address: Address) => customersApi.updateAddress(address.id, { ...address, isDefault: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] })
      toast.success('Default address updated')
    },
    onError: (err: any) => toast.error(err?.message || 'Unable to update address'),
  })

  const handleReorder = (order: Order) => {
    clearCart()
    order.items?.forEach((item) => addItem(item.product, item.quantity, item.notes))
    toast.success('Order added to cart')
    navigate('/cart')
  }

  const addFavoriteMutation = useMutation({
    mutationFn: (productId: string) => engagementApi.addFavorite(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-favorites'] })
      toast.success('Favorite saved')
    },
    onError: (err: any) => toast.error(err?.message || 'Unable to save favorite'),
  })

  const removeFavoriteMutation = useMutation({
    mutationFn: (productId: string) => engagementApi.removeFavorite(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-favorites'] })
      toast.success('Favorite removed')
    },
    onError: (err: any) => toast.error(err?.message || 'Unable to remove favorite'),
  })

  const reviewMutation = useMutation({
    mutationFn: (data: { productId: string; orderId: string; rating: number; comment?: string }) =>
      engagementApi.createReview(data),
    onSuccess: () => {
      setReviewDraft({})
      toast.success('Review submitted')
    },
    onError: (err: any) => toast.error(err?.message || 'Unable to submit review'),
  })

  const redeemGiftCardMutation = useMutation({
    mutationFn: () => walletApi.redeemGiftCard(giftCardCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-wallet'] })
      setGiftCardCode('')
      toast.success('Gift card redeemed')
    },
    onError: (err: any) => toast.error(err?.message || 'Unable to redeem gift card'),
  })

  const toggleFavorite = (productId: string) => {
    if (favoriteIds.includes(productId)) {
      removeFavoriteMutation.mutate(productId)
    } else {
      addFavoriteMutation.mutate(productId)
    }
  }

  const submitAddress = (event: FormEvent) => {
    event.preventDefault()
    if (!addressForm.label || !addressForm.street || !addressForm.city || !addressForm.state || !addressForm.postalCode) {
      toast.error('Please fill all required address fields')
      return
    }
    createAddressMutation.mutate()
  }

  return (
    <div className="container mx-auto py-16">
      <div className="flex flex-col items-center text-center">
        <h1 className="h2">
          {customer?.firstName ? `${customer.firstName}` : t('navigation.account')}
        </h1>
        <Separator className="mt-5" />
        <p className="mt-5 text-muted-foreground">{user?.email}</p>
      </div>

      <div className="mx-auto mt-10 max-w-4xl">
        <VerifyEmailNotice />
      </div>

      <div className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-3">
        <Link
          to="/orders"
          className="group border border-border p-7 transition-colors hover:border-brand-gold"
        >
          <Package className="h-7 w-7 text-brand-gold" aria-hidden="true" />
          <h2 className="mt-4 font-serif text-xl transition-colors group-hover:text-brand-gold">
            {t('orders.title')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('orders.subtitle')}</p>
        </Link>

        <div className="border border-border p-7">
          <User className="h-7 w-7 text-brand-gold" aria-hidden="true" />
          <h2 className="mt-4 font-serif text-xl">{t('checkout.customerInfoTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {customer ? `${customer.firstName} ${customer.lastName ?? ''}` : user?.email}
          </p>
          {customer?.phone && (
            <p className="text-sm text-muted-foreground">{customer.phone}</p>
          )}
        </div>

        <div className="border border-border p-7">
          <MapPin className="h-7 w-7 text-brand-gold" aria-hidden="true" />
          <h2 className="mt-4 font-serif text-xl">{t('checkout.addressTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {customer?.addresses?.length
              ? `${customer.addresses.length}`
              : t('common.none')}
          </p>
        </div>
      </div>

      <section className="mx-auto mt-12 grid max-w-4xl gap-6 lg:grid-cols-3">
        <div className="border border-border p-7">
          <Gift className="h-7 w-7 text-brand-gold" aria-hidden="true" />
          <h2 className="mt-4 font-serif text-xl">Rewards</h2>
          <p className="mt-1 text-sm text-muted-foreground">{customer?.loyaltyTier ?? 'BRONZE'} tier</p>
          <p className="mt-3 font-serif text-3xl">{customer?.loyaltyPoints ?? 0}</p>
          <p className="text-xs text-muted-foreground">points available</p>
        </div>

        <div className="border border-border p-7 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl">Wallet</h2>
              <p className="mt-1 text-sm text-muted-foreground">Store credit and redeemed gift cards</p>
            </div>
            <p className="font-serif text-3xl">{formatCurrency(wallet?.balance ?? 0)}</p>
          </div>
          <div className="mt-4 flex gap-2">
            <Input
              value={giftCardCode}
              onChange={(event) => setGiftCardCode(event.target.value.toUpperCase())}
              placeholder="Gift card code"
              className="h-10"
            />
            <Button
              type="button"
              variant="outline"
              disabled={!giftCardCode || redeemGiftCardMutation.isPending}
              onClick={() => redeemGiftCardMutation.mutate()}
              className="rounded-none"
            >
              Redeem
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-4xl gap-6">
        <div className="border border-border p-7">
          <h2 className="font-serif text-xl">Favorites</h2>
          {favoriteProducts.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Tap the heart on a past order item to save favorites here.</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {favoriteProducts.map((product: any) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addItem(product, 1)}
                  className="inline-flex items-center gap-2 border border-border px-3 py-2 text-xs transition-colors hover:border-brand-gold hover:text-brand-gold"
                >
                  <Heart className="h-3.5 w-3.5 fill-current" />
                  {product.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {activeOrders.length > 0 && (
        <section className="mx-auto mt-16 max-w-4xl">
          <h2 className="font-serif text-2xl">Live Order Tracking</h2>
          <div className="mt-6 grid gap-4">
            {activeOrders.map((order) => {
              const progress = progressFor(order.status)
              return (
                <div key={order.id} className="border border-border p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">#{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
                    </div>
                    <span className={cn('px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em]', getStatusColor(order.status))}>
                      {order.status}
                    </span>
                  </div>
                  <div className="mt-5 grid grid-cols-5 gap-2">
                    {ORDER_STEPS.map((step, index) => (
                      <div key={step} className="space-y-2">
                        <div className={cn('h-1.5 rounded-full', index <= progress ? 'bg-brand-gold' : 'bg-border')} />
                        <p className="truncate text-[10px] text-muted-foreground">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Recent orders */}
      <section className="mx-auto mt-16 max-w-4xl">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl">{t('orders.title')}</h2>
          <Link
            to="/orders"
            className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            {t('common.viewAll')}
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-sm" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="mt-6 border border-border p-10 text-center">
            <p className="text-muted-foreground">{t('orders.emptyHistory')}</p>
            <Link to="/menu" className="btn-cafe mt-6">
              {t('orders.exploreMenu')}
            </Link>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-border border-y border-border">
            {recentOrders.map((order) => (
              <li key={order.id} className="py-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <Link to={`/order-confirmation/${order.orderNumber}`} className="font-medium transition-colors hover:text-brand-gold">
                      {order.orderNumber}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {order.items?.slice(0, 4).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleFavorite(item.product.id)}
                          className={cn(
                            'inline-flex items-center gap-1 border border-border px-2 py-1 text-[11px]',
                            favoriteIds.includes(item.product.id) && 'border-brand-gold text-brand-gold'
                          )}
                        >
                          <Star className={cn('h-3 w-3', favoriteIds.includes(item.product.id) && 'fill-current')} />
                          {item.product.name}
                        </button>
                      ))}
                    </div>
                    {['COMPLETED', 'DELIVERED'].includes(order.status) && (
                      <div className="mt-3 space-y-2">
                        {order.items?.slice(0, 2).map((item) => {
                          const key = `${order.id}:${item.product.id}`
                          const draft = reviewDraft[key] ?? { rating: 5, comment: '' }
                          return (
                            <div key={key} className="grid gap-2 sm:grid-cols-[90px_1fr_auto]">
                              <select
                                value={draft.rating}
                                onChange={(event) => setReviewDraft({ ...reviewDraft, [key]: { ...draft, rating: Number(event.target.value) } })}
                                className="border border-border bg-background px-2 py-1 text-xs"
                              >
                                {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
                              </select>
                              <Input
                                value={draft.comment}
                                onChange={(event) => setReviewDraft({ ...reviewDraft, [key]: { ...draft, comment: event.target.value } })}
                                placeholder={`Review ${item.product.name}`}
                                className="h-8 text-xs"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => reviewMutation.mutate({
                                  productId: item.product.id,
                                  orderId: order.id,
                                  rating: draft.rating,
                                  comment: draft.comment || undefined,
                                })}
                                className="h-8 rounded-none text-xs"
                              >
                                Review
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={cn(
                        'px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em]',
                        getStatusColor(order.status)
                      )}
                    >
                      {order.status}
                    </span>
                    <span className="font-serif text-xl">
                      {formatCurrency(Number(order.total))}
                    </span>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleReorder(order)} className="rounded-none">
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Reorder
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mx-auto mt-16 max-w-4xl">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl">Address Book</h2>
          <span className="text-sm text-muted-foreground">{addresses.length} saved</span>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <form onSubmit={submitAddress} className="border border-border p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-gold" />
              <h3 className="font-serif text-lg">Add Address</h3>
            </div>
            <Input placeholder="Label" value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })} />
            <Input placeholder="Street" value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="City" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} />
              <Input placeholder="State" value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} />
            </div>
            <Input placeholder="Postal code" value={addressForm.postalCode} onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })} />
            <Input placeholder="Delivery instructions" value={addressForm.instructions} onChange={(e) => setAddressForm({ ...addressForm, instructions: e.target.value })} />
            <Button type="submit" disabled={createAddressMutation.isPending} className="btn-cafe w-full">
              Save address
            </Button>
          </form>

          <div className="space-y-3">
            {addressesLoading ? (
              Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-sm" />)
            ) : addresses.length === 0 ? (
              <div className="border border-border p-8 text-center text-sm text-muted-foreground">No saved addresses yet.</div>
            ) : addresses.map((address) => (
              <div key={address.id} className="border border-border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{address.label} {address.isDefault && <span className="text-xs text-brand-gold">Default</span>}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{address.street}, {address.city}, {address.state} {address.postalCode}</p>
                    {address.instructions && <p className="mt-1 text-xs text-muted-foreground">{address.instructions}</p>}
                  </div>
                  <button type="button" onClick={() => deleteAddressMutation.mutate(address.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {!address.isDefault && (
                  <button type="button" onClick={() => setDefaultAddressMutation.mutate(address)} className="mt-3 text-xs underline underline-offset-4 hover:text-brand-gold">
                    Make default
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-16 flex justify-center">
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          {t('navigation.logout')}
        </button>
      </div>
    </div>
  )
}
