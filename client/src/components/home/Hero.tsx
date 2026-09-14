import { ArrowDown, ArrowUpRight, Coffee } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section className="coffee-hero" aria-labelledby="hero-title">
      <div className="coffee-hero-copy">
        <span className="coffee-kicker"><span /> A little ritual. A lot of soul.</span>
        <h1 id="hero-title">Life tastes<br />better with<br /><em>good coffee.</em></h1>
        <p>For slow mornings, big ideas, and everything in between. Find your moment in a cup crafted just for you.</p>
        <div className="coffee-hero-actions">
          <Link to="/menu" className="coffee-button">Explore the menu <ArrowUpRight size={18} /></Link>
          <a href="#our-story" className="coffee-text-link">Our story <ArrowUpRight size={16} /></a>
        </div>
        <div className="coffee-hero-note"><Coffee size={22} strokeWidth={1.3} /><span>Made with care.<br /><strong>Meant to be savored.</strong></span></div>
      </div>
      <div className="coffee-hero-visual">
        <img src="/assets/products/classic-cappuccino.jpg" alt="Fresh cappuccino with delicate latte art in a ceramic cup" fetchPriority="high" width={1024} height={577} />
        <div className="coffee-image-shade" />
        <div className="coffee-roundel"><Coffee size={27} strokeWidth={1.2} /><span>GOOD COFFEE<br />GOOD COMPANY</span></div>
        <div className="coffee-photo-caption"><span>THE EVERYDAY, ELEVATED</span><p>Your favorite kind<br />of <em>coffee break.</em></p></div>
        <a className="coffee-scroll" href="#coffee-menu" aria-label="Discover our coffee"><ArrowDown size={20} /></a>
      </div>
    </section>
  )
}
