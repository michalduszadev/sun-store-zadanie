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

// Options come from sortItems (typed SortOption), and the URL is validated again by parseProductQuery.
const onSortChange = (event: Event) => update({ sort: (event.target as HTMLSelectElement).value as SortOption })
</script>

<template>
  <div class="d-flex flex-wrap align-center ga-3">
    <p class="text-body-1 mr-auto" aria-live="polite">
      {{ formatProductCount(total) }}
    </p>
    <v-btn class="d-md-none" variant="tonal" :prepend-icon="mdiFilterVariant" @click="$emit('openFilters')">
      Filters
    </v-btn>
    <!-- Native <select> instead of v-select: v-select hides its real input behind the
         selected text (hard for tests and assistive tech), ships overlay/list code to
         hydrate, and on phones a native select opens the system picker. -->
    <label class="sort">
      <span class="sort__label">Sort by</span>
      <!-- `selected` on the option, not `:value` on the select: HTML has no value
           attribute for <select>, so only this survives server rendering. -->
      <select class="sort__select" @change="onSortChange">
        <option v-for="item in sortItems" :key="item.value" :value="item.value" :selected="item.value === query.sort">
          {{ item.title }}
        </option>
      </select>
    </label>
  </div>
</template>

<style scoped>
.sort {
  position: relative;
  display: inline-flex;
}

/* Floating label on the border, like Vuetify's outlined fields next to it. */
.sort__label {
  position: absolute;
  top: -0.55rem;
  left: 0.6rem;
  padding: 0 0.25rem;
  font-size: 0.75rem;
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.sort__select {
  min-width: 12rem;
  height: 40px;
  padding: 0 2rem 0 0.75rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.38);
  border-radius: 4px;
  font: inherit;
  color: inherit;
  background: rgb(var(--v-theme-surface)) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E") no-repeat right 0.5rem center / 1.25rem;
  appearance: none;
  cursor: pointer;
}

.sort__select:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 1px;
}
</style>
