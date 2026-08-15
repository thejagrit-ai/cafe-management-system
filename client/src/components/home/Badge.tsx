import { cn } from '@/utils/lib'

/**
 * Circular "est." seal with text running around the ring, as in the source
 * design. The curved text is a plain SVG <textPath>, no library needed.
 */
export default function Badge({
  containerStyles,
  label = 'THE COFFEE BEAN CAFE • ROASTED WITH CARE • ',
}: {
  containerStyles?: string
  label?: string
}) {
  return (
    <div
      className={cn('relative w-[140px] h-[140px] flex items-center justify-center', containerStyles)}
      aria-hidden="true"
    >
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full animate-[spin_28s_linear_infinite]">
        <defs>
          <path id="badge-ring" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" />
        </defs>
        <text
          className="fill-brand-gold"
          style={{ fontSize: '15px', letterSpacing: '0.18em', fontWeight: 600 }}
        >
          <textPath href="#badge-ring">{label}</textPath>
        </text>
      </svg>

      <div className="flex flex-col items-center justify-center text-brand-gold">
        <span className="font-serif text-3xl leading-none">est.</span>
        <span className="font-serif text-4xl leading-none">2024</span>
      </div>
    </div>
  )
}
