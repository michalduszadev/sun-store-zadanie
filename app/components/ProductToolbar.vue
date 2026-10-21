<script setup lang="ts">
import { mdiFilterVariant } from '@mdi/js'
import type { SortOption } from '#shared/utils/productQuery'

defineProps<{ total: number }>()
defineEmits<{ openFilters: [] }>()

const { query, update } = useProductQuery()

const sortItems = computed(() => {
  const items: { title: string, value: SortOption }[] = [
    { title: 'Featured', value: 'featured' },
    { title: 'Price: low to high', value: 'price-asc' },
    { title: 'Price: high to low', value: 'price-desc' },
    { title: 'Name: A to Z', value: 'name-asc' },
  ]
  // Spec sorts only inside a category with a spec (the API ignores them otherwise).
  const spec = categorySpec(query.value.category)
  if (spec) {
    const { label, unit } = spec
    items.push(
      { title: `${label}: high to low`, value: 'spec-desc' },
      { title: `${label}: low to high`, value: 'spec-asc' },
      { title: `Price per ${unit}: low to high`, value: 'unit-price-asc' },
    )
  }
  return items
})
</script>

<template>
  <div class="d-flex flex-wrap align-center ga-3">
    <p class="text-body-1 mr-auto" aria-live="polite">
      {{ formatProductCount(total) }}
    </p>
    <v-btn class="d-md-none" variant="tonal" :prepend-icon="mdiFilterVariant" @click="$emit('openFilters')">
      Filters
    </v-btn>
    <v-select
      :model-value="query.sort"
      :items="sortItems"
      label="Sort by"
      variant="outlined"
      density="compact"
      hide-details
      class="sort-select"
      @update:model-value="(sort: SortOption) => update({ sort })"
    />
  </div>
</template>

<style scoped>
.sort-select {
  max-width: 16rem;
  min-width: 12rem;
}
</style>
