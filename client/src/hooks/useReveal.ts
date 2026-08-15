import { useEffect, useRef } from 'react'

/**
 * Adds `is-visible` to the element the first time it scrolls into view, which
 * drives the `.reveal` transition in index.css.
 *
 * The source design used GSAP ScrollTrigger with Locomotive Scroll for this.
 * IntersectionObserver is built into the browser and produces the same result
 * without the dependency weight.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(options?: {
  threshold?: number
  rootMargin?: string
}) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // Respect the OS "reduce motion" setting: show it immediately.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.classList.add('is-visible')
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            // Reveal once; re-animating on every scroll pass is distracting.
            observer.unobserve(entry.target)
          }
        }
      },
      {
        threshold: options?.threshold ?? 0.15,
        rootMargin: options?.rootMargin ?? '0px 0px -60px 0px',
      }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [options?.threshold, options?.rootMargin])

  return ref
}
