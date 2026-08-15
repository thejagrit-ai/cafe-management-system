import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/lib'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'default' | 'lg' | 'icon'
}

export function ThemeToggle({ className, showLabel = false, size = 'sm' }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <Button
      variant="outline"
      size={size}
      onClick={toggleTheme}
      className={cn(
        "rounded-xl border-border bg-card/80 text-foreground hover:bg-secondary transition-all",
        className
      )}
      title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
      aria-label="Alternar modo claro y oscuro"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform rotate-0 scale-100" />
      ) : (
        <Moon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 transition-transform rotate-0 scale-100" />
      )}
      {showLabel && (
        <span className="ml-2 text-xs font-medium">
          {isDark ? 'Modo Claro' : 'Modo Oscuro'}
        </span>
      )}
    </Button>
  )
}
