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

<!-- Plain HTML inside one v-card: the card has no interactivity, and 24 cards x
     ~6 Vuetify components each was a measurable share of hydration time on mobile. -->
<template>
  <v-card tag="article" variant="outlined" class="product-card d-flex flex-column h-100 pa-4 ga-3">
    <div class="d-flex align-center ga-3">
      <span class="category-icon">
        <svg viewBox="0 0 24 24" width="24" height="24" role="img" :aria-label="CATEGORIES[product.category].label">
          <path :d="ICONS[product.category]" />
        </svg>
      </span>
      <div>
        <p class="text-overline text-medium-emphasis lh-tight">
          {{ product.manufacturer }}
        </p>
        <h2 class="text-subtitle-1 font-weight-bold lh-tight">
          {{ product.name }}
        </h2>
      </div>
    </div>

    <div class="flex-grow-1">
      <span v-if="product.spec" class="spec-badge">{{ formatSpec(product.spec) }}</span>
      <p class="description text-body-2 text-medium-emphasis">
        {{ product.description }}
      </p>
    </div>

    <div class="d-flex align-end justify-space-between">
      <span class="text-h6 font-weight-bold">{{ formatPrice(product.price) }}</span>
      <span v-if="product.spec && product.unitPrice !== null" class="text-caption text-medium-emphasis">
        {{ formatUnitPrice(product.unitPrice, product.spec.unit) }}
      </span>
    </div>
  </v-card>
</template>

<style scoped>
.lh-tight {
  line-height: 1.3;
}

.category-icon {
  display: inline-flex;
  flex: none;
  padding: 8px;
  border-radius: 8px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.12);
  fill: currentColor;
}

.spec-badge {
  display: inline-block;
  margin-bottom: 8px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgb(var(--v-theme-secondary));
  color: rgb(var(--v-theme-on-secondary));
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
