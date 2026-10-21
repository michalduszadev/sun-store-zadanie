/** Page numbers to show: first, last and neighbours of the current one, with gaps. 1 … 4 5 6 … 12 */
export function paginationItems(page: number, pageCount: number): (number | 'gap')[] {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1].filter(p => p >= 1 && p <= pageCount))
  const sorted = [...wanted].sort((a, b) => a - b)
  return sorted.flatMap<number | 'gap'>((p, i) => (i > 0 && p - sorted[i - 1]! > 1 ? ['gap', p] : [p]))
}
