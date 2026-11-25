import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { toast } from 'react-toastify'
import { IoClose, IoLogOutOutline, IoMenu } from 'react-icons/io5'
import Avatar from '@/components/common/Avatar'
import ThemeToggle from '@/components/common/ThemeToggle'
import { logoutUserHandler } from '@/lib/features/auth.feature'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { navItems } from './navigation'

const Brand = () => (
  <Link to="/dashboard" className="flex items-center gap-2.5" aria-label="EMS home">
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-accent">E</span>
    <span className="text-lg font-semibold tracking-tight">EMS</span>
  </Link>
)

/**
 * App shell. On large screens the sidebar is FIXED to the left edge (only the page content scrolls).
 * Below the `lg` breakpoint it becomes a slide-in drawer opened from the top bar.
 */
const DashboardLayout = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const [open, setOpen] = useState(false)

  // Escape closes the drawer; the page behind it must not scroll while it is open.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden' // do not scroll the page behind the drawer
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open])

  const handleLogout = async () => {
    await dispatch(logoutUserHandler())
    toast.success('Logged out successfully.')
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen">
      {/* Top bar: tablets and phones only */}
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 lg:hidden">
        <div className="flex items-center justify-between rounded-full border border-glass-line bg-glass py-2 pl-3 pr-2 shadow-card backdrop-blur-xl backdrop-saturate-150">
          <Brand />
          <div className="flex items-center gap-2">
            <ThemeToggle className="h-10 w-10 shadow-none" />
            {user && <Avatar name={user.fullName} className="h-9 w-9 text-xs" />}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Menu"
              aria-expanded={open}
              aria-controls="sidebar"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary"
            >
              <IoMenu className="text-xl" />
            </button>
          </div>
        </div>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      {/* Sidebar: fixed to the viewport, never scrolls with the page */}
      <aside
        id="sidebar"
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 p-3 transition-[transform,visibility] duration-200 lg:visible lg:z-20 lg:translate-x-0',
          open ? 'visible translate-x-0' : 'invisible -translate-x-full',
        )}
      >
        <div className="flex h-full flex-col rounded-3xl border border-glass-line bg-glass p-4 shadow-card backdrop-blur-2xl backdrop-saturate-150">
          <div className="flex items-center justify-between px-1 pb-4 pt-1">
            <Brand />
            <ThemeToggle className="hidden h-9 w-9 shadow-none lg:flex" />
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-full p-2 text-muted hover:bg-hover lg:hidden">
              <IoClose className="text-xl" />
            </button>
          </div>

          <nav aria-label="Main" className="-mx-1 flex-1 overflow-y-auto px-1">
            <ul className="flex flex-col gap-1">
              {navItems.map(({ label, to, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition',
                        isActive ? 'bg-primary text-on-primary shadow-sm' : 'text-muted hover:bg-hover hover:text-foreground',
                      )
                    }
                  >
                    <Icon className="text-lg" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-4 rounded-2xl bg-sage/70 p-3">
            <div className="flex items-center gap-3">
              {user && <Avatar name={user.fullName} className="h-10 w-10 bg-white text-sm" />}
              <div className="min-w-0 text-sm">
                <p className="truncate font-semibold">{user?.fullName}</p>
                <p className="text-muted">{user?.role}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-on-primary transition hover:bg-primary-dark"
            >
              <IoLogOutOutline className="text-lg" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* The sidebar card sits 12px from the screen edge and is 232px wide, so the content starts one small gutter after it.
          Content fills the remaining width (no centred max-width, which left wide empty bands on big screens). */}
      <div className="lg:pl-64">
        <main className="px-3 pb-8 pt-4 sm:px-5 lg:py-3 lg:pl-1 lg:pr-4 2xl:max-w-[1760px]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
