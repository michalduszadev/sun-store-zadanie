import type { RouteLocationRaw } from 'vue-router'
import type { ProductQuery } from '#shared/utils/productQuery'

/**
 * The URL is the single source of truth for the listing filters (no Pinia):
 * SSR renders straight from it, links are shareable, and the browser's
 * back/forward buttons work without any extra code.
 * This composable is the only place that reads or writes it.
 */
export function useProductQuery() {
  const route = useRoute()
  const router = useRouter()

  /** Typed, validated filters. Recomputed on every URL change, including back/forward. */
  const query = computed(() => parseProductQuery(route.query))

  /** Target of a change, for `:to` props: categories and pages become real, crawlable <a href> links. */
  function linkTo(patch: Partial<ProductQuery>): RouteLocationRaw {
    return { path: route.path, query: serializeProductQuery(updateProductQuery(query.value, patch)) }
  }

  /**
   * Applies a change by navigating. `push` adds a history entry, so "back" undoes it;
   * `replace` overwrites the current one (used while a search is still being typed).
   */
  function update(patch: Partial<ProductQuery>, { replace = false } = {}) {
    return replace ? router.replace(linkTo(patch)) : router.push(linkTo(patch))
  }

  /** Relative href of a query, encoded exactly like the links on the page (used for canonical). */
  function hrefFor(query: Record<string, string>): string {
    return router.resolve({ path: route.path, query }).href
  }

  function reset() {
    return router.push({ path: route.path })
  }

  return { query, linkTo, update, hrefFor, reset }
}
