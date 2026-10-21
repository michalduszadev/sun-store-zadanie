<script setup lang="ts">
import { mdiMagnify } from '@mdi/js'

const { query, update } = useProductQuery()

// Local text so typing is instant; the URL is updated after a pause (debounce),
// otherwise every keystroke would be a request and a history entry.
const text = ref(query.value.q ?? '')

// URL -> field: back/forward or "Clear all" must also update the input.
watch(() => query.value.q, (q) => {
  if ((q ?? '') !== text.value.trim()) text.value = q ?? ''
})

let timer: ReturnType<typeof setTimeout> | undefined

function commit() {
  clearTimeout(timer)
  const q = text.value.trim()
  if (q !== (query.value.q ?? '')) update({ q: q || undefined })
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
  />
</template>
