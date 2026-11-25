import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PublicRoute from '@/components/auth/PublicRoute'
import { loginUserHandler } from '@/lib/features/auth.feature'
import { sessionExpired } from '@/lib/slices/auth.slice'
import { makeStore } from '@/lib/store'
import { renderWithProviders } from '@/test/utils'

const tree = (
  <Routes>
    <Route element={<PublicRoute />}>
      <Route path="/login" element={<div>Login page</div>} />
    </Route>
    <Route element={<ProtectedRoute />}>
      <Route path="/secret" element={<div>Secret page</div>} />
    </Route>
    <Route path="/dashboard" element={<div>Dashboard page</div>} />
  </Routes>
)

const signedInStore = () => {
  const store = makeStore()
  store.dispatch(
    loginUserHandler.fulfilled(
      { success: true, data: { user: { id: 1, fullName: 'A', email: 'a@b.com', role: 'Admin' } } },
      'req',
      { email: 'a', password: 'b' },
    ),
  )
  return store
}

describe('route guards', () => {
  it('ProtectedRoute shows a spinner (and does NOT redirect) until the session check has finished', () => {
    renderWithProviders(tree, { route: '/secret' })

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
  })

  it('ProtectedRoute redirects signed-out users to /login', () => {
    const store = makeStore()
    store.dispatch(sessionExpired())

    renderWithProviders(tree, { route: '/secret', store })

    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('ProtectedRoute renders the page for signed-in users', () => {
    renderWithProviders(tree, { route: '/secret', store: signedInStore() })

    expect(screen.getByText('Secret page')).toBeInTheDocument()
  })

  it('PublicRoute sends signed-in users to the dashboard', () => {
    renderWithProviders(tree, { route: '/login', store: signedInStore() })

    expect(screen.getByText('Dashboard page')).toBeInTheDocument()
  })

  it('PublicRoute shows the login page to signed-out users', () => {
    const store = makeStore()
    store.dispatch(sessionExpired())

    renderWithProviders(tree, { route: '/login', store })

    expect(screen.getByText('Login page')).toBeInTheDocument()
  })
})
