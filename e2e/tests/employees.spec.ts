import { expect, test, type Page } from '@playwright/test'
import { SEED } from './support/env'
import { buildEmployee, createEmployeeViaApi, departmentId, expectToast, parseRupees, uid } from './support/helpers'

const search = async (page: Page, term: string) => {
  const done = page.waitForResponse((r) => r.url().includes('/api/v1/employees?') && r.url().includes('search='))
  await page.getByLabel('Search employees').fill(term)
  await done
}

const rowFor = (page: Page, text: string) => page.getByRole('row').filter({ hasText: text })

test.describe('Employees: list, search, filter, sort, paginate', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/employees')
    await expect(page.getByRole('heading', { name: 'Employees' })).toBeVisible()
  })

  test('shows the seeded demo employees, 10 per page', async ({ page }) => {
    await expect(page.getByText(/^\d+ total$/)).toBeVisible()
    expect(await page.locator('tbody tr').count()).toBe(10)
    await expect(page.getByText(/Showing 1-10 of \d+/)).toBeVisible()

    const total = Number((await page.getByText(/^\d+ total$/).innerText()).split(' ')[0])
    expect(total).toBeGreaterThanOrEqual(SEED.employeeCount)
  })

  test('searching by employee code finds exactly that employee', async ({ page }) => {
    await search(page, SEED.firstEmployee.code)

    await expect(page.locator('tbody tr')).toHaveCount(1)
    await expect(rowFor(page, SEED.firstEmployee.name)).toBeVisible()
    await expect(page.getByText('1 total')).toBeVisible()
  })

  test('searching with no match shows the empty state', async ({ page }) => {
    await search(page, 'zzz-no-such-employee')

    await expect(page.getByText('No employees found.')).toBeVisible()
  })

  test('filters by department', async ({ page }) => {
    await page.getByLabel('Filter by department').selectOption({ label: 'Engineering' })

    // wait until the filtered list has replaced the unfiltered one, then check every row
    const departments = () => page.locator('tbody tr td:nth-child(4) p:first-child').allInnerTexts()
    await expect.poll(async () => new Set(await departments())).toEqual(new Set(['Engineering']))
    expect((await departments()).length).toBeGreaterThanOrEqual(1)
    await expect(page.getByText(/Showing 1-\d+ of \d+/)).toBeVisible()
  })

  test('filters by status: Inactive shows only the leavers', async ({ page }) => {
    await page.getByLabel('Filter by status').selectOption('Inactive')

    await expect(page.locator('tbody tr')).toHaveCount(SEED.inactiveCount)
    for (const badge of await page.locator('tbody tr td:nth-child(7)').allInnerTexts()) expect(badge.trim()).toBe('Inactive')
  })

  test('sorts by salary ascending, then descending', async ({ page }) => {
    const salaries = async () => (await page.locator('tbody tr td:nth-child(6)').allInnerTexts()).map(parseRupees)

    await page.getByRole('button', { name: 'Salary' }).click()
    await expect(page.getByRole('button', { name: 'Salary' }).locator('svg')).toBeVisible()
    const ascending = await salaries()
    expect(ascending).toEqual([...ascending].sort((a, b) => a - b))

    await page.getByRole('button', { name: 'Salary' }).click()
    await expect.poll(async () => (await salaries())[0]).toBeGreaterThanOrEqual(ascending[ascending.length - 1])
    const descending = await salaries()
    expect(descending).toEqual([...descending].sort((a, b) => b - a))
  })

  test('paginates', async ({ page }) => {
    await expect(page.getByText(/Page 1 of \d+/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled()
    const firstPageFirstRow = await page.locator('tbody tr').first().innerText()

    await page.getByRole('button', { name: 'Next' }).click()

    await expect(page.getByText(/Page 2 of \d+/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Previous' })).toBeEnabled()
    expect(await page.locator('tbody tr').first().innerText()).not.toBe(firstPageFirstRow)
  })
})

test.describe('Employees: create', () => {
  test('the form shows every required-field error on an empty submit', async ({ page }) => {
    await page.goto('/employees/new')

    await page.getByRole('button', { name: 'Create Employee' }).click()

    for (const message of ['Employee code is required', 'First name is required', 'Last name is required', 'Email is required', 'Phone is required', 'Date of birth is required', 'Gender is required', 'Designation is required', 'Joining date is required']) {
      await expect(page.getByText(message)).toBeVisible()
    }
  })

  test('rejects an employee under 18 and a negative salary', async ({ page }) => {
    await page.goto('/employees/new')

    await page.getByLabel('Date of Birth').fill(`${new Date().getFullYear() - 10}-01-01`)
    await page.getByLabel('Monthly Salary (INR)').fill('-5')
    await page.getByRole('button', { name: 'Create Employee' }).click()

    await expect(page.getByText('Employee must be at least 18 years old')).toBeVisible()
    await expect(page.getByText('Salary cannot be negative')).toBeVisible()
  })

  test('creates an employee through the form and finds them in the list', async ({ page, request }) => {
    const e = buildEmployee(await departmentId(request, 'Finance'))
    await page.goto('/employees/new')

    await page.getByLabel('Employee Code').fill(e.employeeCode)
    await page.getByLabel('First Name').fill(e.firstName)
    await page.getByLabel('Last Name').fill(e.lastName)
    await page.getByLabel('Email', { exact: true }).fill(e.email)
    await page.getByLabel('Phone').fill(e.phone)
    await page.getByLabel('Date of Birth').fill(e.dateOfBirth)
    await page.getByLabel('Gender').selectOption('Female')
    await page.getByLabel('Department').selectOption({ label: 'Finance' })
    await page.getByLabel('Designation').fill('Payroll Analyst')
    await page.getByLabel('Joining Date').fill(e.joiningDate)
    await page.getByLabel('Monthly Salary (INR)').fill('72500.50')
    await page.getByRole('button', { name: 'Create Employee' }).click()

    await expectToast(page, 'Employee created successfully.')
    await expect(page).toHaveURL(/\/employees$/)
    await search(page, e.employeeCode)
    const row = rowFor(page, `${e.firstName} ${e.lastName}`)
    await expect(row).toContainText('Finance')
    await expect(row).toContainText('₹72,500.50')
  })

  test('a duplicate employee code is rejected with a clear message', async ({ page, request }) => {
    const existing = await createEmployeeViaApi(request)
    const e = buildEmployee(await departmentId(request, 'Engineering'), { employeeCode: existing.employeeCode })
    await page.goto('/employees/new')

    await page.getByLabel('Employee Code').fill(e.employeeCode)
    await page.getByLabel('First Name').fill('Dup')
    await page.getByLabel('Last Name').fill('Licate')
    await page.getByLabel('Email', { exact: true }).fill(e.email)
    await page.getByLabel('Phone').fill(e.phone)
    await page.getByLabel('Date of Birth').fill(e.dateOfBirth)
    await page.getByLabel('Gender').selectOption('Male')
    await page.getByLabel('Department').selectOption({ label: 'Engineering' })
    await page.getByLabel('Designation').fill('Dev')
    await page.getByLabel('Joining Date').fill(e.joiningDate)
    await page.getByLabel('Monthly Salary (INR)').fill('1000')
    await page.getByRole('button', { name: 'Create Employee' }).click()

    await expectToast(page, `Employee code '${existing.employeeCode}' is already in use.`)
    await expect(page).toHaveURL(/\/employees\/new/)
  })
})

test.describe('Employees: view, edit, delete', () => {
  test('the detail page shows the employee and their attendance section', async ({ page }) => {
    await page.goto('/employees')
    await search(page, SEED.firstEmployee.code)

    await page.getByRole('button', { name: `View ${SEED.firstEmployee.name}` }).click()

    await expect(page.getByRole('heading', { name: SEED.firstEmployee.name })).toBeVisible()
    await expect(page.getByText(SEED.firstEmployee.code)).toBeVisible()
    await expect(page.getByText('aarav.sharma@acme-demo.test')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Attendance' })).toBeVisible()
    await expect(page.getByLabel('Attendance month')).toBeVisible()
  })

  test('edit pre-fills the form and saves the change', async ({ page, request }) => {
    const employee = await createEmployeeViaApi(request)
    await page.goto(`/employees/${employee.id}/edit`)

    await expect(page.getByLabel('Employee Code')).toHaveValue(employee.employeeCode)
    await expect(page.getByLabel('Email', { exact: true })).toHaveValue(employee.email)
    await page.getByLabel('Designation').fill('Principal QA')
    await page.getByLabel('Monthly Salary (INR)').fill('99000')
    await page.getByRole('button', { name: 'Update Employee' }).click()

    await expectToast(page, 'Employee updated successfully.')
    await page.goto(`/employees/${employee.id}`)
    await expect(page.getByText('Principal QA').first()).toBeVisible()
    await expect(page.getByText('₹99,000.00')).toBeVisible()
  })

  test('deletes a single employee after confirmation', async ({ page, request }) => {
    const employee = await createEmployeeViaApi(request)
    await page.goto('/employees')
    await search(page, employee.employeeCode)

    await page.getByRole('button', { name: `Delete ${employee.fullName}` }).click()
    await expect(page.getByRole('dialog')).toContainText(employee.employeeCode)
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()

    await expectToast(page, 'Employee deleted successfully.')
    await expect(page.getByText('No employees found.')).toBeVisible()
  })

  test('bulk delete removes every selected employee', async ({ page, request }) => {
    const tag = uid()
    const dept = await departmentId(request, 'Operations')
    const rows = [1, 2, 3].map((n) => buildEmployee(dept, { employeeCode: `E2E-BD-${tag}-${n}`, lastName: `Bulk${tag}${n}`, email: `bulk.${tag.toLowerCase()}.${n}@e2e-demo.test` }))
    const created = await request.post('/api/v1/employees/bulk', {
      data: { employees: rows.map(({ departmentId: _id, ...rest }) => ({ ...rest, departmentName: 'Operations' })) },
    })
    expect(created.status()).toBe(201)

    await page.goto('/employees')
    await search(page, `E2E-BD-${tag}`)
    await expect(page.locator('tbody tr')).toHaveCount(3)

    await page.getByLabel('Select all on this page').check()
    await page.getByRole('button', { name: 'Delete (3)' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete 3' }).click()

    await expectToast(page, '3 employees deleted successfully.')
    await expect(page.getByText('No employees found.')).toBeVisible()
  })
})

test.describe('Employees: CSV import', () => {
  const HEADER = 'employeeCode,firstName,lastName,email,phone,dateOfBirth,gender,departmentName,designation,joiningDate,salary,status'
  const csvRow = (code: string, email: string, department = 'Operations', dob = '1991-05-06') =>
    `${code},Import,User${code},${email},9876543210,${dob},Female,${department},Coordinator,2024-02-01,48000,Active`

  const upload = async (page: Page, csv: string) => {
    await page.goto('/employees')
    await page.getByRole('button', { name: 'Import CSV' }).click()
    await page.getByLabel('CSV file').setInputFiles({ name: 'employees.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  }

  test('imports a valid file and the new employees appear in the list', async ({ page }) => {
    const tag = uid()
    await upload(page, [HEADER, csvRow(`E2E-IMP-${tag}-1`, `imp1.${tag}@e2e-demo.test`), csvRow(`E2E-IMP-${tag}-2`, `imp2.${tag}@e2e-demo.test`)].join('\n'))

    await expect(page.getByText(/2 employees ready to import/)).toBeVisible()
    await page.getByRole('button', { name: 'Import', exact: true }).click()

    await expectToast(page, '2 employees imported successfully.')
    await search(page, `E2E-IMP-${tag}`)
    await expect(page.locator('tbody tr')).toHaveCount(2)
  })

  test('is all-or-nothing: one bad row rejects the whole file and lists the problems by row', async ({ page, request }) => {
    const tag = uid()
    await upload(page, [
      HEADER,
      csvRow(`E2E-BAD-${tag}-1`, `ok.${tag}@e2e-demo.test`),                   // valid
      csvRow(`E2E-BAD-${tag}-2`, `bad.${tag}@e2e-demo.test`, 'No Such Dept'),  // unknown department
      csvRow(`E2E-BAD-${tag}-3`, `young.${tag}@e2e-demo.test`, 'Operations', `${new Date().getFullYear() - 12}-01-01`), // under 18
    ].join('\n'))

    await page.getByRole('button', { name: 'Import', exact: true }).click()

    await expect(page.getByText(/Row 2: Department 'No Such Dept' does not exist/)).toBeVisible()
    await expect(page.getByText(/Row 3: Employee must be at least 18/)).toBeVisible()
    await expect(page.getByText(/Row 1:/)).toHaveCount(0)

    // the valid first row was NOT saved
    const found = await (await request.get('/api/v1/employees', { params: { search: `E2E-BAD-${tag}` } })).json()
    expect(found.data.totalCount).toBe(0)
  })

  test('reports a file with missing columns before anything is sent', async ({ page }) => {
    await upload(page, 'employeeCode,firstName\nEMP-1,Asha\n')

    await expect(page.getByText(/Missing column\(s\):/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeDisabled()
  })

  test('offers a downloadable CSV template', async ({ page }) => {
    await page.goto('/employees')
    await page.getByRole('button', { name: 'Import CSV' }).click()

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download CSV template' }).click()])

    expect(download.suggestedFilename()).toBe('employees-template.csv')
  })
})
