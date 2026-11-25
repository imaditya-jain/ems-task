import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import Modal from '@/components/common/Modal'
import Pagination from '@/components/common/Pagination'
import StatusBadge from '@/components/common/StatusBadge'

describe('Pagination', () => {
  const setup = (props: Partial<React.ComponentProps<typeof Pagination>> = {}) => {
    const onPageChange = vi.fn()
    render(<Pagination page={2} totalPages={5} totalCount={48} pageSize={10} onPageChange={onPageChange} {...props} />)
    return { onPageChange }
  }

  it('shows the visible range and the page position', () => {
    setup()

    expect(screen.getByText('Showing 11-20 of 48')).toBeInTheDocument()
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument()
  })

  it('caps the range at the total count on the last page', () => {
    setup({ page: 5 })

    expect(screen.getByText('Showing 41-48 of 48')).toBeInTheDocument()
  })

  it('renders nothing when there are no results', () => {
    const { container } = render(<Pagination page={1} totalPages={0} totalCount={0} pageSize={10} onPageChange={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('goes to the previous and next page', async () => {
    const { onPageChange } = setup()

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }))

    expect(onPageChange).toHaveBeenNthCalledWith(1, 3)
    expect(onPageChange).toHaveBeenNthCalledWith(2, 1)
  })

  it('disables Previous on the first page and Next on the last', () => {
    setup({ page: 1 })
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('disables Next on the last page', () => {
    setup({ page: 5 })

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })
})

describe('StatusBadge', () => {
  it('shows the status text', () => {
    render(<StatusBadge status="Inactive" />)

    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })
})

describe('Modal', () => {
  it('is an accessible dialog with a title', () => {
    render(
      <Modal title="Add Department" onClose={vi.fn()}>
        content
      </Modal>,
    )

    expect(screen.getByRole('dialog', { name: 'Add Department' })).toBeInTheDocument()
  })

  it('closes on Escape, on the close button and on backdrop click', async () => {
    const onClose = vi.fn()
    render(
      <Modal title="T" onClose={onClose}>
        <p>body</p>
      </Modal>,
    )

    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(2)

    await userEvent.click(screen.getByRole('dialog').parentElement as HTMLElement) // the backdrop
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('does not close when clicking inside the dialog', async () => {
    const onClose = vi.fn()
    render(
      <Modal title="T" onClose={onClose}>
        <p>body</p>
      </Modal>,
    )

    await userEvent.click(screen.getByText('body'))

    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('ConfirmDialog', () => {
  it('calls onConfirm and onCancel from the matching buttons', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<ConfirmDialog title="Delete" message="Sure?" onConfirm={onConfirm} onCancel={onCancel} />)

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('disables the confirm button while the request is running', () => {
    render(<ConfirmDialog title="Delete" message="Sure?" loading onConfirm={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Please wait...' })).toBeDisabled()
  })

  it('supports a custom confirm label', () => {
    render(<ConfirmDialog title="Delete" message="m" confirmLabel="Delete 3" onConfirm={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Delete 3' })).toBeInTheDocument()
  })
})
