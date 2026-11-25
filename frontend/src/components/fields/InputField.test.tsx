import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import InputField from '@/components/fields/InputField'

const Harness = ({ type = 'text', error }: { type?: string; error?: string }) => {
  const { register } = useForm<{ field: string }>()
  return (
    <InputField
      label="Field"
      name="field"
      type={type}
      register={register}
      errors={error ? { field: { type: 'required', message: error } } : undefined}
    />
  )
}

describe('InputField', () => {
  it('associates the label with the input', () => {
    render(<Harness />)

    expect(screen.getByLabelText('Field')).toBeInTheDocument()
  })

  it('shows the validation message and marks the input invalid', () => {
    render(<Harness error="Field is required" />)

    expect(screen.getByText('Field is required')).toBeInTheDocument()
    expect(screen.getByLabelText('Field')).toHaveAttribute('aria-invalid', 'true')
  })

  it('lets the user reveal and hide a password', async () => {
    render(<Harness type="password" />)
    const input = screen.getByLabelText('Field')
    expect(input).toHaveAttribute('type', 'password')

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')

    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('has no show/hide button for normal fields', () => {
    render(<Harness />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
