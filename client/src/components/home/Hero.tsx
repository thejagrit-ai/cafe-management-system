import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Badge from './Badge'
import Separator from './Separator'

/**
 * Full-height hero with the looping video background from the source design.
 *
 * The video and the dot-texture overlay live in `client/public/assets/hero/`.
 * The gradient underneath is kept as a fallback so the section still reads
 * properly on a slow connection, if the file is replaced, or when the browser
 * blocks autoplay.
 */
export default function Hero() {
  const { t } = useTranslation()

  return (
    <section className="on-dark relative h-[calc(100dvh-4rem)] sm:h-[90vh] xl:h-screen min-h-[620px] overflow-hidden text-white bg-brand-ink flex flex-col justify-center">
      {/* Fallback backdrop, visible until the video paints. */}
      <div
        className="absolute inset-0 bg-brand-ink"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 50% 0%, rgba(199,161,122,0.28) 0%, transparent 55%), radial-gradient(ellipse at 15% 90%, rgba(199,161,122,0.14) 0%, transparent 50%)',
        }}
      />

      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/assets/hero/hero-overlay.png"
        className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-1000 data-[ready=true]:opacity-100"
        onLoadedData={(e) => e.currentTarget.setAttribute('data-ready', 'true')}
      >
        <source src="/assets/hero/video.mp4" type="video/mp4" />
      </video>

      {/* Dark wash plus the dot-texture overlay from the source design. */}
      <div className="absolute inset-0 bg-brand-ink/[0.72]" />
      <div
        className="absolute inset-0 opacity-40"
        style={{ backgroundImage: 'url(/assets/hero/hero-overlay.png)' }}
        aria-hidden="true"
      />

      <div className="container relative z-10 mx-auto h-full">
        {/* data-scroll-speed is read by Locomotive Scroll to drift the content
            slower than the page, giving the hero its parallax. */}
        <div
          data-scroll
          data-scroll-speed="0.4"
          className="flex h-full flex-col items-center justify-center gap-7 text-center xl:gap-10 xl:pb-12"
        >
          <div className="flex flex-col items-center">
            <Badge containerStyles="hidden xl:flex xl:w-[180px] xl:h-[180px] mb-2" />
            <h1 className="h1 text-white">
              <span className="text-brand-gold">{t('landing.heroTitleAccent')}</span>{' '}
              {t('landing.heroTitleRest')}
            </h1>
          </div>

          <Separator />

          <p className="lead max-w-[320px] font-light text-white/80 md:max-w-[430px] xl:max-w-[560px]">
            {t('landing.heroSubtitle')}
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link to="/menu" className="btn-cafe">
              {t('landing.heroCta')}
            </Link>
            <a href="#opening-hours" className="btn-cafe-outline">
              {t('landing.heroCtaSecondary')}
            </a>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 xl:block">
        <div className="flex h-11 w-7 items-start justify-center rounded-full border border-white/30 p-2">
          <span className="h-2 w-1 animate-bounce rounded-full bg-brand-gold" />
        </div>
      </div>
    </section>
  )
}
