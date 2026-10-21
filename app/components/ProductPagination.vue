<script setup lang="ts">
import { mdiChevronLeft, mdiChevronRight } from '@mdi/js'

const props = defineProps<{ page: number, pageCount: number }>()

const { linkTo } = useProductQuery()

const pages = computed(() => paginationItems(props.page, props.pageCount))

// Nuxt keeps the scroll position when only the query changes (good for filters).
// A new page of results should start at the top, so pagination scrolls explicitly.
const scrollToTop = () => window.scrollTo({ top: 0 })
</script>

<template>
  <!-- Real links instead of v-pagination buttons: crawlers can follow ?page=2.
       `exact`: vue-router ignores the query when deciding which link is active,
       so without it every ?page=N link would be styled (and announced) as current.
       With it Vuetify also sets aria-current="page" on the current page. -->
  <nav v-if="pageCount > 1" aria-label="Pagination" class="d-flex justify-center align-center flex-wrap ga-1">
    <v-btn
      :to="linkTo({ page: page - 1 })"
      :disabled="page <= 1"
      exact
      :icon="mdiChevronLeft"
      aria-label="Previous page"
      variant="text"
      size="small"
      @click="scrollToTop"
    />
    <template v-for="(p, i) in pages" :key="i">
      <span v-if="p === 'gap'" class="px-1 text-medium-emphasis">…</span>
      <v-btn
        v-else
        :to="linkTo({ page: p })"
        exact
        :variant="p === page ? 'flat' : 'text'"
        active-color="primary"
        :aria-label="`Page ${p}`"
        size="small"
        min-width="36"
        @click="scrollToTop"
      >
        {{ p }}
      </v-btn>
    </template>
    <v-btn
      :to="linkTo({ page: page + 1 })"
      :disabled="page >= pageCount"
      exact
      :icon="mdiChevronRight"
      aria-label="Next page"
      variant="text"
      size="small"
      @click="scrollToTop"
    />
  </nav>
</template>
