/**
 * fetch wrapper for protected endpoints with silent token refresh.
 *
 * 1. Send the request (the browser attaches the httpOnly cookies).
 * 2. On 401, call /auth/refresh-token ONCE (shared by all concurrent requests = "single-flight").
 * 3. If refresh worked, retry the original request once; otherwise tell the app the session is over.
 */
const REFRESH_URL = '/api/v1/auth/refresh-token'
const LOGOUT_URL = '/api/v1/auth/logout'

let refreshRequest: Promise<boolean> | null = null
let onSessionExpired: (() => void) | null = null

/** The store registers this so authFetch can reset auth state without importing the store (avoids a circular import). */
export const setSessionExpiredHandler = (handler: () => void) => {
  onSessionExpired = handler
}

const refreshSession = async () => {
  const response = await fetch(REFRESH_URL, { method: 'POST', cache: 'no-store' })
  return response.ok
}

export const authFetch = async (input: string, init?: RequestInit): Promise<Response> => {
  const response = await fetch(input, init)

  if (response.status !== 401 || input === REFRESH_URL || input === LOGOUT_URL) {
    return response
  }

  if (!refreshRequest) {
    refreshRequest = refreshSession().finally(() => {
      refreshRequest = null
    })
  }

  const refreshed = await refreshRequest

  if (!refreshed) {
    onSessionExpired?.()
    return response
  }

  const retryResponse = await fetch(input, init)

  if (retryResponse.status === 401) {
    onSessionExpired?.()
  }

  return retryResponse
}
