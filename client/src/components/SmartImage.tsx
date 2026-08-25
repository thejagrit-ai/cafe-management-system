import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

interface SmartImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null
  /** Rendered when there is no image, or when the one we have fails to load. */
  fallback: ReactNode
}

/**
 * An `<img>` that degrades to a placeholder instead of a broken-image icon.
 *
 * Product and category photos come from the database, so they can be a remote
 * URL an admin pasted, a host that has since gone away, or a photo ID a stock
 * library retired. Every call site already had a "no image" placeholder for a
 * null column; this reuses that same placeholder for a URL that 404s, which is
 * the case that was actually showing up as broken tiles on the storefront.
 */
export function SmartImage({ src, fallback, ...imgProps }: SmartImageProps) {
  const [failed, setFailed] = useState(false)

  // A card can be recycled onto a different product as a list re-renders, so a
  // previous failure must not suppress the new image.
  useEffect(() => {
    setFailed(false)
  }, [src])

  if (!src || failed) return <>{fallback}</>

  return <img src={src} onError={() => setFailed(true)} {...imgProps} />
}
