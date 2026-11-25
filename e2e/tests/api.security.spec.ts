import { expect, test, type APIRequestContext } from '@playwright/test'
import { ADMIN, API_URL, DEMO_HR } from './support/env'

// API-level security checks. Every test here starts with NO session.
test.use({ storageState: { cookies: [], origins: [] } })

const login = (request: APIRequestContext, email: string, password: string) =>
  request.post('/api/v1/auth/login', { data: { email, password } })

const cookieValue = (setCookies: string[], name: string) =>
  setCookies.find((c) => c.startsWith(`${name}=`))?.split(';')[0].slice(name.length + 1)

const setCookies = (response: Awaited<ReturnType<typeof login>>) =>
  response.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie').map((h) => h.value)

test.describe('API security', () => {
  test('health endpoint is public', async ({ request }) => {
    const response = await request.get('/api/v1/health')

    expect(response.ok()).toBe(true)
    expect(await response.json()).toMatchObject({ success: true })
  })

  const protectedGets = [
    '/api/v1/auth/me', '/api/v1/departments', '/api/v1/employees', '/api/v1/employees/options',
    '/api/v1/attendance', '/api/v1/analytics/overview', '/api/v1/analytics/hiring-trend',
    '/api/v1/performance', '/api/v1/performance/metrics', '/api/v1/reports/salary', '/api/v1/reports/employee-directory',
  ]

  for (const url of protectedGets) {
    test(`GET ${url} requires authentication`, async ({ request }) => {
      const response = await request.get(url)

      expect(response.status()).toBe(401)
      expect(await response.json()).toEqual({ success: false, error: 'Unauthorized.' })
    })
  }

  for (const [method, url] of [['POST', '/api/v1/employees'], ['POST', '/api/v1/departments'], ['POST', '/api/v1/attendance'], ['DELETE', '/api/v1/employees/1'], ['POST', '/api/v1/employees/bulk-delete']] as const) {
    test(`${method} ${url} requires authentication`, async ({ request }) => {
      const response = await request.fetch(url, { method, data: {} })

      expect(response.status()).toBe(401)
    })
  }

  test('login validates its input and reports the first problem', async ({ request }) => {
    const empty = await request.post('/api/v1/auth/login', { data: {} })
    expect(empty.status()).toBe(400)

    const badEmail = await login(request, 'nope', 'secret123')
    expect(badEmail.status()).toBe(400)
    expect((await badEmail.json()).error).toBe('Enter a valid email address.')
  })

  test('wrong password and unknown email give the same 401 message', async ({ request }) => {
    const wrongPassword = await login(request, ADMIN.email, 'wrong-password')
    const unknownUser = await login(request, 'ghost@ems.test', 'wrong-password')

    expect(wrongPassword.status()).toBe(401)
    expect(unknownUser.status()).toBe(401)
    expect((await wrongPassword.json()).error).toBe((await unknownUser.json()).error)
  })

  test('login never returns tokens in the body; it sets httpOnly SameSite=Strict cookies', async ({ request }) => {
    const response = await login(request, DEMO_HR.email, DEMO_HR.password)
    const body = await response.json()
    const cookies = setCookies(response)

    expect(response.status()).toBe(200)
    expect(JSON.stringify(body)).not.toMatch(/eyJ/)
    expect(body.data.user).toEqual(expect.objectContaining({ email: DEMO_HR.email, role: 'HR' }))
    expect(body.data.user).not.toHaveProperty('passwordHash')

    const access = cookies.find((c) => c.startsWith('accessToken='))!
    const refresh = cookies.find((c) => c.startsWith('refreshToken='))!
    for (const cookie of [access, refresh]) {
      expect(cookie.toLowerCase()).toContain('httponly')
      expect(cookie.toLowerCase()).toContain('samesite=strict')
    }
    expect(refresh.toLowerCase()).toContain('path=/api/v1/auth')
  })

  test('/auth/me returns only safe user fields', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: API_URL })
    await login(ctx, DEMO_HR.email, DEMO_HR.password)

    const me = await (await ctx.get('/api/v1/auth/me')).json()

    expect(Object.keys(me.data.user).sort()).toEqual(['email', 'fullName', 'id', 'role'])
    await ctx.dispose()
  })

  test('refresh tokens rotate, and replaying an old one revokes the whole session', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: API_URL })
    const first = await login(ctx, DEMO_HR.email, DEMO_HR.password)
    const oldRefresh = cookieValue(setCookies(first), 'refreshToken')!

    const rotated = await ctx.post('/api/v1/auth/refresh-token')
    expect(rotated.status()).toBe(200)
    const newRefresh = cookieValue(setCookies(rotated), 'refreshToken')!
    expect(newRefresh).not.toBe(oldRefresh)

    // An attacker (or a stale tab) replays the OLD refresh token.
    const attacker = await playwright.request.newContext({ baseURL: API_URL, extraHTTPHeaders: { Cookie: `refreshToken=${oldRefresh}` } })
    const replay = await attacker.post('/api/v1/auth/refresh-token')
    expect(replay.status()).toBe(401)

    // ...and the legitimate (newer) token is now dead too, because the session was revoked.
    const afterRevoke = await ctx.post('/api/v1/auth/refresh-token')
    expect(afterRevoke.status()).toBe(401)

    await attacker.dispose()
    await ctx.dispose()
  })

  test('after logout the refresh token no longer works', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: API_URL })
    const loginResponse = await login(ctx, DEMO_HR.email, DEMO_HR.password)
    const refreshToken = cookieValue(setCookies(loginResponse), 'refreshToken')!

    expect((await ctx.post('/api/v1/auth/logout')).status()).toBe(200)

    const stolen = await playwright.request.newContext({ baseURL: API_URL, extraHTTPHeaders: { Cookie: `refreshToken=${refreshToken}` } })
    expect((await stolen.post('/api/v1/auth/refresh-token')).status()).toBe(401)
    await stolen.dispose()
    await ctx.dispose()
  })

  test('logout is forgiving: it succeeds even with no session', async ({ request }) => {
    const response = await request.post('/api/v1/auth/logout')

    expect(response.status()).toBe(200)
  })

  test('a forged or garbage access token is rejected', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: API_URL, extraHTTPHeaders: { Cookie: 'accessToken=eyJhbGciOiJIUzI1NiJ9.e30.forged' } })

    expect((await ctx.get('/api/v1/departments')).status()).toBe(401)
    await ctx.dispose()
  })

  test('login is rate limited per client IP', async ({ playwright }) => {
    // A unique forwarded IP gives this test its own rate-limit bucket (the e2e API allows 30 attempts a minute).
    const ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`
    const ctx = await playwright.request.newContext({ baseURL: API_URL, extraHTTPHeaders: { 'X-Forwarded-For': ip } })

    const statuses: number[] = []
    for (let i = 0; i < 31; i++) statuses.push((await login(ctx, ADMIN.email, `wrong-${i}`)).status())

    expect(statuses.slice(0, 30).every((s) => s === 401)).toBe(true)
    expect(statuses[30]).toBe(429)

    // other IPs are unaffected
    const other = await playwright.request.newContext({ baseURL: API_URL, extraHTTPHeaders: { 'X-Forwarded-For': '10.99.99.99' } })
    expect((await login(other, ADMIN.email, 'wrong')).status()).toBe(401)
    await other.dispose()
    await ctx.dispose()
  })
})
