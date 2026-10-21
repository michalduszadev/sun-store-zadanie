import type { SpecUnit } from '../types/product'

/** Single source of truth for categories; order here is the order shown in the UI. */
export const CATEGORY_SLUGS = ['solar-panel', 'battery', 'connector'] as const

export type CategorySlug = (typeof CATEGORY_SLUGS)[number]

export interface CategoryDefinition {
  /** Value used in the `category` column of products.csv. */
  csvValue: string
  label: string
  labelPlural: string
  /** The extractable spec ("Capacity" in kWh, "Power" in W), or null when the category has none. */
  spec: { unit: SpecUnit, label: string } | null
}

// Record<CategorySlug, …> makes TypeScript require an entry for every slug.
export const CATEGORIES: Record<CategorySlug, CategoryDefinition> = {
  'solar-panel': { csvValue: 'solar panel', label: 'Solar panel', labelPlural: 'Solar panels', spec: { unit: 'W', label: 'Power' } },
  'battery': { csvValue: 'battery', label: 'Battery', labelPlural: 'Batteries', spec: { unit: 'kWh', label: 'Capacity' } },
  'connector': { csvValue: 'connector', label: 'Connector', labelPlural: 'Connectors & accessories', spec: null },
}

/** Spec of the selected category; null for "all products" or a category without a spec. */
export function categorySpec(category?: CategorySlug): CategoryDefinition['spec'] {
  return category ? CATEGORIES[category].spec : null
}

export function categoryFromCsv(value: string): CategorySlug | undefined {
  return CATEGORY_SLUGS.find(slug => CATEGORIES[slug].csvValue === value.toLowerCase())
}
