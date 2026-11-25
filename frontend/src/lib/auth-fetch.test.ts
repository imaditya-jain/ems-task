import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authFetch, setSessionExpiredHandler } from '@/lib/auth-fetch'
import { jsonResponse } from '@/test/utils'

const REFRESH = '/api/v1/auth/refresh-token'

describe('authFetch', () => {
  const fetchMock = vi.fn<typeof fetch>()
  const onExpired = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    onExpired.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    setSessionExpiredHandler(onExpired)
  })

  it('returns non-401 responses untouched, without refreshing', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))

    const response = await authFetch('/api/v1/employees')

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('on 401 refreshes the session once and retries the original request', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 401)) // original
      .mockResolvedValueOnce(jsonResponse({}, 200)) // refresh
      .mockResolvedValueOnce(jsonResponse({ data: 1 }, 200)) // retry

    const response = await authFetch('/api/v1/employees', { method: 'GET' })

    expect(response.status).toBe(200)
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(['/api/v1/employees', REFRESH, '/api/v1/employees'])
    expect(onExpired).not.toHaveBeenCalled()
  })

  it('shares ONE refresh request between concurrent 401s (single-flight)', async () => {
    let refreshCalls = 0
    fetchMock.mockImplementation(async (input) => {
      const url = String(input)
      if (url === REFRESH) {
        refreshCalls++
        await new Promise((resolve) => setTimeout(resolve, 20))
        return jsonResponse({}, 200)
      }
      // each protected URL: first call 401, retry 200
      const seen = fetchMock.mock.calls.filter((c) => String(c[0]) === url).length
      return jsonResponse({}, seen === 1 ? 401 : 200)
    })

    const responses = await Promise.all([authFetch('/api/a'), authFetch('/api/b'), authFetch('/api/c')])

    expect(responses.map((r) => r.status)).toEqual([200, 200, 200])
    expect(refreshCalls).toBe(1)
  })

  it('when the refresh fails it signals session expiry and returns the original 401 (no retry)', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({}, 401)) // refresh rejected

    const response = await authFetch('/api/v1/employees')

    expect(response.status).toBe(401)
    expect(onExpired).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('retries only once: a second 401 ends the session instead of looping', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 401)) // original
      .mockResolvedValueOnce(jsonResponse({}, 200)) // refresh ok
      .mockResolvedValueOnce(jsonResponse({}, 401)) // retry still unauthorised

    const response = await authFetch('/api/v1/employees')

    expect(response.status).toBe(401)
    expect(onExpired).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it.each([REFRESH, '/api/v1/auth/logout'])('never tries to refresh when %s itself returns 401', async (url) => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 401))

    const response = await authFetch(url, { method: 'POST' })

    expect(response.status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('allows a new refresh after the previous one finished', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({}, 200))
      .mockResolvedValueOnce(jsonResponse({}, 200))
    await authFetch('/api/x')

    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({}, 200))
      .mockResolvedValueOnce(jsonResponse({}, 200))
    await authFetch('/api/y')

    expect(fetchMock.mock.calls.filter((c) => c[0] === REFRESH)).toHaveLength(2)
  })
})
