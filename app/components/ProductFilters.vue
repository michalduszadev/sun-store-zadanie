<script setup lang="ts">
import type { ProductsResponse } from '#shared/types/api'

defineProps<{ facets: ProductsResponse['facets'] }>()

const { query, linkTo, update } = useProductQuery()

// "solar panels (W) or batteries (kWh)", derived so it cannot drift from CATEGORIES.
const specHint = CATEGORY_SLUGS
  .flatMap((slug) => {
    const { labelPlural, spec } = CATEGORIES[slug]
    return spec ? [`${labelPlural.toLowerCase()} (${spec.unit})`] : []
  })
  .join(' or ')
</script>

<template>
  <div class="d-flex flex-column ga-6">
    <!-- Categories are links (not buttons): crawlable, open-in-new-tab works, SSR-friendly.
         `:active` is explicit because vue-router ignores the query string when matching links. -->
    <nav aria-label="Categories">
      <h2 class="text-subtitle-2 mb-1">
        Category
      </h2>
      <v-list density="compact" nav class="pa-0">
        <v-list-item
          :to="linkTo({ category: undefined })"
          :active="!query.category"
          title="All products"
          color="primary"
        />
        <v-list-item
          v-for="category in facets.categories"
          :key="category.value"
          :to="linkTo({ category: category.value })"
          :active="query.category === category.value"
          :title="category.label"
          :disabled="category.count === 0 && query.category !== category.value"
          color="primary"
        >
          <template #append>
            <span class="text-caption text-medium-emphasis">{{ category.count }}</span>
          </template>
        </v-list-item>
      </v-list>
    </nav>

    <section aria-labelledby="filter-manufacturer">
      <h2 id="filter-manufacturer" class="text-subtitle-2 mb-1">
        Manufacturer
      </h2>
      <div class="manufacturers">
        <v-checkbox
          v-for="manufacturer in facets.manufacturers"
          :key="manufacturer.value"
          :model-value="query.manufacturer"
          :value="manufacturer.value"
          density="compact"
          color="primary"
          hide-details
          @update:model-value="(value: string[] | null) => update({ manufacturer: value ?? [] })"
        >
          <template #label>
            {{ manufacturer.label }}
            <span class="text-caption text-medium-emphasis ml-1">({{ manufacturer.count }})</span>
          </template>
        </v-checkbox>
        <p v-if="facets.manufacturers.length === 0" class="text-body-2 text-medium-emphasis">
          No manufacturers match the other filters.
        </p>
      </div>
    </section>

    <RangeFields
      label="Price"
      prefix="€"
      :min="query.priceMin"
      :max="query.priceMax"
      :bounds="facets.price"
      @change="({ min, max }) => update({ priceMin: min, priceMax: max })"
    />

    <RangeFields
      v-if="facets.spec"
      :label="`${facets.spec.label} (${facets.spec.unit})`"
      :suffix="facets.spec.unit"
      :min="query.specMin"
      :max="query.specMax"
      :bounds="facets.spec"
      @change="({ min, max }) => update({ specMin: min, specMax: max })"
    />
    <p v-else class="text-caption text-medium-emphasis">
      Pick {{ specHint }} to filter and sort by capacity or power.
    </p>
  </div>
</template>

<style scoped>
.manufacturers {
  max-height: 22rem;
  overflow-y: auto;
}
</style>
