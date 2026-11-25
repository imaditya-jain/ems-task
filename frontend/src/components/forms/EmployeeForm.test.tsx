import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import EmployeeForm from '@/components/forms/EmployeeForm'
import type { Department, Employee } from '@/types'

const departments: Department[] = [
  { id: 1, name: 'Engineering', description: null, createdAt: '2026-01-01T00:00:00Z' },
  { id: 2, name: 'HR', description: null, createdAt: '2026-01-01T00:00:00Z' },
]

const existing: Employee = {
  id: 9, employeeCode: 'EMP-009', firstName: 'Asha', lastName: 'Patil', fullName: 'Asha Patil', email: 'asha@corp.com',
  phone: '+91 98765 43210', dateOfBirth: '1995-04-12', gender: 'Female', departmentId: 2, departmentName: 'HR',
  designation: 'HR Lead', joiningDate: '2022-06-01', salary: 85000, status: 'Active', createdAt: '2026-01-01T00:00:00Z',
}

const setup = (employee?: Employee) => {
  const onSubmit = vi.fn()
  render(<EmployeeForm employee={employee} departments={departments} saving={false} onSubmit={onSubmit} onCancel={vi.fn()} />)
  return { onSubmit }
}

const fill = async (overrides: Record<string, string> = {}) => {
  const values: Record<string, string> = {
    employeeCode: 'EMP-100', firstName: 'Ravi', lastName: 'Kumar', email: 'ravi@corp.com', phone: '9876543210',
    designation: 'Developer', salary: '55000', ...overrides,
  }
  for (const [id, value] of Object.entries(values)) await userEvent.type(document.getElementById(id) as HTMLElement, value)
  fireEvent.change(document.getElementById('dateOfBirth') as HTMLElement, { target: { value: overrides.dateOfBirth ?? '1992-03-04' } })
  fireEvent.change(document.getElementById('joiningDate') as HTMLElement, { target: { value: '2023-01-02' } })
  await userEvent.selectOptions(document.getElementById('gender') as HTMLElement, 'Male')
  await userEvent.selectOptions(document.getElementById('departmentId') as HTMLElement, 'Engineering')
}

describe('EmployeeForm', () => {
  it('shows every required-field message on an empty submit, and does not submit', async () => {
    const { onSubmit } = setup()

    await userEvent.click(screen.getByRole('button', { name: 'Create Employee' }))

    for (const message of [
      'Employee code is required', 'First name is required', 'Last name is required', 'Email is required',
      'Phone is required', 'Date of birth is required', 'Gender is required', 'Designation is required',
      'Joining date is required',
    ]) {
      expect(await screen.findByText(message)).toBeInTheDocument()
    }
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects an employee under 18', async () => {
    const { onSubmit } = setup()
    const year = new Date().getFullYear() - 10

    await fill({ dateOfBirth: `${year}-01-01` })
    await userEvent.click(screen.getByRole('button', { name: 'Create Employee' }))

    expect(await screen.findByText('Employee must be at least 18 years old')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('validates employee code and phone formats', async () => {
    setup()

    await fill({ employeeCode: 'A!', phone: 'abc' })
    await userEvent.click(screen.getByRole('button', { name: 'Create Employee' }))

    expect(await screen.findByText('Use 3-20 letters, numbers or hyphens')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid phone number')).toBeInTheDocument()
  })

  it('rejects a negative salary', async () => {
    setup()

    await fill({ salary: '-5' })
    await userEvent.click(screen.getByRole('button', { name: 'Create Employee' }))

    expect(await screen.findByText('Salary cannot be negative')).toBeInTheDocument()
  })

  it('submits typed values: salary and department id are numbers', async () => {
    const { onSubmit } = setup()

    await fill()
    await userEvent.click(screen.getByRole('button', { name: 'Create Employee' }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      employeeCode: 'EMP-100', firstName: 'Ravi', email: 'ravi@corp.com', gender: 'Male',
      departmentId: 1, salary: 55000, status: 'Active', dateOfBirth: '1992-03-04', joiningDate: '2023-01-02',
    })
  })

  it('is pre-filled when editing', () => {
    setup(existing)

    expect(screen.getByLabelText('Employee Code')).toHaveValue('EMP-009')
    expect(screen.getByLabelText('Email')).toHaveValue('asha@corp.com')
    expect(screen.getByLabelText('Department')).toHaveValue('2')
    expect(screen.getByLabelText('Monthly Salary (INR)')).toHaveValue(85000)
    expect(screen.getByRole('button', { name: 'Update Employee' })).toBeInTheDocument()
  })

  it('lists every department in the dropdown', () => {
    setup()

    expect(screen.getByRole('option', { name: 'Engineering' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'HR' })).toBeInTheDocument()
  })
})
