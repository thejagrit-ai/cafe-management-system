import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Coffee, MapPin, Phone, Mail } from 'lucide-react'
import Separator from '@/components/home/Separator'

export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="on-dark relative overflow-hidden bg-brand-ink text-white">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 50% 0%, rgba(199,161,122,0.16) 0%, transparent 60%)',
        }}
      />

      <div className="container relative mx-auto py-16">
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="flex items-center gap-2.5">
            <Coffee className="h-6 w-6 text-brand-gold" aria-hidden="true" />
            <span className="font-serif text-2xl">The Coffee Bean Cafe</span>
          </Link>
          <Separator className="mt-6" />
        </div>

        <div className="mt-12 grid gap-10 text-center sm:grid-cols-3 sm:text-left">
          <nav aria-label="Footer">
            <h3 className="font-serif text-lg text-brand-gold">{t('navigation.menu')}</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-white/60">
              <li>
                <Link to="/" className="transition-colors hover:text-white">
                  {t('navigation.home')}
                </Link>
              </li>
              <li>
                <Link to="/menu" className="transition-colors hover:text-white">
                  {t('navigation.menu')}
                </Link>
              </li>
              <li>
                <Link to="/orders" className="transition-colors hover:text-white">
                  {t('navigation.orders')}
                </Link>
              </li>
              <li>
                <Link to="/account" className="transition-colors hover:text-white">
                  {t('navigation.account')}
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h3 className="font-serif text-lg text-brand-gold">{t('landing.hoursFindUs')}</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-white/60">
              <li className="flex items-start justify-center gap-2 sm:justify-start">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" aria-hidden="true" />
                <span>456 Bean Street, Coffeeville, CA 90210</span>
              </li>
              <li className="flex items-center justify-center gap-2 sm:justify-start">
                <Phone className="h-4 w-4 shrink-0 text-brand-gold" aria-hidden="true" />
                <a href="tel:+15552233" className="transition-colors hover:text-white">
                  555-CAFE
                </a>
              </li>
              <li className="flex items-center justify-center gap-2 sm:justify-start">
                <Mail className="h-4 w-4 shrink-0 text-brand-gold" aria-hidden="true" />
                <a href="mailto:hello@thecoffeebean.cafe" className="transition-colors hover:text-white">
                  hello@thecoffeebean.cafe
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif text-lg text-brand-gold">{t('landing.hoursTitle')}</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-white/60">
              <li className="flex justify-between gap-4">
                <span>{t('landing.hoursWeekdays')}</span>
                <span className="text-white/80">07:00 — 21:00</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>{t('landing.hoursSaturday')}</span>
                <span className="text-white/80">07:00 — 21:00</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>{t('landing.hoursSunday')}</span>
                <span className="text-white/80">08:00 — 18:00</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-7 text-center text-xs text-white/40">
          © {year} The Coffee Bean Cafe. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
