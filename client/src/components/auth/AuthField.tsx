import { useId, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/utils/lib'

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  /** Renders a show/hide toggle and manages the input type. */
  revealable?: boolean
  error?: string
}

export function AuthField({
  label,
  revealable = false,
  error,
  className,
  type = 'text',
  ...props
}: AuthFieldProps) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  const resolvedType = revealable ? (revealed ? 'text' : 'password') : type

  return (
    <div className="space-y-1.5 text-left">
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-white/80 tracking-wide pl-1"
      >
        {label}
      </label>

      <div
        className={cn(
          'group relative flex items-center rounded-xl bg-white/[0.07] border border-white/15 px-3.5 py-3 transition-all duration-200',
          'hover:bg-white/[0.10] hover:border-white/25',
          'focus-within:bg-[#1a1615] focus-within:border-brand-gold focus-within:ring-2 focus-within:ring-brand-gold/30',
          error && 'border-rose-400/80 focus-within:ring-rose-500/30'
        )}
      >
        <input
          id={id}
          type={resolvedType}
          className={cn(
            'w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none border-none shadow-none font-sans',
            revealable && 'pr-8',
            className
          )}
          {...props}
        />

        {revealable && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="absolute right-3.5 p-1 rounded-lg text-white/45 transition-colors hover:text-white hover:bg-white/10"
            aria-label={revealed ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-rose-400 pl-1">{error}</p>}
    </div>
  )
}
