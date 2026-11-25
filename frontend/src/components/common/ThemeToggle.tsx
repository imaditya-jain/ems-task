import clsx from 'clsx'
import { IoMoonOutline, IoSunnyOutline } from 'react-icons/io5'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { toggleTheme } from '@/lib/slices/ui.slice'
import { saveTheme } from '@/lib/theme'

/** Switches between light and dark mode. The choice is saved (see ThemeSync). */
const ThemeToggle = ({ className }: { className?: string }) => {
  const dispatch = useAppDispatch()
  const theme = useAppSelector((state) => state.ui.theme)
  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={() => {
        dispatch(toggleTheme())
        saveTheme(next) // saved only on an explicit choice; until then the system preference applies
      }}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={clsx('flex h-10 w-10 items-center justify-center rounded-full border border-glass-line bg-glass text-foreground shadow-card backdrop-blur transition hover:bg-hover', className)}
    >
      {theme === 'dark' ? <IoSunnyOutline className="text-lg" /> : <IoMoonOutline className="text-lg" />}
    </button>
  )
}

export default ThemeToggle
