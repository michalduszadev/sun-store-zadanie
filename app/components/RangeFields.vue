<script setup lang="ts">
/** Min/max number inputs. Emits only on commit (blur or Enter), not on every keystroke. */
const props = defineProps<{
  min?: number
  max?: number
  /** Bounds shown as placeholders. */
  bounds: { min: number, max: number }
  prefix?: string
  suffix?: string
  label: string
}>()

const emit = defineEmits<{ change: [range: { min?: number, max?: number }] }>()

const toText = (value?: number) => (value === undefined ? '' : String(value))

// One draft per field: a URL change of `min` (e.g. our own commit finishing) never
// touches what the user is typing in `max`, and vice versa.
const { text: minText, markCommitted: markMinCommitted } = useDraftField(() => toText(props.min))
const { text: maxText, markCommitted: markMaxCommitted } = useDraftField(() => toText(props.max))

function parse(text: string): number | undefined {
  const value = Number(text.replace(',', '.'))
  return text.trim() === '' || !Number.isFinite(value) || value < 0 ? undefined : value
}

// Both values are committed together, from the fields: building one of them from props
// would use a stale URL while an earlier commit is still navigating.
function commit() {
  const next = { min: parse(minText.value), max: parse(maxText.value) }
  // Show what is applied: invalid input ("abc", "-5") is cleared, not silently ignored.
  minText.value = toText(next.min)
  maxText.value = toText(next.max)
  const minChanged = markMinCommitted(minText.value)
  const maxChanged = markMaxCommitted(maxText.value)
  if (minChanged || maxChanged) emit('change', next)
}
</script>

<!-- fieldset + legend: screen readers announce "Price, group" before "From"/"To".
     (An aria-label on the input would be ignored: Vuetify links the visible label via aria-labelledby.) -->
<template>
  <fieldset class="range-fields">
    <legend class="text-subtitle-2 mb-2">
      {{ label }}
    </legend>
    <div class="d-flex ga-2">
      <v-text-field
        v-model="minText"
        :placeholder="String(bounds.min)"
        :prefix="prefix"
        :suffix="suffix"
        label="From"
        inputmode="decimal"
        variant="outlined"
        density="compact"
        hide-details
        @change="commit"
        @keydown.enter="commit"
      />
      <v-text-field
        v-model="maxText"
        :placeholder="String(bounds.max)"
        :prefix="prefix"
        :suffix="suffix"
        label="To"
        inputmode="decimal"
        variant="outlined"
        density="compact"
        hide-details
        @change="commit"
        @keydown.enter="commit"
      />
    </div>
  </fieldset>
</template>

<style scoped>
.range-fields {
  border: 0;
  padding: 0;
  margin: 0;
}
</style>
