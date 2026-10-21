<template>
  <v-app>
    <NuxtRouteAnnouncer />
    <v-app-bar flat border="b" color="surface">
      <v-container class="d-flex align-center py-0">
        <NuxtLink to="/" class="brand text-h6 font-weight-bold">
          sun<span class="text-primary">.store</span>
        </NuxtLink>
        <span class="text-caption text-medium-emphasis ml-3 d-none d-sm-inline">PV products for installers</span>
      </v-container>
    </v-app-bar>
    <v-main>
      <NuxtPage />
    </v-main>
    <v-footer class="text-caption text-medium-emphasis justify-center" border="t">
      Recruitment task demo. Product data from products.csv; not a real shop.
    </v-footer>
  </v-app>
</template>

<style scoped>
.brand {
  color: inherit;
  text-decoration: none;
}
</style>
