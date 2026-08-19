import React from 'react'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { cn } from '@/utils/lib'
import { setLanguage as applyLanguage } from '@/i18n'

interface LanguageSwitcherProps {
  className?: string
  showIcon?: boolean
}

export function LanguageSwitcher({ className, showIcon = true }: LanguageSwitcherProps) {
  const { i18n } = useTranslation()
  const currentLang = i18n.language.startsWith('en') ? 'en' : 'es'

  // Goes through the i18n helper rather than `i18n.changeLanguage` directly:
  // non-default catalogues are code-split and must be fetched before the
  // switch, otherwise the UI flashes fallback strings.
  const setLanguage = (lang: 'es' | 'en') => {
    void applyLanguage(lang)
  }

  return (
    <div className={cn("inline-flex items-center gap-1.5 p-1 rounded-full bg-secondary/80 border border-border/80 text-xs font-medium backdrop-blur-sm", className)}>
      {showIcon && <Globe className="w-3.5 h-3.5 text-muted-foreground ml-1.5" />}
      <button
        type="button"
        onClick={() => setLanguage('es')}
        className={cn(
          "px-2.5 py-1 rounded-full transition-all duration-200",
          currentLang === 'es'
            ? "bg-white text-foreground shadow-sm font-semibold dark:bg-card"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="Cambiar idioma a Español Colombia"
      >
        ES
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={cn(
          "px-2.5 py-1 rounded-full transition-all duration-200",
          currentLang === 'en'
            ? "bg-white text-foreground shadow-sm font-semibold dark:bg-card"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="Switch language to English"
      >
        EN
      </button>
    </div>
  )
}
