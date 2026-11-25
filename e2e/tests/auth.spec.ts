import { expect, test } from '@playwright/test'
import { ADMIN, DEMO_HR } from './support/env'
import { expectToast } from './support/helpers'

// These tests start signed OUT and use the demo HR user for the successful flows, so the shared admin session
// saved by auth.setup.ts is never invalidated.
test.use({ storageState: { cookies: [], origins: [] } })

const signIn = async (page: import('@playwright/test').Page, email: string, password: string) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
}

test.describe('Authentication', () => {
  test('visiting a protected page while signed out redirects to the login page', async ({ page }) => {
    await page.goto('/employees')

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  })

  test('the login form validates empty and malformed input before calling the API', async ({ page }) => {
    await page.goto('/login')

    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page.getByText('Email is required')).toBeVisible()
    await expect(page.getByText('Password is required')).toBeVisible()

    await page.getByLabel('Email').fill('not-an-email')
    await page.getByLabel('Password', { exact: true }).fill('123')
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page.getByText('Enter a valid email address')).toBeVisible()
    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible()
  })

  test('a wrong password shows a generic error and keeps the user on the login page', async ({ page }) => {
    await signIn(page, ADMIN.email, 'definitely-wrong')

    await expectToast(page, 'Invalid email or password.')
    await expect(page).toHaveURL(/\/login/)
  })

  test('an unknown email gets the SAME message as a wrong password (no account enumeration)', async ({ page }) => {
    await signIn(page, 'nobody@ems.test', 'whatever123')

    await expectToast(page, 'Invalid email or password.')
  })

  test('a valid login lands on the dashboard and shows who is signed in', async ({ page }) => {
    await signIn(page, DEMO_HR.email, DEMO_HR.password)

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText(DEMO_HR.name).first()).toBeVisible()
    await expect(page.getByText('HR', { exact: true })).toBeVisible()
  })

  test('the session survives a page reload', async ({ page }) => {
    await signIn(page, DEMO_HR.email, DEMO_HR.password)
    await expect(page).toHaveURL(/\/dashboard/)

    await page.reload()

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText(DEMO_HR.name).first()).toBeVisible()
  })

  test('a signed-in user is redirected away from the login page', async ({ page }) => {
    await signIn(page, DEMO_HR.email, DEMO_HR.password)
    await expect(page).toHaveURL(/\/dashboard/)

    await page.goto('/login')

    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('tokens are httpOnly, SameSite=Strict cookies and are never exposed to page JavaScript', async ({ page, context }) => {
    await signIn(page, DEMO_HR.email, DEMO_HR.password)
    await expect(page).toHaveURL(/\/dashboard/)

    const cookies = await context.cookies()
    const access = cookies.find((c) => c.name === 'accessToken')
    const refresh = cookies.find((c) => c.name === 'refreshToken')

    expect(access).toMatchObject({ httpOnly: true, sameSite: 'Strict', path: '/' })
    expect(refresh).toMatchObject({ httpOnly: true, sameSite: 'Strict', path: '/api/v1/auth' })

    const exposed = await page.evaluate(() => ({
      cookie: document.cookie,
      local: JSON.stringify({ ...localStorage }),
      session: JSON.stringify({ ...sessionStorage }),
    }))
    expect(exposed.cookie).not.toContain('Token')
    expect(exposed.local).not.toContain('eyJ') // no JWT in localStorage
    expect(exposed.session).not.toContain('eyJ')
  })

  test('an expired access token is refreshed silently, without the user noticing', async ({ page, context }) => {
    await signIn(page, DEMO_HR.email, DEMO_HR.password)
    await expect(page).toHaveURL(/\/dashboard/)

    await context.clearCookies({ name: 'accessToken' }) // simulate the 15-minute expiry
    const refreshed = page.waitForResponse((r) => r.url().includes('/auth/refresh-token') && r.status() === 200)

    await page.goto('/employees')

    await refreshed
    await expect(page).toHaveURL(/\/employees/)
    await expect(page.getByRole('heading', { name: 'Employees' })).toBeVisible()
  })

  test('logging out clears the session: protected pages and the refresh endpoint are closed afterwards', async ({ page }) => {
    await signIn(page, DEMO_HR.email, DEMO_HR.password)
    await expect(page).toHaveURL(/\/dashboard/)

    await page.getByRole('button', { name: 'Logout' }).click()
    await expect(page).toHaveURL(/\/login/)

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)

    const refresh = await page.request.post('/api/v1/auth/refresh-token')
    expect(refresh.status()).toBe(401)
  })

  test('the user can reveal and hide the password', async ({ page }) => {
    await page.goto('/login')
    const password = page.getByLabel('Password', { exact: true })

    await page.getByRole('button', { name: 'Show password' }).click()
    await expect(password).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: 'Hide password' }).click()
    await expect(password).toHaveAttribute('type', 'password')
  })

  test('an unknown route shows the 404 page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')

    await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
  })
})
