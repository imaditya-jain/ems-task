import { expect, test, type Page } from '@playwright/test'
import { ADMIN } from './support/env'

const PHONE = { width: 390, height: 844 }

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)

test.describe('Responsive layout (phone, signed out)', () => {
  test.use({ storageState: { cookies: [], origins: [] }, viewport: PHONE })

  test('the login page fits the screen and is usable', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
    expect(await noHorizontalScroll(page)).toBe(true)
  })

  test('a user can sign in from a phone', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('Email').fill(ADMIN.email)
    await page.getByLabel('Password', { exact: true }).fill(ADMIN.password)
    await page.getByRole('button', { name: 'Sign In' }).click()

    await expect(page).toHaveURL(/\/dashboard/)
  })
})

test.describe('Responsive layout (phone, signed in)', () => {
  test.use({ viewport: PHONE })

  for (const path of ['/dashboard', '/employees', '/attendance', '/departments', '/reports', '/analytics', '/performance']) {
    test(`${path} has no horizontal page scroll on a phone`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('navigation')).toBeVisible()
      await expect(page.locator('main h1').first()).toBeVisible()

      expect(await noHorizontalScroll(page)).toBe(true)
    })
  }

  test('the navigation is reachable on a phone', async ({ page }) => {
    await page.goto('/dashboard')

    await page.getByRole('link', { name: 'Employees' }).click()

    await expect(page).toHaveURL(/\/employees/)
  })

  test('data tables scroll inside their own container instead of breaking the page', async ({ page }) => {
    await page.goto('/employees')
    await expect(page.locator('tbody tr').first()).toBeVisible()

    const wrapper = page.locator('div.overflow-x-auto').first()
    expect(await wrapper.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
    expect(await noHorizontalScroll(page)).toBe(true)
  })

  test('the add-employee form stacks into a single column', async ({ page }) => {
    await page.goto('/employees/new')

    const first = await page.getByLabel('Employee Code').boundingBox()
    const second = await page.getByLabel('Status').boundingBox()

    expect(first && second && second.y > first.y).toBe(true) // second field is BELOW the first, not beside it
  })
})

test.describe('Responsive layout (tablet)', () => {
  test.use({ viewport: { width: 820, height: 1180 } })

  test('the dashboard has no horizontal page scroll', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('Total employees')).toBeVisible()

    expect(await noHorizontalScroll(page)).toBe(true)
  })
})
