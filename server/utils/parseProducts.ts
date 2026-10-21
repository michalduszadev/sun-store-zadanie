import { parse } from 'csv-parse/sync'
import { z } from 'zod'
import type { Product } from '#shared/types/product'
import { CATEGORY_SLUGS, categoryFromCsv } from '#shared/utils/categories'
import { slugify } from '#shared/utils/slugify'
import { extractSpec } from './specs'

// Values arrive already trimmed by csv-parse (`trim: true`).
const rowSchema = z.object({
  name: z.string().min(1),
  manufacturer: z.string().min(1),
  // Empty string would become 0, so require a non-empty value first; NaN is rejected by z.number().
  price: z.string().min(1).transform(Number).pipe(z.number().nonnegative()),
  description: z.string(),
  category: z.string().transform(categoryFromCsv).pipe(z.enum(CATEGORY_SLUGS)),
})

interface CsvRow {
  record: unknown
  /** `info: true` makes csv-parse report the real line (correct even with multiline quoted fields). */
  info: { lines: number }
}

/**
 * Pure: CSV text in, enriched products out. Kept separate from the
 * storage loader so it can be unit-tested without the Nitro runtime.
 */
export function parseProductsCsv(csv: string): Product[] {
  const rows: CsvRow[] = parse(csv, { columns: true, skip_empty_lines: true, trim: true, info: true })
  const products: Product[] = []

  for (const { record, info } of rows) {
    const result = rowSchema.safeParse(record)
    if (!result.success) {
      console.warn(`[catalog] Skipping CSV line ${info.lines}: ${z.prettifyError(result.error)}`)
      continue
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
      // spec.value is > 0, guaranteed by the plausibility range in extractSpec.
      unitPrice: spec ? price / spec.value : null,
    })
  }

  return products
}
