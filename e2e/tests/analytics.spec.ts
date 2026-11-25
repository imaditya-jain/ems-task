import { expect, test, type Page } from '@playwright/test'
import { SEED } from './support/env'
import { daysAgo, today } from './support/helpers'

const charts = (page: Page) => page.locator('.recharts-wrapper')

/** Reads the big number inside the stat card whose label is `label`. */
const statValue = async (page: Page, label: string) => {
  const card = page.locator('div.rounded-2xl', { has: page.getByText(label, { exact: true }) }).first()
  return Number((await card.locator('p').nth(1).innerText()).replace(/[^0-9]/g, ''))
}

test.describe('Dashboard', () => {
  test('shows live headcount, departments, new hires and payroll', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page.getByText('Total employees')).toBeVisible()
    await expect(page.getByText('Departments', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('New hires this month')).toBeVisible()
    await expect(page.getByText('Monthly payroll')).toBeVisible()
    await expect(page.getByText(/₹[\d,]+\.\d{2}/).first()).toBeVisible()
    expect(await statValue(page, 'Total employees')).toBeGreaterThanOrEqual(SEED.employeeCount)
  })

  test("renders today's attendance chart and quick actions", async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page.getByRole('heading', { name: "Today's attendance" })).toBeVisible()
    await expect(charts(page).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Add an employee' })).toBeVisible()
  })

  test('quick actions navigate to the right pages', async ({ page }) => {
    await page.goto('/dashboard')

    await page.getByRole('link', { name: 'Add an employee' }).click()
    await expect(page).toHaveURL(/\/employees\/new/)
    await page.goBack()
    await page.getByRole('link', { name: 'Download reports' }).click()
    await expect(page).toHaveURL(/\/reports/)
  })
})

test.describe('Analytics: hiring and department growth', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics')
    await expect(page.getByText('Hires in period')).toBeVisible()
  })

  test('shows the hiring trend and department growth charts', async ({ page }) => {
    await expect(charts(page)).toHaveCount(2)
    await expect(page.getByRole('heading', { name: 'Hiring trend' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Department growth' })).toBeVisible()
  })

  test('the growth table lists every demo department', async ({ page }) => {
    for (const name of SEED.departments) await expect(page.getByRole('cell', { name, exact: true })).toBeVisible()
  })

  test('the demo data (spread over ~24 months) produces hires in a 12-month window', async ({ page }) => {
    expect(await statValue(page, 'Hires in period')).toBeGreaterThan(5)
  })

  test('changing the period reloads the data', async ({ page }) => {
    const response = page.waitForResponse((r) => r.url().includes('/analytics/hiring-trend?months=36'))

    await page.getByLabel('Period').selectOption('36')

    expect((await response).status()).toBe(200)
    await expect(charts(page)).toHaveCount(2)
  })
})

test.describe('Analytics: attendance patterns', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics')
    await page.getByRole('button', { name: 'Attendance Patterns' }).click()
    await expect(page.getByText('Most frequently late or absent')).toBeVisible()
  })

  test('shows the rate, status totals, both charts and the offenders table', async ({ page }) => {
    await expect(page.getByText(/^\d+\.\d%$/).first()).toBeVisible()
    await expect(page.getByText('Present days')).toBeVisible()
    await expect(charts(page)).toHaveCount(2)
    expect(await page.locator('tbody tr').count()).toBeGreaterThan(0)
  })

  test('the weekday chart covers Monday to Sunday', async ({ page }) => {
    await expect
      .poll(async () =>
      (await charts(page).first().locator('text').allTextContents()).map((t) => t.trim()).filter((t) => /^[A-Z][a-z]{2}$/.test(t)),
    )
      .toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  })

  test('filters by department and by date range', async ({ page }) => {
    const byDepartment = page.waitForResponse((r) => r.url().includes('/attendance-patterns') && r.url().includes('departmentId='))
    await page.getByLabel('Department').selectOption({ label: 'Sales' })
    expect((await byDepartment).status()).toBe(200)

    const byRange = page.waitForResponse((r) => r.url().includes(`from=${daysAgo(6)}`))
    await page.getByLabel('From date').fill(daysAgo(6))
    expect((await byRange).status()).toBe(200)
    await expect(page.getByText('Present days')).toBeVisible()
  })

  test('an invalid range shows a message', async ({ page }) => {
    await page.getByLabel('From date').fill(today())
    await page.getByLabel('To date').fill(daysAgo(3))

    await expect(page.getByText('The start date cannot be after the end date.')).toBeVisible()
  })
})

test.describe('Analytics API', () => {
  test('overview reflects the seeded data', async ({ request }) => {
    const { data } = await (await request.get('/api/v1/analytics/overview', { params: { today: today() } })).json()

    expect(data.totalEmployees).toBeGreaterThanOrEqual(SEED.employeeCount)
    expect(data.inactiveEmployees).toBeGreaterThanOrEqual(SEED.inactiveCount)
    expect(data.departments).toBeGreaterThanOrEqual(SEED.departments.length)
    expect(data.todayAttendance.date).toBe(today())
  })

  test('hiring trend returns one point per requested month, in order, and totals add up', async ({ request }) => {
    const { data } = await (await request.get('/api/v1/analytics/hiring-trend', { params: { months: 12 } })).json()
    const months: string[] = data.points.map((p: { month: string }) => p.month)

    expect(months).toHaveLength(12)
    expect([...months].sort()).toEqual(months)
    expect(data.totalHires).toBe(data.points.reduce((sum: number, p: { hires: number }) => sum + p.hires, 0))
  })

  test('headcount never decreases month over month', async ({ request }) => {
    const { data } = await (await request.get('/api/v1/analytics/hiring-trend', { params: { months: 24 } })).json()
    const headcounts: number[] = data.points.map((p: { headcount: number }) => p.headcount)

    expect(headcounts).toEqual([...headcounts].sort((a, b) => a - b))
  })

  test('rejects an unsupported number of months', async ({ request }) => {
    expect((await request.get('/api/v1/analytics/hiring-trend', { params: { months: 1 } })).status()).toBe(400)
    expect((await request.get('/api/v1/analytics/department-growth', { params: { months: 99 } })).status()).toBe(400)
  })

  test('attendance patterns are Monday-first with a rate between 0 and 1', async ({ request }) => {
    const { data } = await (await request.get('/api/v1/analytics/attendance-patterns')).json()

    expect(data.byWeekday.map((w: { weekday: string }) => w.weekday)[0]).toBe('Monday')
    expect(data.byWeekday).toHaveLength(7)
    expect(data.totals.attendanceRate).toBeGreaterThan(0)
    expect(data.totals.attendanceRate).toBeLessThanOrEqual(1)
  })

  test('attendance patterns reject a reversed range', async ({ request }) => {
    const response = await request.get('/api/v1/analytics/attendance-patterns', { params: { from: today(), to: daysAgo(5) } })

    expect(response.status()).toBe(400)
  })
})
