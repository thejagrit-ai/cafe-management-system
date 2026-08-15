import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { es } from './es'
import { en } from './en'

const savedLanguage = localStorage.getItem('cafe_language') || 'es'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      es: {
        translation: es,
      },
      en: {
        translation: en,
      },
    },
    lng: savedLanguage,
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false,
    },
  })

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('cafe_language', lng)
  document.documentElement.lang = lng === 'es' ? 'es-CO' : 'en'
})

export default i18n
