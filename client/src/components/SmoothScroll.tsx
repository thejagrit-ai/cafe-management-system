import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import 'locomotive-scroll/locomotive-scroll.css'

/**
 * Inertial smooth scrolling for the customer-facing shell, using Locomotive
 * Scroll v5 (the Lenis-based rewrite) exactly as the source design does.
 *
 * v5 drives the native scroll position rather than transforming a container,
 * so GSAP ScrollTrigger works against it without a scrollerProxy, and browser
 * find / keyboard paging keep working.
 *
 * The library is imported dynamically so its weight lands in a separate chunk
 * and never blocks first paint, and it is skipped entirely when the visitor
 * has asked for reduced motion.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const { pathname, hash } = useLocation()
  // Typed loosely: v5 ships its own types but the instance shape differs
  // between the modern and legacy entry points.
  const scrollRef = useRef<{ destroy?: () => void; scrollTo?: (t: unknown, o?: unknown) => void } | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let cancelled = false

    const start = async () => {
      const LocomotiveScroll = (await import('locomotive-scroll')).default
      // The component may have unmounted while the chunk was downloading.
      if (cancelled) return
      scrollRef.current = new LocomotiveScroll({
        lenisOptions: {
          // Slightly longer glide than the default; matches the unhurried feel
          // of the source design without becoming sluggish.
          duration: 1.1,
          smoothWheel: true,
        },
      }) as unknown as typeof scrollRef.current
    }

    void start()

    return () => {
      cancelled = true
      scrollRef.current?.destroy?.()
      scrollRef.current = null
    }
  }, [])

  // Reset scroll between routes, or jump to an in-page anchor.
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (hash) {
      const id = hash.slice(1)
      requestAnimationFrame(() => {
        const target = document.getElementById(id)
        if (!target) return
        if (scrollRef.current?.scrollTo) scrollRef.current.scrollTo(target)
        else target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
      return
    }

    if (scrollRef.current?.scrollTo) {
      scrollRef.current.scrollTo(0, { immediate: true })
    } else {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
    }
  }, [pathname, hash])

  return <>{children}</>
}
