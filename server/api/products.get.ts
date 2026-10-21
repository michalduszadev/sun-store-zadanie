import type { ProductsResponse } from '#shared/types/api'
import { parseProductQuery } from '#shared/utils/productQuery'

/**
 * GET /api/products?category=battery&manufacturer=ecocharge,aurapower&priceMax=1500&sort=spec-desc&page=2
 * Filtering, search, sorting, paging and facet counts all happen here, on the server.
 */
export default defineEventHandler(async (event): Promise<ProductsResponse> => {
  // parseProductQuery never throws: invalid params are ignored, not answered with 400.
  const query = parseProductQuery(getQuery(event))

  const catalog = await getCatalog()

  // Set after loading succeeded, so an error response is never cached.
  // Catalog only changes on deploy: let the CDN cache each URL and refresh in the background.
  setResponseHeader(event, 'Cache-Control', 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400')

  return queryProducts(catalog, query)
})
