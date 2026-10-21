<script setup lang="ts">
import { mdiClose } from '@mdi/js'

const { query, reset } = useProductQuery()

// Fetch with the *normalized* query, not raw route.query: one filter set maps to
// one request URL (better CDN cache hits), and junk params (utm_*, typos) are dropped.
const apiQuery = computed(() => serializeProductQuery(query.value))

// SSR: Nitro calls the handler in-process and the result is embedded in the HTML
// payload, so hydration does not fetch again. Client: changing apiQuery refetches.
// A fixed key keeps the previous results on screen while the next ones load.
const { data, status, error, refresh } = await useFetch('/api/products', {
  key: 'products',
  query: apiQuery,
})

const loading = computed(() => status.value === 'pending')
const filtersOpen = ref(false)

// --- SEO: all rules live in shared/utils/listingSeo.ts (pure, unit-tested) ---
const seo = computed(() => {
  if (!data.value) return null
  const meta = buildListingSeo(query.value, data.value)
  return { ...meta, jsonLd: buildItemListJsonLd(meta.heading, data.value) }
})

// Absolute URL from the incoming request (works on SSR and in the browser).
// router.resolve encodes the query exactly like the links on the page.
const origin = useRequestURL().origin
const router = useRouter()
const canonicalUrl = computed(() => seo.value && origin + router.resolve({ path: '/', query: seo.value.canonicalQuery }).href)

// Getters keep the tags reactive: they update on client-side filter changes too.
useSeoMeta({
  title: () => seo.value?.title ?? `Products | ${SITE_NAME}`,
  description: () => seo.value?.description,
  robots: () => seo.value?.robots,
  ogTitle: () => seo.value?.title,
  ogDescription: () => seo.value?.description,
  ogUrl: () => canonicalUrl.value,
  ogType: 'website',
  ogSiteName: SITE_NAME,
  twitterCard: 'summary',
})

useHead({
  link: () => (canonicalUrl.value ? [{ rel: 'canonical', href: canonicalUrl.value }] : []),
  // unhead serializes the object and escapes "<" for JSON script types.
  script: () => (seo.value ? [{ type: 'application/ld+json', textContent: seo.value.jsonLd }] : []),
})
</script>

<template>
  <v-container class="py-6">
    <h1 class="text-h4 font-weight-bold mb-4">
      {{ seo?.heading ?? 'Products' }}
    </h1>

    <v-alert v-if="error && !data" type="error" variant="tonal" class="mb-4">
      Could not load products.
      <template #append>
        <v-btn variant="text" @click="refresh()">
          Try again
        </v-btn>
      </template>
    </v-alert>

    <v-row v-if="data">
      <!-- Desktop: filters in a sidebar. Mobile: the same component in a dialog.
           Switching with CSS (d-none d-md-block) instead of useDisplay() avoids
           a hydration mismatch, because the server does not know the screen width. -->
      <v-col cols="12" md="3" class="d-none d-md-block">
        <aside aria-label="Filters">
          <!-- Delayed hydration: hydrates only once visible. On phones the sidebar is
               display:none, so its ~30 inputs are never hydrated (less main-thread work);
               the server-rendered category links are still in the HTML for crawlers. -->
          <LazyProductFilters hydrate-on-visible :facets="data.facets" />
        </aside>
      </v-col>

      <v-col cols="12" md="9">
        <div class="d-flex flex-column ga-4">
          <ProductSearch />
          <ProductToolbar :total="data.total" @open-filters="filtersOpen = true" />
          <ActiveFilters :facets="data.facets" />

          <div class="results" :class="{ 'results--loading': loading }" :aria-busy="loading">
            <v-progress-linear v-if="loading" indeterminate color="primary" class="results__progress" />

            <v-row v-if="data.items.length > 0">
              <v-col v-for="product in data.items" :key="product.id" cols="12" sm="6" lg="4">
                <ProductCard :product="product" />
              </v-col>
            </v-row>

            <v-sheet v-else border rounded class="pa-8 text-center">
              <p class="text-h6 mb-2">
                No products match these filters
              </p>
              <p class="text-body-2 text-medium-emphasis mb-4">
                Try removing a filter or searching for something broader.
              </p>
              <v-btn color="primary" @click="reset">
                Clear all filters
              </v-btn>
            </v-sheet>
          </div>

          <ProductPagination :page="data.page" :page-count="data.pageCount" />
        </div>
      </v-col>
    </v-row>

    <v-dialog v-if="data" v-model="filtersOpen" fullscreen scrollable>
      <v-card>
        <v-toolbar color="surface" border="b" density="comfortable">
          <v-toolbar-title>Filters</v-toolbar-title>
          <v-btn :icon="mdiClose" aria-label="Close filters" @click="filtersOpen = false" />
        </v-toolbar>
        <v-card-text>
          <ProductFilters :facets="data.facets" />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn block color="primary" variant="flat" size="large" @click="filtersOpen = false">
            Show {{ formatProductCount(data.total) }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.results {
  position: relative;
  transition: opacity 0.15s;
}

/* Keep the previous results visible but dimmed instead of flashing a spinner. */
.results--loading {
  opacity: 0.55;
}

.results__progress {
  position: absolute;
  top: -8px;
  left: 0;
  right: 0;
}
</style>
