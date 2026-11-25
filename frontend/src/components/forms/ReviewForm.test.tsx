import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ReviewForm from '@/components/forms/ReviewForm'
import type { EmployeeOption, PerformanceReview } from '@/types'

const employees: EmployeeOption[] = [
  { id: 1, employeeCode: 'EMP-001', fullName: 'Anil Test' },
  { id: 2, employeeCode: 'EMP-002', fullName: 'Bina Test' },
]

const review: PerformanceReview = {
  id: 5, employeeId: 3, employeeCode: 'EMP-003', employeeName: 'Chet Test', departmentName: 'Eng', year: 2025, quarter: 2,
  qualityScore: 4, productivityScore: 3, teamworkScore: 5, overallRating: 4, ratingLabel: 'Exceeds Expectations',
  comments: 'Good', createdAt: '2026-01-01T00:00:00Z',
}

const setup = (existing?: PerformanceReview) => {
  const onSubmit = vi.fn()
  render(<ReviewForm review={existing} employees={employees} saving={false} onSubmit={onSubmit} onCancel={vi.fn()} />)
  return { onSubmit }
}

describe('ReviewForm', () => {
  it('requires an employee and all three scores', async () => {
    const { onSubmit } = setup()

    await userEvent.click(screen.getByRole('button', { name: 'Create Review' }))

    expect(await screen.findByText('Select an employee')).toBeInTheDocument()
    expect(screen.getByText('Quality score is required')).toBeInTheDocument()
    expect(screen.getByText('Productivity score is required')).toBeInTheDocument()
    expect(screen.getByText('Teamwork score is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a year in the future', async () => {
    setup()

    await userEvent.clear(screen.getByLabelText('Year'))
    await userEvent.type(screen.getByLabelText('Year'), String(new Date().getFullYear() + 1))
    await userEvent.click(screen.getByRole('button', { name: 'Create Review' }))

    expect(await screen.findByText('Year cannot be in the future')).toBeInTheDocument()
  })

  it('submits numeric ids and scores', async () => {
    const { onSubmit } = setup()

    await userEvent.selectOptions(screen.getByLabelText('Employee'), '2')
    await userEvent.selectOptions(screen.getByLabelText('Quality'), '5')
    await userEvent.selectOptions(screen.getByLabelText('Productivity'), '4')
    await userEvent.selectOptions(screen.getByLabelText('Teamwork'), '3')
    await userEvent.click(screen.getByRole('button', { name: 'Create Review' }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ employeeId: 2, qualityScore: 5, productivityScore: 4, teamworkScore: 3 })
  })

  it('locks the employee when editing, and keeps them selectable even if not in the active list', () => {
    setup(review)

    const select = screen.getByLabelText('Employee')
    expect(select).toBeDisabled()
    expect(select).toHaveValue('3')
    expect(screen.getByRole('option', { name: 'Chet Test (EMP-003)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update Review' })).toBeInTheDocument()
  })
})
