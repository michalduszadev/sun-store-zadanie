import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { useDraftField } from '../../app/composables/useDraftField'

/** Stands in for a value read from the URL; changing it = a navigation that finished. */
function urlValue(initial: string) {
  return ref(initial)
}

describe('useDraftField', () => {
  it('starts with the value from the URL', () => {
    const url = urlValue('500')
    expect(useDraftField(() => url.value).text.value).toBe('500')
  })

  it('copies changes made elsewhere (back button, "Clear all") into the field', async () => {
    const url = urlValue('500')
    const { text } = useDraftField(() => url.value)
    url.value = ''
    await nextTick()
    expect(text.value).toBe('')
  })

  it('does not overwrite typing when its own commit finishes navigating (the race)', async () => {
    const url = urlValue('')
    const { text, markCommitted } = useDraftField(() => url.value)

    text.value = 'bat'
    expect(markCommitted('bat')).toBe(true) // navigation to ?q=bat starts
    text.value = 'battery' // user keeps typing while it is in flight
    url.value = 'bat' // navigation finishes: the echo of our own commit
    await nextTick()

    expect(text.value).toBe('battery')
  })

  it('reports whether a commit changes anything', () => {
    const url = urlValue('500')
    const { markCommitted } = useDraftField(() => url.value)
    expect(markCommitted('500')).toBe(false)
    expect(markCommitted('600')).toBe(true)
    expect(markCommitted('600')).toBe(false)
  })

  it('keeps fields independent: committing one does not touch the other', async () => {
    const url = { min: urlValue(''), max: urlValue('') }
    const min = useDraftField(() => url.min.value)
    const max = useDraftField(() => url.max.value)

    min.text.value = '500'
    min.markCommitted('500')
    max.text.value = '15' // typing max while ?priceMin=500 is in flight
    url.min.value = '500'
    await nextTick()

    expect(max.text.value).toBe('15')
  })
})
