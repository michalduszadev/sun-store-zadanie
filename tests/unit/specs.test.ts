import { describe, expect, it, vi } from 'vitest'
import { extractSpec } from '../../server/utils/specs'

const battery = (name: string, description: string) => ({ name, description, category: 'battery' as const })
const panel = (name: string, description: string) => ({ name, description, category: 'solar-panel' as const })

describe('extractSpec', () => {
  it('reads battery capacity in kWh from the description', () => {
    expect(extractSpec(battery('EcoCharge HomeVault 10', 'The HomeVault 10 is a 10kWh LiFePO4 battery.')))
      .toEqual({ value: 10, unit: 'kWh' })
  })

  it('reads solar panel power in W from the description', () => {
    expect(extractSpec(panel('Solarix Prime 450', 'This panel offers an impressive 450W output.')))
      .toEqual({ value: 450, unit: 'W' })
  })

  it.each([
    ['stack total', 'PowerFlow Stack 7.5', 'The PowerFlow Stack 7.5 is a 7.5kWh modular LFP battery. You can stack up to four units for a total of 30kWh.', 7.5],
    ['module size', 'AuraPower Reserve 12.5', 'A 12.5kWh (five 2.5kWh modules) stackable LFP system.', 12.5],
  ])('takes the first match when the description also mentions a %s', (_, name, description, expected) => {
    expect(extractSpec(battery(name, description))).toEqual({ value: expected, unit: 'kWh' })
  })

  it('accepts a space before the unit, comma decimals and case variants', () => {
    expect(extractSpec(battery('X 7,5', 'A 7,5 KWH unit.'))).toEqual({ value: 7.5, unit: 'kWh' })
    expect(extractSpec(panel('Y 400', 'Rated at 400 W.'))).toEqual({ value: 400, unit: 'W' })
  })

  it('accepts watt-peak (Wp), common in PV datasheets', () => {
    expect(extractSpec(panel('Z 410', 'A 410Wp module.'))).toEqual({ value: 410, unit: 'W' })
  })

  it('does not confuse kW, kWh, V or A with W', () => {
    expect(extractSpec(panel('Panel', 'Certified for 1500V, 15A fuse, 5kW inverter, 10kWh battery.'))).toBeNull()
  })

  it('falls back to the trailing number in the name when the description has no unit', () => {
    expect(extractSpec(battery('PowerFlow Stack 3.5', 'The base module for their scalable system.')))
      .toEqual({ value: 3.5, unit: 'kWh' })
  })

  it('ignores implausible description values and falls back to the name', () => {
    expect(extractSpec(panel('Odd 450', 'Peak 0.45W per cell, 450 total.'))).toEqual({ value: 450, unit: 'W' })
  })

  it('prefers the description and warns when it disagrees with the name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(extractSpec(battery('Bank 5', 'A 4.8kWh module.'))).toEqual({ value: 4.8, unit: 'kWh' })
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  it('returns null for categories without a spec', () => {
    expect(extractSpec({ name: 'SafeLock Inline Fuse 15A', description: 'Rated 15A, 1500V.', category: 'connector' })).toBeNull()
  })

  it('returns null when neither description nor name contain a value', () => {
    expect(extractSpec(battery('Mystery Box', 'Stores energy.'))).toBeNull()
  })
})
