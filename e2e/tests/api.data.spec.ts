import { expect, test } from '@playwright/test'
import { SEED } from './support/env'
import { buildEmployee, createEmployeeViaApi, daysAgo, departmentId, uid } from './support/helpers'

test.describe('Departments API', () => {
  test('full lifecycle: create, read, update, conflict, delete, 404', async ({ request }) => {
    const name = `API Dept ${uid()}`

    const created = await request.post('/api/v1/departments', { data: { name: `  ${name}  `, description: '   ' } })
    expect(created.status()).toBe(201)
    const department = (await created.json()).data.department
    expect(department.name).toBe(name) // trimmed
    expect(department.description).toBeNull() // blank description normalised

    expect((await request.get(`/api/v1/departments/${department.id}`)).status()).toBe(200)

    const duplicate = await request.post('/api/v1/departments', { data: { name: name.toUpperCase() } })
    expect(duplicate.status()).toBe(409)
    expect((await duplicate.json()).error).toContain('already exists')

    const renamed = await request.put(`/api/v1/departments/${department.id}`, { data: { name: `${name} 2`, description: 'Updated' } })
    expect(renamed.status()).toBe(200)
    expect((await renamed.json()).data.department.description).toBe('Updated')

    expect((await request.delete(`/api/v1/departments/${department.id}`)).status()).toBe(200)
    expect((await request.get(`/api/v1/departments/${department.id}`)).status()).toBe(404)
  })

  test('validation: name length is enforced', async ({ request }) => {
    expect((await request.post('/api/v1/departments', { data: { name: 'A' } })).status()).toBe(400)
    expect((await request.post('/api/v1/departments', { data: { name: 'x'.repeat(101) } })).status()).toBe(400)
    expect((await request.post('/api/v1/departments', { data: {} })).status()).toBe(400)
  })

  test('search is case-insensitive and results are sorted by name', async ({ request }) => {
    const all = (await (await request.get('/api/v1/departments')).json()).data.departments.map((d: { name: string }) => d.name)
    expect(all).toEqual([...all].sort((a, b) => a.localeCompare(b)))
    for (const name of SEED.departments) expect(all).toContain(name)

    const found = (await (await request.get('/api/v1/departments', { params: { search: 'ENGIN' } })).json()).data.departments
    expect(found.map((d: { name: string }) => d.name)).toContain('Engineering')
  })

  test('a department with employees cannot be deleted', async ({ request }) => {
    const id = await departmentId(request, 'Engineering')

    const response = await request.delete(`/api/v1/departments/${id}`)

    expect(response.status()).toBe(409)
    expect((await response.json()).error).toContain('still has employees')
  })
})

