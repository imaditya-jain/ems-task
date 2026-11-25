import { useEffect } from 'react'
import { ToastContainer } from 'react-toastify'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { setTheme } from '@/lib/slices/ui.slice'
import { applyTheme, readSavedTheme, systemTheme } from '@/lib/theme'

/** Keeps <html class="dark"> in step with the theme in Redux, follows the system theme until the user chooses, and themes toasts. */
const ThemeSync = () => {
  const dispatch = useAppDispatch()
  const theme = useAppSelector((state) => state.ui.theme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // If the user never picked a theme, follow the operating system when it switches (e.g. at sunset).
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!query) return

    const onChange = () => {
      if (readSavedTheme() === null) dispatch(setTheme(systemTheme()))
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [dispatch])

  return <ToastContainer position="top-right" autoClose={3000} theme={theme} />
}

export default ThemeSync
