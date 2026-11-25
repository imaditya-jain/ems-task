import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { toast } from 'react-toastify'
import { IoLogOutOutline } from 'react-icons/io5'
import { logoutUserHandler } from '@/lib/features/auth.feature'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { navItems } from './navigation'

const DashboardLayout = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)

  const handleLogout = async () => {
    await dispatch(logoutUserHandler())
    toast.success('Logged out successfully.')
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-border bg-surface md:w-64 md:border-b-0 md:border-r">
        <div className="px-6 py-5 text-lg font-semibold text-primary">EMS</div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-page hover:text-foreground',
                )
              }
            >
              <Icon className="text-lg" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:px-8">
          <div className="text-sm">
            <p className="font-medium">{user?.fullName}</p>
            <p className="text-muted">{user?.role}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:bg-page"
          >
            <IoLogOutOutline className="text-lg" />
            Logout
          </button>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
