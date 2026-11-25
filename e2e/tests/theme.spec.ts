import { expect, test, type Page } from '@playwright/test'
import { ADMIN } from './support/env'

const isDark = (page: Page) => page.evaluate(() => document.documentElement.classList.contains('dark'))
const toggle = (page: Page) => page.getByRole('button', { name: /Switch to (dark|light) mode/ }).first()

// Each test starts with no saved preference.
test.describe('Light and dark mode', () => {
  test.describe('follows the system preference by default', () => {
    test.use({ colorScheme: 'dark' })

    test('dark system -> dark app, and the toggle offers light', async ({ page }) => {
      await page.goto('/dashboard')

      expect(await isDark(page)).toBe(true)
      await expect(page.getByRole('button', { name: 'Switch to light mode' }).first()).toBeVisible()
    })
  })

  test.describe('light system', () => {
    test.use({ colorScheme: 'light' })

    test('light system -> light app, and the toggle offers dark', async ({ page }) => {
      await page.goto('/dashboard')

      expect(await isDark(page)).toBe(false)
      await expect(page.getByRole('button', { name: 'Switch to dark mode' }).first()).toBeVisible()
    })

    test('the toggle switches the whole app and the icon label follows', async ({ page }) => {
      await page.goto('/dashboard')

      await toggle(page).click()
      expect(await isDark(page)).toBe(true)
      await expect(page.getByRole('button', { name: 'Switch to light mode' }).first()).toBeVisible()

      await toggle(page).click()
      expect(await isDark(page)).toBe(false)
    })

    test('the choice is remembered after a reload and on other pages', async ({ page }) => {
      await page.goto('/dashboard')
      await toggle(page).click()

      await page.reload()
      expect(await isDark(page)).toBe(true)

      await page.goto('/employees')
      expect(await isDark(page)).toBe(true)
    })

    test('an explicit choice beats the system preference', async ({ page }) => {
      await page.goto('/dashboard')
      await toggle(page).click() // choose dark on a light system
      await page.reload()
      await toggle(page).click() // and back to light

      await page.reload()
      expect(await isDark(page)).toBe(false)
    })

    test('the page background and cards really change colour', async ({ page }) => {
      await page.goto('/dashboard')
      const card = page.getByRole('heading', { name: 'Recent hires' }).locator('xpath=ancestor::section[1]')
      const colours = () => card.evaluate((el) => getComputedStyle(el).backgroundColor)
      const light = await colours()

      await toggle(page).click()

      await expect.poll(colours).not.toBe(light)
    })

    test('the first page load never flashes the wrong theme', async ({ page }) => {
      await page.addInitScript(() => window.localStorage.setItem('ems-theme', 'dark'))

      await page.goto('/dashboard')

      // index.html applies the saved theme before React renders anything
      expect(await page.evaluate(() => document.documentElement.dataset.themeReady)).toBe('true')
      expect(await isDark(page)).toBe(true)
    })
  })

  test.describe('signed out', () => {
    test.use({ storageState: { cookies: [], origins: [] }, colorScheme: 'light' })

    test('the login page has a theme toggle too', async ({ page }) => {
      await page.goto('/login')

      await toggle(page).click()

      expect(await isDark(page)).toBe(true)
      await page.getByLabel('Email').fill(ADMIN.email)
      await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    })
  })
})
