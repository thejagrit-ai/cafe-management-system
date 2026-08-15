import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { useReveal } from '@/hooks/useReveal'
import { cn } from '@/utils/lib'
import Separator from './Separator'

/**
 * Testimonial carousel. The source design used Swiper; this is a small
 * controlled slider instead, which keeps the dependency out of the bundle and
 * stays keyboard accessible.
 */
const TESTIMONIALS = [
  {
    quote:
      'The flat white here ruined every other flat white for me. You can taste that the beans were roasted this week, not last quarter.',
    name: 'Priya N.',
    role: 'Regular since opening',
  },
  {
    quote:
      'I work from the corner table most Tuesdays. Nobody rushes you, the wifi holds, and the croissants come out of the oven at eleven.',
    name: 'Marcus D.',
    role: 'Freelance designer',
  },
  {
    quote:
      'Ordered ahead for a team of nine and it was ready, labelled and still hot. That never happens.',
    name: 'Elena R.',
    role: 'Office manager',
  },
]

export default function Testimonials() {
  const { t } = useTranslation()
  const reveal = useReveal<HTMLDivElement>()
  const [index, setIndex] = useState(0)

  const go = (direction: 1 | -1) => {
    setIndex((current) => (current + direction + TESTIMONIALS.length) % TESTIMONIALS.length)
  }

  return (
    <section className="py-20 xl:py-32">
      <div className="container mx-auto">
        <div ref={reveal} className="reveal flex flex-col items-center text-center">
          <span className="eyebrow">{t('landing.testimonialsEyebrow')}</span>
          <h2 className="h2 mt-3">{t('landing.testimonialsTitle')}</h2>
          <Separator className="mt-6" />
        </div>

        <div className="relative mx-auto mt-14 max-w-3xl">
          <Quote className="mx-auto h-10 w-10 text-brand-gold/40" aria-hidden="true" />

          <div aria-live="polite" className="mt-6 text-center">
            <blockquote className="font-serif text-[26px] leading-snug sm:text-[32px] xl:text-[38px]">
              “{TESTIMONIALS[index].quote}”
            </blockquote>
            <div className="mt-7">
              <div className="font-semibold">{TESTIMONIALS[index].name}</div>
              <div className="text-sm text-muted-foreground">{TESTIMONIALS[index].role}</div>
            </div>
          </div>

          <div className="mt-10 flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => go(-1)}
              className="rounded-full border border-border p-2.5 text-foreground transition-colors hover:border-brand-gold hover:text-brand-gold"
              aria-label={t('landing.previous')}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex gap-2">
              {TESTIMONIALS.map((entry, i) => (
                <button
                  key={entry.name}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`${i + 1} / ${TESTIMONIALS.length}`}
                  aria-current={i === index}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === index ? 'w-7 bg-brand-gold' : 'w-1.5 bg-border hover:bg-brand-gold/50'
                  )}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => go(1)}
              className="rounded-full border border-border p-2.5 text-foreground transition-colors hover:border-brand-gold hover:text-brand-gold"
              aria-label={t('landing.next')}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
