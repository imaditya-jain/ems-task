import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import ThemeToggle from '@/components/common/ThemeToggle'
import { makeStore } from '@/lib/store'
import { setTheme } from '@/lib/slices/ui.slice'
import { THEME_STORAGE_KEY } from '@/lib/theme'
import ThemeSync from '@/providers/ThemeSync'
import { renderWithProviders } from '@/test/utils'

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.className = ''
  })

  const setup = (theme: 'light' | 'dark') => {
    const store = makeStore()
    store.dispatch(setTheme(theme))
    renderWithProviders(
      <>
        <ThemeSync />
        <ThemeToggle />
      </>,
      { store },
    )
    return store
  }

  it('offers the OPPOSITE mode as its action', () => {
    setup('light')
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument()
  })

  it('switches to dark, applies the class and saves the choice', async () => {
    const store = setup('light')

    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }))

    expect(store.getState().ui.theme).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument()
  })

  it('switches back to light again', async () => {
    setup('dark')
    expect(document.documentElement).toHaveClass('dark')

    await userEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }))

    expect(document.documentElement).not.toHaveClass('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('does not save anything until the user actually clicks', () => {
    setup('dark')

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })
})
