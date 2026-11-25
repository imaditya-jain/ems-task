import { authFetch } from '@/lib/auth-fetch'
import type { ApiResponse } from '@/types'

const API_BASE = '/api/v1'

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
    throw new Error(result.error || 'Something went wrong.')
  }

  return result
}
