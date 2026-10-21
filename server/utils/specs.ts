import type { CategorySlug, ProductSpec, SpecUnit } from '#shared/types/product'

interface SpecRule {
  unit: SpecUnit
  /** First capture group is the number. Must not match neighbouring units (kW, V, A...). */
  pattern: RegExp
  /** Plausible range; values outside are treated as a parsing mistake. */
  min: number
  max: number
}

const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`

/**
 * One rule per category. Adding a spec for a new category
 * (e.g. amperage for connectors) means adding one entry here.
 */
const SPEC_RULES: Record<CategorySlug, SpecRule | null> = {
  'battery': { unit: 'kWh', pattern: new RegExp(String.raw`\b${NUMBER}\s*kWh\b`, 'i'), min: 0.5, max: 200 },
  // Case-sensitive on purpose: "W"/"Wp" only, so kW, kWh and words never match.
  'solar-panel': { unit: 'W', pattern: new RegExp(String.raw`\b${NUMBER}\s*Wp?\b`), min: 10, max: 1000 },
  'connector': null,
}

/** Model numbers sit at the end of the name: "EcoCharge HomeVault 13.5". */
const TRAILING_NUMBER = new RegExp(String.raw`\s${NUMBER}$`)

function toNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null
  const value = Number(raw.replace(',', '.'))
  return Number.isFinite(value) ? value : null
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
  const rule = SPEC_RULES[category]
  if (!rule) return null

  const isPlausible = (v: number | null): v is number => v !== null && v >= rule.min && v <= rule.max

  const fromDescription = toNumber(description.match(rule.pattern)?.[1])
  const fromName = toNumber(name.trim().match(TRAILING_NUMBER)?.[1])

  if (isPlausible(fromDescription)) {
    if (fromName !== null && fromName !== fromDescription) {
      console.warn(`[specs] "${name}": description says ${fromDescription} ${rule.unit}, name says ${fromName}. Using description.`)
    }
    return { value: fromDescription, unit: rule.unit }
  }

  if (isPlausible(fromName)) {
    return { value: fromName, unit: rule.unit }
  }

  return null
}
