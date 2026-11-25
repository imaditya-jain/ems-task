import { useEffect, type ReactNode } from 'react'
import { initializeAuthSessionHandler } from '@/lib/features/auth.feature'
import { useAppDispatch } from '@/lib/hooks'

const AuthSessionProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(initializeAuthSessionHandler())
  }, [dispatch])

  return <>{children}</>
}

export default AuthSessionProvider
