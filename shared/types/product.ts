export type CategorySlug = 'battery' | 'solar-panel' | 'connector'

export type SpecUnit = 'kWh' | 'W'

/** Capacity (batteries, kWh) or power (solar panels, W) extracted from the CSV text. */
export interface ProductSpec {
  value: number
  unit: SpecUnit
}

export interface Product {
  /** URL-safe slug of the product name; stable key for lists. */
  id: string
  name: string
  manufacturer: string
  manufacturerSlug: string
  price: number
  description: string
  category: CategorySlug
  spec: ProductSpec | null
  /** Price per spec unit (EUR/kWh or EUR/W); null when the product has no spec. */
  unitPrice: number | null
}
