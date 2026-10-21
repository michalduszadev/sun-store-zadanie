<script setup lang="ts">
import { mdiMagnify } from '@mdi/js'

const { query, update } = useProductQuery()

// Local text so typing is instant; the URL is updated after a pause (debounce),
// otherwise every keystroke would be a request and a history entry.
const text = ref(query.value.q ?? '')

// Last value this field wrote to the URL.
let committed = query.value.q ?? ''

// URL -> field: back/forward or "Clear all" must also update the input.
// The URL change caused by our own commit is ignored: the navigation finishes
// asynchronously and the user may have typed more in the meantime.
watch(() => query.value.q ?? '', (q) => {
  if (q === committed) return
  committed = q
  text.value = q
})

let timer: ReturnType<typeof setTimeout> | undefined
// Typing with pauses commits several times ("bat", "battery"). Only the first commit
// adds a history entry; later ones replace it, so "back" skips half-typed queries.
let pushedWhileFocused = false

function commit() {
  clearTimeout(timer)
  const q = text.value.trim()
  if (q === committed) return
  committed = q
  update({ q: q || undefined }, { replace: pushedWhileFocused })
  pushedWhileFocused = true
}

function onInput(value: string | null) {
  text.value = value ?? ''
  clearTimeout(timer)
  timer = setTimeout(commit, 350)
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <v-text-field
    :model-value="text"
    :prepend-inner-icon="mdiMagnify"
    label="Search products"
    placeholder="Name, manufacturer or description"
    type="search"
    variant="outlined"
    density="comfortable"
    clearable
    hide-details
    @update:model-value="onInput"
    @keydown.enter="commit"
    @blur="pushedWhileFocused = false"
  />
</template>
