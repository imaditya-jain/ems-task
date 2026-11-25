import { expect, type APIRequestContext, type Page } from '@playwright/test'

/**
 * Short unique suffix (8 chars) so tests can create their own records without colliding with earlier runs.
 * It must stay short: employee codes are limited to 20 characters, e.g. "E2E-ATOM-<uid>-1".
 */
export const uid = () => `${Date.now().toString(36).slice(-6)}${Math.random().toString(36).slice(2, 4)}`.toUpperCase()

export const pad = (n: number) => String(n).padStart(2, '0')

/** yyyy-MM-dd in local time, `days` before today. */
export const daysAgo = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const today = () => daysAgo(0)

export interface NewEmployee {
  employeeCode: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  gender: 'Male' | 'Female' | 'Other'
  departmentId: number
  designation: string
  joiningDate: string
  salary: number
  status: 'Active' | 'Inactive'
}

export const departmentId = async (request: APIRequestContext, name: string): Promise<number> => {
  const response = await request.get('/api/v1/departments', { params: { search: name } })
  const { data } = await response.json()
  const found = data.departments.find((d: { name: string }) => d.name === name)
  if (!found) throw new Error(`Department "${name}" not found. Is the demo data seeded?`)
  return found.id
}

/** Builds a valid employee payload with unique code/email. Pass overrides for the fields a test cares about. */
export const buildEmployee = (deptId: number, overrides: Partial<NewEmployee> = {}): NewEmployee => {
  const id = uid()
  return {
    employeeCode: `E2E-${id}`,
    firstName: 'E2E',
    lastName: `Tester${id}`,
    email: `e2e.${id.toLowerCase()}@e2e-demo.test`,
    phone: '9876543210',
    dateOfBirth: '1992-03-04',
    gender: 'Male',
    departmentId: deptId,
    designation: 'QA Automation',
    joiningDate: daysAgo(200),
    salary: 61000,
    status: 'Active',
    ...overrides,
  }
}

export const createEmployeeViaApi = async (request: APIRequestContext, overrides: Partial<NewEmployee> = {}) => {
  const payload = buildEmployee(await departmentId(request, 'Engineering'), overrides)
  const response = await request.post('/api/v1/employees', { data: payload })
  expect(response.status(), await response.text()).toBe(201)
  const { data } = await response.json()
  return { ...data.employee, payload } as { id: number; employeeCode: string; fullName: string; email: string; payload: NewEmployee }
}

/** Waits for a toast with this text (toasts can stack, so match the first). */
export const expectToast = (page: Page, text: string | RegExp) => expect(page.getByText(text).first()).toBeVisible()

export const parseRupees = (text: string) => Number(text.replace(/[^0-9.]/g, ''))
