import { expect, test, type Page } from '@playwright/test'
import { ADMIN } from './support/env'

const DEVICES = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  laptop: { width: 1366, height: 768 },
  desktop: { width: 1920, height: 1080 },
} as const

const PAGES = ['/dashboard', '/employees', '/employees/new', '/attendance', '/departments', '/reports', '/analytics', '/performance']

const noHorizontalScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)

const sidebar = (page: Page) => page.locator('#sidebar')

test.describe('Layout on every device size', () => {
  for (const [device, viewport] of Object.entries(DEVICES)) {
    test.describe(device, () => {
      test.use({ viewport })

      for (const path of PAGES) {
        test(`${path} fits the screen with no horizontal page scroll`, async ({ page }) => {
          await page.goto(path)
          await expect(page.locator('main h1').first()).toBeVisible()

          expect(await noHorizontalScroll(page)).toBe(true)
        })
      }

      test('every dashboard widget is visible', async ({ page }) => {
        await page.goto('/dashboard')

        for (const title of ['Attendance rate', 'Attendance marked today', 'Employee spotlight', 'Recent hires', 'Workforce by department']) {
          await expect(page.getByRole('heading', { name: title })).toBeVisible()
        }
      })
    })
  }
})

test.describe('Sidebar (laptop and desktop)', () => {
  test.use({ viewport: DEVICES.laptop })

  test('is always visible and lists every section', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(sidebar(page)).toBeVisible()
    for (const label of ['Dashboard', 'Employees', 'Attendance', 'Performance', 'Analytics', 'Departments', 'Reports']) {
      await expect(sidebar(page).getByRole('link', { name: label })).toBeVisible()
    }
    await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden() // no hamburger on large screens
  })

  test('stays fixed in place while the page content scrolls', async ({ page }) => {
    await page.goto('/dashboard') // tall enough to scroll on a laptop screen
    await expect(page.getByRole('heading', { name: 'Recent hires' })).toBeVisible()
    const before = await sidebar(page).boundingBox()

    await page.mouse.wheel(0, 1500)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(150)
    const after = await sidebar(page).boundingBox()

    expect(after?.y).toBe(before?.y)
    await expect(sidebar(page).getByRole('button', { name: 'Logout' })).toBeInViewport()
  })

  test('the content sits right next to the sidebar (no large empty gap)', async ({ page }) => {
    await page.goto('/dashboard')

    const bar = await sidebar(page).boundingBox()
    const title = await page.locator('main h1').first().boundingBox()

    const gap = title!.x - (bar!.x + bar!.width)
    expect(gap).toBeLessThan(24)
    expect(gap).toBeGreaterThanOrEqual(0)
  })

  test('the active page is highlighted in the sidebar', async ({ page }) => {
    await page.goto('/attendance')

    await expect(sidebar(page).getByRole('link', { name: 'Attendance' })).toHaveClass(/bg-primary/)
    await expect(sidebar(page).getByRole('link', { name: 'Employees' })).not.toHaveClass(/bg-primary/)
  })
})

for (const device of ['mobile', 'tablet'] as const) {
  test.describe(`Drawer menu (${device})`, () => {
    test.use({ viewport: DEVICES[device] })

    test('the sidebar is hidden until the menu button is pressed', async ({ page }) => {
      await page.goto('/dashboard')

      await expect(sidebar(page)).toBeHidden()
      await page.getByRole('button', { name: 'Menu' }).click()
      await expect(sidebar(page)).toBeVisible()
      await expect(sidebar(page).getByRole('link', { name: 'Reports' })).toBeVisible()
    })

    test('choosing a page navigates and closes the drawer', async ({ page }) => {
      await page.goto('/dashboard')
      await page.getByRole('button', { name: 'Menu' }).click()

      await sidebar(page).getByRole('link', { name: 'Employees' }).click()

      await expect(page).toHaveURL(/\/employees/)
      await expect(sidebar(page)).toBeHidden()
    })

    test('Escape and the close button dismiss the drawer', async ({ page }) => {
      await page.goto('/dashboard')

      await page.getByRole('button', { name: 'Menu' }).click()
      await page.keyboard.press('Escape')
      await expect(sidebar(page)).toBeHidden()

      await page.getByRole('button', { name: 'Menu' }).click()
      await page.getByRole('button', { name: 'Close menu' }).click()
      await expect(sidebar(page)).toBeHidden()
    })

    test('the page behind the open drawer does not scroll', async ({ page }) => {
      await page.goto('/dashboard')

      await page.getByRole('button', { name: 'Menu' }).click()

      expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
    })

    test('logout is reachable from the drawer', async ({ page }) => {
      await page.goto('/dashboard')
      await page.getByRole('button', { name: 'Menu' }).click()

      await expect(sidebar(page).getByRole('button', { name: 'Logout' })).toBeVisible()
    })
  })
}

test.describe('Phone: tables and forms', () => {
  test.use({ viewport: DEVICES.mobile })

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

    expect(first && second && second.y > first.y).toBe(true)
  })

  test('the dashboard hero numbers and their badges stay inside the screen', async ({ page }) => {
    await page.goto('/dashboard')

    for (const id of ['hero-employees', 'hero-hires', 'hero-rating']) {
      const box = await page.getByTestId(id).boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(DEVICES.mobile.width)
    }
  })

  test('recent hires drop low-priority columns and show the job title under the name', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page.getByRole('columnheader', { name: 'Salary' })).toBeHidden()
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible()
  })
})

test.describe('Signed-out phone', () => {
  test.use({ storageState: { cookies: [], origins: [] }, viewport: DEVICES.mobile })

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
