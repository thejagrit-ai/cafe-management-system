import type { Product } from '@/types'

const menuPhotoByKeyword: Array<[string[], string]> = [
  [['cold brew', 'iced', 'nitro'], '/assets/products/premium-cold-coffee.png'],
  [['croissant', 'muffin', 'cookie'], '/assets/products/premium-pastry.png'],
  [['toast', 'panini', 'baguette'], '/assets/products/premium-sandwich.png'],
  [['smoothie', 'bowl'], '/assets/products/premium-smoothie-bowl.png'],
  [['matcha', 'chai', 'tea'], '/assets/products/premium-tea-matcha.png'],
  [['latte', 'cappuccino', 'mocha', 'espresso', 'pour-over'], '/assets/products/premium-hot-coffee.png'],
]

/** Keeps the customer menu free from placeholder or unrelated legacy photos. */
export function getProductImage(product: Product) {
  const name = product.name.toLowerCase()
  return menuPhotoByKeyword.find(([keywords]) => keywords.some((keyword) => name.includes(keyword)))?.[1] ?? product.imageUrl
}
