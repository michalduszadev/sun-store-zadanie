import { describe, expect, it } from 'vitest'
import { parseProductQuery, serializeProductQuery, updateProductQuery } from '#shared/utils/productQuery'

const DEFAULT_QUERY = { manufacturer: [], sort: 'featured', page: 1 }

describe('parseProductQuery', () => {
  it('returns defaults for an empty query', () => {
    expect(parseProductQuery({})).toEqual(DEFAULT_QUERY)
  })

  it('parses a full, valid query', () => {
    expect(parseProductQuery({
      category: 'battery',
      manufacturer: 'ecocharge,auropower',
      priceMin: '500',
      priceMax: '1500',
      specMin: '5',
      specMax: '10',
      q: '  LFP  ',
      sort: 'spec-desc',
      page: '2',
    })).toEqual({
      category: 'battery',
      manufacturer: ['auropower', 'ecocharge'],
      priceMin: 500,
      priceMax: 1500,
      specMin: 5,
      specMax: 10,
      q: 'LFP',
      sort: 'spec-desc',
      page: 2,
    })
  })

  it('ignores invalid values instead of failing', () => {
    expect(parseProductQuery({
      category: 'inverter',
      manufacturer: '<script>',
      priceMin: 'abc',
      priceMax: '-5',
      sort: 'random',
      page: '0',
    })).toEqual(DEFAULT_QUERY)
  })

  it('treats empty strings and repeated params as absent', () => {
    expect(parseProductQuery({ priceMin: '', q: '', page: ['1', '2'] })).toEqual(DEFAULT_QUERY)
  })

  it('swaps min and max when given in the wrong order', () => {
    expect(parseProductQuery({ priceMin: '900', priceMax: '100' })).toMatchObject({ priceMin: 100, priceMax: 900 })
  })

  it('drops spec filters and spec sorting when the category has no spec', () => {
    expect(parseProductQuery({ specMin: '5', sort: 'spec-asc' })).toMatchObject({ specMin: undefined, sort: 'featured' })
    expect(parseProductQuery({ category: 'connector', specMax: '5', sort: 'unit-price-asc' }))
      .toMatchObject({ specMax: undefined, sort: 'featured' })
  })
})

describe('serializeProductQuery', () => {
  it('omits defaults so the URL stays clean', () => {
    expect(serializeProductQuery(parseProductQuery({}))).toEqual({})
  })

  it('round-trips through parse', () => {
    const query = parseProductQuery({ category: 'solar-panel', manufacturer: 'solarix,apex-solar', specMin: '400', sort: 'price-asc', page: '3' })
    const serialized = serializeProductQuery(query)
    expect(serialized).toEqual({ category: 'solar-panel', manufacturer: 'apex-solar,solarix', specMin: '400', sort: 'price-asc', page: '3' })
    expect(parseProductQuery(serialized)).toEqual(query)
  })
})

describe('updateProductQuery', () => {
  const current = parseProductQuery({ category: 'battery', specMin: '5', specMax: '10', sort: 'spec-desc', page: '3' })

  it('goes back to page 1 on any filter change', () => {
    expect(updateProductQuery(current, { priceMax: 1000 })).toMatchObject({ priceMax: 1000, page: 1, specMin: 5 })
  })

  it('keeps the requested page when the change is the page itself', () => {
    expect(updateProductQuery(current, { page: 4 }).page).toBe(4)
  })

  it('clears the spec range when the category changes (kWh is not W)', () => {
    expect(updateProductQuery(current, { category: 'solar-panel' }))
      .toMatchObject({ category: 'solar-panel', specMin: undefined, specMax: undefined, sort: 'spec-desc' })
  })

  it('drops spec sorting when the new category has no spec', () => {
    expect(updateProductQuery(current, { category: undefined }).sort).toBe('featured')
  })

  it('normalizes manufacturers set from the UI', () => {
    expect(updateProductQuery(current, { manufacturer: ['solarix', 'apex', 'solarix'] }).manufacturer).toEqual(['apex', 'solarix'])
  })
})
