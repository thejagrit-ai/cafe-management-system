import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { ordersApi } from '@/api/orders'
import { customersApi } from '@/api/customers'
import { settingsApi } from '@/api/settings'
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
  ChevronRight,
  Check
} from 'lucide-react'
import { toast } from 'sonner'

export default function CheckoutPage() {
  const { t } = useTranslation()
  const { items, subtotal, clearCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

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
    user?.customer ? `${user.customer.firstName} ${user.customer.lastName || ''}`.trim() : 'Cliente Origin'
  )
  const [cardExpiry, setCardExpiry] = useState('12/28')
  const [cardCvv, setCardCvv] = useState('884')

  // Address state for delivery
  const [customStreet, setCustomStreet] = useState('')
  const [customCity, setCustomCity] = useState('Bogotá')

  const [guestName, setGuestName] = useState(() =>
    user?.customer ? `${user.customer.firstName} ${user.customer.lastName || ''}`.trim() : ''
  )
  const [guestPhone, setGuestPhone] = useState(() => user?.customer?.phone || '')
  const [guestEmail, setGuestEmail] = useState(() => user?.email || '')

  const { data: addressesData } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => customersApi.getAddresses(),
    enabled: !!user?.id
  })

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get()
  })

  const settings = settingsData?.data
  const addresses = addressesData?.data || []
  const [selectedAddressId, setSelectedAddressId] = useState<string>(addresses[0]?.id || '')

  const taxRate = Number(settings?.taxRate || 8)
  const taxAmount = subtotal * (taxRate / 100)
  const deliveryFee = orderType === 'DELIVERY' ? Number(settings?.deliveryFee || 5000) : 0
  const total = subtotal + taxAmount + deliveryFee

  const createOrderMutation = useMutation({
    mutationFn: (data: any) => ordersApi.create(data),
    onSuccess: (response) => {
      toast.success(t('checkout.orderSuccessTitle'))
      clearCart()
      navigate(`/order-confirmation/${response.data?.orderNumber}`)
    },
    onError: (error: any) => {
      toast.error(error.message || t('errors.genericTitle'))
    }
  })

  const handleSelectOrderType = (type: 'DINE_IN' | 'PICKUP' | 'DELIVERY') => {
    setOrderType(type)
    if (type !== 'DINE_IN' && paymentMethod === 'CASH') {
      setPaymentMethod('CARD')
    }
  }

  const handleSubmit = () => {
    if (items.length === 0) {
      toast.error('Tu carrito está vacío')
      return
    }

    if (orderType === 'DINE_IN' && (!tableNumber || parseInt(tableNumber, 10) <= 0)) {
      toast.error('Por favor ingresa un número de mesa válido')
      return
    }

    if (orderType === 'DELIVERY' && !selectedAddressId && !customStreet.trim()) {
      toast.error('Por favor ingresa o selecciona una dirección de entrega')
      return
    }

    let finalNotes = notes.trim()
    if (guestName && !user) {
      finalNotes = finalNotes ? `${finalNotes} | Cliente: ${guestName}` : `Cliente: ${guestName}`
      if (guestPhone) finalNotes += ` (Tel: ${guestPhone})`
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
          <h2 className="text-2xl font-serif font-bold text-foreground">Tu carrito está vacío</h2>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Explora nuestro menú de cafés de especialidad, postres y delicias antes de ordenar.
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
          <span>Volver al Carrito</span>
        </Link>

        {/* Page Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-border/60 pb-5">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground tracking-tight">
              Finalizar Pedido
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-sans">
              {orderType === 'DINE_IN'
                ? `Servicio a mesa · Mesa #${tableNumber} confirmada`
                : 'Confirmación express con despacho inmediato'}
            </p>
          </div>

          {orderType === 'DINE_IN' && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7C4EEE]/10 border border-[#7C4EEE]/20 text-[#7C4EEE] text-xs font-bold font-sans">
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Mesa #{tableNumber}</span>
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
                    Datos del Cliente
                  </h2>
                </div>
                {!user && (
                  <span className="text-[11px] text-muted-foreground">
                    Pedido como Invitado
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">
                    Nombre (Opcional)
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Tu nombre (opcional)"
                      className="pl-10 h-11 rounded-xl bg-secondary/30 text-xs border-border/80"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">
                    Teléfono / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+57 300 123 4567"
                      className="pl-10 h-11 rounded-xl bg-secondary/30 text-xs border-border/80"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-semibold text-muted-foreground">
                    Correo Electrónico (para recibo digital)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      className="pl-10 h-11 rounded-xl bg-secondary/30 text-xs border-border/80"
                    />
                  </div>
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
                  Tipo de Entrega
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
                    <h4 className="font-bold text-xs text-foreground">En Mesa</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Servicio a tu mesa</p>
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
                    <h4 className="font-bold text-xs text-foreground">Para Llevar</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Retiro en barra</p>
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
                    <h4 className="font-bold text-xs text-foreground">A Domicilio</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Directo a tu puerta</p>
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
                            Mesa #{tableNumber} Confirmada
                          </h4>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            QR Activo
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-sans">
                          Los baristas llevarán tu pedido directamente a la mesa #{tableNumber}.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowChangeTable(!showChangeTable)}
                      className="text-xs font-semibold text-[#7C4EEE] hover:underline px-2 py-1 shrink-0"
                    >
                      {showChangeTable ? 'Ocultar' : 'Cambiar'}
                    </button>
                  </div>

                  {/* Optional Change Table (Only displayed if customer clicks 'Cambiar') */}
                  {showChangeTable && (
                    <div className="mt-3 p-4 rounded-xl bg-secondary/30 border border-border/70 space-y-2.5 animate-fade-in text-xs">
                      <label className="font-semibold text-muted-foreground">
                        Ingresa o selecciona otro número de mesa:
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
                              Mesa {num}
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
                    <span>Dirección de Entrega</span>
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
                        <label className="font-medium text-muted-foreground">Calle / Carrera / Apto *</label>
                        <Input
                          value={customStreet}
                          onChange={(e) => setCustomStreet(e.target.value)}
                          placeholder="Ej. Calle 93 # 12-45, Apto 402"
                          className="h-10 rounded-xl bg-secondary/30"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-medium text-muted-foreground">Ciudad *</label>
                        <Input
                          value={customCity}
                          onChange={(e) => setCustomCity(e.target.value)}
                          placeholder="Bogotá, Medellín, etc."
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
                    Método de Pago
                  </h2>
                </div>

                {orderType !== 'DINE_IN' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <Lock className="w-3 h-3" />
                    <span>Pago Seguro Anticipado</span>
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
                    <h4 className="font-bold text-xs text-foreground">Tarjeta Débito / Crédito</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">Visa, Mastercard, Amex</p>
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
                    <h4 className="font-bold text-xs text-foreground">PSE / Nequi / Daviplata</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">Transferencia instantánea</p>
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
                      <h4 className="font-bold text-xs text-foreground">Pagar en Mesa / Caja</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">Efectivo al terminar</p>
                    </div>
                  </button>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-border/80 bg-secondary/30 flex flex-col justify-between opacity-50 cursor-not-allowed">
                    <Banknote className="w-5 h-5 mb-3 text-muted-foreground" />
                    <div>
                      <h4 className="font-bold text-xs text-muted-foreground line-through">Efectivo</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Solo pago anticipado para llevar</p>
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
                      <span>Pasarela Segura Encriptada 256-bit</span>
                    </span>
                    <div className="flex gap-1.5 font-mono text-[10px] font-bold">
                      <span className="px-1.5 py-0.5 rounded bg-card border">VISA</span>
                      <span className="px-1.5 py-0.5 rounded bg-card border">MASTERCARD</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="font-semibold text-muted-foreground">Número de Tarjeta</label>
                      <Input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4532 0000 0000 0000"
                        className="h-10 rounded-xl font-mono bg-card text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground">Nombre del Titular</label>
                      <Input
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="Como figura en el plástico"
                        className="h-10 rounded-xl bg-card text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground">Expiración</label>
                        <Input
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/AA"
                          className="h-10 rounded-xl text-center font-mono bg-card text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-muted-foreground">CVC / CVV</label>
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
                Notas / Instrucciones para el Barista
              </label>
              <Textarea
                placeholder="Ej. Leche deslactosada, sin azúcar, extra caliente..."
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
                  Resumen de la Orden
                </h3>
                <span className="text-xs font-bold text-[#7C4EEE] bg-[#7C4EEE]/10 px-2 py-0.5 rounded-md font-sans">
                  {items.reduce((sum, item) => sum + item.quantity, 0)} items
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
                  <span>Subtotal</span>
                  <span className="text-foreground font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Impuesto ({taxRate}%)</span>
                  <span className="text-foreground font-medium">{formatCurrency(taxAmount)}</span>
                </div>
                {orderType === 'DELIVERY' && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Costo de Domicilio</span>
                    <span className="text-foreground font-medium">{formatCurrency(deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-foreground pt-3 border-t border-border/60 items-baseline">
                  <span className="font-serif text-base">Total a Pagar</span>
                  <span className="text-[#7C4EEE] font-sans text-xl font-bold">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Quality Guarantee Pill */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/40 text-[11px] text-muted-foreground font-sans">
                <ShieldCheck className="w-4 h-4 text-[#7C4EEE] shrink-0" />
                <span>Garantía Origin Coffee · Preparación en vivo</span>
              </div>

              {/* Submit CTA Button */}
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={createOrderMutation.isPending}
                className="w-full h-12 rounded-xl bg-[#7C4EEE] hover:bg-[#683BD6] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
              >
                {createOrderMutation.isPending ? (
                  <span>Enviando comanda a cocina...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {orderType === 'DINE_IN' && paymentMethod === 'CASH'
                        ? `Confirmar Pedido en Mesa #${tableNumber}`
                        : `Pagar y Confirmar (${formatCurrency(total)})`}
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