import { useRef, useState, type ReactNode } from 'react'
import { cn } from '@/utils/lib'

interface TiltCardProps {
  /** Rendered on the front face. */
  front: ReactNode
  /** Rendered on the back face, mirrored back to readable by the flip. */
  back: ReactNode
  flipped: boolean
  className?: string
}

/** Maximum tilt in degrees at the far edge of the card. */
const MAX_TILT = 9

/**
 * Card that tilts in 3D toward the pointer and flips to reveal a second face.
 *
 * The tilt is applied to a wrapper with `transform-style: preserve-3d`, so any
 * child carrying a `translateZ` genuinely floats above the surface rather than
 * being painted flat — that parallax between layers is what sells the depth.
 *
 * Pointer tilt is skipped on coarse pointers (no hover to track) and whenever
 * the visitor asks for reduced motion.
 */
export function TiltCard({ front, back, flipped, className }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const interactive =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    // -0.5..0.5 relative to the card centre.
    const px = (event.clientX - rect.left) / rect.width - 0.5
    const py = (event.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: -py * MAX_TILT * 2, y: px * MAX_TILT * 2 })
  }

  const reset = () => setTilt({ x: 0, y: 0 })

  return (
    <div
      className={cn('[perspective:1600px]', className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
    >
      <div
        ref={ref}
        className="relative transition-transform duration-300 ease-out [transform-style:preserve-3d]"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        }}
      >
        {/* Both faces occupy the same grid cell, so the card is always as tall
            as the taller of the two — the sign-up face has more fields, and an
            absolutely positioned back would overflow the sign-in footprint. */}
        <div
          className="grid transition-transform [grid-template-areas:'stack'] [transform-style:preserve-3d]"
          style={{
            transform: `rotateY(${flipped ? 180 : 0}deg)`,
            transitionDuration: '900ms',
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div
            className="[grid-area:stack] [backface-visibility:hidden]"
            aria-hidden={flipped}
          >
            {front}
          </div>

          <div
            className="[grid-area:stack] [backface-visibility:hidden] [transform:rotateY(180deg)]"
            aria-hidden={!flipped}
          >
            {back}
          </div>
        </div>
      </div>
    </div>
  )
}
