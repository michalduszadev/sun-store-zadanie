import { parse } from 'csv-parse/sync'
import { z } from 'zod'
import type { Product } from '#shared/types/product'
import { categoryFromCsv } from '#shared/utils/categories'
import { slugify } from '#shared/utils/slugify'
import { extractSpec } from './specs'

const rowSchema = z.object({
  name: z.string().trim().min(1),
  manufacturer: z.string().trim().min(1),
  // Empty string would become 0, so require a non-empty value first; NaN is rejected by z.number().
  price: z.string().trim().min(1).transform(Number).pipe(z.number().nonnegative()),
  description: z.string().trim(),
  category: z.string().transform((value, ctx) => {
    const category = categoryFromCsv(value)
    if (!category) {
      ctx.addIssue({ code: 'custom', message: `Unknown category "${value}"` })
      return z.NEVER
    }
    return category.slug
  }),
})

/**
 * Pure: CSV text in, enriched products out. Kept separate from the
 * storage loader so it can be unit-tested without the Nitro runtime.
 */
export function parseProductsCsv(csv: string): Product[] {
  const rows: unknown[] = parse(csv, { columns: true, skip_empty_lines: true, trim: true })
  const products: Product[] = []

  rows.forEach((row, index) => {
    const result = rowSchema.safeParse(row)
    if (!result.success) {
      // +2: header line and 1-based numbering, so the log points at the CSV line.
      console.warn(`[catalog] Skipping CSV line ${index + 2}: ${z.prettifyError(result.error)}`)
      return
    }

    const { name, manufacturer, price, description, category } = result.data
    const spec = extractSpec({ name, description, category })

    products.push({
      id: slugify(name),
      name,
      manufacturer,
      manufacturerSlug: slugify(manufacturer),
      price,
      description,
      category,
      spec,
      unitPrice: spec && spec.value > 0 ? price / spec.value : null,
    })
  })

  return products
}
