import { expect, test, type Page } from '@playwright/test'
import { SEED } from './support/env'
import { createEmployeeViaApi, daysAgo, expectToast, today } from './support/helpers'

// The demo data covers the last 60 days. These tests mark a day well before that, so they work on a clean demo
// database AND on a database that earlier runs have already written to (marking is an upsert).
const DAY = daysAgo(120)

/** Tests (and earlier runs) add employees, so always compare with the live number of active employees. */
const activeCount = async (request: import('@playwright/test').APIRequestContext) =>
  (await (await request.get('/api/v1/employees', { params: { status: 'Active', pageSize: 1 } })).json()).data.totalCount as number

const open = async (page: Page, date = DAY) => {
  await page.goto('/attendance')
  await page.getByLabel('Attendance date').fill(date)
  await expect(page.getByLabel('Attendance date')).toHaveValue(date)
  await expect.poll(() => page.locator('tbody tr').count()).toBeGreaterThan(0)
}

const statusOf = (page: Page, name: string) => page.getByLabel(`Status for ${name}`)

const markEveryonePresent = async (page: Page) => {
  await page.getByRole('button', { name: 'Mark all Present' }).click()
  await page.getByRole('button', { name: /^Save/ }).click()
  await expectToast(page, /Attendance saved/)
}

test.describe('Attendance', () => {
  test('lists exactly the ACTIVE employees on the daily sheet', async ({ page, request }) => {
    const active = await activeCount(request)
    await open(page)

    await expect.poll(() => page.locator('tbody tr').count()).toBe(active)
    expect(active).toBeGreaterThanOrEqual(SEED.employeeCount - SEED.inactiveCount)
    await expect(page.getByLabel('Status for Aarav Sharma')).toBeVisible()
  })

  test('the date picker does not allow future dates', async ({ page }) => {
    await page.goto('/attendance')

    await expect(page.getByLabel('Attendance date')).toHaveAttribute('max', today())
  })

  test('mark all present, save, and the records persist after a reload', async ({ page, request }) => {
    const active = await activeCount(request)
    await open(page)

    await page.getByRole('button', { name: 'Mark all Present' }).click()
    await expect(page.getByText('Not marked: 0')).toBeVisible()
    await page.getByRole('button', { name: /^Save \(\d+\)$/ }).click()
    await expectToast(page, /Attendance saved for \d+ employees\./)

    await open(page)
    await expect(page.getByText('Not marked: 0')).toBeVisible()
    await expect(page.getByText(`Present: ${active}`)).toBeVisible()
  })

  test('can correct a record and add a note; both persist', async ({ page }) => {
    await open(page)
    await markEveryonePresent(page)

    await statusOf(page, 'Aarav Sharma').selectOption('Late')
    await page.getByLabel('Notes for Aarav Sharma').fill('Heavy traffic')
    await page.getByRole('button', { name: 'Save (1)' }).click()
    await expectToast(page, 'Attendance saved for 1 employee.')

    await open(page)
    await expect(statusOf(page, 'Aarav Sharma')).toHaveValue('Late')
    await expect(page.getByLabel('Notes for Aarav Sharma')).toHaveValue('Heavy traffic')
    await expect(page.getByText('Late: 1')).toBeVisible()
  })

  test('unsaved edits survive filtering and searching', async ({ page, request }) => {
    const active = await activeCount(request)
    await open(page)
    await statusOf(page, 'Aarav Sharma').selectOption('Absent')

    await page.getByLabel('Search employees').fill('Priya')
    await expect.poll(() => page.locator('tbody tr').count()).toBeLessThan(active)
    await page.getByLabel('Search employees').fill('')
    await expect.poll(() => page.locator('tbody tr').count()).toBe(active)

    await expect(statusOf(page, 'Aarav Sharma')).toHaveValue('Absent')
    await expect(page.getByRole('button', { name: 'Save (1)' })).toBeVisible()
  })

  test('the Save button is disabled until something changes', async ({ page }) => {
    await open(page)

    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
  })

  test('changing the date discards edits that belonged to the previous day', async ({ page }) => {
    await open(page)
    await statusOf(page, 'Aarav Sharma').selectOption('Leave')
    await expect(page.getByRole('button', { name: 'Save (1)' })).toBeVisible()

    await page.getByLabel('Attendance date').fill(daysAgo(121))

    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
  })

  test('department filter narrows the sheet', async ({ page, request }) => {
    const active = await activeCount(request)
    await open(page)

    await page.getByLabel('Filter by department').selectOption({ label: 'Finance' })

    await expect.poll(() => page.locator('tbody tr').count()).toBeLessThan(active)
    await expect(page.getByRole('cell', { name: 'Finance', exact: true }).first()).toBeVisible()
  })

  test("the employee's monthly history shows the marked day with its note", async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: 'Mark all Present' }).click()
    await statusOf(page, 'Aarav Sharma').selectOption('HalfDay')
    await page.getByLabel('Notes for Aarav Sharma').fill('Doctor visit')
    await page.getByRole('button', { name: /^Save/ }).click()
    await expectToast(page, /Attendance saved/)

    await page.goto('/employees')
    await page.getByLabel('Search employees').fill(SEED.firstEmployee.code)
    await page.getByRole('button', { name: `View ${SEED.firstEmployee.name}` }).click()
    await page.getByLabel('Attendance month').fill(DAY.slice(0, 7))

    await expect(page.getByText('Doctor visit')).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Half Day' })).toBeVisible()
  })

  test('a new employee appears on the sheet and can be marked', async ({ page, request }) => {
    const employee = await createEmployeeViaApi(request)
    await open(page)

    await page.getByLabel('Search employees').fill(employee.employeeCode)
    await statusOf(page, employee.fullName).selectOption('Present')
    await page.getByRole('button', { name: 'Save (1)' }).click()

    await expectToast(page, 'Attendance saved for 1 employee.')
  })
})

