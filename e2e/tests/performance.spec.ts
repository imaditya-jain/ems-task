import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { SEED } from './support/env'
import { createEmployeeViaApi, expectToast } from './support/helpers'

const NOW = new Date()
const YEAR = NOW.getFullYear()
const QUARTER = Math.floor(NOW.getMonth() / 3) + 1

const charts = (page: Page) => page.locator('.recharts-wrapper')
const searchReviews = async (page: Page, term: string) => {
  const done = page.waitForResponse((r) => r.url().includes('/api/v1/performance?') && r.url().includes('search='))
  await page.getByLabel('Search reviews').fill(term)
  await done
}

// The review form is a dialog, and the page behind it has filters with similar labels ("Filter by quarter"),
// so every form field is looked up inside the dialog.
const dialog = (page: Page) => page.getByRole('dialog')

const fillReview = async (page: Page, employeeLabel: string, scores: [number, number, number], quarter = QUARTER) => {
  await page.getByRole('button', { name: 'Add Review' }).click()
  await dialog(page).getByLabel('Employee').selectOption({ label: employeeLabel })
  await dialog(page).getByLabel('Quarter').selectOption(String(quarter))
  await dialog(page).getByLabel('Quality').selectOption(String(scores[0]))
  await dialog(page).getByLabel('Productivity').selectOption(String(scores[1]))
  await dialog(page).getByLabel('Teamwork').selectOption(String(scores[2]))
}

test.describe('Performance: metrics and reviews list', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/performance')
    await expect(page.getByRole('heading', { name: 'Performance', exact: true })).toBeVisible()
  })

  test('shows summary cards, three charts and the top / needs-improvement lists', async ({ page }) => {
    for (const label of ['Reviews', 'Average rating', 'Quality', 'Productivity', 'Teamwork']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
    }
    await expect(charts(page)).toHaveCount(3)
    await expect(page.getByRole('heading', { name: 'Top performers' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Needs improvement/ })).toBeVisible()
  })

  test('lists the seeded reviews, paginated', async ({ page }) => {
    await expect(page.locator('tbody tr')).toHaveCount(10)
    await expect(page.getByText(/Showing 1-10 of \d+/)).toBeVisible()
    const total = Number((await page.getByText(/Showing 1-10 of \d+/).innerText()).split(' of ')[1])
    expect(total).toBeGreaterThanOrEqual(60)
  })

  test('year and quarter filters narrow the list', async ({ page }) => {
    const all = Number((await page.getByText(/Showing 1-10 of \d+/).innerText()).split(' of ')[1])

    await page.getByLabel('Filter by year').selectOption(String(YEAR))
    await page.getByLabel('Filter by quarter').selectOption(String(QUARTER))

    await expect(page.getByText(/Showing 1-\d+ of \d+/)).toBeVisible()
    const filtered = Number((await page.getByText(/Showing 1-\d+ of \d+/).innerText()).split(' of ')[1])
    expect(filtered).toBeLessThan(all)
    for (const period of await page.locator('tbody tr td:nth-child(2)').allInnerTexts()) expect(period.trim()).toBe(`${YEAR} Q${QUARTER}`)
  })

  test('the department filter narrows the list', async ({ page }) => {
    await page.getByLabel('Filter by department').selectOption({ label: 'Sales' })

    await expect(page.getByText(/Showing 1-\d+ of \d+/)).toBeVisible()
    for (const text of await page.locator('tbody tr td:nth-child(1) p:nth-child(2)').allInnerTexts()) expect(text).toContain('Sales')
  })

  test('searching finds a seeded employee by code', async ({ page }) => {
    await searchReviews(page, SEED.firstEmployee.code)

    const rows = await page.locator('tbody tr').count()
    expect(rows).toBeGreaterThanOrEqual(1)
    expect(rows).toBeLessThanOrEqual(4) // at most one review per quarter shown in the demo data
    await expect(page.locator('tbody tr').first()).toContainText(SEED.firstEmployee.name)
  })
})

