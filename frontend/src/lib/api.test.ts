import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest, toRejectError } from '@/lib/api'
import { jsonResponse } from '@/test/utils'

describe('apiRequest', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('returns the response envelope on success', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 1 } }))

    const result = await apiRequest<{ id: number }>('/departments')

    expect(result.data).toEqual({ id: 1 })
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/departments', expect.objectContaining({ method: 'GET' }))
  })

  it('sends a JSON body with the right header', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }))

    await apiRequest('/departments', { method: 'POST', body: { name: 'HR' } })

    const [, init] = fetchMock.mock.calls[0]
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe(JSON.stringify({ name: 'HR' }))
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' })
  })

  it('does not set a content type when there is no body', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }))

    await apiRequest('/departments')

    expect(fetchMock.mock.calls[0][1]?.headers).toBeUndefined()
  })

  it('throws an ApiError carrying the server message', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false, error: 'Duplicate name' }, 409))

    await expect(apiRequest('/departments', { method: 'POST', body: {} })).rejects.toMatchObject({
      name: 'Error',
      message: 'Duplicate name',
    })
  })

  it('keeps the per-row error list for bulk operations', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: false, error: 'Import failed', errors: ['Row 1: bad email', 'Row 2: bad date'] }, 422),
    )

    const error = await apiRequest('/employees/bulk', { method: 'POST', body: {} }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).errors).toEqual(['Row 1: bad email', 'Row 2: bad date'])
  })

  it('falls back to a generic message when the body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 502 }))

    await expect(apiRequest('/departments')).rejects.toThrow('Something went wrong.')
  })

  it('does not attempt a silent refresh for unauthenticated calls such as login', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false, error: 'Invalid email or password.' }, 401))

    await expect(apiRequest('/auth/login', { method: 'POST', body: {}, authenticated: false })).rejects.toThrow('Invalid email or password.')

    expect(fetchMock).toHaveBeenCalledTimes(1) // no refresh-token call
  })

  it('refreshes silently for authenticated calls that return 401', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({}, 200)) // refresh
      .mockResolvedValueOnce(jsonResponse({ success: true, data: 'ok' })) // retry

    const result = await apiRequest('/employees')

    expect(result.data).toBe('ok')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})

describe('toRejectError', () => {
  it('uses the message of an Error', () => {
    expect(toRejectError(new Error('Boom'))).toEqual({ success: false, error: 'Boom', errors: undefined })
  })

  it('passes through the list of errors from an ApiError', () => {
    expect(toRejectError(new ApiError('Bad file', ['Row 1: x']))).toEqual({ success: false, error: 'Bad file', errors: ['Row 1: x'] })
  })

  it('falls back to a generic message for unknown values', () => {
    expect(toRejectError('weird')).toMatchObject({ success: false, error: 'Something went wrong.' })
  })
})
