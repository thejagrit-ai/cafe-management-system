import { useState, useEffect, useCallback, useRef } from 'react'
import { soundService } from '@/utils/sound'
import { toast } from 'sonner'
import type { Order } from '@/types'

interface UseOrderNotificationOptions {
  orders?: Order[] | any[]
  enabled?: boolean
}

// Module-level cache to track all known/notified order IDs across the entire browser session.
// This prevents false alerts when switching pages, filters, pagination, or tabs.
const sessionNotifiedOrderIds = new Set<string>()
const sessionStartTime = Date.now()
let isSessionInitialRun = true

export function useOrderNotification({ orders, enabled = true }: UseOrderNotificationOptions = {}) {
  const [isMuted, setIsMuted] = useState<boolean>(() => soundService.isSoundMuted())
  const hasInitializedThisInstance = useRef(false)

  useEffect(() => {
    if (!enabled || !orders || orders.length === 0) return

    // On the very first data fetch of the session, register all existing historical orders
    // as already known without firing any notifications or sounds.
    if (isSessionInitialRun || !hasInitializedThisInstance.current) {
      orders.forEach((o: any) => {
        if (o?.id) sessionNotifiedOrderIds.add(o.id)
      })
      isSessionInitialRun = false
      hasInitializedThisInstance.current = true
      return
    }

    const brandNewPendingOrders: any[] = []

    for (const order of orders) {
      if (!order?.id) continue

      // If we have already seen this order in this session, skip
      if (sessionNotifiedOrderIds.has(order.id)) continue

      // Always mark as seen immediately so pagination/filtering changes don't treat old orders as new
      sessionNotifiedOrderIds.add(order.id)

      // Only notify if the order was created AFTER the session started (or within 30s before)
      // AND has status PENDING (awaiting kitchen/staff attention).
      const orderCreatedAt = order.createdAt ? new Date(order.createdAt).getTime() : 0
      const isFresh = orderCreatedAt >= sessionStartTime - 30_000
      const isPending = order.status === 'PENDING' || !order.status

      if (isFresh && isPending) {
        brandNewPendingOrders.push(order)
      }
    }

    if (brandNewPendingOrders.length > 0) {
      // Play order chime once for the new incoming batch
      soundService.playOrderChime()

      // Display clean toast for genuine real-time incoming orders
      brandNewPendingOrders.forEach((order: any) => {
        const tableText = order.tableNumber
          ? `Mesa #${order.tableNumber}`
          : order.type === 'DINE_IN'
          ? 'En Mesa'
          : order.type === 'PICKUP'
          ? 'Para Llevar'
          : 'Domicilio'

        const customer =
          order.customerName ||
          (order.customer ? `${order.customer.firstName} ${order.customer.lastName || ''}`.trim() : 'Cliente en barra')

        toast.info(`🔔 ¡Nueva Comanda! #${order.orderNumber || order.id?.slice(-4)}`, {
          description: `${tableText} · ${customer}`,
          duration: 6000,
        })
      })
    }
  }, [orders, enabled])

  const toggleMute = useCallback(() => {
    const next = soundService.toggleMute()
    setIsMuted(next)
    if (next) {
      toast('Sonido desactivado', { icon: '🔇' })
    } else {
      toast('Sonido activado', { icon: '🔔' })
      soundService.playOrderChime()
    }
  }, [])

  const testSound = useCallback(() => {
    if (isMuted) {
      soundService.setSoundMuted(false)
      setIsMuted(false)
    }
    soundService.playOrderChime()
    toast.success('Sonido de prueba reproducido', { icon: '🔔' })
  }, [isMuted])

  return {
    isMuted,
    toggleMute,
    testSound,
  }
}
