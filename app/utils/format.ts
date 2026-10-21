import type { ProductSpec, SpecUnit } from '#shared/types/product'

// The CSV has no currency; EUR is assumed (European B2B marketplace).
// Formatters are created once: Intl constructors are relatively expensive.
const price = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' })
const unitPrice: Record<SpecUnit, Intl.NumberFormat> = {
  kWh: new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }),
  // Panels cost cents per watt, so one more digit is meaningful (EUR 0.622/W).
  W: new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 3, maximumFractionDigits: 3 }),
}
const number = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 1 })

export const formatPrice = (value: number) => price.format(value)

export const formatSpec = (spec: ProductSpec) => `${number.format(spec.value)} ${spec.unit}`

export const formatUnitPrice = (value: number, unit: SpecUnit) => `${unitPrice[unit].format(value)}/${unit}`

export const formatProductCount = (count: number) => `${count} ${count === 1 ? 'product' : 'products'}`
