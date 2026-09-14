import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { productsApi } from '@/api/products'
import { ProductCard } from '@/components/ProductCard'

const collections = [
  { name: 'The classics', note: 'Rich espresso. Silky milk. Pure comfort.', image: 'classic-cappuccino', label: 'WARM & FAMILIAR', alt: 'Cappuccino with latte art' },
  { name: 'Something chilled', note: 'A refreshing change of pace.', image: 'cold-brew', label: 'COOL & UNHURRIED', alt: 'Cold coffee served over ice' },
  { name: 'A sweeter moment', note: 'Because coffee loves a little company.', image: 'butter-croissant', label: 'THE PERFECT PAIRING', alt: 'Golden butter croissant' },
]

export default function MenuPreview() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['home-featured'],
    queryFn: () => productsApi.getFeatured(3),
  })
  const products = data?.data ?? []

  return (
    <section className="coffee-section coffee-menu" id="coffee-menu" aria-labelledby="menu-title">
      <div className="coffee-section-heading">
        <div><span className="coffee-kicker">FIND YOUR DAILY RITUAL</span><h2 id="menu-title">A cup for <em>every mood.</em></h2></div>
        <Link to="/menu" className="coffee-text-link">View full menu <ArrowUpRight size={17} /></Link>
      </div>
      <div className="coffee-collection-grid">
        {collections.map((collection, index) => (
          <Link to="/menu" className="coffee-collection" key={collection.name}>
            <div className="coffee-collection-image"><img src={`/assets/products/${collection.image}.jpg`} alt={collection.alt} loading="lazy" width={600} height={600} /><span>0{index + 1} / {collection.label}</span><div className="coffee-collection-arrow"><ArrowUpRight size={22} /></div></div>
            <h3>{collection.name}</h3><p>{collection.note}</p>
          </Link>
        ))}
      </div>
      {products.length > 0 && <div className="coffee-featured"><div className="coffee-section-heading"><h3>On the menu today</h3><span className="coffee-kicker">PICK YOUR FAVORITE</span></div><div className="coffee-collection-grid">{products.map(product => <ProductCard key={product.id} product={product} />)}</div></div>}
      {isPending && <p className="coffee-menu-status" role="status">Finding today's featured coffees…</p>}
      {isError && <p className="coffee-menu-status" role="status">Today's selections are taking a little longer to load. <Link to="/menu">Visit the menu to try again.</Link></p>}
    </section>
  )
}
