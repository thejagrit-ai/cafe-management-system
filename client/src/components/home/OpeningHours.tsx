import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { MapPin, Phone, Clock } from 'lucide-react'
import { settingsApi } from '@/api/settings'
import { useReveal } from '@/hooks/useReveal'
import Separator from './Separator'

export default function OpeningHours() {
  const { t } = useTranslation()
  const headerReveal = useReveal<HTMLDivElement>()
  const contentReveal = useReveal<HTMLDivElement>()

  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  })

  const opening = data?.data?.openingTime ?? '07:00'
  const closing = data?.data?.closingTime ?? '21:00'

  const schedule = [
    { label: t('landing.hoursWeekdays'), value: `${opening} — ${closing}` },
    { label: t('landing.hoursSaturday'), value: `${opening} — ${closing}` },
    { label: t('landing.hoursSunday'), value: `08:00 — 18:00` },
  ]

  return (
    <section
      id="opening-hours"
      className="on-dark relative overflow-hidden bg-brand-ink py-20 text-white xl:py-32"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 80% 20%, rgba(199,161,122,0.22) 0%, transparent 55%)',
        }}
      />

      <div className="container relative mx-auto px-4 sm:px-6">
        <div ref={headerReveal} className="reveal flex flex-col items-center text-center">
          <span className="eyebrow">{t('landing.hoursEyebrow')}</span>
          <h2 className="h2 mt-3 text-white">{t('landing.hoursTitle')}</h2>
          <Separator className="mt-6" />
        </div>

        <div ref={contentReveal} className="mx-auto mt-14 grid max-w-4xl gap-10 md:grid-cols-2 reveal">
          <div className="space-y-1 p-6 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
            {schedule.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4 border-b border-white/10 py-3.5"
              >
                <span className="text-white/80 text-sm font-medium">{row.label}</span>
                <span className="font-serif text-lg font-bold text-brand-gold">{row.value}</span>
              </div>
            ))}
            <p className="pt-4 text-xs text-white/50">{t('landing.hoursNote')}</p>
          </div>

          <div className="space-y-5 p-6 rounded-2xl bg-white/5 border border-white/10 shadow-lg flex flex-col justify-center text-sm">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-brand-gold/15 text-brand-gold shrink-0">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <span className="block font-semibold text-white">
                  {t('landing.contactAddressTitle')}
                </span>
                <p className="mt-0.5 text-xs text-white/70">
                  Calle 93 # 12-45, Chicó Norte, Bogotá
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-brand-gold/15 text-brand-gold shrink-0">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <span className="block font-semibold text-white">
                  {t('landing.contactPhoneTitle')}
                </span>
                <p className="mt-0.5 text-xs text-white/70 font-mono">
                  +57 (1) 745-8890
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-brand-gold/15 text-brand-gold shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="block font-semibold text-white">
                  {t('landing.contactDineInTitle')}
                </span>
                <p className="mt-0.5 text-xs text-white/70">
                  {t('landing.contactDineInDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
