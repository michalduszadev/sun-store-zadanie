import { ref, watch } from 'vue'

/**
 * A text field whose value lives in the URL ("draft" = what the user sees and types).
 *
 * Typing changes only the local `text`; the caller decides when to commit it to the
 * URL. Navigation finishes asynchronously, so the URL change caused by our own commit
 * arrives later, possibly after the user typed more. That echo must not overwrite the
 * field; only changes made elsewhere (back/forward, "Clear all", a chip) are copied in.
 *
 * Explicit `vue` imports (not Nuxt auto-imports) so it runs in plain Vitest.
 */
export function useDraftField(urlValue: () => string) {
  const text = ref(urlValue())
  /** The value the URL has, or is about to have after our latest commit. */
  let committed = urlValue()

  watch(urlValue, (value) => {
    if (value === committed) return // echo of our own commit
    committed = value
    text.value = value
  })

  /**
   * Call right before navigating, with the value as it will appear in the URL.
   * Returns false when it is already committed, so the caller can skip navigating.
   */
  function markCommitted(value: string): boolean {
    if (value === committed) return false
    committed = value
    return true
  }

  return { text, markCommitted }
}
