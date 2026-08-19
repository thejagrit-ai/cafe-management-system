import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { es } from './es'

const savedLanguage = localStorage.getItem('cafe_language') || 'es'

/**
 * Spanish is the default and ships with the app. English is fetched only when
 * someone actually switches to it, so the initial bundle carries one catalogue
 * instead of two.
 */
const loaders: Record<string, () => Promise<Record<string, unknown>>> = {
  en: () => import('./en').then((m) => m.en as unknown as Record<string, unknown>),
}

async function ensureLanguageLoaded(lng: string): Promise<void> {
  if (i18n.hasResourceBundle(lng, 'translation')) return
  const loader = loaders[lng]
  if (!loader) return
  i18n.addResourceBundle(lng, 'translation', await loader(), true, true)
}

i18n.use(initReactI18next).init({
  resources: {
    es: {
      translation: es,
    },
  },
  // Start on Spanish even when another language is stored: switching before the
  // catalogue exists would render fallback strings for a frame. `setLanguage`
  // below fetches the catalogue first, then switches.
  lng: 'es',
  fallbackLng: 'es',
  interpolation: {
    escapeValue: false,
  },
})

/** Loads the catalogue if needed, then switches. Always use this over `i18n.changeLanguage`. */
export async function setLanguage(lng: string): Promise<void> {
  await ensureLanguageLoaded(lng)
  await i18n.changeLanguage(lng)
}

if (savedLanguage !== 'es') {
  void setLanguage(savedLanguage)
}

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('cafe_language', lng)
  document.documentElement.lang = lng === 'es' ? 'es-CO' : 'en'
})

export default i18n