test.describe('Performance: review lifecycle', () => {
  test('the form validates required fields', async ({ page }) => {
    await page.goto('/performance')
    await page.getByRole('button', { name: 'Add Review' }).click()

    await page.getByRole('button', { name: 'Create Review' }).click()

    await expect(page.getByText('Select an employee')).toBeVisible()
    await expect(page.getByText('Quality score is required')).toBeVisible()
    await expect(page.getByText('Productivity score is required')).toBeVisible()
    await expect(page.getByText('Teamwork score is required')).toBeVisible()
  })

  test('creates a review, shows the computed rating, edits it, then deletes it', async ({ page, request }) => {
    const employee = await createEmployeeViaApi(request)
    await page.goto('/performance')

    // create: scores 5, 4, 3 -> overall 4.00 -> "Exceeds Expectations"
    await fillReview(page, `${employee.fullName} (${employee.employeeCode})`, [5, 4, 3])
    await dialog(page).getByRole('button', { name: 'Create Review' }).click()
    await expectToast(page, 'Review created successfully.')
    await searchReviews(page, employee.employeeCode)
    const row = page.getByRole('row').filter({ hasText: employee.fullName })
    await expect(row).toContainText('4.00')
    await expect(row).toContainText('Exceeds Expectations')

    // a second review for the same quarter is rejected
    await fillReview(page, `${employee.fullName} (${employee.employeeCode})`, [3, 3, 3])
    await page.getByRole('button', { name: 'Create Review' }).click()
    await expectToast(page, /already has a review for/)
    await page.getByRole('button', { name: 'Cancel' }).click()

    // edit: the employee is locked; scores 5, 5, 5 -> 5.00 -> "Outstanding"
    await page.getByLabel(`Edit review for ${employee.fullName} ${YEAR} Q${QUARTER}`).click()
    await expect(dialog(page).getByLabel('Employee')).toBeDisabled()
    await dialog(page).getByLabel('Quality').selectOption('5')
    await dialog(page).getByLabel('Productivity').selectOption('5')
    await dialog(page).getByLabel('Teamwork').selectOption('5')
    await dialog(page).getByRole('button', { name: 'Update Review' }).click()
    await expectToast(page, 'Review updated successfully.')
    await expect(row).toContainText('5.00')
    await expect(row).toContainText('Outstanding')

    // delete
    await page.getByLabel(`Delete review for ${employee.fullName} ${YEAR} Q${QUARTER}`).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
    await expectToast(page, 'Review deleted successfully.')
    await expect(page.getByText('No reviews found.')).toBeVisible()
  })

  test('a year in the future is rejected by the form', async ({ page, request }) => {
    const employee = await createEmployeeViaApi(request)
    await page.goto('/performance')
    await fillReview(page, `${employee.fullName} (${employee.employeeCode})`, [3, 3, 3])

    await dialog(page).getByLabel('Year').fill(String(YEAR + 1))
    await page.getByRole('button', { name: 'Create Review' }).click()

    await expect(page.getByText('Year cannot be in the future')).toBeVisible()
  })
})

test.describe('Performance: export', () => {
  for (const [button, ext, signature] of [['Export PDF', 'pdf', '%PDF'], ['Export Excel', 'xlsx', 'PK']] as const) {
    test(`${button} downloads a ${ext} that follows the selected filters`, async ({ page }) => {
      await page.goto('/performance')
      await page.getByLabel('Filter by year').selectOption(String(YEAR))
      await page.getByLabel('Filter by quarter').selectOption(String(QUARTER))

      const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: button }).click()])

      expect(file.suggestedFilename()).toMatch(new RegExp(`^performance-\\d{4}-\\d{2}-\\d{2}\\.${ext}$`))
      expect(readFileSync(await file.path()).subarray(0, signature.length).toString('latin1')).toBe(signature)
    })
  }
})

test.describe('Performance API', () => {
  test('metrics have the expected shape and consistent totals', async ({ request }) => {
    const { data } = await (await request.get('/api/v1/performance/metrics')).json()

    expect(data.summary.reviewCount).toBeGreaterThanOrEqual(60)
    expect(data.summary.averageOverall).toBeGreaterThanOrEqual(1)
    expect(data.summary.averageOverall).toBeLessThanOrEqual(5)
    expect(data.distribution.reduce((sum: number, b: { count: number }) => sum + b.count, 0)).toBe(data.summary.reviewCount)
    expect(data.topPerformers.length).toBeLessThanOrEqual(5)
    const top: number[] = data.topPerformers.map((p: { overall: number }) => p.overall)
    expect(top).toEqual([...top].sort((a, b) => b - a))
    for (const p of data.needsImprovement) expect(p.overall).toBeLessThan(3)
  })

  test('rejects scores outside 1-5, a future quarter and a duplicate period', async ({ request }) => {
    const employee = await createEmployeeViaApi(request)
    const review = (over: Record<string, unknown>) =>
      request.post('/api/v1/performance', {
        data: { employeeId: employee.id, year: YEAR - 1, quarter: 1, qualityScore: 4, productivityScore: 4, teamworkScore: 4, ...over },
      })

    expect((await review({ qualityScore: 9 })).status()).toBe(400)
    expect((await review({ teamworkScore: 0 })).status()).toBe(400)
    expect((await review({ year: YEAR + 1 })).status()).toBe(400)
    expect((await review({})).status()).toBe(201)
    expect((await review({})).status()).toBe(409)
  })

  test('a review cannot be moved to another employee', async ({ request }) => {
    const a = await createEmployeeViaApi(request)
    const b = await createEmployeeViaApi(request)
    const created = await (
      await request.post('/api/v1/performance', {
        data: { employeeId: a.id, year: YEAR - 1, quarter: 2, qualityScore: 3, productivityScore: 3, teamworkScore: 3 },
      })
    ).json()

    const moved = await request.put(`/api/v1/performance/${created.data.review.id}`, {
      data: { employeeId: b.id, year: YEAR - 1, quarter: 2, qualityScore: 3, productivityScore: 3, teamworkScore: 3 },
    })

    expect(moved.status()).toBe(400)
  })

  test('an unknown review is a 404', async ({ request }) => {
    expect((await request.get('/api/v1/performance/99999999')).status()).toBe(404)
    expect((await request.delete('/api/v1/performance/99999999')).status()).toBe(404)
  })
})
