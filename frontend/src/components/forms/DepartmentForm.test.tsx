import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DepartmentForm from '@/components/forms/DepartmentForm'

const setup = (props: Partial<React.ComponentProps<typeof DepartmentForm>> = {}) => {
  const onSubmit = vi.fn()
  const onCancel = vi.fn()
  render(<DepartmentForm saving={false} onSubmit={onSubmit} onCancel={onCancel} {...props} />)
  return { onSubmit, onCancel }
}

describe('DepartmentForm', () => {
  it('requires a name', async () => {
    const { onSubmit } = setup()

    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText('Department name is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a one-character name', async () => {
    setup()

    await userEvent.type(screen.getByLabelText('Name'), 'A')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText('Name must be at least 2 characters')).toBeInTheDocument()
  })

  it('submits trimmed values', async () => {
    const { onSubmit } = setup()

    await userEvent.type(screen.getByLabelText('Name'), '  Finance  ')
    await userEvent.type(screen.getByLabelText('Description'), ' Money team ')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({ name: 'Finance', description: 'Money team' })
  })

  it('is pre-filled when editing and offers an Update button', () => {
    setup({ department: { id: 1, name: 'HR', description: 'People', createdAt: '2026-01-01T00:00:00Z' } })

    expect(screen.getByLabelText('Name')).toHaveValue('HR')
    expect(screen.getByLabelText('Description')).toHaveValue('People')
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument()
  })

  it('disables submit while saving and supports cancel', async () => {
    const { onCancel } = setup({ saving: true })

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
