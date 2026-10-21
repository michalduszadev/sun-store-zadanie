import type { ProductSpec, SpecUnit } from '#shared/types/product'
import { CATEGORIES, type CategorySlug } from '#shared/utils/categories'

interface SpecRule {
  /** First capture group is the number. Must not match neighbouring units (kW, V, A...). */
  pattern: RegExp
  /** Plausible range; values outside are treated as a parsing mistake. */
  min: number
  max: number
}

/**
 * How to read each unit from text. Which category has which unit lives in
 * CATEGORIES (shared with the UI), so adding a spec to a category is:
 * set its `spec`, and add a rule here if the unit is new.
 */
const SPEC_RULES: Record<SpecUnit, SpecRule> = {
  kWh: { pattern: /\b(\d+(?:[.,]\d+)?)\s*kWh\b/i, min: 0.5, max: 200 },
  // Case-sensitive on purpose: "W"/"Wp" only, so kW, kWh and words never match.
  W: { pattern: /\b(\d+(?:[.,]\d+)?)\s*Wp?\b/, min: 10, max: 1000 },
}

/** Model numbers sit at the end of the name: "EcoCharge HomeVault 13.5". */
const TRAILING_NUMBER = /\s(\d+(?:[.,]\d+)?)$/

function toNumber(raw: string | undefined): number | null {
  return raw === undefined ? null : Number(raw.replace(',', '.'))
}

interface SpecSource {
  name: string
  description: string
  category: CategorySlug
}

/**
 * Description first: it states the unit explicitly ("10kWh", "450W").
 * The first match wins, because later mentions describe something else
 * ("stack up to four units for a total of 30kWh", "five 2.5kWh modules").
 * The trailing number in the name is a fallback and a cross-check.
 */
export function extractSpec({ name, description, category }: SpecSource): ProductSpec | null {
  const unit = CATEGORIES[category].spec?.unit
  if (!unit) return null

  const rule = SPEC_RULES[unit]
  const isPlausible = (v: number | null): v is number => v !== null && v >= rule.min && v <= rule.max

  const fromDescription = toNumber(description.match(rule.pattern)?.[1])
  const fromName = toNumber(name.match(TRAILING_NUMBER)?.[1])

  if (isPlausible(fromDescription)) {
    if (fromName !== null && fromName !== fromDescription) {
      console.warn(`[specs] "${name}": description says ${fromDescription} ${unit}, name says ${fromName}. Using description.`)
    }
    return { value: fromDescription, unit }
  }

  if (isPlausible(fromName)) {
    return { value: fromName, unit }
  }

  return null
}
