import { describe, expect, it } from 'vitest'
import type { Product } from '#shared/types/product'
import { parseProductQuery } from '#shared/utils/productQuery'
import { queryProducts } from '../../server/utils/queryProducts'

function product(overrides: Partial<Product> & Pick<Product, 'name'>): Product {
  return {
    id: overrides.name.toLowerCase().replace(/\s+/g, '-'),
    manufacturer: 'Acme',
    manufacturerSlug: 'acme',
    price: 100,
    description: '',
    category: 'connector',
    spec: null,
    unitPrice: null,
    ...overrides,
  }
}

const catalog: Product[] = [
  product({ name: 'Bat 5', category: 'battery', manufacturer: 'EcoCharge', manufacturerSlug: 'ecocharge', price: 780, spec: { value: 5, unit: 'kWh' }, unitPrice: 156, description: 'LFP backup battery' }),
  product({ name: 'Bat 10', category: 'battery', manufacturer: 'EcoCharge', manufacturerSlug: 'ecocharge', price: 1499, spec: { value: 10, unit: 'kWh' }, unitPrice: 149.9, description: 'NMC high power' }),
  product({ name: 'Bat 14', category: 'battery', manufacturer: 'Quantum Energy', manufacturerSlug: 'quantum-energy', price: 1890, spec: { value: 14, unit: 'kWh' }, unitPrice: 135, description: 'LFP off-grid' }),
  product({ name: 'Panel 450', category: 'solar-panel', manufacturer: 'Solarix', manufacturerSlug: 'solarix', price: 280, spec: { value: 450, unit: 'W' }, unitPrice: 0.62, description: 'Monocrystalline PERC' }),
  product({ name: 'Fuse 15A', category: 'connector', manufacturer: 'SafeLock', manufacturerSlug: 'safelock', price: 15, description: 'MC4 inline fuse' }),
]

const run = (query: Record<string, string>, pageSize = 24) => queryProducts(catalog, parseProductQuery(query), pageSize)
const names = (query: Record<string, string>) => run(query).items.map(p => p.name)

describe('queryProducts: filtering', () => {
  it('returns everything in catalog order by default', () => {
    expect(names({})).toEqual(['Bat 5', 'Bat 10', 'Bat 14', 'Panel 450', 'Fuse 15A'])
  })

  it('filters by category, manufacturers (OR) and price range (inclusive)', () => {
    expect(names({ category: 'battery' })).toEqual(['Bat 5', 'Bat 10', 'Bat 14'])
    expect(names({ manufacturer: 'solarix,safelock' })).toEqual(['Panel 450', 'Fuse 15A'])
    expect(names({ priceMin: '280', priceMax: '1499' })).toEqual(['Bat 5', 'Bat 10', 'Panel 450'])
  })

  it('filters by spec range within a category', () => {
    expect(names({ category: 'battery', specMin: '6', specMax: '14' })).toEqual(['Bat 10', 'Bat 14'])
  })

  it('searches name, manufacturer and description; every word must match', () => {
    expect(names({ q: 'lfp' })).toEqual(['Bat 5', 'Bat 14'])
    expect(names({ q: 'quantum lfp' })).toEqual(['Bat 14'])
    expect(names({ q: 'MC4' })).toEqual(['Fuse 15A'])
    expect(names({ q: 'lfp nmc' })).toEqual([])
  })

  it('matches numbers as whole numbers only', () => {
    expect(names({ q: '1' })).toEqual([])
    expect(names({ q: '10' })).toEqual(['Bat 10'])
    expect(names({ q: '45' })).toEqual([])
    expect(names({ q: '15a' })).toEqual(['Fuse 15A'])
  })
})

describe('queryProducts: sorting and paging', () => {
  it('sorts by price, spec and price per unit', () => {
    expect(names({ sort: 'price-desc' })).toEqual(['Bat 14', 'Bat 10', 'Bat 5', 'Panel 450', 'Fuse 15A'])
    expect(names({ category: 'battery', sort: 'spec-desc' })).toEqual(['Bat 14', 'Bat 10', 'Bat 5'])
    expect(names({ category: 'battery', sort: 'unit-price-asc' })).toEqual(['Bat 14', 'Bat 10', 'Bat 5'])
  })

  it('does not mutate the shared catalog when sorting', () => {
    run({ sort: 'price-asc' })
    expect(catalog[0]?.name).toBe('Bat 5')
  })

  it('paginates and clamps an out-of-range page to the last page', () => {
    const page2 = run({ page: '2' }, 2)
    expect(page2).toMatchObject({ total: 5, page: 2, pageCount: 3 })
    expect(page2.items.map(p => p.name)).toEqual(['Bat 14', 'Panel 450'])
    expect(run({ page: '99' }, 2)).toMatchObject({ page: 3, items: [expect.objectContaining({ name: 'Fuse 15A' })] })
  })
})

describe('queryProducts: facets', () => {
  it('counts manufacturers ignoring the manufacturer filter itself', () => {
    const { facets } = run({ category: 'battery', manufacturer: 'ecocharge' })
    expect(facets.manufacturers).toEqual([
      { value: 'ecocharge', label: 'EcoCharge', count: 2 },
      { value: 'quantum-energy', label: 'Quantum Energy', count: 1 },
    ])
  })

  it('counts categories ignoring the category filter itself', () => {
    const { facets } = run({ category: 'battery', q: 'lfp' })
    expect(facets.categories).toEqual([
      { value: 'solar-panel', label: 'Solar panels', count: 0 },
      { value: 'battery', label: 'Batteries', count: 2 },
      { value: 'connector', label: 'Connectors & accessories', count: 0 },
    ])
  })

  it('keeps a selected manufacturer visible even when nothing matches it', () => {
    const { facets } = run({ category: 'solar-panel', manufacturer: 'ecocharge' })
    expect(facets.manufacturers).toContainEqual({ value: 'ecocharge', label: 'EcoCharge', count: 0 })
  })

  it('reports price and spec bounds for the selected category', () => {
    const { facets } = run({ category: 'battery', priceMax: '1000' })
    expect(facets.price).toEqual({ min: 780, max: 1890 })
    expect(facets.spec).toEqual({ min: 5, max: 14, unit: 'kWh', label: 'Capacity' })
    expect(run({}).facets.spec).toBeNull()
  })
})
