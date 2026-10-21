<script setup lang="ts">
import type { ProductsResponse } from '#shared/types/api'

const props = defineProps<{ facets: ProductsResponse['facets'] }>()

const { query, update, reset } = useProductQuery()


/** One chip per active filter; closing a chip removes just that filter. */
const chips = computed(() => {
  const q = query.value
  const list: { key: string, label: string, remove: () => void }[] = []

  if (q.category) list.push({ key: 'category', label: CATEGORIES[q.category].labelPlural, remove: () => update({ category: undefined }) })
  for (const slug of q.manufacturer) {
    const label = props.facets.manufacturers.find(m => m.value === slug)?.label ?? slug
    list.push({ key: `m-${slug}`, label, remove: () => update({ manufacturer: q.manufacturer.filter(s => s !== slug) }) })
  }
  if (q.priceMin !== undefined || q.priceMax !== undefined) {
    list.push({ key: 'price', label: `Price ${formatRange(q.priceMin, q.priceMax, formatPrice)}`, remove: () => update({ priceMin: undefined, priceMax: undefined }) })
  }
  // normalize() already cleared specMin/Max if the category has no spec.
  const spec = categorySpec(q.category)
  if (spec && (q.specMin !== undefined || q.specMax !== undefined)) {
    const { label, unit } = spec
    list.push({ key: 'spec', label: `${label} ${formatRange(q.specMin, q.specMax, String)} ${unit}`, remove: () => update({ specMin: undefined, specMax: undefined }) })
  }
  if (q.q) list.push({ key: 'q', label: `“${q.q}”`, remove: () => update({ q: undefined }) })

  return list
})
</script>

<template>
  <div v-if="chips.length > 0" class="d-flex flex-wrap align-center ga-2">
    <v-chip v-for="chip in chips" :key="chip.key" closable size="small" @click:close="chip.remove">
      {{ chip.label }}
    </v-chip>
    <v-btn variant="text" size="small" color="primary" @click="reset">
      Clear all
    </v-btn>
  </div>
</template>
