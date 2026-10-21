import { z } from 'zod'
import { CATEGORY_SLUGS, categorySpec, type CategorySlug } from './categories'

/**
 * The filter state of the listing page. It lives in the URL, so this module
 * is the contract between the URL, the page and the /api/products endpoint.
 * Shared (shared/) so client and server parse it with the very same rules.
 */

export const SORT_OPTIONS = ['featured', 'price-asc', 'price-desc', 'spec-asc', 'spec-desc', 'unit-price-asc', 'name-asc'] as const
export type SortOption = (typeof SORT_OPTIONS)[number]

/** Sorts that only make sense inside a category with a spec (kWh and W are not comparable). */
const SPEC_SORTS: ReadonlySet<SortOption> = new Set(['spec-asc', 'spec-desc', 'unit-price-asc'])

export const PAGE_SIZE = 24

export interface ProductQuery {
  category?: CategorySlug
  /** Manufacturer slugs, sorted and unique, so one filter set has one URL. */
  manufacturer: string[]
  priceMin?: number
  priceMax?: number
  specMin?: number
  specMax?: number
  q?: string
  sort: SortOption
  page: number
}

const SLUG = /^[a-z0-9.-]+$/

// URL values are `string | string[] | undefined`. Every field ends with .catch():
// anything invalid (wrong type, repeated param, garbage) falls back to "not set"
// instead of failing the request, e.g. ?page=abc -> page 1.
// `min(1)` before Number(): an empty string would otherwise become 0.
const amount = z.string().trim().min(1).transform(Number).pipe(z.number().nonnegative()).optional().catch(undefined)

const schema = z.object({
  category: z.enum(CATEGORY_SLUGS).optional().catch(undefined),
  // "a,b" (our own format) and ?manufacturer=a&manufacturer=b (hand-written links) both work.
  manufacturer: z.union([z.string(), z.array(z.string())])
    .transform(value => [value].flat().flatMap(item => item.split(',')).filter(slug => SLUG.test(slug)))
    .catch([]),
  priceMin: amount,
  priceMax: amount,
  specMin: amount,
  specMax: amount,
  q: z.string().trim().min(1).transform(value => value.slice(0, 100)).optional().catch(undefined),
  sort: z.enum(SORT_OPTIONS).catch('featured'),
  page: z.string().transform(Number).pipe(z.number().int().min(1)).catch(1),
})

/** [900, 100] -> [100, 900]; undefined on either side is left as is. */
function ordered(min?: number, max?: number): [number?, number?] {
  return min !== undefined && max !== undefined && min > max ? [max, min] : [min, max]
}

/** Cross-field rules that a per-field schema cannot express. */
function normalize(query: ProductQuery): ProductQuery {
  const hasSpec = categorySpec(query.category) !== null
  const [priceMin, priceMax] = ordered(query.priceMin, query.priceMax)
  const [specMin, specMax] = hasSpec ? ordered(query.specMin, query.specMax) : []

  return {
    ...query,
    manufacturer: [...new Set(query.manufacturer)].sort(),
    priceMin,
    priceMax,
    specMin,
    specMax,
    sort: !hasSpec && SPEC_SORTS.has(query.sort) ? 'featured' : query.sort,
  }
}

/** Never throws: anything unparseable is dropped. Accepts h3's getQuery() and vue-router's route.query. */
export function parseProductQuery(input: Record<string, unknown>): ProductQuery {
  return normalize(schema.parse(input))
}

/**
 * Applies one UI change to the current query. Any change returns to page 1
 * (unless the change *is* the page), and switching category starts with a
 * clean spec range, because a kWh range means nothing for solar panels (W).
 */
export function updateProductQuery(query: ProductQuery, patch: Partial<ProductQuery>): ProductQuery {
  const next: ProductQuery = { ...query, page: 1, ...patch }
  if ('category' in patch && patch.category !== query.category) {
    next.specMin = patch.specMin
    next.specMax = patch.specMax
  }
  return normalize(next)
}

/** Inverse of parseProductQuery. Default values are omitted, so the URL stays short and canonical. */
export function serializeProductQuery(query: ProductQuery): Record<string, string> {
  const out: Record<string, string> = {}
  if (query.category) out.category = query.category
  if (query.manufacturer.length > 0) out.manufacturer = query.manufacturer.join(',')
  for (const key of ['priceMin', 'priceMax', 'specMin', 'specMax'] as const) {
    const value = query[key]
    if (value !== undefined) out[key] = String(value)
  }
  if (query.q) out.q = query.q
  if (query.sort !== 'featured') out.sort = query.sort
  if (query.page > 1) out.page = String(query.page)
  return out
}
