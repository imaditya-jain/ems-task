import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/lib/hooks'
import Spinner from '@/components/common/Spinner'

/** Renders child routes only for signed-in users. */
const ProtectedRoute = () => {
  const location = useLocation()
  const { isAuthenticated, initialized } = useAppSelector((state) => state.auth)

  if (!initialized) return <Spinner fullScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />

  return <Outlet />
}

export default ProtectedRoute
