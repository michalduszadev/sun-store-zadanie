/** "Quantum Energy" -> "quantum-energy", "SafeLock Pro Pair M/F" -> "safelock-pro-pair-m-f" */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/\p{M}/gu, '') // strip diacritics: "é" -> "e"
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
