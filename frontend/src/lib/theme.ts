export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'ems-theme'

const systemPrefersDark = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches)

/** The theme the user explicitly chose, or null when they never did. */
export const readSavedTheme = (): Theme | null => {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    return saved === 'light' || saved === 'dark' ? saved : null
  } catch {
    return null // storage can be blocked (private mode)
  }
}

/**
 * The theme the page STARTS in. index.html applies the saved/system theme before first paint, so the page itself
 * is the source of truth: reading it guarantees the toggle icon always matches what the user sees.
 */
export const readInitialTheme = (): Theme => {
  if (typeof document !== 'undefined' && document.documentElement.dataset.themeReady === 'true') {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  }

  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // storage can be blocked (private mode); fall through to the system preference
  }

  return systemPrefersDark() ? 'dark' : 'light'
}

export const saveTheme = (theme: Theme) => {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // ignore: the theme still applies for this session
  }
}

export const systemTheme = (): Theme => (systemPrefersDark() ? 'dark' : 'light')

export const applyTheme = (theme: Theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}
