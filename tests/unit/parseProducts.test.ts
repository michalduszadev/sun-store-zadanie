import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { parseProductsCsv } from '../../server/utils/parseProducts'

const HEADER = 'name,manufacturer,price,description,category'

describe('parseProductsCsv', () => {
  it('parses quoted descriptions containing commas', () => {
    const [product] = parseProductsCsv(`${HEADER}\nEcoCharge HomeVault 10,EcoCharge,1499,"A 10kWh battery, 6,000 cycle life.",battery`)
    expect(product).toMatchObject({
      id: 'ecocharge-homevault-10',
      manufacturer: 'EcoCharge',
      manufacturerSlug: 'ecocharge',
      price: 1499,
      description: 'A 10kWh battery, 6,000 cycle life.',
      category: 'battery',
      spec: { value: 10, unit: 'kWh' },
    })
  })

  it('computes price per spec unit', () => {
    const [product] = parseProductsCsv(`${HEADER}\nSolarix Prime 450,Solarix,279.99,A 450W panel.,solar panel`)
    expect(product?.unitPrice).toBeCloseTo(0.6222, 4)
  })

  it('leaves unitPrice null for products without a spec', () => {
    const [product] = parseProductsCsv(`${HEADER}\nSafeLock Pro Pair M/F,SafeLock,7.99,MC4 pair.,connector`)
    expect(product).toMatchObject({ category: 'connector', spec: null, unitPrice: null })
  })

  it('skips invalid rows instead of failing the whole catalog', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const products = parseProductsCsv([
      HEADER,
      'Good 5,Brand,100,A 5kWh unit.,battery',
      'No Price,Brand,,A 5kWh unit.,battery',
      'Bad Category,Brand,10,Something.,inverter',
    ].join('\n'))
    expect(products.map(p => p.name)).toEqual(['Good 5'])
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })

  describe('real products.csv', () => {
    const products = parseProductsCsv(readFileSync(new URL('../../server/assets/products.csv', import.meta.url), 'utf8'))

    it('loads all 150 products with unique ids', () => {
      expect(products).toHaveLength(150)
      expect(new Set(products.map(p => p.id)).size).toBe(150)
    })

    it('finds a spec for every battery and panel, matching the model number in the name', () => {
      for (const p of products.filter(p => p.category !== 'connector')) {
        const modelNumber = Number(p.name.split(' ').at(-1))
        expect(p.spec?.value, p.name).toBe(modelNumber)
      }
    })
  })
})
