import { authFetch } from '@/lib/auth-fetch'
import type { ApiResponse, RejectError } from '@/types'

const API_BASE = '/api/v1'

/** Error thrown for non-2xx responses; `errors` holds per-row messages (e.g. bulk import). */
export class ApiError extends Error {
  errors?: string[]

  constructor(message: string, errors?: string[]) {
    super(message)
    this.errors = errors
  }
}

/** Converts anything thrown inside a thunk into the payload used by rejectWithValue. */
export const toRejectError = (error: unknown): RejectError => ({
  success: false,
  error: error instanceof Error ? error.message : 'Something went wrong.',
  errors: error instanceof ApiError ? error.errors : undefined,
})

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Protected endpoints use authFetch so an expired access token is refreshed silently. */
  authenticated?: boolean
}

/** Sends a JSON request and returns the parsed envelope. Throws an Error with the server's message on failure. */
export const apiRequest = async <T = unknown>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> => {
  const { method = 'GET', body, authenticated = true } = options

  const init: RequestInit = {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }

  const url = `${API_BASE}${path}`
  const response = authenticated ? await authFetch(url, init) : await fetch(url, init)

  const result: ApiResponse<T> = await response.json().catch(() => ({ success: false }))

  if (!response.ok) {
    throw new ApiError(result.error || 'Something went wrong.', result.errors)
  }

  return result
}
