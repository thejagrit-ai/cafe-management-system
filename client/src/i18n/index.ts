import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './en'

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: en,
    },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export async function setLanguage(lng: string = 'en'): Promise<void> {
  await i18n.changeLanguage(lng)
}

document.documentElement.lang = 'en'

export default i18n
