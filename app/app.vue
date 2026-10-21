<template>
  <v-app>
    <NuxtRouteAnnouncer />
    <!-- Plain sticky header instead of v-app-bar: Vuetify's layout system measures
         the app bar only after hydration (SSR sends --v-layout-top: 0px), which shifted
         the whole page down by 64px (CLS). Sticky positioning needs no measuring. -->
    <header class="app-header">
      <v-container class="d-flex align-center py-0 h-100">
        <NuxtLink to="/" class="brand text-h6 font-weight-bold">
          sun<span class="text-primary">.store</span>
        </NuxtLink>
        <span class="text-caption text-medium-emphasis ml-3 d-none d-sm-inline">PV products for installers</span>
      </v-container>
    </header>
    <main>
      <NuxtPage />
    </main>
    <v-footer class="text-caption text-medium-emphasis justify-center" border="t">
      Recruitment task demo. Product data from products.csv; not a real shop.
    </v-footer>
  </v-app>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  height: 64px;
  background: rgb(var(--v-theme-surface));
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

main {
  flex: 1 0 auto;
}

.brand {
  color: inherit;
  text-decoration: none;
}
</style>
