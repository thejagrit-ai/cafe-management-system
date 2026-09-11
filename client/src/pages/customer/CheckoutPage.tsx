import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { ordersApi } from '@/api/orders'
import { customersApi } from '@/api/customers'
import { settingsApi } from '@/api/settings'
import { loyaltyApi } from '@/api/loyalty'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, cn } from '@/utils/lib'
import {
  ArrowLeft,
  Coffee,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Store,
  Truck,
  ShieldCheck,
  User,
  Phone,
  Mail,
  UtensilsCrossed,
  Lock,
  Sparkles,
  Check
} from 'lucide-react'
import { toast } from 'sonner'

type DetailErrors = Partial<Record<'name' | 'phone' | 'email', string>>

/** Fallback conversion rate, used only while the loyalty balance is loading. */
const DEFAULT_POINT_VALUE = 10

export default function CheckoutPage() {
  const { t } = useTranslation()
  const { items, subtotal, clearCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const savedTable = typeof window !== 'undefined' ? sessionStorage.getItem('cafe_active_table') : null
  const [tableNumber, setTableNumber] = useState<string>(savedTable || '1')
  const [showChangeTable, setShowChangeTable] = useState(false)
  const [orderType, setOrderType] = useState<'DINE_IN' | 'PICKUP' | 'DELIVERY'>(
    savedTable ? 'DINE_IN' : 'DINE_IN'
  )
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'CASH' | 'ONLINE'>('CARD')
  const [notes, setNotes] = useState('')

  // Simulated card details for upfront approval
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8892')
  const [cardHolder, setCardHolder] = useState(() =>
    user?.customer ? `${user.customer.firstName} ${user.customer.lastName || ''}`.trim() : 'Guest Customer'
  )
  const [cardExpiry, setCardExpiry] = useState('12/28')
  const [cardCvv, setCardCvv] = useState('884')

  // Address state for delivery
  const [customStreet, setCustomStreet] = useState('')
  const [customCity, setCustomCity] = useState('Bengaluru')

  const [guestName, setGuestName] = useState(() =>
    user?.customer ? `${user.customer.firstName} ${user.customer.lastName || ''}`.trim() : ''
  )
  const [guestPhone, setGuestPhone] = useState(() => user?.customer?.phone || '')
  const [guestEmail, setGuestEmail] = useState(() => user?.email || '')

  // Contact-field errors, keyed by field so each input renders its own message.
  // `detailsTouched` keeps the form quiet until the guest actually tries to
  // confirm — flagging empty fields the moment the page opens reads as nagging.
  const [detailErrors, setDetailErrors] = useState<DetailErrors>({})
  const [detailsTouched, setDetailsTouched] = useState(false)

  const { data: addressesData } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => customersApi.getAddresses(),
    enabled: !!user?.id
  })

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get()
  })

  const { data: loyaltyData } = useQuery({
    queryKey: ['my-loyalty'],
    queryFn: () => loyaltyApi.getMyLoyalty(),
    enabled: !!user?.customer?.id,
    retry: false
  })

  const settings = settingsData?.data
  const addresses = addressesData?.data || []
  const [selectedAddressId, setSelectedAddressId] = useState<string>(addresses[0]?.id || '')

  const taxRate = Number(settings?.taxRate || 8)
  const taxAmount = subtotal * (taxRate / 100)
  const deliveryFee = orderType === 'DELIVERY' ? Number(settings?.deliveryFee || 5000) : 0

  // Loyalty redemption. Mirrors the server's rules so the figure shown here is
  // the figure that gets charged: points are worth a fixed amount each and
  // cannot discount more than the goods themselves.
  const loyalty = loyaltyData?.data
  // The server owns the conversion rate; `monetaryValue` is the same balance
  // already priced in currency, so the per-point value falls out of it and the
  // client never keeps a second copy of the rule that could drift.
  const pointValue =
    loyalty && loyalty.points > 0 ? loyalty.monetaryValue / loyalty.points : DEFAULT_POINT_VALUE
  const pointsBalance = loyalty?.points ?? 0
  const maxRedeemablePoints = Math.max(
    Math.min(pointsBalance, Math.floor(subtotal / pointValue)),
    0
  )
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false)
  const pointsRedeemed = useLoyaltyPoints ? maxRedeemablePoints : 0
  const loyaltyDiscount = pointsRedeemed * pointValue

  const total = Math.max(subtotal + taxAmount + deliveryFee - loyaltyDiscount, 0)

  const createOrderMutation = useMutation({
    mutationFn: (data: any) => ordersApi.create(data),
    onSuccess: (response) => {
      toast.success(t('checkout.orderSuccessTitle'))
      clearCart()
      // The balance just changed if points were spent, and points are earned
      // when the order completes - either way the cached figure is stale.
      queryClient.invalidateQueries({ queryKey: ['my-loyalty'] })
      const order = response.data
      if (order?.orderNumber && order?.guestToken && typeof window !== 'undefined') {
        try {
          const stored = JSON.parse(sessionStorage.getItem('cafe_guest_tokens') || '{}')
          stored[order.orderNumber] = order.guestToken
          sessionStorage.setItem('cafe_guest_tokens', JSON.stringify(stored))
        } catch {
          // ignore storage errors
        }
      }
      navigate(`/order-confirmation/${order?.orderNumber}`)
    },
    onError: (error: any) => {
      toast.error(error.message || t('errors.genericTitle'))
    }
  })

  /**
   * Validates the contact block. Returns a field→message map so each input can
   * show its own error inline; a single toast cannot say *which* field is
   * wrong, and on a phone the offending input is usually scrolled off screen.
   */
  const validateDetails = (): DetailErrors => {
    const errors: DetailErrors = {}

    const name = guestName.trim()
    if (!name) {
      errors.name = t('checkout.nameRequiredError')
    } else if (name.length < 2) {
      errors.name = t('checkout.nameTooShortError')
    }

    // Digits only, so spaces, dashes and a +91 prefix all pass. Ten is the
    // shortest real mobile number in the markets this runs in; the upper bound
    // leaves room for a country code.
    const phoneDigits = guestPhone.replace(/\D/g, '')
    if (!phoneDigits) {
      errors.phone = t('checkout.phoneRequiredError')
    } else if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      errors.phone = t('checkout.phoneInvalidError')
    }

    // Email stays optional — plenty of walk-in guests decline one — but a typo
    // in a receipt address is worth catching before the order is placed.
    const email = guestEmail.trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      errors.email = t('checkout.emailInvalidError')
    }

    return errors
  }

  // Once the guest has been shown errors, clear them as they type rather than
  // making them press Confirm again to find out whether the fix took.
  useEffect(() => {
    if (detailsTouched) setDetailErrors(validateDetails())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestName, guestPhone, guestEmail, detailsTouched])

  const handleSelectOrderType = (type: 'DINE_IN' | 'PICKUP' | 'DELIVERY') => {
    setOrderType(type)
    if (type !== 'DINE_IN' && paymentMethod === 'CASH') {
      setPaymentMethod('CARD')
    }
  }

  const handleSubmit = () => {
    if (items.length === 0) {
      toast.error(t('checkout.cartEmptyError'))
      return
    }

    // Contact details are mandatory for every order. Staff need a name to call
    // out and a number to reach when an item is unavailable or a delivery
    // rider cannot find the door; an anonymous ticket leaves the counter with
    // no way to close that loop.
    const detailErrors = validateDetails()
    setDetailErrors(detailErrors)
    setDetailsTouched(true)
    if (Object.keys(detailErrors).length > 0) {
      toast.error(t('checkout.detailsIncompleteError'))
      return
    }

    if (orderType === 'DINE_IN' && (!tableNumber || parseInt(tableNumber, 10) <= 0)) {
      toast.error(t('checkout.invalidTableError'))
      return
    }

    if (orderType === 'DELIVERY' && !selectedAddressId && !customStreet.trim()) {
      toast.error(t('checkout.addressRequiredError'))
      return
    }

    // Guests have no customer record, so their contact details would otherwise
    // be lost: carry them on the order note, which is what the kitchen and
    // counter screens display.
    let finalNotes = notes.trim()
    if (!user) {
      const contact = `Customer: ${guestName.trim()} (Tel: ${guestPhone.trim()})`
      finalNotes = finalNotes ? `${finalNotes} | ${contact}` : contact
      if (guestEmail.trim()) finalNotes += ` (${guestEmail.trim()})`
    }

    const orderData = {
      type: orderType,
      tableNumber: orderType === 'DINE_IN' ? parseInt(tableNumber, 10) : undefined,
      customerId: user?.customer?.id,
      items: items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        notes: item.notes
      })),
      notes: finalNotes || undefined,
      addressId: orderType === 'DELIVERY' && selectedAddressId ? selectedAddressId : undefined,
      redeemPoints: pointsRedeemed > 0 ? pointsRedeemed : undefined,
      paymentMethod: paymentMethod,
      paymentDetails: (paymentMethod === 'CARD' || paymentMethod === 'ONLINE') ? {
        cardNumber: cardNumber.replace(/\s/g, ''),
        cardHolder: cardHolder,
        expiry: cardExpiry,
        transactionId: `TXN-${Date.now()}`
      } : undefined
    }

    createOrderMutation.mutate(orderData)
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-24 text-center max-w-md space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-secondary/80 flex items-center justify-center text-muted-foreground shadow-xs">
          <Coffee className="w-10 h-10 stroke-[1.5] text-[#7C4EEE]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-serif font-bold text-foreground">{t('cart.empty')}</h2>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            {t('checkout.emptyCartDesc')}
          </p>
        </div>
        <Link to="/menu">
          <Button className="rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white px-6 h-11 text-xs font-semibold shadow-md">
            <span>{t('orders.exploreMenu')}</span>
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl space-y-8">
        {/* Navigation Breadcrumb */}
        <Link
          to="/cart"
          className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-[#7C4EEE] transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          <span>{t('checkout.backToCart')}</span>
        </Link>

        {/* Page Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-border/60 pb-5">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground tracking-tight">
              {t('checkout.pageTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-sans">
              {orderType === 'DINE_IN'
                ? t('checkout.dineInSubtitle', { table: tableNumber })
                : t('checkout.expressSubtitle')}
            </p>
          </div>

          {orderType === 'DINE_IN' && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7C4EEE]/10 border border-[#7C4EEE]/20 text-[#7C4EEE] text-xs font-bold font-sans">
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>{t('checkout.tableBadge', { table: tableNumber })}</span>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Main Checkout Sections */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Step 1: Customer Contact Info */}
            <div className="p-6 rounded-2xl border border-border/70 bg-card shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#7C4EEE]/10 text-[#7C4EEE] flex items-center justify-center text-xs font-bold font-serif">
                    1
                  </div>
                  <h2 className="font-serif font-bold text-base text-foreground">
                    {t('checkout.stepCustomer')}
                  </h2>
                </div>
                {!user && (
                  <span className="text-[11px] text-muted-foreground">
                    {t('checkout.guestOrder')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground" htmlFor="checkout-name">
                    {t('checkout.nameOptional')}
                    <span className="text-destructive ml-0.5" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="checkout-name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      onBlur={() => setDetailsTouched(true)}
                      placeholder={t('checkout.namePlaceholder')}
                      aria-required="true"
                      aria-invalid={Boolean(detailErrors.name)}
                      aria-describedby={detailErrors.name ? 'checkout-name-error' : undefined}
                      className={cn('pl-10 h-11 rounded-xl bg-secondary/30 text-xs border-border/80', detailErrors.name && 'border-destructive focus-visible:ring-destructive')}
                    />
                  </div>
                  {detailErrors.name && (
                    <p id="checkout-name-error" role="alert" className="text-[11px] font-medium text-destructive">
                      {detailErrors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground" htmlFor="checkout-phone">
                    {t('checkout.phoneLabel')}
                    <span className="text-destructive ml-0.5" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="checkout-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      onBlur={() => setDetailsTouched(true)}
                      placeholder={t('checkout.phonePlaceholder')}
                      aria-required="true"
                      aria-invalid={Boolean(detailErrors.phone)}
                      aria-describedby={detailErrors.phone ? 'checkout-phone-error' : undefined}
                      className={cn('pl-10 h-11 rounded-xl bg-secondary/30 text-xs border-border/80', detailErrors.phone && 'border-destructive focus-visible:ring-destructive')}
                    />
                  </div>
                  {detailErrors.phone && (
                    <p id="checkout-phone-error" role="alert" className="text-[11px] font-medium text-destructive">
                      {detailErrors.phone}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-semibold text-muted-foreground" htmlFor="checkout-email">
                    {t('checkout.emailLabel')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="checkout-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      onBlur={() => setDetailsTouched(true)}
                      placeholder={t('checkout.emailPlaceholder')}
                      aria-invalid={Boolean(detailErrors.email)}
                      aria-describedby={detailErrors.email ? 'checkout-email-error' : undefined}
                      className={cn('pl-10 h-11 rounded-xl bg-secondary/30 text-xs border-border/80', detailErrors.email && 'border-destructive focus-visible:ring-destructive')}
                    />
                  </div>
                  {detailErrors.email && (
                    <p id="checkout-email-error" role="alert" className="text-[11px] font-medium text-destructive">
                      {detailErrors.email}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Channel & Table Location */}
            <div className="p-6 rounded-2xl border border-border/70 bg-card shadow-xs space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#7C4EEE]/10 text-[#7C4EEE] flex items-center justify-center text-xs font-bold font-serif">
                  2
                </div>
                <h2 className="font-serif font-bold text-base text-foreground">
                  {t('checkout.stepFulfilment')}
                </h2>
              </div>

              {/* Order Channel Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans">
                <button
                  type="button"
                  onClick={() => handleSelectOrderType('DINE_IN')}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all flex items-start gap-3",
                    orderType === 'DINE_IN'
                      ? "border-[#7C4EEE] bg-[#7C4EEE]/5 ring-1 ring-[#7C4EEE]/30 shadow-xs"
                      : "border-border/80 hover:border-border bg-card"
                  )}
                >
                  <div className={cn("p-2 rounded-lg shrink-0", orderType === 'DINE_IN' ? "bg-[#7C4EEE] text-white" : "bg-secondary text-muted-foreground")}>
                    <UtensilsCrossed className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-foreground">{t('checkout.dineIn')}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{t('checkout.dineInDesc')}</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectOrderType('PICKUP')}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all flex items-start gap-3",
                    orderType === 'PICKUP'
                      ? "border-[#7C4EEE] bg-[#7C4EEE]/5 ring-1 ring-[#7C4EEE]/30 shadow-xs"
                      : "border-border/80 hover:border-border bg-card"
                  )}
                >
                  <div className={cn("p-2 rounded-lg shrink-0", orderType === 'PICKUP' ? "bg-[#7C4EEE] text-white" : "bg-secondary text-muted-foreground")}>
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-foreground">{t('checkout.pickup')}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{t('checkout.pickupDesc')}</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectOrderType('DELIVERY')}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all flex items-start gap-3",
                    orderType === 'DELIVERY'
                      ? "border-[#7C4EEE] bg-[#7C4EEE]/5 ring-1 ring-[#7C4EEE]/30 shadow-xs"
                      : "border-border/80 hover:border-border bg-card"
                  )}
                >
                  <div className={cn("p-2 rounded-lg shrink-0", orderType === 'DELIVERY' ? "bg-[#7C4EEE] text-white" : "bg-secondary text-muted-foreground")}>
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-foreground">{t('checkout.delivery')}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{t('checkout.deliveryDesc')}</p>
                  </div>
                </button>
              </div>

              {/* Clean Confirmed Table Display for DINE_IN (No unnecessary table pickers) */}
              {orderType === 'DINE_IN' && (
                <div className="pt-2">
                  <div className="p-4 rounded-xl border border-[#7C4EEE]/30 bg-[#7C4EEE]/5 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[#7C4EEE] text-white flex items-center justify-center font-serif font-bold text-base shadow-xs">
                        #{tableNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs sm:text-sm text-foreground">
                            {t('checkout.tableConfirmed', { table: tableNumber })}
                          </h4>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            {t('checkout.qrActive')}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-sans">
                          {t('checkout.tableNote', { table: tableNumber })}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowChangeTable(!showChangeTable)}
                      className="text-xs font-semibold text-[#7C4EEE] hover:underline px-2 py-1 shrink-0"
                    >
                      {showChangeTable ? t('checkout.hide') : t('checkout.change')}
                    </button>
                  </div>

                  {/* Optional Change Table (Only displayed if customer clicks 'Cambiar') */}
                  {showChangeTable && (
                    <div className="mt-3 p-4 rounded-xl bg-secondary/30 border border-border/70 space-y-2.5 animate-fade-in text-xs">
                      <label className="font-semibold text-muted-foreground">
                        {t('checkout.pickAnotherTable')}
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={99}
                          value={tableNumber}
                          onChange={(e) => setTableNumber(e.target.value)}
                          className="h-9 w-24 rounded-lg bg-card text-center font-bold font-mono text-sm"
                        />
                        <div className="flex flex-wrap gap-1">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => {
                                setTableNumber(String(num))
                                setShowChangeTable(false)
                              }}
                              className={cn(
                                "px-2.5 py-1 rounded-lg border text-xs font-medium transition-all",
                                tableNumber === String(num)
                                  ? "bg-[#7C4EEE] text-white border-[#7C4EEE]"
                                  : "border-border/70 bg-card hover:border-[#7C4EEE]"
                              )}
                            >
                              {t('checkout.tableOption', { number: num })}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Delivery Address fields if DELIVERY */}
              {orderType === 'DELIVERY' && (
                <div className="pt-2 space-y-3 animate-fade-in font-sans text-xs">
                  <label className="font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-[#7C4EEE]" />
                    <span>{t('checkout.deliveryAddress')}</span>
                  </label>

                  {user && addresses.length > 0 ? (
                    <div className="space-y-2">
                      {addresses.map((addr) => (
                        <label
                          key={addr.id}
                          className={cn(
                            "flex items-center justify-between p-3.5 rounded-xl border text-xs cursor-pointer transition-all",
                            selectedAddressId === addr.id
                              ? "border-[#7C4EEE] bg-[#7C4EEE]/5 font-semibold"
                              : "border-border bg-secondary/20"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="address"
                              checked={selectedAddressId === addr.id}
                              onChange={() => setSelectedAddressId(addr.id)}
                              className="accent-[#7C4EEE]"
                            />
                            <span>{addr.street}, {addr.city} ({addr.label})</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="font-medium text-muted-foreground">{t('checkout.streetLabel')}</label>
                        <Input
                          value={customStreet}
                          onChange={(e) => setCustomStreet(e.target.value)}
                          placeholder={t('checkout.streetPlaceholder')}
                          className="h-10 rounded-xl bg-secondary/30"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-medium text-muted-foreground">{t('checkout.cityLabel')}</label>
                        <Input
                          value={customCity}
                          onChange={(e) => setCustomCity(e.target.value)}
                          placeholder={t('checkout.cityPlaceholder')}
                          className="h-10 rounded-xl bg-secondary/30"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 3: Payment Method */}
            <div className="p-6 rounded-2xl border border-border/70 bg-card shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#7C4EEE]/10 text-[#7C4EEE] flex items-center justify-center text-xs font-bold font-serif">
                    3
                  </div>
                  <h2 className="font-serif font-bold text-base text-foreground">
                    {t('checkout.stepPayment')}
                  </h2>
                </div>

                {orderType !== 'DINE_IN' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <Lock className="w-3 h-3" />
                    <span>{t('checkout.securePrepaid')}</span>
                  </span>
                )}
              </div>

              {/* Payment Methods Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans">
                {/* Option 1: Card */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all flex flex-col justify-between relative",
                    paymentMethod === 'CARD'
                      ? "border-[#7C4EEE] bg-[#7C4EEE]/5 ring-1 ring-[#7C4EEE]/30 shadow-xs"
                      : "border-border/80 hover:border-border bg-card"
                  )}
                >
                  <div className="flex justify-between items-center w-full mb-3">
                    <CreditCard className={cn("w-5 h-5", paymentMethod === 'CARD' ? "text-[#7C4EEE]" : "text-muted-foreground")} />
                    {paymentMethod === 'CARD' && (
                      <span className="w-4 h-4 rounded-full bg-[#7C4EEE] text-white flex items-center justify-center text-[10px]">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-foreground">{t('checkout.payCard')}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t('checkout.payCardDesc')}</p>
                  </div>
                </button>

                {/* Option 2: Online Gateway */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('ONLINE')}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all flex flex-col justify-between relative",
                    paymentMethod === 'ONLINE'
                      ? "border-[#7C4EEE] bg-[#7C4EEE]/5 ring-1 ring-[#7C4EEE]/30 shadow-xs"
                      : "border-border/80 hover:border-border bg-card"
                  )}
                >
                  <div className="flex justify-between items-center w-full mb-3">
                    <Smartphone className={cn("w-5 h-5", paymentMethod === 'ONLINE' ? "text-[#7C4EEE]" : "text-muted-foreground")} />
                    {paymentMethod === 'ONLINE' && (
                      <span className="w-4 h-4 rounded-full bg-[#7C4EEE] text-white flex items-center justify-center text-[10px]">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-foreground">{t('checkout.payOnline')}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t('checkout.payOnlineDesc')}</p>
                  </div>
                </button>

                {/* Option 3: Cash (Only for DINE_IN at table) */}
                {orderType === 'DINE_IN' ? (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all flex flex-col justify-between relative",
                      paymentMethod === 'CASH'
                        ? "border-[#7C4EEE] bg-[#7C4EEE]/5 ring-1 ring-[#7C4EEE]/30 shadow-xs"
                        : "border-border/80 hover:border-border bg-card"
                    )}
                  >
                    <div className="flex justify-between items-center w-full mb-3">
                      <Banknote className={cn("w-5 h-5", paymentMethod === 'CASH' ? "text-[#7C4EEE]" : "text-muted-foreground")} />
                      {paymentMethod === 'CASH' && (
                        <span className="w-4 h-4 rounded-full bg-[#7C4EEE] text-white flex items-center justify-center text-[10px]">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-foreground">{t('checkout.payCash')}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t('checkout.payCashDesc')}</p>
                    </div>
                  </button>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-border/80 bg-secondary/30 flex flex-col justify-between opacity-50 cursor-not-allowed">
                    <Banknote className="w-5 h-5 mb-3 text-muted-foreground" />
                    <div>
                      <h4 className="font-bold text-xs text-muted-foreground line-through">{t('checkout.cashLabel')}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t('checkout.cashUnavailable')}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Form */}
              {paymentMethod === 'CARD' && (
                <div className="p-4 rounded-xl border border-border/70 bg-secondary/20 space-y-3 animate-fade-in text-xs font-sans">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="font-semibold flex items-center gap-1.5 text-[11px]">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t('checkout.secureGateway')}</span>
                    </span>
                    <div className="flex gap-1.5 font-mono text-[10px] font-bold">
                      <span className="px-1.5 py-0.5 rounded bg-card border">VISA</span>
                      <span className="px-1.5 py-0.5 rounded bg-card border">MASTERCARD</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="font-semibold text-muted-foreground">{t('checkout.cardNumber')}</label>
                      <Input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4532 0000 0000 0000"
                        className="h-10 rounded-xl font-mono bg-card text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground">{t('checkout.cardHolder')}</label>
                      <Input
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder={t('checkout.cardHolderPlaceholder')}
                        className="h-10 rounded-xl bg-card text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground">{t('checkout.cardExpiry')}</label>
                        <Input
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder={t('checkout.cardExpiryPlaceholder')}
                          className="h-10 rounded-xl text-center font-mono bg-card text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground">{t('checkout.cardCvc')}</label>
                        <Input
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="123"
                          type="password"
                          maxLength={4}
                          className="h-10 rounded-xl text-center font-mono bg-card text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 4: Special Instructions */}
            <div className="p-6 rounded-2xl border border-border/70 bg-card shadow-xs space-y-3 font-sans">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t('checkout.notesLabel')}
              </label>
              <Textarea
                placeholder={t('checkout.notesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl resize-none text-xs bg-secondary/30 min-h-[70px] border-border/80"
              />
            </div>
          </div>

          {/* Sidebar Summary & Final Action */}
          <div className="lg:col-span-4">
            <div className="p-6 rounded-2xl border border-border/70 bg-card space-y-6 sticky top-24 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="font-serif font-bold text-lg text-foreground">
                  {t('checkout.orderSummary')}
                </h3>
                <span className="text-xs font-bold text-[#7C4EEE] bg-[#7C4EEE]/10 px-2 py-0.5 rounded-md font-sans">
                  {t('checkout.itemsBadge', {
                    count: items.reduce((sum, item) => sum + item.quantity, 0),
                  })}
                </span>
              </div>

              {/* Items List */}
              <div className="divide-y divide-border/60 max-h-60 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.product.id} className="py-3 flex justify-between items-center text-xs font-sans">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-foreground block">
                        {item.product.name}
                      </span>
                      <span className="text-muted-foreground text-[11px]">
                        {item.quantity} × {formatCurrency(Number(item.product.price))}
                      </span>
                    </div>
                    <span className="font-bold text-foreground">
                      {formatCurrency(Number(item.product.price) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-2.5 pt-3 border-t border-border/60 text-xs font-sans">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('common.subtotal')}</span>
                  <span className="text-foreground font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('checkout.taxLine', { rate: taxRate })}</span>
                  <span className="text-foreground font-medium">{formatCurrency(taxAmount)}</span>
                </div>
                {orderType === 'DELIVERY' && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('checkout.deliveryLine')}</span>
                    <span className="text-foreground font-medium">{formatCurrency(deliveryFee)}</span>
                  </div>
                )}

                {pointsRedeemed > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>{t('checkout.loyaltyLine', { points: pointsRedeemed })}</span>
                    <span>-{formatCurrency(loyaltyDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-bold text-foreground pt-3 border-t border-border/60 items-baseline">
                  <span className="font-serif text-base">{t('checkout.totalToPay')}</span>
                  <span className="text-[#7C4EEE] font-sans text-xl font-bold">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Loyalty redemption. Only shown to a signed-in customer who has
                  enough points to actually take something off this bill. */}
              {!!user?.customer?.id && pointsBalance > 0 && (
                <label
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl border text-xs transition-colors',
                    maxRedeemablePoints > 0
                      ? 'border-amber-500/30 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10'
                      : 'border-border/60 bg-secondary/30 cursor-not-allowed opacity-70'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={useLoyaltyPoints && maxRedeemablePoints > 0}
                    disabled={maxRedeemablePoints === 0}
                    onChange={(e) => setUseLoyaltyPoints(e.target.checked)}
                    className="mt-0.5 rounded accent-amber-500 w-4 h-4 shrink-0 disabled:cursor-not-allowed"
                  />
                  <span className="space-y-0.5">
                    <span className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      {t('checkout.useLoyaltyPoints')}
                    </span>
                    <span className="block text-muted-foreground">
                      {maxRedeemablePoints > 0
                        ? t('checkout.loyaltyAvailable', {
                            balance: pointsBalance,
                            applied: maxRedeemablePoints,
                            amount: formatCurrency(maxRedeemablePoints * pointValue),
                          })
                        : t('checkout.loyaltyNotEnough', { balance: pointsBalance })}
                    </span>
                  </span>
                </label>
              )}

              {/* Quality Guarantee Pill */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/40 text-[11px] text-muted-foreground font-sans">
                <ShieldCheck className="w-4 h-4 text-[#7C4EEE] shrink-0" />
                <span>{t('checkout.guarantee')}</span>
              </div>

              {/* Submit CTA Button */}
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={createOrderMutation.isPending}
                className="w-full h-12 rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
              >
                {createOrderMutation.isPending ? (
                  <span>{t('checkout.sending')}</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {orderType === 'DINE_IN' && paymentMethod === 'CASH'
                        ? t('checkout.confirmAtTable', { table: tableNumber })
                        : t('checkout.payAndConfirm', { total: formatCurrency(total) })}
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}