import { describe, expect, it } from 'vitest'
import reducer, { clearAuthError, sessionExpired } from '@/lib/slices/auth.slice'
import { initializeAuthSessionHandler, loginUserHandler, logoutUserHandler } from '@/lib/features/auth.feature'
import type { User } from '@/types'

const user: User = { id: 1, fullName: 'Admin', email: 'admin@corp.com', role: 'Admin' }
const initial = reducer(undefined, { type: 'init' })
const signedIn = reducer(initial, loginUserHandler.fulfilled({ success: true, data: { user } }, 'req', { email: 'a', password: 'b' }))

describe('auth slice', () => {
  it('starts signed out and not yet initialised', () => {
    expect(initial).toEqual({ user: null, loading: false, error: '', isAuthenticated: false, initialized: false })
  })

  it('login: pending sets loading and clears the previous error', () => {
    const withError = { ...initial, error: 'old' }

    const state = reducer(withError, loginUserHandler.pending('req', { email: 'a', password: 'b' }))

    expect(state.loading).toBe(true)
    expect(state.error).toBe('')
  })

  it('login: fulfilled stores the user and marks the session initialised', () => {
    expect(signedIn).toMatchObject({ user, isAuthenticated: true, initialized: true, loading: false })
  })

  it('login: rejected stores the server error and stays signed out', () => {
    const state = reducer(
      initial,
      loginUserHandler.rejected(null, 'req', { email: 'a', password: 'b' }, { success: false, error: 'Invalid email or password.' }),
    )

    expect(state.error).toBe('Invalid email or password.')
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
  })

  it('logout (success or failure) always signs the user out locally', () => {
    const afterOk = reducer(signedIn, logoutUserHandler.fulfilled({ success: true }, 'req'))
    const afterFail = reducer(signedIn, logoutUserHandler.rejected(null, 'req', undefined, { success: false, error: 'x' }))

    expect(afterOk).toMatchObject({ user: null, isAuthenticated: false })
    expect(afterFail).toMatchObject({ user: null, isAuthenticated: false })
  })

  it('session restore: fulfilled signs in; rejected finishes initialisation signed out', () => {
    const restored = reducer(initial, initializeAuthSessionHandler.fulfilled({ success: true, data: { user } }, 'req'))
    const none = reducer(initial, initializeAuthSessionHandler.rejected(null, 'req', undefined, { success: false, error: 'Session not found.' }))

    expect(restored).toMatchObject({ isAuthenticated: true, initialized: true, user })
    expect(none).toMatchObject({ isAuthenticated: false, initialized: true, user: null })
  })

  it('session restore: pending marks the app as not initialised (so guards wait)', () => {
    expect(reducer(signedIn, initializeAuthSessionHandler.pending('req')).initialized).toBe(false)
  })

  it('sessionExpired signs out and unblocks route guards', () => {
    const state = reducer(signedIn, sessionExpired())

    expect(state).toMatchObject({ user: null, isAuthenticated: false, initialized: true })
  })

  it('clearAuthError removes the error message', () => {
    expect(reducer({ ...initial, error: 'x' }, clearAuthError()).error).toBe('')
  })
})
