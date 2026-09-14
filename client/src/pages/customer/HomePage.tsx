import { ArrowUpRight, Coffee, Heart, Leaf } from 'lucide-react'
import { Link } from 'react-router-dom'
import Hero from '@/components/home/Hero'
import MenuPreview from '@/components/home/MenuPreview'
import OpeningHours from '@/components/home/OpeningHours'
import '@/styles/coffee-storefront.css'

export default function HomePage() {
  return (
    <div className="coffee-home">
      <Hero />
      <div className="coffee-values" aria-label="The Coffee Bean experience">
        <span><Coffee size={17} /> Thoughtfully crafted coffee</span><i aria-hidden="true">✦</i>
        <span><Leaf size={17} /> A taste for the little things</span><i aria-hidden="true">✦</i>
        <span><Heart size={17} /> Always a warm welcome</span>
      </div>
      <MenuPreview />
      <section className="coffee-story coffee-section" id="our-story" aria-labelledby="story-title">
        <div className="coffee-story-visual">
          <img src="/assets/auth/cafe.jpg" alt="Espresso being freshly extracted into a white ceramic cup" loading="lazy" width={900} height={1200} />
          <div className="coffee-story-label">The art is in<br /><em>the details.</em></div>
        </div>
        <div className="coffee-story-copy">
          <span className="coffee-kicker">MORE THAN WHAT'S IN YOUR CUP</span>
          <h2 id="story-title">A love for coffee.<br /><em>A place for you.</em></h2>
          <p>We believe the best part of a coffee break is the way it makes you feel. The first sip. A familiar face. A little time to make the day your own.</p>
          <p>From a rich espresso to something sweet on the side, we're here to make your everyday ritual a little more special.</p>
          <div className="coffee-story-details"><div><Coffee size={22} strokeWidth={1.3} /><h3>Care in every cup</h3><p>Good ingredients. Thoughtful preparation.</p></div><div><Heart size={22} strokeWidth={1.3} /><h3>Come as you are</h3><p>Your daily pause, your own way.</p></div></div>
          <a href="#opening-hours" className="coffee-text-link">Make time for a coffee <ArrowUpRight size={17} /></a>
        </div>
      </section>
      <section className="coffee-invitation">
        <span className="coffee-kicker">YOUR NEXT FAVORITE MOMENT</span>
        <h2>A good day starts<br />with <em>a great cup.</em></h2>
        <p>Something bold. Something smooth. Something just for you.</p>
        <Link to="/menu" className="coffee-button">Find your favorite <ArrowUpRight size={18} /></Link>
      </section>
      <OpeningHours />
    </div>
  )
}
