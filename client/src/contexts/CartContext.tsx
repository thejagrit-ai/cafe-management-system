import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CartItem, Product } from '@/types'

const STORAGE_KEY = 'cafe_cart'

interface CartContextType {
  items: CartItem[]
  itemCount: number
  subtotal: number
  addItem: (product: Product, quantity?: number, notes?: string) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  isInCart: (productId: string) => boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

/** Reads the persisted cart, tolerating absent or corrupt storage. */
function readStoredCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is CartItem =>
        !!entry?.product?.id && typeof entry.quantity === 'number' && entry.quantity > 0
    )
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readStoredCart)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Storage can be full or blocked (private browsing); the cart still works
      // for this session, so this is not worth surfacing to the customer.
    }
  }, [items])

  const addItem = (product: Product, quantity = 1, notes?: string) => {
    if (quantity < 1) return
    setItems((current) => {
      const existing = current.find((entry) => entry.product.id === product.id)
      if (existing) {
        return current.map((entry) =>
          entry.product.id === product.id
            ? { ...entry, quantity: entry.quantity + quantity, notes: notes ?? entry.notes }
            : entry
        )
      }
      return [...current, { product, quantity, notes }]
    })
  }

  const removeItem = (productId: string) => {
    setItems((current) => current.filter((entry) => entry.product.id !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    // Dropping to zero removes the line rather than storing an empty one.
    if (quantity < 1) {
      removeItem(productId)
      return
    }
    setItems((current) =>
      current.map((entry) => (entry.product.id === productId ? { ...entry, quantity } : entry))
    )
  }

  const clearCart = () => setItems([])

  const itemCount = useMemo(
    () => items.reduce((sum, entry) => sum + entry.quantity, 0),
    [items]
  )

  // Display only. The server recalculates every total from its own prices when
  // the order is placed, so this figure is never trusted for billing.
  const subtotal = useMemo(
    () => items.reduce((sum, entry) => sum + Number(entry.product.price) * entry.quantity, 0),
    [items]
  )

  const value: CartContextType = {
    items,
    itemCount,
    subtotal,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    isInCart: (productId) => items.some((entry) => entry.product.id === productId),
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
