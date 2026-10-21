import type { FacetOption, NumericRange, ProductsResponse } from '#shared/types/api'
import type { Product } from '#shared/types/product'
import { CATEGORIES, CATEGORY_SLUGS, type CategorySlug } from '#shared/utils/categories'
import { PAGE_SIZE, type ProductQuery, type SortOption } from '#shared/utils/productQuery'

type Comparator = (a: Product, b: Product) => number

/** `featured` keeps the catalog (CSV) order: toSorted is stable, so 0 changes nothing. */
const COMPARATORS: Record<SortOption, Comparator> = {
  'featured': () => 0,
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  // Spec sorts are only allowed inside a spec category (see productQuery.normalize), so spec is set.
  'spec-asc': (a, b) => (a.spec?.value ?? 0) - (b.spec?.value ?? 0),
  'spec-desc': (a, b) => (b.spec?.value ?? 0) - (a.spec?.value ?? 0),
  'unit-price-asc': (a, b) => (a.unitPrice ?? 0) - (b.unitPrice ?? 0),
  'name-asc': (a, b) => a.name.localeCompare(b.name, 'en'),
}

/**
 * Builds the filter predicate once per request. `ignore` drops one filter,
 * which is how facet counts are computed: "how many results would I get
 * for this manufacturer, keeping all the other filters?"
 * Spec filters belong to the category, so ignoring the category ignores them too.
 */
function createFilter(query: ProductQuery, ignore?: 'category' | 'manufacturer') {
  const words = query.q?.toLowerCase().split(/\s+/).filter(Boolean) ?? []

  return (p: Product): boolean => {
    if (ignore !== 'category') {
      if (query.category && p.category !== query.category) return false
      if (query.specMin !== undefined && (p.spec === null || p.spec.value < query.specMin)) return false
      if (query.specMax !== undefined && (p.spec === null || p.spec.value > query.specMax)) return false
    }
    if (ignore !== 'manufacturer' && query.manufacturer.length > 0 && !query.manufacturer.includes(p.manufacturerSlug)) return false
    if (query.priceMin !== undefined && p.price < query.priceMin) return false
    if (query.priceMax !== undefined && p.price > query.priceMax) return false
    if (words.length > 0) {
      const text = `${p.name} ${p.manufacturer} ${p.description}`.toLowerCase()
      if (!words.every(word => text.includes(word))) return false
    }
    return true
  }
}

function range(values: number[]): NumericRange {
  return values.length > 0 ? { min: Math.min(...values), max: Math.max(...values) } : { min: 0, max: 0 }
}

function countBy(products: Product[], key: (p: Product) => string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const p of products) counts.set(key(p), (counts.get(key(p)) ?? 0) + 1)
  return counts
}

function categoryFacet(catalog: readonly Product[], query: ProductQuery): FacetOption<CategorySlug>[] {
  const counts = countBy(catalog.filter(createFilter(query, 'category')), p => p.category)
  return CATEGORY_SLUGS.map(slug => ({ value: slug, label: CATEGORIES[slug].labelPlural, count: counts.get(slug) ?? 0 }))
}

function manufacturerFacet(catalog: readonly Product[], query: ProductQuery): FacetOption[] {
  const counts = countBy(catalog.filter(createFilter(query, 'manufacturer')), p => p.manufacturerSlug)
  const labels = new Map(catalog.map(p => [p.manufacturerSlug, p.manufacturer]))

  return [...labels]
    .map(([slug, label]) => ({ value: slug, label, count: counts.get(slug) ?? 0 }))
    // Hide manufacturers with no results, except selected ones, so they can still be unchecked.
    .filter(option => option.count > 0 || query.manufacturer.includes(option.value))
    // Alphabetical, not by count: checkboxes should not jump around while filtering.
    .sort((a, b) => a.label.localeCompare(b.label, 'en'))
}

export function queryProducts(catalog: readonly Product[], query: ProductQuery, pageSize = PAGE_SIZE): ProductsResponse {
  const sorted = catalog.filter(createFilter(query)).toSorted(COMPARATORS[query.sort])

  const total = sorted.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(query.page, pageCount)

  // Range bounds come from the whole category, not the current results,
  // so the price/spec inputs keep stable limits while the user narrows down.
  const inCategory = query.category ? catalog.filter(p => p.category === query.category) : catalog
  const spec = query.category ? CATEGORIES[query.category].spec : null

  return {
    items: sorted.slice((page - 1) * pageSize, page * pageSize),
    total,
    page,
    pageCount,
    facets: {
      categories: categoryFacet(catalog, query),
      manufacturers: manufacturerFacet(catalog, query),
      price: range(inCategory.map(p => p.price)),
      spec: spec ? { ...range(inCategory.flatMap(p => p.spec?.value ?? [])), ...spec } : null,
    },
  }
}
