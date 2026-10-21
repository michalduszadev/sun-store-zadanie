import { describe, expect, it } from 'vitest'
import { paginationItems } from '../../app/utils/pagination'

describe('paginationItems', () => {
  it('shows every page when there are only a few', () => {
    expect(paginationItems(1, 1)).toEqual([1])
    expect(paginationItems(2, 3)).toEqual([1, 2, 3])
  })

  it('collapses distant pages into gaps', () => {
    expect(paginationItems(5, 12)).toEqual([1, 'gap', 4, 5, 6, 'gap', 12])
    expect(paginationItems(1, 7)).toEqual([1, 2, 'gap', 7])
    expect(paginationItems(7, 7)).toEqual([1, 'gap', 6, 7])
  })

  it('does not insert a gap between adjacent pages', () => {
    expect(paginationItems(3, 7)).toEqual([1, 2, 3, 4, 'gap', 7])
  })
})
