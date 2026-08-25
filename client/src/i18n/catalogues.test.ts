import { describe, it, expect } from 'vitest'
import { es } from './es'
import { en } from './en'

/**
 * The admin and staff screens used to hardcode their Spanish copy, so choosing
 * English left most of the console untranslated. Now that every string routes
 * through these catalogues, the risk moves to them drifting apart: a key added
 * to one language and forgotten in the other renders the raw key name, and a
 * placeholder renamed on one side renders a literal `{{name}}`.
 */

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

const flatEs = flatten(es as unknown as Catalogue)
const flatEn = flatten(en as unknown as Catalogue)

/** `{{name}}` interpolation slots, which both languages must agree on. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort()
}

describe('translation catalogues', () => {
  it('defines the same keys in both languages', () => {
    const missingFromEnglish = Object.keys(flatEs).filter((key) => !(key in flatEn))
    const missingFromSpanish = Object.keys(flatEn).filter((key) => !(key in flatEs))

    expect({ missingFromEnglish, missingFromSpanish }).toEqual({
      missingFromEnglish: [],
      missingFromSpanish: [],
    })
  })

  it('has no empty translations', () => {
    const blank = Object.entries({ es: flatEs, en: flatEn }).flatMap(([lang, flat]) =>
      Object.entries(flat)
        .filter(([, value]) => value.trim() === '')
        .map(([key]) => `${lang}:${key}`)
    )

    expect(blank).toEqual([])
  })

  it('uses the same interpolation placeholders in both languages', () => {
    const mismatched = Object.keys(flatEs)
      .filter((key) => key in flatEn)
      .filter(
        (key) =>
          placeholders(flatEs[key]).join(',') !== placeholders(flatEn[key]).join(',')
      )

    expect(mismatched).toEqual([])
  })

  it('does not leave Spanish text in the English catalogue', () => {
    // Accents and inverted punctuation are a reliable tell for a key that was
    // copied across without being translated — apart from "café" itself, which
    // is ordinary English and appears throughout the product's own name.
    const untranslated = Object.entries(flatEn)
      .filter(([, value]) => /[áéíóúñ¿¡]/i.test(value.replace(/caf[ée]s?/gi, '')))
      .map(([key]) => key)

    expect(untranslated).toEqual([])
  })
})
