import type { ProductsResponse } from '../types/api'
import type { SpecUnit } from '../types/product'
import { CATEGORIES, categorySpec } from './categories'
import { PAGE_SIZE, serializeProductQuery, type ProductQuery } from './productQuery'

/**
 * Everything the listing page needs for SEO, derived from the filters and the
 * API response. Pure (no Nuxt APIs), so the rules are unit-tested and the
 * page only wires the result into useSeoMeta / useHead.
 */
export interface ListingSeo {
  /** Visible <h1>. */
  heading: string
  title: string
  description: string
  /** "index, follow" for landing pages, "noindex, follow" for filter combinations. */
  robots: string
  /** Query of the canonical URL: normalized, junk params (utm_*...) dropped, page as clamped by the server. */
  canonicalQuery: Record<string, string>
}

export const SITE_NAME = 'sun.store'

/**
 * Landing pages worth indexing: the catalog, a category, a manufacturer, or
 * both, and their result pages. Search, sorting, ranges and multi-select
 * create near-endless near-duplicate URLs, so they are kept out of the index
 * ("follow" still lets crawlers discover the products and links on them).
 */
function isIndexable(query: ProductQuery, total: number): boolean {
  return total > 0
    && !query.q
    && query.sort === 'featured'
    && query.manufacturer.length <= 1
    && [query.priceMin, query.priceMax, query.specMin, query.specMax].every(value => value === undefined)
}

function rangeText(min: number | undefined, max: number | undefined, unit: SpecUnit): string | null {
  if (min !== undefined && max !== undefined) return `${min}–${max} ${unit}`
  if (min !== undefined) return `from ${min} ${unit}`
  if (max !== undefined) return `up to ${max} ${unit}`
  return null
}

export function buildListingSeo(query: ProductQuery, response: ProductsResponse): ListingSeo {
  const category = query.category ? CATEGORIES[query.category] : null
  const spec = categorySpec(query.category)
  const manufacturer = query.manufacturer.length === 1
    ? response.facets.manufacturers.find(m => m.value === query.manufacturer[0])?.label
    : undefined

  // "EcoCharge batteries", "solar panels", "EcoCharge products", "products"
  const noun = [manufacturer, category?.labelPlural.toLowerCase() ?? 'products'].filter(Boolean).join(' ')
  // "EcoCharge batteries", "Solar panels", "EcoCharge products", "All products"
  const heading = manufacturer ? noun : (category?.labelPlural ?? 'All products')

  const specRange = spec ? rangeText(query.specMin, query.specMax, spec.unit) : null
  const titleParts = [
    query.q ? `“${query.q}” in ${heading}` : heading,
    specRange,
  ].filter(Boolean).join(' ')
  const title = `${titleParts}${response.page > 1 ? ` – Page ${response.page}` : ''} | ${SITE_NAME}`

  const manufacturerCount = response.facets.manufacturers.filter(m => m.count > 0).length
  const description = response.total === 0
    ? 'No products match these filters. Browse solar panels, batteries and connectors for PV installers.'
    : `Compare ${response.total} ${noun}${query.manufacturer.length === 0 ? ` from ${manufacturerCount} manufacturers` : ''}. `
      + `Prices${spec ? ` and price per ${spec.unit}` : ''} for PV installers on a B2B marketplace.`

  return {
    heading,
    title,
    description,
    robots: isIndexable(query, response.total) ? 'index, follow' : 'noindex, follow',
    canonicalQuery: serializeProductQuery({ ...query, page: response.page }),
  }
}

/** UN/CEFACT unit codes, as schema.org expects in `unitCode`. */
const UNIT_CODES: Record<SpecUnit, string> = { kWh: 'KWH', W: 'WTT' }

/**
 * schema.org ItemList of the products on this page (JSON-LD).
 * Product pages do not exist in this task, so items carry no `url`;
 * the data still describes brand, price and capacity/power to search engines.
 * Returned as an object: unhead serializes it and escapes "<" in JSON scripts,
 * so text like "</script>" in a description cannot break out of the tag.
 */
export function buildItemListJsonLd(name: string, response: ProductsResponse) {
  const offset = (response.page - 1) * PAGE_SIZE

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    'numberOfItems': response.total,
    'itemListElement': response.items.map((product, index) => {
      const spec = categorySpec(product.category)
      return {
        '@type': 'ListItem',
        'position': offset + index + 1,
        'item': {
          '@type': 'Product',
          'name': product.name,
          'description': product.description,
          'category': CATEGORIES[product.category].label,
          'brand': { '@type': 'Brand', 'name': product.manufacturer },
          'offers': { '@type': 'Offer', 'price': product.price.toFixed(2), 'priceCurrency': 'EUR' },
          ...(product.spec && spec && {
            additionalProperty: {
              '@type': 'PropertyValue',
              'name': spec.label,
              'value': product.spec.value,
              'unitCode': UNIT_CODES[product.spec.unit],
              'unitText': product.spec.unit,
            },
          }),
        },
      }
    }),
  }
}
