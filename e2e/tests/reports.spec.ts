import { readFileSync } from 'node:fs'
import readXlsxFile from 'read-excel-file/node'
import { expect, test, type Page } from '@playwright/test'
import { SEED } from './support/env'

const cards = [
  { title: 'Employee Directory', slug: 'employee-directory' },
  { title: 'Department Summary', slug: 'departments' },
  { title: 'Attendance Report', slug: 'attendance' },
  { title: 'Salary Report', slug: 'salary' },
] as const

const card = (page: Page, title: string) => page.locator('div.rounded-2xl', { has: page.getByRole('heading', { name: title }) })

const download = async (page: Page, title: string, button: 'Download PDF' | 'Download Excel') => {
  const [file] = await Promise.all([page.waitForEvent('download'), card(page, title).getByRole('button', { name: button }).click()])
  return { name: file.suggestedFilename(), bytes: readFileSync(await file.path()) }
}

type Cell = string | number | boolean | Date | null

/** Reads the first worksheet of an xlsx file into rows of typed cells. */
const readSheet = async (bytes: Buffer) => {
  const sheets = (await readXlsxFile(bytes)) as unknown as { sheet: string; data: Cell[][] }[]
  const rows = sheets[0].data
  const text = rows.map((row) => row.filter((v) => v !== null).map(String).join(' | ')).join('\n')
  return { sheets, rows, text }
}

const stamp = () => new Date().toISOString().slice(0, 10)

test.describe('Reports (UI downloads)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports')
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
  })

  for (const { title, slug } of cards) {
    test(`${title}: downloads a valid PDF`, async ({ page }) => {
      const { name, bytes } = await download(page, title, 'Download PDF')

      expect(name).toMatch(new RegExp(`^${slug}-\\d{4}-\\d{2}-\\d{2}\\.pdf$`))
      expect(bytes.subarray(0, 4).toString('latin1')).toBe('%PDF')
      expect(bytes.length).toBeGreaterThan(1000)
    })

    test(`${title}: downloads a valid Excel workbook`, async ({ page }) => {
      const { name, bytes } = await download(page, title, 'Download Excel')

      expect(name).toMatch(new RegExp(`^${slug}-\\d{4}-\\d{2}-\\d{2}\\.xlsx$`))
      expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK') // an xlsx file is a zip archive
      expect((await readSheet(bytes)).sheets).toHaveLength(1)
    })
  }

  test('the employee directory workbook contains the demo employees and a summary', async ({ page }) => {
    const { bytes } = await download(page, 'Employee Directory', 'Download Excel')

    const { text } = await readSheet(bytes)

    expect(text).toContain('Employee Directory')
    expect(text).toContain(SEED.firstEmployee.code)
    expect(text).toContain(SEED.firstEmployee.name)
    expect(text).toContain('Total employees')
  })

  test('the directory can be filtered by status (leavers only)', async ({ page }) => {
    await card(page, 'Employee Directory').getByRole('combobox').nth(1).selectOption('Inactive')

    const { bytes } = await download(page, 'Employee Directory', 'Download Excel')
    const { rows } = await readSheet(bytes)
    const statuses = rows.map((row) => String(row[7] ?? '')).filter((status) => status === 'Active' || status === 'Inactive')

    expect(statuses.length).toBeGreaterThanOrEqual(SEED.inactiveCount)
    expect(new Set(statuses)).toEqual(new Set(['Inactive']))
  })

  test('the department workbook lists all demo departments with payroll totals', async ({ page }) => {
    const { bytes } = await download(page, 'Department Summary', 'Download Excel')

    const { text } = await readSheet(bytes)

    for (const name of SEED.departments) expect(text).toContain(name)
    expect(text).toContain('Total monthly payroll')
  })

  test('the salary workbook stores salaries as real numbers (sortable and summable)', async ({ page }) => {
    const { bytes } = await download(page, 'Salary Report', 'Download Excel')

    const { rows } = await readSheet(bytes)
    const numeric = rows.filter((row) => String(row[0]).startsWith('EMP-') && typeof row[4] === 'number').length

    expect(numeric).toBeGreaterThanOrEqual(SEED.employeeCount - SEED.inactiveCount) // defaults to active staff
  })

  test('the attendance workbook has the attendance-rate column and the demo employees', async ({ page }) => {
    const { bytes } = await download(page, 'Attendance Report', 'Download Excel')

    const { text } = await readSheet(bytes)

    expect(text).toContain('Attendance %')
    expect(text).toContain(SEED.firstEmployee.code)
  })

  test('the attendance report validates the date range before downloading', async ({ page }) => {
    const attendance = card(page, 'Attendance Report')
    await attendance.locator('input[type=date]').nth(0).fill('2026-12-10')
    await attendance.locator('input[type=date]').nth(1).fill('2026-12-01')

    await expect(page.getByText('The start date cannot be after the end date.').first()).toBeVisible()
    await attendance.getByRole('button', { name: 'Download PDF' }).click()
    await expect(page.getByText('The start date cannot be after the end date.')).toHaveCount(2) // inline hint + toast
  })

  test('buttons are disabled while a report is being prepared', async ({ page }) => {
    await page.route('**/api/v1/reports/salary**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800))
      await route.continue()
    })

    const pending = page.waitForEvent('download')
    await card(page, 'Salary Report').getByRole('button', { name: 'Download PDF' }).click()

    await expect(card(page, 'Salary Report').getByRole('button', { name: 'Preparing...' })).toBeDisabled()
    await expect(card(page, 'Employee Directory').getByRole('button', { name: 'Download PDF' })).toBeDisabled()
    await pending
  })
})

test.describe('Reports (API)', () => {
  for (const slug of ['employee-directory', 'departments', 'attendance', 'salary', 'performance']) {
    test(`/reports/${slug}: content types, filenames and no-store caching`, async ({ request }) => {
      const pdf = await request.get(`/api/v1/reports/${slug}`, { params: { format: 'pdf' } })
      const xlsx = await request.get(`/api/v1/reports/${slug}`, { params: { format: 'excel' } })

      expect(pdf.status()).toBe(200)
      expect(pdf.headers()['content-type']).toBe('application/pdf')
      expect(pdf.headers()['content-disposition']).toContain(`${slug}-${stamp()}.pdf`)
      expect(pdf.headers()['cache-control']).toBe('no-store') // salary data must never be cached

      expect(xlsx.status()).toBe(200)
      expect(xlsx.headers()['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      expect(xlsx.headers()['content-disposition']).toContain('.xlsx')
    })
  }

  test('an unknown format is rejected', async ({ request }) => {
    expect((await request.get('/api/v1/reports/salary', { params: { format: 'doc' } })).status()).toBe(400)
  })

  test('the attendance report rejects a reversed range and a range over a year', async ({ request }) => {
    const reversed = await request.get('/api/v1/reports/attendance', { params: { from: '2026-05-10', to: '2026-05-01' } })
    const tooLong = await request.get('/api/v1/reports/attendance', { params: { from: '2024-01-01', to: '2026-01-01' } })

    expect(reversed.status()).toBe(400)
    expect(tooLong.status()).toBe(400)
  })

  test('the performance report rejects an invalid quarter', async ({ request }) => {
    expect((await request.get('/api/v1/reports/performance', { params: { quarter: 7 } })).status()).toBe(400)
  })
})
