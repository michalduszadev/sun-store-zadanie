export default defineEventHandler(async () => {
  const products = await getCatalog()
  return { total: products.length, sample: products.slice(0, 2) }
})
