import { describe, expect, it } from 'vitest'
import reducer, { setTheme, toggleTheme } from '@/lib/slices/ui.slice'

describe('ui slice', () => {
  it('toggles between light and dark', () => {
    const light = reducer({ theme: 'light' }, { type: 'noop' })

    const dark = reducer(light, toggleTheme())
    expect(dark.theme).toBe('dark')
    expect(reducer(dark, toggleTheme()).theme).toBe('light')
  })

  it('sets a specific theme', () => {
    expect(reducer({ theme: 'light' }, setTheme('dark')).theme).toBe('dark')
    expect(reducer({ theme: 'dark' }, setTheme('dark')).theme).toBe('dark')
  })
})
