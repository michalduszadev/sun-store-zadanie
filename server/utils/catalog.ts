import type { Product } from '#shared/types/product'
import { parseProductsCsv } from './parseProducts'

let catalog: Promise<Product[]> | undefined

/**
 * Reads products.csv from Nitro server assets (`server/assets/` is bundled
 * with the server build, so it also works on serverless platforms where
 * relative fs paths do not exist) and parses it once per server instance.
 * The promise is cached, so concurrent first requests share one parse.
 */
export function getCatalog(): Promise<Product[]> {
  catalog ??= loadCatalog().catch((error: unknown) => {
    catalog = undefined // do not cache a failure, retry on the next request
    throw error
  })
  return catalog
}

async function loadCatalog(): Promise<Product[]> {
  const csv = await useStorage('assets:server').getItem<string>('products.csv')
  if (typeof csv !== 'string' || csv.length === 0) {
    throw createError({ statusCode: 500, statusMessage: 'Product catalog is missing' })
  }
  return parseProductsCsv(csv)
}
