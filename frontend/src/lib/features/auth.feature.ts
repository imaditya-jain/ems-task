import { createAsyncThunk } from '@reduxjs/toolkit'
import { apiRequest } from '@/lib/api'
import type { ApiResponse, RejectError, User } from '@/types'

type AuthResponse = ApiResponse<{ user: User }>

export interface LoginPayload {
  email: string
  password: string
}

const toRejectError = (error: unknown): RejectError => ({
  success: false,
  error: error instanceof Error ? error.message : 'Something went wrong.',
})

export const loginUserHandler = createAsyncThunk<AuthResponse, LoginPayload, { rejectValue: RejectError }>(
  'auth/login',
  async (payload, { rejectWithValue }) => {
    try {
      return await apiRequest<{ user: User }>('/auth/login', { method: 'POST', body: payload, authenticated: false })
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)

export const logoutUserHandler = createAsyncThunk<ApiResponse, void, { rejectValue: RejectError }>(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      return await apiRequest('/auth/logout', { method: 'POST', authenticated: false })
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)

/** Runs once on app start: restores the session from cookies (refreshing silently if the access token expired). */
export const initializeAuthSessionHandler = createAsyncThunk<AuthResponse, void, { rejectValue: RejectError }>(
  'auth/initialize-session',
  async (_, { rejectWithValue }) => {
    try {
      return await apiRequest<{ user: User }>('/auth/me')
    } catch {
      return rejectWithValue({ success: false, error: 'Session not found.' })
    }
  },
)
