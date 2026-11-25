import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/lib/hooks'
import Spinner from '@/components/common/Spinner'

/** Pages like /login are for signed-out users only. */
const PublicRoute = () => {
  const { isAuthenticated, initialized } = useAppSelector((state) => state.auth)

  if (!initialized) return <Spinner fullScreen />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return <Outlet />
}

export default PublicRoute
