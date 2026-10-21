import type { Product, SpecUnit } from './product'

export interface FacetOption {
  /** Slug used in the URL. */
  value: string
  label: string
  /** Number of results if this option were selected, given the other active filters. */
  count: number
}

export interface NumericRange {
  min: number
  max: number
}

export interface ProductsResponse {
  items: Product[]
  total: number
  /** Effective page (an out-of-range request is clamped to the last page). */
  page: number
  pageCount: number
  facets: {
    categories: FacetOption[]
    manufacturers: FacetOption[]
    /** Price bounds within the selected category; used for the range inputs. */
    price: NumericRange
    /** Spec bounds within the selected category; null when it has no spec. */
    spec: (NumericRange & { unit: SpecUnit, label: string }) | null
  }
}
