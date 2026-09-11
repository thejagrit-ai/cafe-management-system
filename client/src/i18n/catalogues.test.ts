import { describe, it, expect } from 'vitest'
import { en } from './en'

type Catalogue = Record<string, Record<string, string>>

/** Flattens `{ ns: { key: value } }` into `{ 'ns.key': value }`. */
function flatten(catalogue: Catalogue): Record<string, string> {
  const flat: Record<string, string> = {}
  for (const [namespace, entries] of Object.entries(catalogue)) {
    for (const [key, value] of Object.entries(entries)) {
      flat[`${namespace}.${key}`] = value
    }
  }
  return flat
}

const flatEn = flatten(en as unknown as Catalogue)

describe('translation catalogue', () => {
  it('has no empty translations', () => {
    const blank = Object.entries(flatEn)
      .filter(([, value]) => value.trim() === '')
      .map(([key]) => key)

    expect(blank).toEqual([])
  })

  it('does not leave Spanish text in the English catalogue', () => {
    // Accents and inverted punctuation are a reliable tell for untranslated Spanish —
    // apart from "café" itself, which is standard English and appears in product copy.
    const untranslated = Object.entries(flatEn)
      .filter(([, value]) => /[áéíóúñ¿¡]/i.test(value.replace(/caf[ée]s?/gi, '')))
      .map(([key]) => key)

    expect(untranslated).toEqual([])
  })
})
