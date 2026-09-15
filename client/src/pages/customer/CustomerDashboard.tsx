import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Gift,
  Heart,
  LogOut,
  MapPin,
  Package,
  Plus,
  RotateCcw,
  Star,
  Trash2,
  User,
  Sparkles,
  Tag,
  Copy,
  Check,
  CreditCard,
  Clock,
  ChevronRight,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Percent,
  Compass,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { ordersApi } from '@/api/orders'
import { customersApi } from '@/api/customers'
import { engagementApi, walletApi, couponsApi, type Coupon } from '@/api/growth'
import { loyaltyApi } from '@/api/loyalty'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate, getStatusColor, cn } from '@/utils/lib'
import { VerifyEmailNotice } from '@/components/VerifyEmailNotice'
import { toast } from 'sonner'
import type { Address, Order } from '@/types'
import { useMemo, useState, type FormEvent } from 'react'

const ORDER_STEPS = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED']

function progressFor(status: string) {
  if (status === 'DELIVERED') return 4
  return Math.max(0, ORDER_STEPS.indexOf(status))
}

const DEFAULT_OFFERS = [
  {
    id: 'welcome20',
    code: 'WELCOME20',
    name: 'First Sip Welcome Perk',
    description: 'Get 20% off on your handcrafted specialty coffee orders above ₹250.',
    discount: '20% OFF',
    type: 'PERCENTAGE',
    minOrder: '₹250',
    tag: 'Welcome Deal',
    badgeColor: 'from-amber-500 to-orange-600',
  },
  {
    id: 'freedel',
    code: 'FREEDELIVERY',
    name: 'Complimentary Express Delivery',
    description: 'Zero delivery surcharge on all breakfast, lunch, and pastry baskets.',
    discount: 'FREE DELIVERY',
    type: 'FIXED_AMOUNT',
    minOrder: '₹299',
    tag: 'Popular',
    badgeColor: 'from-emerald-500 to-teal-700',
  },
  {
    id: 'cafeclub50',
    code: 'CAFECLUB50',
    name: 'Signature Feast Discount',
    description: 'Flat ₹50 savings on any artisanal brew combo with bakery items.',
    discount: 'FLAT ₹50 OFF',
    type: 'FIXED_AMOUNT',
    minOrder: '₹350',
    tag: 'Limited Time',
    badgeColor: 'from-purple-600 to-[#7C4EEE]',
  },
]