test.describe('Attendance API', () => {
  test('rejects a date more than one day in the future', async ({ request }) => {
    const sheet = await (await request.get('/api/v1/attendance', { params: { date: daysAgo(1) } })).json()
    const employeeId = sheet.data.rows[0].employeeId

    const response = await request.post('/api/v1/attendance', {
      data: { date: daysAgo(-5), records: [{ employeeId, status: 'Present' }] },
    })

    expect(response.status()).toBe(400)
    expect((await response.json()).error).toContain('future')
  })

  test('rejects marking an inactive employee', async ({ request }) => {
    const inactive = await (await request.get('/api/v1/employees', { params: { status: 'Inactive' } })).json()

    const response = await request.post('/api/v1/attendance', {
      data: { date: DAY, records: [{ employeeId: inactive.data.items[0].id, status: 'Present' }] },
    })

    expect(response.status()).toBe(400)
  })

  test('marking twice updates the record instead of creating a duplicate', async ({ request }) => {
    const employee = await createEmployeeViaApi(request)
    const mark = (status: string) =>
      request.post('/api/v1/attendance', { data: { date: DAY, records: [{ employeeId: employee.id, status }] } })

    expect((await mark('Present')).status()).toBe(200)
    expect((await mark('Absent')).status()).toBe(200)

    const month = await (await request.get(`/api/v1/attendance/employees/${employee.id}`, { params: { month: DAY.slice(0, 7) } })).json()
    expect(month.data.records).toHaveLength(1)
    expect(month.data.records[0].status).toBe('Absent')
    expect(month.data.summary).toMatchObject({ absent: 1, present: 0, total: 1 })
  })

  test('rejects an invalid status and a malformed month', async ({ request }) => {
    const employee = await createEmployeeViaApi(request)

    const badStatus = await request.post('/api/v1/attendance', {
      data: { date: DAY, records: [{ employeeId: employee.id, status: 'Nope' }] },
    })
    const badMonth = await request.get(`/api/v1/attendance/employees/${employee.id}`, { params: { month: 'abc' } })

    expect(badStatus.status()).toBe(400)
    expect(badMonth.status()).toBe(400)
  })

  test('the monthly summary of an unknown employee is a 404', async ({ request }) => {
    expect((await request.get('/api/v1/attendance/employees/99999999')).status()).toBe(404)
  })
})
