import Hero from '@/components/home/Hero'
import Explore from '@/components/home/Explore'
import About from '@/components/home/About'
import MenuPreview from '@/components/home/MenuPreview'
import OpeningHours from '@/components/home/OpeningHours'
import Testimonials from '@/components/home/Testimonials'

export default function HomePage() {
  return (
    <>
      <Hero />
      <Explore />
      <About />
      <MenuPreview />
      <OpeningHours />
      <Testimonials />
    </>
  )
}
