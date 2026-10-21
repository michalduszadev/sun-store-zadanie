import type { CategorySlug, SpecUnit } from '../types/product'

export interface CategoryDefinition {
  slug: CategorySlug
  /** Value used in the `category` column of products.csv. */
  csvValue: string
  label: string
  labelPlural: string
  /** Unit of the extractable spec, or null when the category has none. */
  specUnit: SpecUnit | null
  /** Human label of the spec ("Capacity", "Power"). */
  specLabel: string | null
}

export const CATEGORIES: readonly CategoryDefinition[] = [
  { slug: 'solar-panel', csvValue: 'solar panel', label: 'Solar panel', labelPlural: 'Solar panels', specUnit: 'W', specLabel: 'Power' },
  { slug: 'battery', csvValue: 'battery', label: 'Battery', labelPlural: 'Batteries', specUnit: 'kWh', specLabel: 'Capacity' },
  { slug: 'connector', csvValue: 'connector', label: 'Connector', labelPlural: 'Connectors & accessories', specUnit: null, specLabel: null },
]

export const CATEGORY_SLUGS = CATEGORIES.map(c => c.slug) as [CategorySlug, ...CategorySlug[]]

export function getCategory(slug: CategorySlug): CategoryDefinition {
  // CATEGORIES covers every CategorySlug, so the lookup cannot fail.
  return CATEGORIES.find(c => c.slug === slug)!
}

export function categoryFromCsv(value: string): CategoryDefinition | undefined {
  return CATEGORIES.find(c => c.csvValue === value.trim().toLowerCase())
}
