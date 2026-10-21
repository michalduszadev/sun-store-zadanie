import { describe, expect, it } from 'vitest'
import type { ProductsResponse } from '#shared/types/api'
import type { Product } from '#shared/types/product'
import { buildItemListJsonLd, buildListingSeo } from '#shared/utils/listingSeo'
import { parseProductQuery } from '#shared/utils/productQuery'

const facets = (manufacturers: [string, string, number][]): ProductsResponse['facets'] => ({
  categories: [],
  manufacturers: manufacturers.map(([value, label, count]) => ({ value, label, count })),
  price: { min: 0, max: 0 },
  spec: null,
})

const response = (overrides: Partial<ProductsResponse> = {}): ProductsResponse => ({
  items: [],
  total: 50,
  page: 1,
  pageCount: 3,
  facets: facets([['ecocharge', 'EcoCharge', 5], ['aurapower', 'AuraPower', 5]]),
  ...overrides,
})

const seo = (query: Record<string, string>, res = response()) => buildListingSeo(parseProductQuery(query), res)

describe('buildListingSeo: heading and title', () => {
  it('describes the whole catalog without filters', () => {
    expect(seo({}, response({ total: 150 }))).toMatchObject({
      heading: 'All products',
      title: 'All products | sun.store',
      description: 'Compare 150 products from 2 manufacturers. Prices for PV installers on a B2B marketplace.',
    })
  })

  it('names the category and a single manufacturer', () => {
    expect(seo({ category: 'battery' }).heading).toBe('Batteries')
    expect(seo({ category: 'battery', manufacturer: 'ecocharge' }, response({ total: 5 }))).toMatchObject({
      heading: 'EcoCharge batteries',
      title: 'EcoCharge batteries | sun.store',
      description: 'Compare 5 EcoCharge batteries. Prices and price per kWh for PV installers on a B2B marketplace.',
    })
    expect(seo({ manufacturer: 'ecocharge' }).heading).toBe('EcoCharge products')
  })

  it('adds the spec range and the page number to the title', () => {
    expect(seo({ category: 'battery', specMin: '5', specMax: '10', page: '2' }, response({ page: 2 })).title)
      .toBe('Batteries 5–10 kWh – Page 2 | sun.store')
    expect(seo({ category: 'solar-panel', specMin: '400' }).title).toBe('Solar panels from 400 W | sun.store')
  })

  it('names several manufacturers and the price range', () => {
    expect(seo({ category: 'battery', manufacturer: 'ecocharge,aurapower', priceMax: '1500' })).toMatchObject({
      heading: 'AuraPower & EcoCharge batteries',
      title: 'AuraPower & EcoCharge batteries up to €1,500.00 | sun.store',
    })
    expect(seo({ category: 'solar-panel', priceMin: '100', priceMax: '300' }).title)
      .toBe('Solar panels €100.00–€300.00 | sun.store')
  })

  it('shortens a long manufacturer list', () => {
    const res = response({ facets: facets([['a', 'A', 1], ['b', 'B', 1], ['c', 'C', 1], ['d', 'D', 1]]) })
    expect(seo({ manufacturer: 'a,b,c,d' }, res).heading).toBe('A, B +2 products')
  })

  it('shows the search phrase in the title', () => {
    expect(seo({ category: 'battery', q: 'lfp' }).title).toBe('“lfp” in Batteries | sun.store')
  })

  it('uses the page clamped by the server, not the one requested', () => {
    expect(seo({ page: '99' }, response({ page: 3 }))).toMatchObject({
      title: 'All products – Page 3 | sun.store',
      canonicalQuery: { page: '3' },
    })
  })
})

describe('buildListingSeo: indexing rules', () => {
  it.each([
    [{}],
    [{ category: 'battery' }],
    [{ category: 'battery', manufacturer: 'ecocharge' }],
    [{ manufacturer: 'ecocharge' }],
    [{ category: 'battery', page: '2' }],
  ])('indexes landing pages: %o', (query) => {
    expect(seo(query).robots).toBe('index, follow')
  })

  it.each([
    [{ q: 'lfp' }],
    [{ sort: 'price-asc' }],
    [{ priceMax: '1000' }],
    [{ category: 'battery', specMin: '5' }],
    [{ manufacturer: 'ecocharge,aurapower' }],
  ])('keeps filter combinations out of the index but lets crawlers follow links: %o', (query) => {
    expect(seo(query).robots).toBe('noindex, follow')
  })

  it('keeps a failed load out of the index but still gives it a title', () => {
    expect(buildListingSeo(parseProductQuery({ category: 'battery' }), null)).toMatchObject({
      title: 'Products | sun.store',
      robots: 'noindex, follow',
      canonicalQuery: { category: 'battery' },
    })
  })

  it('does not index an empty result page', () => {
    expect(seo({ category: 'battery' }, response({ total: 0 })).robots).toBe('noindex, follow')
  })

  it('builds a normalized canonical query', () => {
    expect(seo({ manufacturer: 'ecocharge', category: 'battery', utm_source: 'mail' }).canonicalQuery)
      .toEqual({ category: 'battery', manufacturer: 'ecocharge' })
  })
})

describe('buildItemListJsonLd', () => {
  const product: Product = {
    id: 'ecocharge-homevault-10',
    name: 'EcoCharge HomeVault 10',
    manufacturer: 'EcoCharge',
    manufacturerSlug: 'ecocharge',
    price: 1499,
    description: 'A 10kWh battery',
    category: 'battery',
    spec: { value: 10, unit: 'kWh' },
    unitPrice: 149.9,
  }

  it('lists products with positions continuing across pages', () => {
    expect(buildItemListJsonLd('Batteries', response({ items: [product], page: 2 }))).toMatchObject({
      '@type': 'ItemList',
      'name': 'Batteries',
      'numberOfItems': 50,
      'itemListElement': [{
        '@type': 'ListItem',
        'position': 25,
        'item': {
          '@type': 'Product',
          'name': 'EcoCharge HomeVault 10',
          'brand': { '@type': 'Brand', 'name': 'EcoCharge' },
          'offers': { '@type': 'Offer', 'price': '1499.00', 'priceCurrency': 'EUR' },
          'additionalProperty': { '@type': 'PropertyValue', 'name': 'Capacity', 'value': 10, 'unitCode': 'KWH', 'unitText': 'kWh' },
        },
      }],
    })
  })
})
