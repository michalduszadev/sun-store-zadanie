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
const minText = ref(toText(props.min))
const maxText = ref(toText(props.max))

// URL -> fields (back/forward, chips, "Clear all").
watch(() => [props.min, props.max], () => {
  minText.value = toText(props.min)
  maxText.value = toText(props.max)
})

function parse(text: string): number | undefined {
  const value = Number(text.replace(',', '.'))
  return text.trim() === '' || !Number.isFinite(value) || value < 0 ? undefined : value
}

function commit() {
  const next = { min: parse(minText.value), max: parse(maxText.value) }
  if (next.min !== props.min || next.max !== props.max) emit('change', next)
}
</script>

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
        :aria-label="`${label} from`"
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
        :aria-label="`${label} to`"
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