export default function CustomerDashboard() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { addItem, clearCart } = useCart()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()

  // Tab State
  const activeTab = searchParams.get('tab') || 'overview'
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab }, { replace: true })
  }

  // Address form state
  const [addressForm, setAddressForm] = useState({
    label: 'Home',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    instructions: '',
  })
  const [isAddingAddress, setIsAddingAddress] = useState(false)

  // Review state
  const [reviewDraft, setReviewDraft] = useState<Record<string, { rating: number; comment: string }>>({})
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [giftCardCode, setGiftCardCode] = useState(() => searchParams.get('giftCard')?.toUpperCase() || '')
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL')

  // Queries
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['my-orders', 'dashboard'],
    queryFn: () => ordersApi.getMyOrders({ page: 1, limit: 10 }),
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

  const { data: loyaltyData } = useQuery({
    queryKey: ['my-loyalty'],
    queryFn: () => loyaltyApi.getMyLoyalty(),
    enabled: !!user?.id,
  })

  const { data: couponsData } = useQuery({
    queryKey: ['active-coupons'],
    queryFn: () => couponsApi.getAll({ status: 'ACTIVE' }),
  })

  const recentOrders = ordersData?.data ?? []
  const addresses = addressData?.data ?? []
  const favorites = favoritesData?.data ?? []
  const favoriteIds = favorites.map((favorite) => favorite.productId)
  const wallet = walletData?.data
  const loyalty = loyaltyData?.data
  const customer = user?.customer
  const activeOrders = recentOrders.filter((order) => !['COMPLETED', 'CANCELLED'].includes(order.status))
  const favoriteProducts = useMemo(() => favorites.map((favorite) => favorite.product).filter(Boolean), [favorites])

  // Combine backend coupons with signature offers
  const allOffers = useMemo(() => {
    const backendCoupons = (couponsData?.data ?? []).map((c: Coupon) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description || (c.type === 'PERCENTAGE' ? `Get ${c.value}% off on minimum order of ₹${c.minOrderAmount}` : `Flat ₹${c.value} off on order above ₹${c.minOrderAmount}`),
      discount: c.type === 'PERCENTAGE' ? `${c.value}% OFF` : `FLAT ₹${c.value} OFF`,
      type: c.type,
      minOrder: `₹${c.minOrderAmount}`,
      tag: 'Special Offer',
      badgeColor: 'from-[#7C4EEE] to-indigo-700',
    }))

    const codes = new Set(backendCoupons.map((b) => b.code))
    const filteredDefaults = DEFAULT_OFFERS.filter((d) => !codes.has(d.code))
    return [...backendCoupons, ...filteredDefaults]
  }, [couponsData])

  // Mutations
  const createAddressMutation = useMutation({
    mutationFn: () => customersApi.createAddress({ ...addressForm, isDefault: addresses.length === 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] })
      setAddressForm({ label: 'Home', street: '', city: '', state: '', postalCode: '', instructions: '' })
      setIsAddingAddress(false)
      toast.success('Address saved successfully')
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
    toast.success('Order items added to cart!')
    navigate('/cart')
  }

  const addFavoriteMutation = useMutation({
    mutationFn: (productId: string) => engagementApi.addFavorite(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-favorites'] })
      toast.success('Item added to favorites')
    },
    onError: (err: any) => toast.error(err?.message || 'Unable to save favorite'),
  })

  const removeFavoriteMutation = useMutation({
    mutationFn: (productId: string) => engagementApi.removeFavorite(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-favorites'] })
      toast.success('Item removed from favorites')
    },
    onError: (err: any) => toast.error(err?.message || 'Unable to remove favorite'),
  })

  const reviewMutation = useMutation({
    mutationFn: (data: { productId: string; orderId: string; rating: number; comment?: string }) =>
      engagementApi.createReview(data),
    onSuccess: () => {
      setReviewDraft({})
      toast.success('Thank you! Review submitted successfully.')
    },
    onError: (err: any) => toast.error(err?.message || 'Unable to submit review'),
  })

  const redeemGiftCardMutation = useMutation({
    mutationFn: () => walletApi.redeemGiftCard(giftCardCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-wallet'] })
      setGiftCardCode('')
      toast.success('Gift card credited to your wallet balance!')
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

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success(`Coupon code ${code} copied to clipboard!`)
    setTimeout(() => setCopiedCode(null), 3000)
  }

  const applyAndExplore = (code: string) => {
    copyCouponCode(code)
    navigate('/menu')
  }

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'ACTIVE') {
      return recentOrders.filter((order) => !['COMPLETED', 'CANCELLED'].includes(order.status))
    }
    if (orderFilter === 'COMPLETED') {
      return recentOrders.filter((order) => ['COMPLETED', 'DELIVERED'].includes(order.status))
    }
    return recentOrders
  }, [recentOrders, orderFilter])

  const customerInitials = useMemo(() => {
    if (customer?.firstName) {
      return `${customer.firstName[0]}${customer.lastName ? customer.lastName[0] : ''}`.toUpperCase()
    }
    return user?.email ? user.email[0].toUpperCase() : 'C'
  }, [customer, user])

  const tierBadge = loyalty?.tierDetails?.badge || '☕'
  const tierName = loyalty?.tierDetails?.name || customer?.loyaltyTier || 'BRONZE'

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Top Banner / Breadcrumb Area */}
      <div className="border-b border-border/60 bg-card/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
              <span>/</span>
              <span className="text-foreground font-medium">Customer Portal</span>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/menu">
                <Button variant="outline" size="sm" className="rounded-xl text-xs h-8 px-3 border-border hover:bg-secondary">
                  <Compass className="w-3.5 h-3.5 mr-1.5 text-brand-gold" />
                  <span>Explore Menu</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="rounded-xl text-xs h-8 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                <span>{t('navigation.logout')}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Verification Alert if needed */}
        <VerifyEmailNotice />

        {/* Hero Customer Profile Header */}
        <div className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card shadow-sm relative overflow-hidden">
          {/* Subtle warm decorative glow */}
          <div className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-bl from-amber-500/10 via-brand-gold/5 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            {/* User Identity */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-brand-gold/20 via-[#7C4EEE]/20 to-amber-500/20 border-2 border-brand-gold/40 flex items-center justify-center text-xl sm:text-2xl font-serif font-bold text-foreground shadow-xs">
                  {customerInitials}
                </div>
                <span className="absolute -bottom-1 -right-1 text-base sm:text-lg bg-card rounded-full p-0.5 shadow-xs" title={`Tier: ${tierName}`}>
                  {tierBadge}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-serif font-bold text-foreground">
                    {customer?.firstName ? `${customer.firstName} ${customer.lastName ?? ''}` : 'Customer Account'}
                  </h1>
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] font-semibold py-0.5 px-2">
                    {tierBadge} {tierName} MEMBER
                  </Badge>
                  {user?.emailVerified && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] py-0 px-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                {customer?.phone && (
                  <p className="text-xs text-muted-foreground">{customer.phone}</p>
                )}
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
              <div
                onClick={() => setActiveTab('rewards')}
                className="p-3.5 rounded-2xl bg-secondary/40 hover:bg-secondary/70 border border-border/50 transition-all cursor-pointer space-y-1 min-w-[120px]"
              >
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Rewards</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <p className="font-serif text-lg font-bold text-foreground">
                  {loyalty?.points ?? customer?.loyaltyPoints ?? 0} <span className="text-xs font-sans font-normal text-muted-foreground">pts</span>
                </p>
                <p className="text-[10px] text-brand-gold font-medium">
                  ≈ {formatCurrency(loyalty?.monetaryValue ?? 0)}
                </p>
              </div>

              <div
                onClick={() => setActiveTab('rewards')}
                className="p-3.5 rounded-2xl bg-secondary/40 hover:bg-secondary/70 border border-border/50 transition-all cursor-pointer space-y-1 min-w-[120px]"
              >
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Wallet</span>
                  <CreditCard className="w-3.5 h-3.5 text-[#7C4EEE]" />
                </div>
                <p className="font-serif text-lg font-bold text-foreground">
                  {formatCurrency(wallet?.balance ?? 0)}
                </p>
                <p className="text-[10px] text-muted-foreground">Store Credit</p>
              </div>

              <div
                onClick={() => setActiveTab('orders')}
                className="p-3.5 rounded-2xl bg-secondary/40 hover:bg-secondary/70 border border-border/50 transition-all cursor-pointer space-y-1 min-w-[120px]"
              >
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Orders</span>
                  <Package className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <p className="font-serif text-lg font-bold text-foreground">
                  {recentOrders.length}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {activeOrders.length > 0 ? `${activeOrders.length} active` : 'All completed'}
                </p>
              </div>

              <div
                onClick={() => setActiveTab('favorites')}
                className="p-3.5 rounded-2xl bg-secondary/40 hover:bg-secondary/70 border border-border/50 transition-all cursor-pointer space-y-1 min-w-[120px]"
              >
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Favorites</span>
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                </div>
                <p className="font-serif text-lg font-bold text-foreground">
                  {favorites.length}
                </p>
                <p className="text-[10px] text-muted-foreground">Saved Items</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border/70 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2',
              activeTab === 'overview'
                ? 'bg-[#7C4EEE] text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            <User className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('offers')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2',
              activeTab === 'offers'
                ? 'bg-[#7C4EEE] text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            <Tag className="w-3.5 h-3.5 text-amber-500" />
            <span>Special Offers & Deals</span>
            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] py-0 px-1.5 border-none font-bold">
              {allOffers.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2',
              activeTab === 'orders'
                ? 'bg-[#7C4EEE] text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Orders & Live Tracking</span>
            {activeOrders.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rewards')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2',
              activeTab === 'rewards'
                ? 'bg-[#7C4EEE] text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Loyalty & Wallet</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('addresses')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2',
              activeTab === 'addresses'
                ? 'bg-[#7C4EEE] text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Saved Addresses</span>
            <span className="text-[10px] text-muted-foreground">({addresses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('favorites')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2',
              activeTab === 'favorites'
                ? 'bg-[#7C4EEE] text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Favorites</span>
            <span className="text-[10px] text-muted-foreground">({favorites.length})</span>
          </button>
        </div>

        {/* TAB CONTENT: 1. OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Live Order Tracker Banner if any active order */}
            {activeOrders.length > 0 && (
              <div className="p-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/20 pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
                    </span>
                    <div>
                      <h3 className="font-serif font-bold text-base text-foreground">
                        Live Order in Progress: #{activeOrders[0].orderNumber}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Placed on {formatDate(activeOrders[0].createdAt)} · Total {formatCurrency(Number(activeOrders[0].total))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider', getStatusColor(activeOrders[0].status))}>
                      {activeOrders[0].status}
                    </span>
                    <Link to={`/order-confirmation/${activeOrders[0].orderNumber}`}>
                      <Button size="sm" variant="outline" className="rounded-xl text-xs h-8">
                        Track Details <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* 5-step progress bar */}
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {ORDER_STEPS.map((step, index) => {
                    const currentProg = progressFor(activeOrders[0].status)
                    const isPassed = index <= currentProg
                    return (
                      <div key={step} className="space-y-1.5">
                        <div className={cn('h-2 rounded-full transition-all duration-500', isPassed ? 'bg-emerald-500 shadow-2xs' : 'bg-border/60')} />
                        <p className={cn('truncate text-[10px] font-semibold text-center uppercase tracking-wider', isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                          {step}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Featured Offers Top Banner (*"make proper offer"*) */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-purple-600/10 to-amber-500/10 border border-amber-500/30 relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400">
                      <Tag className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Today's Cafe Specials & Vouchers
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground">
                    Exclusive Deals on Handcrafted Brews & Bakes
                  </h2>
                  <p className="text-xs text-muted-foreground max-w-xl">
                    Save on your daily espresso, cold brews, artisanal pastries and breakfast platters with verified promo codes.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Button
                    type="button"
                    onClick={() => setActiveTab('offers')}
                    className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white px-5 h-10 text-xs font-semibold shadow-xs"
                  >
                    <span>View All Offers ({allOffers.length})</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>

              {/* Quick 2-Offer mini cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-5">
                {allOffers.slice(0, 3).map((offer) => (
                  <div
                    key={offer.id}
                    className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-2xs flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-foreground">{offer.discount}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">Min {offer.minOrder}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{offer.name}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyCouponCode(offer.code)}
                      className="p-2 rounded-xl bg-secondary/60 hover:bg-secondary text-foreground text-xs font-mono font-bold flex items-center gap-1.5 border border-border/50 shrink-0 transition-all"
                      title="Copy coupon code"
                    >
                      {copiedCode === offer.code ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 text-[11px]">COPIED</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[11px]">{offer.code}</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 2-Column Main Section: Recent Orders + Quick Actions & Rewards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Recent Orders (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-brand-gold" />
                    <h3 className="font-serif font-bold text-lg text-foreground">Recent Orders</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-brand-gold hover:underline font-semibold flex items-center gap-1"
                  >
                    View All Orders <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {ordersLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 rounded-2xl" />
                    ))}
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-dashed border-border text-center space-y-3 bg-card/40">
                    <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground">You haven't placed any orders yet.</p>
                    <Link to="/menu">
                      <Button size="sm" className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs">
                        Start Your First Order
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentOrders.slice(0, 3).map((order) => (
                      <div
                        key={order.id}
                        className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card hover:border-border transition-all shadow-2xs space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                          <div>
                            <Link
                              to={`/order-confirmation/${order.orderNumber}`}
                              className="font-serif font-bold text-sm text-foreground hover:text-brand-gold transition-colors"
                            >
                              #{order.orderNumber}
                            </Link>
                            <span className="text-[11px] text-muted-foreground ml-2">
                              {formatDate(order.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', getStatusColor(order.status))}>
                              {order.status}
                            </span>
                            <span className="font-serif font-bold text-sm text-foreground">
                              {formatCurrency(Number(order.total))}
                            </span>
                          </div>
                        </div>

                        {/* Items summary */}
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="text-muted-foreground text-[11px] truncate max-w-xs">
                            {order.items?.map((item) => `${item.quantity}x ${item.product?.name}`).join(', ')}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleReorder(order)}
                              className="rounded-xl text-xs h-8 px-3 border-border hover:bg-secondary"
                            >
                              <RotateCcw className="w-3 h-3 mr-1.5" />
                              Reorder
                            </Button>
                            <Link to={`/order-confirmation/${order.orderNumber}`}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="rounded-xl text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground"
                              >
                                Invoice
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Wallet & Quick Actions (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Loyalty Tier Mini Card */}
                <div className="p-5 rounded-2xl border border-border/80 bg-card shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <h4 className="font-serif font-bold text-sm text-foreground">Club Tier Benefits</h4>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {tierName}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Earn 1 point per ₹10 spent. Redeem points directly for free espresso shots, pastries, and signature drinks at checkout.
                  </p>

                  {loyalty?.nextTier.nextTier && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Progress to {loyalty.nextTier.nextTier}</span>
                        <span className="font-semibold text-foreground">{loyalty.nextTier.pointsNeeded} pts to go</span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-[#7C4EEE] rounded-full transition-all duration-500"
                          style={{ width: `${loyalty.nextTier.progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('rewards')}
                      className="w-full rounded-xl text-xs h-9 border-border"
                    >
                      View Loyalty History & Perks
                    </Button>
                  </div>
                </div>

                {/* Quick Gift Card Redeem Box */}
                <div className="p-5 rounded-2xl border border-border/80 bg-card shadow-2xs space-y-3">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-[#7C4EEE]" />
                    <h4 className="font-serif font-bold text-sm text-foreground">Redeem Gift Card</h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Enter your digital voucher or gift card code to credit your balance instantly.
                  </p>

                  <div className="flex gap-2 pt-1">
                    <Input
                      value={giftCardCode}
                      onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                      placeholder="e.g. CAFE-GIFT-100"
                      className="h-9 rounded-xl text-xs font-mono bg-background uppercase"
                    />
                    <Button
                      type="button"
                      disabled={!giftCardCode || redeemGiftCardMutation.isPending}
                      onClick={() => redeemGiftCardMutation.mutate()}
                      className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs h-9 px-4 shrink-0"
                    >
                      Redeem
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: 2. OFFERS & DEALS (*"make proper offer"*) */}
        {activeTab === 'offers' && (
          <div className="space-y-6">
            <div className="border-b border-border/60 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
                  <Tag className="w-5 h-5 text-amber-500" />
                  Exclusive Customer Offers & Vouchers
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Apply these verified coupons during checkout or copy the code to redeem instantly.
                </p>
              </div>
              <Link to="/menu">
                <Button className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs h-9 px-4">
                  <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
                  Apply & Order from Menu
                </Button>
              </Link>
            </div>

            {/* Grid of Coupons / Offers */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {allOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-2xs hover:border-brand-gold/40 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  {/* Card Header Strip */}
                  <div className={`p-4 bg-gradient-to-r ${offer.badgeColor} text-white flex items-center justify-between`}>
                    <span className="text-xs font-bold uppercase tracking-wider">{offer.tag}</span>
                    <span className="font-serif text-lg font-bold">{offer.discount}</span>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <h3 className="font-serif font-bold text-base text-foreground">
                        {offer.name}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {offer.description}
                      </p>
                    </div>

                    <div className="pt-2 space-y-3">
                      {/* Dashed Coupon Code Box */}
                      <div className="p-2.5 rounded-xl border-2 border-dashed border-[#7C4EEE]/40 bg-[#7C4EEE]/5 flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-xs tracking-wider text-foreground pl-1">
                          {offer.code}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyCouponCode(offer.code)}
                          className="h-7 px-2.5 rounded-lg text-xs font-medium hover:bg-[#7C4EEE]/10 text-[#7C4EEE]"
                        >
                          {copiedCode === offer.code ? (
                            <>
                              <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                              <span className="text-emerald-600 font-bold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" />
                              <span>Copy Code</span>
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Min Order: <strong className="text-foreground">{offer.minOrder}</strong></span>
                        <button
                          type="button"
                          onClick={() => applyAndExplore(offer.code)}
                          className="text-[#7C4EEE] hover:underline font-semibold flex items-center gap-1"
                        >
                          Order with Code <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Gift Card Redeem Section in Offers */}
            <div className="p-6 rounded-3xl border border-border/80 bg-secondary/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-base text-foreground flex items-center gap-2">
                  <Gift className="w-4 h-4 text-[#7C4EEE]" />
                  Have a Cafe Gift Card or Voucher?
                </h3>
                <p className="text-xs text-muted-foreground">
                  Redeem your digital gift card code to top up your wallet balance immediately.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Input
                  value={giftCardCode}
                  onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                  placeholder="Enter Gift Card Code"
                  className="h-10 rounded-xl text-xs font-mono bg-background uppercase w-full md:w-56"
                />
                <Button
                  type="button"
                  disabled={!giftCardCode || redeemGiftCardMutation.isPending}
                  onClick={() => redeemGiftCardMutation.mutate()}
                  className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs h-10 px-5 shrink-0"
                >
                  Redeem
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: 3. ORDERS & LIVE TRACKING */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="border-b border-border/60 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
                  <Package className="w-5 h-5 text-brand-gold" />
                  Your Orders & History
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Track live kitchen status, view invoices, and easily reorder your favorite meals.
                </p>
              </div>

              {/* Status filter tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/50 border border-border/50 text-xs">
                {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setOrderFilter(filter)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg font-semibold transition-all',
                      orderFilter === filter
                        ? 'bg-card text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {filter === 'ALL' ? 'All Orders' : filter === 'ACTIVE' ? 'Live / In-Progress' : 'Completed'}
                  </button>
                ))}
              </div>
            </div>

            {ordersLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 rounded-3xl border border-dashed border-border text-center space-y-4 bg-card/40">
                <Package className="w-12 h-12 mx-auto text-muted-foreground/40" />
                <h3 className="font-serif font-bold text-lg text-foreground">No orders found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {orderFilter === 'ACTIVE' ? 'You have no active orders in progress.' : 'You have not placed any orders yet.'}
                </p>
                <Link to="/menu">
                  <Button className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs h-10 px-5">
                    Browse Menu & Order
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const isActive = !['COMPLETED', 'CANCELLED'].includes(order.status)
                  const progress = progressFor(order.status)

                  return (
                    <div
                      key={order.id}
                      className="p-6 rounded-3xl border border-border/80 bg-card hover:border-border transition-all shadow-2xs space-y-4"
                    >
                      {/* Top Order Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <Link
                              to={`/order-confirmation/${order.orderNumber}`}
                              className="font-serif font-bold text-base text-foreground hover:text-brand-gold transition-colors"
                            >
                              Order #{order.orderNumber}
                            </Link>
                            <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', getStatusColor(order.status))}>
                              {order.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(order.createdAt)} · Type: {order.type || 'DINE_IN'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-serif font-bold text-xl text-foreground">
                            {formatCurrency(Number(order.total))}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleReorder(order)}
                            className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs h-9 px-3.5 shadow-2xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                            Reorder
                          </Button>
                        </div>
                      </div>

                      {/* Live Step Tracker if active */}
                      {isActive && (
                        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-2">
                          <div className="grid grid-cols-5 gap-2">
                            {ORDER_STEPS.map((step, index) => (
                              <div key={step} className="space-y-1">
                                <div className={cn('h-1.5 rounded-full', index <= progress ? 'bg-emerald-500' : 'bg-border/60')} />
                                <p className={cn('truncate text-[9px] font-semibold text-center uppercase tracking-wider', index <= progress ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                                  {step}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Items Summary with Favorites Star */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Items in Order</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {order.items?.map((item) => (
                            <div
                              key={item.id}
                              className="p-2.5 rounded-xl bg-secondary/30 border border-border/40 flex items-center justify-between gap-2 text-xs"
                            >
                              <span className="truncate text-foreground font-medium">
                                {item.quantity}x {item.product?.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => item.product?.id && toggleFavorite(item.product.id)}
                                className={cn(
                                  'p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors shrink-0',
                                  favoriteIds.includes(item.product?.id) && 'text-amber-500 fill-amber-500'
                                )}
                                title="Favorite this item"
                              >
                                <Star className={cn('w-3.5 h-3.5', favoriteIds.includes(item.product?.id) && 'fill-current')} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Review Section for Completed Orders */}
                      {['COMPLETED', 'DELIVERED'].includes(order.status) && (
                        <div className="pt-2 border-t border-border/40">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                            Rate & Review Items
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {order.items?.slice(0, 2).map((item) => {
                              const key = `${order.id}:${item.product?.id}`
                              const draft = reviewDraft[key] ?? { rating: 5, comment: '' }
                              return (
                                <div key={key} className="flex items-center gap-2 p-2 rounded-xl bg-secondary/20 border border-border/40">
                                  <select
                                    value={draft.rating}
                                    onChange={(e) => setReviewDraft({ ...reviewDraft, [key]: { ...draft, rating: Number(e.target.value) } })}
                                    className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                                  >
                                    {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} ★</option>)}
                                  </select>
                                  <Input
                                    value={draft.comment}
                                    onChange={(e) => setReviewDraft({ ...reviewDraft, [key]: { ...draft, comment: e.target.value } })}
                                    placeholder={`Review ${item.product?.name}...`}
                                    className="h-8 rounded-lg text-xs bg-background flex-1"
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => reviewMutation.mutate({
                                      productId: item.product.id,
                                      orderId: order.id,
                                      rating: draft.rating,
                                      comment: draft.comment || undefined,
                                    })}
                                    className="rounded-lg text-xs h-8 px-2.5 bg-brand-gold text-white hover:bg-amber-600 shrink-0"
                                  >
                                    Submit
                                  </Button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: 4. LOYALTY & WALLET */}
        {activeTab === 'rewards' && (
          <div className="space-y-6">
            <div className="border-b border-border/60 pb-4">
              <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Loyalty Club & Cafe Wallet
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Earn points automatically with every cup, unlock higher membership perks, and manage store credits.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Loyalty Card (6 cols) */}
              <div className="lg:col-span-6 space-y-6">
                <div className="p-6 rounded-3xl bg-gradient-to-br from-[#7C4EEE] to-purple-900 text-white shadow-md relative overflow-hidden space-y-5">
                  <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-40 h-40 bg-white/10 rounded-full blur-xl pointer-events-none" />

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/80">Membership Card</span>
                    <Badge className="bg-white/20 hover:bg-white/30 text-white text-xs border-none font-bold">
                      {tierBadge} {tierName} TIER
                    </Badge>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-serif font-bold tracking-tight">
                        {loyalty?.points ?? customer?.loyaltyPoints ?? 0}
                      </span>
                      <span className="text-sm font-semibold text-white/80">Reward Points</span>
                    </div>
                    <p className="text-xs text-white/70 mt-1">
                      Estimated value: <strong className="text-white">{formatCurrency(loyalty?.monetaryValue ?? 0)}</strong>
                    </p>
                  </div>

                  {/* Progress bar */}
                  {loyalty?.nextTier.nextTier && (
                    <div className="space-y-1.5 pt-2 border-t border-white/20">
                      <div className="flex items-center justify-between text-xs text-white/90">
                        <span>Progress to {loyalty.nextTier.nextTier}</span>
                        <span className="font-bold">{loyalty.nextTier.pointsNeeded} pts needed</span>
                      </div>
                      <div className="w-full h-2.5 bg-black/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${loyalty.nextTier.progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Active Perks List */}
                <div className="p-6 rounded-3xl border border-border/80 bg-card space-y-3 shadow-2xs">
                  <h4 className="font-serif font-bold text-sm text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Your Active {tierName} Tier Benefits
                  </h4>
                  <div className="grid grid-cols-1 gap-2 pt-1 text-xs">
                    {(loyalty?.tierDetails?.perks || [
                      'Earn 1 point for every ₹10 spent',
                      'Exclusive seasonal offers and promotions',
                      'Free birthday dessert or drink coupon',
                      'Priority table reservation support',
                    ]).map((perk, i) => (
                      <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-secondary/30 border border-border/40 text-foreground">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Wallet & Gift Cards (6 cols) */}
              <div className="lg:col-span-6 space-y-6">
                <div className="p-6 rounded-3xl border border-border/80 bg-card shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-emerald-600" />
                      <h4 className="font-serif font-bold text-base text-foreground">Cafe Store Wallet</h4>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-bold">
                      Active
                    </Badge>
                  </div>

                  <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-muted-foreground uppercase font-semibold">Available Balance</span>
                      <p className="font-serif text-3xl font-bold text-foreground mt-0.5">
                        {formatCurrency(wallet?.balance ?? 0)}
                      </p>
                    </div>
                    <Link to="/menu">
                      <Button size="sm" className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs h-9 px-4">
                        Use for Order
                      </Button>
                    </Link>
                  </div>

                  {/* Redeem Box */}
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <span className="text-xs font-bold text-foreground">Top-up with Gift Card</span>
                    <div className="flex gap-2">
                      <Input
                        value={giftCardCode}
                        onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                        placeholder="Enter gift card code"
                        className="h-10 rounded-xl text-xs font-mono bg-background uppercase"
                      />
                      <Button
                        type="button"
                        disabled={!giftCardCode || redeemGiftCardMutation.isPending}
                        onClick={() => redeemGiftCardMutation.mutate()}
                        className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs h-10 px-5 shrink-0"
                      >
                        Redeem
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Loyalty Point History */}
                {loyalty?.transactions && loyalty.transactions.length > 0 && (
                  <div className="p-6 rounded-3xl border border-border/80 bg-card shadow-2xs space-y-3">
                    <h4 className="font-serif font-bold text-sm text-foreground">Recent Points Activity</h4>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
                      {loyalty.transactions.slice(0, 6).map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/30 border border-border/40"
                        >
                          <div>
                            <p className="font-semibold text-foreground">{tx.description}</p>
                            <span className="text-[10px] text-muted-foreground">{formatDate(tx.createdAt)}</span>
                          </div>
                          <span className={cn('font-mono font-bold', tx.points > 0 ? 'text-emerald-600' : 'text-rose-600')}>
                            {tx.points > 0 ? `+${tx.points}` : tx.points} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: 5. SAVED ADDRESSES */}
        {activeTab === 'addresses' && (
          <div className="space-y-6">
            <div className="border-b border-border/60 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-brand-gold" />
                  Delivery Address Book
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage your home, office, and preferred delivery destinations for faster checkout.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => setIsAddingAddress(!isAddingAddress)}
                className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs h-9 px-4"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {isAddingAddress ? 'Cancel' : 'Add New Address'}
              </Button>
            </div>

            {/* Add Address Form Accordion */}
            {isAddingAddress && (
              <form onSubmit={submitAddress} className="p-6 rounded-3xl border border-[#7C4EEE]/40 bg-card shadow-md space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                  <Plus className="h-4 w-4 text-[#7C4EEE]" />
                  <h3 className="font-serif font-bold text-base text-foreground">Add New Delivery Address</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Address Label</label>
                    <select
                      value={addressForm.label}
                      onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs"
                    >
                      <option value="Home">Home</option>
                      <option value="Office / Work">Office / Work</option>
                      <option value="Friends & Family">Friends & Family</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Street & Flat / Building Number</label>
                    <Input
                      placeholder="e.g. 42 Main Street, Apt 3B"
                      value={addressForm.street}
                      onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                      className="h-10 rounded-xl text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold">City</label>
                    <Input
                      placeholder="e.g. Mumbai"
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      className="h-10 rounded-xl text-xs bg-background"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">State</label>
                      <Input
                        placeholder="State"
                        value={addressForm.state}
                        onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                        className="h-10 rounded-xl text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Postal Code</label>
                      <Input
                        placeholder="PIN Code"
                        value={addressForm.postalCode}
                        onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                        className="h-10 rounded-xl text-xs bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold">Delivery Instructions (Optional)</label>
                    <Input
                      placeholder="e.g. Leave with security or ring bell"
                      value={addressForm.instructions}
                      onChange={(e) => setAddressForm({ ...addressForm, instructions: e.target.value })}
                      className="h-10 rounded-xl text-xs bg-background"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
                  <Button type="button" variant="outline" onClick={() => setIsAddingAddress(false)} className="rounded-xl text-xs h-10 px-4">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createAddressMutation.isPending} className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs h-10 px-6 font-semibold">
                    Save Address
                  </Button>
                </div>
              </form>
            )}

            {/* Address List Grid */}
            {addressesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
              </div>
            ) : addresses.length === 0 ? (
              <div className="p-10 rounded-3xl border border-dashed border-border text-center space-y-3 bg-card/40">
                <MapPin className="w-10 h-10 mx-auto text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No delivery addresses saved yet.</p>
                <Button
                  type="button"
                  onClick={() => setIsAddingAddress(true)}
                  className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs h-9 px-4"
                >
                  Add Your First Address
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className="p-5 rounded-2xl border border-border/80 bg-card shadow-2xs space-y-3 flex flex-col justify-between hover:border-border transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-sm text-foreground">{address.label}</span>
                          {address.isDefault && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold">
                              Default
                            </Badge>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteAddressMutation.mutate(address.id)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded-lg transition-colors"
                          title="Delete address"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-muted-foreground pt-1">
                        {address.street}, {address.city}, {address.state} {address.postalCode}
                      </p>
                      {address.instructions && (
                        <p className="text-[11px] text-muted-foreground/80 italic">
                          Note: "{address.instructions}"
                        </p>
                      )}
                    </div>

                    {!address.isDefault && (
                      <div className="pt-2 border-t border-border/40">
                        <button
                          type="button"
                          onClick={() => setDefaultAddressMutation.mutate(address)}
                          className="text-xs text-[#7C4EEE] hover:underline font-semibold"
                        >
                          Set as Default Address
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: 6. FAVORITES */}
        {activeTab === 'favorites' && (
          <div className="space-y-6">
            <div className="border-b border-border/60 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-serif font-bold text-foreground flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" />
                  Your Bookmarked Favorites
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Quickly reorder your favorite coffees, desserts, and breakfast favorites with 1 click.
                </p>
              </div>
              <Link to="/menu">
                <Button className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs h-9 px-4">
                  Browse Full Menu
                </Button>
              </Link>
            </div>

            {favoriteProducts.length === 0 ? (
              <div className="p-12 rounded-3xl border border-dashed border-border text-center space-y-4 bg-card/40">
                <Heart className="w-12 h-12 mx-auto text-muted-foreground/30" />
                <h3 className="font-serif font-bold text-lg text-foreground">No favorites saved yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Click the star or heart icon on any product in our menu to save it here for instant reordering.
                </p>
                <Link to="/menu">
                  <Button className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs h-10 px-5">
                    Explore Menu & Star Items
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {favoriteProducts.map((product: any) => (
                  <div
                    key={product.id}
                    className="p-4 rounded-2xl border border-border/80 bg-card shadow-2xs space-y-3 flex flex-col justify-between hover:border-border transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-serif font-bold text-sm text-foreground">{product.name}</h4>
                          <p className="font-semibold text-brand-gold text-xs mt-0.5">
                            {formatCurrency(Number(product.price))}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(product.id)}
                          className="text-rose-500 fill-rose-500 p-1"
                          title="Remove from favorites"
                        >
                          <Heart className="w-4 h-4 fill-current" />
                        </button>
                      </div>

                      {product.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        addItem(product, 1)
                        toast.success(`${product.name} added to cart`)
                      }}
                      className="w-full rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white text-xs h-9 font-semibold"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
                      Add to Cart
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
