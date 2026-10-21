<script setup lang="ts">
import { mdiMagnify } from '@mdi/js'

const { query, update } = useProductQuery()

// Local text so typing is instant; the URL is updated after a pause (debounce),
// otherwise every keystroke would be a request and a history entry.
// useDraftField keeps the field in sync with the URL without the echo race.
const { text, markCommitted } = useDraftField(() => query.value.q ?? '')

let timer: ReturnType<typeof setTimeout> | undefined
// Typing with pauses commits several times ("bat", "battery"). Only the first commit
// adds a history entry; later ones replace it, so "back" skips half-typed queries.
// Enter or leaving the field ends the session: the next search gets its own entry.
let pushedWhileFocused = false

function commit() {
  clearTimeout(timer)
  const q = text.value.trim()
  if (!markCommitted(q)) return
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
    @keydown.enter="commit(); pushedWhileFocused = false"
    @blur="pushedWhileFocused = false"
  />
</template>
