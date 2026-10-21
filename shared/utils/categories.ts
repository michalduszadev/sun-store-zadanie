import type { SpecUnit } from '../types/product'

/** Single source of truth for categories; order here is the order shown in the UI. */
export const CATEGORY_SLUGS = ['solar-panel', 'battery', 'connector'] as const

export type CategorySlug = (typeof CATEGORY_SLUGS)[number]

export interface CategoryDefinition {
  /** Value used in the `category` column of products.csv. */
  csvValue: string
  label: string
  labelPlural: string
  /** Unit of the extractable spec, or null when the category has none. */
  specUnit: SpecUnit | null
  /** Human label of the spec ("Capacity", "Power"). */
  specLabel: string | null
}

// Record<CategorySlug, …> makes TypeScript require an entry for every slug.
export const CATEGORIES: Record<CategorySlug, CategoryDefinition> = {
  'solar-panel': { csvValue: 'solar panel', label: 'Solar panel', labelPlural: 'Solar panels', specUnit: 'W', specLabel: 'Power' },
  'battery': { csvValue: 'battery', label: 'Battery', labelPlural: 'Batteries', specUnit: 'kWh', specLabel: 'Capacity' },
  'connector': { csvValue: 'connector', label: 'Connector', labelPlural: 'Connectors & accessories', specUnit: null, specLabel: null },
}

export function categoryFromCsv(value: string): CategorySlug | undefined {
  return CATEGORY_SLUGS.find(slug => CATEGORIES[slug].csvValue === value.toLowerCase())
}
