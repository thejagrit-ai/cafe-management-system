import { useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import Badge from './Badge'
import Separator from './Separator'

/**
 * Pinned horizontal-scroll story section, as in the source design: the section
 * sticks to the viewport and three panels slide sideways as you scroll down.
 *
 * The source used `end: "1800vw top"`, which demands eighteen viewport widths
 * of scrolling. That is a lot on a page where this is one section of six, so
 * the distance here is expressed relative to the panel count and tuned to feel
 * the same without holding the page hostage.
 *
 * Below the xl breakpoint the panels stack vertically instead: pinning plus
 * horizontal translation fights touch scrolling on phones.
 */
export default function About() {
  const { t } = useTranslation()
  const trackRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const panels = [
    {
      title: t('landing.aboutTitle') + ' ' + t('landing.aboutTitleAccent'),
      body: t('landing.aboutLead'),
      stat: '2024',
      statLabel: t('landing.statEstablished'),
    },
    {
      title: t('landing.aboutPanel2Title'),
      body: t('landing.aboutBody1'),
      stat: '100%',
      statLabel: t('landing.statBeans'),
    },
    {
      title: t('landing.aboutPanel3Title'),
      body: t('landing.aboutBody2'),
      stat: '24h',
      statLabel: t('landing.statSteep'),
    },
  ]

  useLayoutEffect(() => {
    const track = trackRef.current
    const trigger = triggerRef.current
    if (!track || !trigger) return

    gsap.registerPlugin(ScrollTrigger)

    // gsap.matchMedia scopes the animation to a breakpoint and reverts it
    // automatically when the query stops matching or the component unmounts.
    const mm = gsap.matchMedia()

    mm.add(
      {
        isDesktop: '(min-width: 1200px) and (prefers-reduced-motion: no-preference)',
      },
      (context) => {
        if (!context.conditions?.isDesktop) return

        const distance = track.scrollWidth - window.innerWidth

        gsap.to(track, {
          x: -distance,
          ease: 'none',
          scrollTrigger: {
            trigger,
            start: 'top top',
            // Scroll distance matches the horizontal travel, so the panels move
            // at roughly the speed of the wheel.
            end: () => `+=${distance}`,
            scrub: 0.6,
            pin: true,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        })
      }
    )

    // Sections above this one fetch their content, so the page keeps growing
    // after mount. ScrollTrigger caches start/end positions on creation and
    // only re-measures on resize, so without this the pin would begin at the
    // wrong scroll offset.
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)

    const observer = new ResizeObserver(() => {
      // Debounced through rAF: the observer can fire many times per frame
      // while images decode.
      window.requestAnimationFrame(refresh)
    })
    observer.observe(document.body)

    return () => {
      window.removeEventListener('load', refresh)
      observer.disconnect()
      mm.revert()
    }
  }, [t])

  return (
    <section id="about" className="on-dark bg-brand-ink text-white">
      {/* Desktop: pinned horizontal track */}
      <div ref={triggerRef} className="hidden xl:block overflow-hidden">
        {/* `antialiased` matters here: GSAP transforms the track, and browsers
            fall back to RGB subpixel rendering on transformed text, which
            fringes the glyphs with colour. */}
        <div ref={trackRef} className="flex w-max antialiased">
          {panels.map((panel, index) => (
            <article
              key={panel.statLabel}
              className="flex h-screen w-screen shrink-0 flex-col items-center justify-center px-16 text-center"
            >
              <div className="max-w-[640px]">
                {index === 0 && <Badge containerStyles="mx-auto mb-8 w-[160px] h-[160px]" />}
                <span className="eyebrow">{t('landing.aboutEyebrow')}</span>
                <h2 className="h2 mt-3 text-white">{panel.title}</h2>
                <Separator className="mx-auto mt-6" />
                <p className="lead mt-7 font-light text-white/70">{panel.body}</p>

                <div className="mt-10">
                  <div className="font-serif text-[56px] leading-none text-brand-gold">
                    {panel.stat}
                  </div>
                  <div className="mt-2 text-[12px] uppercase tracking-[0.2em] text-white/50">
                    {panel.statLabel}
                  </div>
                </div>
              </div>

              <span
                className="mt-12 text-[11px] uppercase tracking-[0.3em] text-white/25"
                aria-hidden="true"
              >
                {index + 1} / {panels.length}
              </span>
            </article>
          ))}
        </div>
      </div>

      {/* Below xl: the same content stacked, no pinning */}
      <div className="xl:hidden py-20">
        <div className="container mx-auto flex flex-col items-center text-center">
          <span className="eyebrow">{t('landing.aboutEyebrow')}</span>
          <h2 className="h2 mt-3 text-white">
            {t('landing.aboutTitle')}{' '}
            <span className="text-brand-gold">{t('landing.aboutTitleAccent')}</span>
          </h2>
          <Separator className="mt-6" />

          <div className="mt-8 space-y-12">
            {panels.map((panel) => (
              <div key={panel.statLabel}>
                <p className="lead font-light text-white/70">{panel.body}</p>
                <div className="mt-5">
                  <div className="font-serif text-[40px] leading-none text-brand-gold">
                    {panel.stat}
                  </div>
                  <div className="mt-1.5 text-[11px] uppercase tracking-[0.2em] text-white/50">
                    {panel.statLabel}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-12 font-serif text-[24px] leading-snug text-white">
            “{t('landing.aboutQuote')}”
          </p>
        </div>
      </div>
    </section>
  )
}
