// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: true },

  modules: ['@nuxt/eslint', 'vuetify-nuxt-module'],

  typescript: {
    strict: true,
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },

  css: ['~/assets/main.css'],

  vuetify: {
    // Nuxt also has a `useLayout` composable; prefix Vuetify's to avoid the clash.
    moduleOptions: { prefixComposables: ['useLayout'] },
    vuetifyOptions: {
      // SVG icons from @mdi/js: tree-shaken per icon, no icon font request.
      icons: { defaultSet: 'mdi-svg' },
      theme: {
        defaultTheme: 'light',
        themes: {
          light: {
            colors: {
              primary: '#1f6f43',
              secondary: '#f2a900',
            },
            variables: {
              // Default 0.6 makes field labels ~4.3:1 contrast on white (WCAG AA needs 4.5:1).
              'medium-emphasis-opacity': 0.7,
            },
          },
        },
      },
    },
  },
})
