<script setup lang="ts">
import { mdiBatteryCharging, mdiPowerPlug, mdiSolarPanel } from '@mdi/js'
import type { Product } from '#shared/types/product'
import type { CategorySlug } from '#shared/utils/categories'

defineProps<{ product: Product }>()

const ICONS: Record<CategorySlug, string> = {
  'solar-panel': mdiSolarPanel,
  'battery': mdiBatteryCharging,
  'connector': mdiPowerPlug,
}
</script>

<template>
  <v-card variant="outlined" class="product-card d-flex flex-column h-100">
    <v-card-item>
      <template #prepend>
        <v-avatar color="primary" variant="tonal" rounded>
          <v-icon :icon="ICONS[product.category]" :aria-label="CATEGORIES[product.category].label" />
        </v-avatar>
      </template>
      <p class="text-overline text-medium-emphasis lh-tight">
        {{ product.manufacturer }}
      </p>
      <h2 class="text-subtitle-1 font-weight-bold lh-tight">
        {{ product.name }}
      </h2>
    </v-card-item>

    <v-card-text class="flex-grow-1 pb-2">
      <v-chip v-if="product.spec" size="small" color="secondary" variant="flat" class="mb-2 font-weight-bold">
        {{ formatSpec(product.spec) }}
      </v-chip>
      <p class="description text-body-2 text-medium-emphasis">
        {{ product.description }}
      </p>
    </v-card-text>

    <v-card-actions class="px-4 pb-4 pt-0 d-flex align-end justify-space-between">
      <span class="text-h6 font-weight-bold">{{ formatPrice(product.price) }}</span>
      <span v-if="product.spec && product.unitPrice !== null" class="text-caption text-medium-emphasis">
        {{ formatUnitPrice(product.unitPrice, product.spec.unit) }}
      </span>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.lh-tight {
  line-height: 1.3;
}

/* Three lines keep cards the same height; the full text stays in the HTML for SEO. */
.description {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
