import { createSlice } from '@reduxjs/toolkit'
import type { User } from '@/types'
import { initializeAuthSessionHandler, loginUserHandler, logoutUserHandler } from '@/lib/features/auth.feature'

interface AuthState {
  user: User | null
  loading: boolean
  error: string
  isAuthenticated: boolean
  /** false until the first /me check finishes, so we never redirect a logged-in user during page load */
  initialized: boolean
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: '',
  isAuthenticated: false,
  initialized: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = ''
    },
    /** Dispatched by authFetch when the refresh token is no longer valid. */
    sessionExpired: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.initialized = true
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUserHandler.pending, (state) => {
        state.loading = true
        state.error = ''
      })
      .addCase(loginUserHandler.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.data?.user ?? null
        state.isAuthenticated = true
        state.initialized = true
      })
      .addCase(loginUserHandler.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload?.error ?? 'Something went wrong.'
        state.user = null
        state.isAuthenticated = false
      })

      .addCase(logoutUserHandler.fulfilled, (state) => {
        state.user = null
        state.isAuthenticated = false
      })
      .addCase(logoutUserHandler.rejected, (state) => {
        // Cookies are cleared server-side even if the call failed, so treat the user as logged out locally.
        state.user = null
        state.isAuthenticated = false
      })

      .addCase(initializeAuthSessionHandler.pending, (state) => {
        state.initialized = false
      })
      .addCase(initializeAuthSessionHandler.fulfilled, (state, action) => {
        state.user = action.payload.data?.user ?? null
        state.isAuthenticated = true
        state.initialized = true
      })
      .addCase(initializeAuthSessionHandler.rejected, (state) => {
        state.user = null
        state.isAuthenticated = false
        state.initialized = true
      })
  },
})

export const { clearAuthError, sessionExpired } = authSlice.actions
export default authSlice.reducer
