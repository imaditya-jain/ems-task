import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyTheme, readInitialTheme, readSavedTheme, saveTheme, THEME_STORAGE_KEY } from '@/lib/theme'

const mockSystemTheme = (dark: boolean) =>
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: dark, addEventListener: vi.fn(), removeEventListener: vi.fn() }))

describe('theme helpers', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.className = ''
    delete document.documentElement.dataset.themeReady
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts from the theme already on the page (set before first paint by index.html)', () => {
    document.documentElement.dataset.themeReady = 'true'
    document.documentElement.classList.add('dark')

    expect(readInitialTheme()).toBe('dark')
  })

  it('reports light when the page is ready and has no dark class', () => {
    document.documentElement.dataset.themeReady = 'true'

    expect(readInitialTheme()).toBe('light')
  })

  it('falls back to the saved choice when the page was not prepared', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark')

    expect(readInitialTheme()).toBe('dark')
  })

  it('falls back to the system preference when nothing was saved', () => {
    mockSystemTheme(true)
    expect(readInitialTheme()).toBe('dark')

    mockSystemTheme(false)
    expect(readInitialTheme()).toBe('light')
  })

  it('ignores a corrupted saved value', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'purple')
    mockSystemTheme(false)

    expect(readSavedTheme()).toBeNull()
    expect(readInitialTheme()).toBe('light')
  })

  it('saves and reads back an explicit choice', () => {
    saveTheme('dark')

    expect(readSavedTheme()).toBe('dark')
  })

  it('applyTheme toggles the dark class on <html>', () => {
    applyTheme('dark')
    expect(document.documentElement).toHaveClass('dark')

    applyTheme('light')
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('does not crash when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    mockSystemTheme(false)

    expect(readSavedTheme()).toBeNull()
    expect(() => saveTheme('dark')).not.toThrow()
    expect(readInitialTheme()).toBe('light')
  })
})
