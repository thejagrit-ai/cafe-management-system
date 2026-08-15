import { cn } from '@/utils/lib'

/** Thin gold rule with a centred diamond — the section divider from the design. */
export default function Separator({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)} aria-hidden="true">
      <span className="h-px w-14 sm:w-20 bg-gradient-to-r from-transparent to-brand-gold" />
      <span className="h-1.5 w-1.5 rotate-45 bg-brand-gold" />
      <span className="h-px w-14 sm:w-20 bg-gradient-to-l from-transparent to-brand-gold" />
    </div>
  )
}