test.describe('Employees API', () => {
  test('creates an employee: input is trimmed and the email is lower-cased', async ({ request }) => {
    const dept = await departmentId(request, 'Finance')
    const e = buildEmployee(dept, { firstName: '  Meena ', email: `  MEENA.${uid()}@E2E-Demo.TEST ` })

    const response = await request.post('/api/v1/employees', { data: e })

    expect(response.status()).toBe(201)
    const { employee } = (await response.json()).data
    expect(employee.firstName).toBe('Meena')
    expect(employee.email).toBe(e.email.trim().toLowerCase())
    expect(employee.departmentName).toBe('Finance')
  })

  test('business rules: under 18, joining before 18, unknown department, duplicate code and email', async ({ request }) => {
    const dept = await departmentId(request, 'Engineering')
    const post = (over: Record<string, unknown>) => request.post('/api/v1/employees', { data: { ...buildEmployee(dept), ...over } })

    const young = await post({ dateOfBirth: daysAgo(365 * 17) })
    expect(young.status()).toBe(400)
    expect((await young.json()).error).toContain('18')

    expect((await post({ dateOfBirth: '2000-01-01', joiningDate: '2016-01-01' })).status()).toBe(400)
    expect((await post({ departmentId: 99999999 })).status()).toBe(400)

    const existing = await createEmployeeViaApi(request)
    const sameCode = await post({ employeeCode: existing.employeeCode })
    expect(sameCode.status()).toBe(409)
    const sameEmail = await post({ email: existing.email.toUpperCase() })
    expect(sameEmail.status()).toBe(409)
  })

  test('validation reports every problem at once', async ({ request }) => {
    const response = await request.post('/api/v1/employees', { data: { employeeCode: 'x' } })
    const body = await response.json()

    expect(response.status()).toBe(400)
    expect(body.errors.length).toBeGreaterThan(5)
  })

  test('pagination: page size is clamped and totals are consistent', async ({ request }) => {
    const big = (await (await request.get('/api/v1/employees', { params: { pageSize: 1000 } })).json()).data
    expect(big.pageSize).toBe(100)

    const small = (await (await request.get('/api/v1/employees', { params: { page: 2, pageSize: 5 } })).json()).data
    expect(small.items).toHaveLength(5)
    expect(small.page).toBe(2)
    expect(small.totalPages).toBe(Math.ceil(small.totalCount / 5))
    expect(small.totalCount).toBeGreaterThanOrEqual(SEED.employeeCount)
  })

  test('sorting works in both directions and the pages do not overlap', async ({ request }) => {
    const salaries = async (descending: boolean) =>
      (await (await request.get('/api/v1/employees', { params: { sortBy: 'salary', descending, pageSize: 100 } })).json()).data.items.map((e: { salary: number }) => e.salary)

    const asc = await salaries(false)
    const desc = await salaries(true)

    expect(asc).toEqual([...asc].sort((a, b) => a - b))
    expect(desc).toEqual([...desc].sort((a, b) => b - a))

    const p1 = (await (await request.get('/api/v1/employees', { params: { pageSize: 10, page: 1 } })).json()).data.items.map((e: { id: number }) => e.id)
    const p2 = (await (await request.get('/api/v1/employees', { params: { pageSize: 10, page: 2 } })).json()).data.items.map((e: { id: number }) => e.id)
    expect(p1.filter((id: number) => p2.includes(id))).toEqual([])
  })

  test('a malicious sortBy value cannot reach the query (SQL-injection safe)', async ({ request }) => {
    const response = await request.get('/api/v1/employees', { params: { sortBy: 'salary; DROP TABLE employees;--', pageSize: 5 } })

    expect(response.status()).toBe(200)
    expect((await (await request.get('/api/v1/employees', { params: { pageSize: 5 } })).json()).data.totalCount).toBeGreaterThanOrEqual(SEED.employeeCount)
  })

  test('a SQL-looking search term is treated as plain text', async ({ request }) => {
    const response = await request.get('/api/v1/employees', { params: { search: "'; DROP TABLE employees;--" } })

    expect(response.status()).toBe(200)
    expect((await response.json()).data.totalCount).toBe(0)
  })

  test('search and filters combine', async ({ request }) => {
    const inactive = (await (await request.get('/api/v1/employees', { params: { status: 'Inactive' } })).json()).data
    expect(inactive.totalCount).toBeGreaterThanOrEqual(SEED.inactiveCount)
    for (const e of inactive.items) expect(e.status).toBe('Inactive')

    const dept = await departmentId(request, 'Sales')
    const sales = (await (await request.get('/api/v1/employees', { params: { departmentId: dept, pageSize: 100 } })).json()).data
    for (const e of sales.items) expect(e.departmentName).toBe('Sales')

    const byCode = (await (await request.get('/api/v1/employees', { params: { search: SEED.firstEmployee.code } })).json()).data
    expect(byCode.totalCount).toBe(1)
  })

  test('options lists active employees only', async ({ request }) => {
    const { data } = await (await request.get('/api/v1/employees/options')).json()

    expect(data.employees.length).toBeGreaterThanOrEqual(SEED.employeeCount - SEED.inactiveCount)
    expect(Object.keys(data.employees[0]).sort()).toEqual(['employeeCode', 'fullName', 'id'])
  })

  test('update: unknown id is 404 and the employee may keep their own code and email', async ({ request }) => {
    const employee = await createEmployeeViaApi(request)

    const keep = await request.put(`/api/v1/employees/${employee.id}`, { data: { ...employee.payload, designation: 'Updated' } })
    expect(keep.status()).toBe(200)

    expect((await request.put('/api/v1/employees/99999999', { data: employee.payload })).status()).toBe(404)
  })

  test('bulk create is atomic: one bad row rejects the file and saves nothing', async ({ request }) => {
    const tag = uid()
    const row = (n: number, department = 'Operations') => {
      const { departmentId: _ignored, ...rest } = buildEmployee(0, {
        employeeCode: `E2E-ATOM-${tag}-${n}`,
        email: `atom.${tag.toLowerCase()}.${n}@e2e-demo.test`,
      })
      return { ...rest, departmentName: department }
    }

    const bad = await request.post('/api/v1/employees/bulk', { data: { employees: [row(1), row(2, 'Nowhere'), row(3)] } })
    expect(bad.status()).toBe(422)
    const body = await bad.json()
    expect(body.errors).toEqual([expect.stringContaining('Row 2:')])

    const none = (await (await request.get('/api/v1/employees', { params: { search: `E2E-ATOM-${tag}` } })).json()).data
    expect(none.totalCount).toBe(0)

    const good = await request.post('/api/v1/employees/bulk', { data: { employees: [row(1), row(2), row(3)] } })
    expect(good.status()).toBe(201)
    expect((await good.json()).data.count).toBe(3)
  })

  test('bulk create rejects duplicates inside the file and an empty list', async ({ request }) => {
    const tag = uid()
    const { departmentId: _ignored, ...rest } = buildEmployee(0, { employeeCode: `E2E-DUPF-${tag}`, email: `dupf.${tag.toLowerCase()}@e2e-demo.test` })
    const row = { ...rest, departmentName: 'Operations' }

    const dup = await request.post('/api/v1/employees/bulk', { data: { employees: [row, row] } })
    expect(dup.status()).toBe(422)
    expect((await dup.json()).errors.some((e: string) => e.startsWith('Row 2:'))).toBe(true)

    expect((await request.post('/api/v1/employees/bulk', { data: { employees: [] } })).status()).toBe(400)
  })

  test('bulk delete is atomic: a missing id deletes nothing', async ({ request }) => {
    const keep = await createEmployeeViaApi(request)

    const response = await request.post('/api/v1/employees/bulk-delete', { data: { ids: [keep.id, 99999999] } })

    expect(response.status()).toBe(404)
    expect((await request.get(`/api/v1/employees/${keep.id}`)).status()).toBe(200)
  })

  test('bulk delete removes the selected employees and ignores duplicate ids', async ({ request }) => {
    const a = await createEmployeeViaApi(request)
    const b = await createEmployeeViaApi(request)

    const response = await request.post('/api/v1/employees/bulk-delete', { data: { ids: [a.id, b.id, a.id] } })

    expect(response.status()).toBe(200)
    expect((await response.json()).data.count).toBe(2)
    expect((await request.get(`/api/v1/employees/${a.id}`)).status()).toBe(404)
  })
})
