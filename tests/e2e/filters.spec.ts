import { expect, test, type Page } from '@playwright/test'

/** Product names in the order shown on the page. */
const productNames = (page: Page) => page.locator('.product-card h2')

type NuxtWindow = Window & { useNuxtApp?: () => { isHydrating: boolean } }

/**
 * Clicking a checkbox before hydration would toggle plain server-rendered HTML
 * with no Vue handler attached, so wait for it. Same check as the official
 * `@nuxt/test-utils` helper (`goto(url, { waitUntil: 'hydration' })`), without
 * adding that dependency. `networkidle` then waits for the lazily loaded chunk
 * of the delayed-hydration sidebar, which nothing in the DOM signals.
 */
async function waitForHydration(page: Page) {
  await page.waitForFunction(() => (window as NuxtWindow).useNuxtApp?.().isHydrating === false)
  await page.waitForLoadState('networkidle')
}

test('filters live in the URL: they survive a reload and "back" undoes the last one', async ({ page }) => {
  await page.goto('/')
  await waitForHydration(page)

  // Category: a real link in the sidebar.
  await page.getByRole('navigation', { name: 'Categories' }).getByRole('link', { name: /Batteries/ }).click()
  await expect(page).toHaveURL(/\?category=battery$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Batteries')

  // Manufacturer: a checkbox.
  await page.getByRole('checkbox', { name: /EcoCharge/ }).check()
  await expect(page).toHaveURL(/manufacturer=ecocharge/)
  await expect(page.getByText('5 products')).toBeVisible()

  // Sort by capacity (kWh), available because a category with a spec is selected.
  await page.getByLabel('Sort by').selectOption({ label: 'Capacity: high to low' })
  await expect(page).toHaveURL(/sort=spec-desc/)

  const resultsBeforeReload = await productNames(page).allTextContents()
  expect(resultsBeforeReload).toEqual([
    'EcoCharge HomeVault 13.5',
    'EcoCharge HomeVault 12',
    'EcoCharge HomeVault 10',
    'EcoCharge HomeVault 7.5',
    'EcoCharge HomeVault 5',
  ])

  // Reload: same URL, same results, same controls.
  await page.reload()
  await waitForHydration(page)
  await expect(productNames(page)).toHaveText(resultsBeforeReload)
  await expect(page.getByRole('checkbox', { name: /EcoCharge/ })).toBeChecked()
  await expect(page.getByLabel('Sort by')).toHaveValue('spec-desc')

  // Back: undoes only the sort, the other filters stay.
  await page.goBack()
  await expect(page).not.toHaveURL(/sort=/)
  await expect(page).toHaveURL(/category=battery&manufacturer=ecocharge/)
  await expect(productNames(page).first()).toHaveText('EcoCharge HomeVault 10') // catalog order again
  await expect(page.getByLabel('Sort by')).toHaveValue('featured')
  await expect(page.getByRole('checkbox', { name: /EcoCharge/ })).toBeChecked()
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('a link with filters is rendered on the server with the right results and SEO tags', async ({ page }) => {
    await page.goto('/?category=solar-panel&manufacturer=solarix&sort=spec-desc')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Solarix solar panels')
    await expect(productNames(page)).toHaveText([
      'Solarix Prime 460',
      'Solarix Prime 450',
      'Solarix Prime 440',
      'Solarix Prime 435',
      'Solarix Prime 425',
    ])
    await expect(page.getByLabel('Sort by')).toHaveValue('spec-desc')
    await expect(page.getByRole('checkbox', { name: /Solarix/ })).toBeChecked()
    await expect(page).toHaveTitle('Solarix solar panels | sun.store')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
  })
})
