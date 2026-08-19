/**
 * Shared gate for the site's optional heavy decoration — the hero video
 * (~10 MB) and the WebGL backdrop on the auth screens (~860 kB of three.js).
 *
 * Both have a designed static fallback, so on a phone, a metered or slow
 * connection, or for someone who has asked for reduced motion, the right
 * answer is simply not to download them.
 */

interface NetworkInformation {
  saveData?: boolean
  effectiveType?: string
}

function getConnection(): NetworkInformation | undefined {
  return (navigator as Navigator & { connection?: NetworkInformation }).connection
}

/**
 * True when this visitor should be served the lightweight fallback instead of
 * the heavy asset. `minWidth` is the viewport below which the decoration is not
 * worth its bytes.
 */
export function prefersLightweightExperience(minWidth = 1024): boolean {
  if (typeof window === 'undefined') return true
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true
  if (window.matchMedia(`(max-width: ${minWidth - 1}px)`).matches) return true

  const connection = getConnection()
  if (connection?.saveData) return true
  if (connection?.effectiveType && /(^|-)(2g|3g)$/.test(connection.effectiveType)) return true

  return false
}

/** Runs `fn` once the browser is idle, falling back to a short timeout. */
export function whenIdle(fn: () => void): () => void {
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
    .requestIdleCallback
  if (ric) {
    const handle = ric(fn)
    return () => {
      const cic = (window as Window & { cancelIdleCallback?: (h: number) => void })
        .cancelIdleCallback
      cic?.(handle)
    }
  }
  const timer = window.setTimeout(fn, 1200)
  return () => window.clearTimeout(timer)
}
