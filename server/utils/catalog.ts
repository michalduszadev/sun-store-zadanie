import type { Product } from '#shared/types/product'
import { parseProductsCsv } from './parseProducts'

let catalog: Promise<readonly Product[]> | undefined

/**
 * Reads products.csv from Nitro server assets (`server/assets/` is bundled
 * with the server build, so it also works on serverless platforms where
 * relative fs paths do not exist) and parses it once per server instance.
 * The promise is cached, so concurrent first requests share one parse.
 * Readonly: the array is shared by all requests, so handlers must not
 * sort or splice it in place (use toSorted / filter / slice).
 */
export function getCatalog(): Promise<readonly Product[]> {
  catalog ??= loadCatalog()
  return catalog
}

async function loadCatalog(): Promise<readonly Product[]> {
  const csv = await useStorage('assets:server').getItem<string>('products.csv')
  if (!csv) {
    throw createError({ statusCode: 500, statusMessage: 'Product catalog is missing' })
  }
  return parseProductsCsv(csv)
}
