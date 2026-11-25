import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BulkImportModal from '@/components/employees/BulkImportModal'
import { jsonResponse, renderWithProviders } from '@/test/utils'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const HEADER = 'employeeCode,firstName,lastName,email,phone,dateOfBirth,gender,departmentName,designation,joiningDate,salary,status'
const ROW = 'EMP-1,Asha,Patil,asha@corp.com,9876543210,1995-04-12,Female,Engineering,Dev,2022-06-01,50000,Active'

const csv = (content: string) => new File([content], 'employees.csv', { type: 'text/csv' })

describe('BulkImportModal', () => {
  const fetchMock = vi.fn<typeof fetch>()
  const onImported = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    onImported.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  const setup = () => renderWithProviders(<BulkImportModal onClose={vi.fn()} onImported={onImported} />)

  it('keeps Import disabled until a valid file is chosen', () => {
    setup()

    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled()
  })

  it('reads the file and shows how many employees are ready', async () => {
    setup()

    await userEvent.upload(screen.getByLabelText('CSV file'), csv(`${HEADER}\n${ROW}\n${ROW.replace('EMP-1', 'EMP-2')}\n`))

    expect(await screen.findByText(/2 employees ready to import/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled()
  })

  it('reports missing columns', async () => {
    setup()

    await userEvent.upload(screen.getByLabelText('CSV file'), csv('employeeCode,firstName\nEMP-1,Asha\n'))

    expect(await screen.findByText(/Missing column\(s\): .*lastName/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled()
  })

  it('reports a file without employee rows', async () => {
    setup()

    await userEvent.upload(screen.getByLabelText('CSV file'), csv(`${HEADER}\n`))

    expect(await screen.findByText('The file has no employee rows.')).toBeInTheDocument()
  })

  it('rejects files with more than 200 rows', async () => {
    setup()
    const rows = Array.from({ length: 201 }, (_, i) => ROW.replace('EMP-1', `EMP-${i}`)).join('\n')

    await userEvent.upload(screen.getByLabelText('CSV file'), csv(`${HEADER}\n${rows}`))

    expect(await screen.findByText('You can import at most 200 employees at a time.')).toBeInTheDocument()
  })

  it('sends the parsed rows (salary as a number, status defaulting to Active) and reports success', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, message: '1 employees imported successfully.', data: { count: 1 } }, 201))
    setup()

    await userEvent.upload(screen.getByLabelText('CSV file'), csv(`${HEADER.replace(',status', '')}\n${ROW.replace(',Active', '')}\n`))
    await userEvent.click(await screen.findByRole('button', { name: 'Import' }))

    await vi.waitFor(() => expect(onImported).toHaveBeenCalled())
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
    expect(body.employees[0]).toMatchObject({ employeeCode: 'EMP-1', salary: 50000, status: 'Active', departmentName: 'Engineering' })
  })

  it('lists every server-side row error when the import is rejected', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: false, error: 'Import failed', errors: ['Row 1: Department x does not exist.', 'Row 2: Email is already in use.'] }, 422),
    )
    setup()

    await userEvent.upload(screen.getByLabelText('CSV file'), csv(`${HEADER}\n${ROW}\n`))
    await userEvent.click(await screen.findByRole('button', { name: 'Import' }))

    expect(await screen.findByText('Row 1: Department x does not exist.')).toBeInTheDocument()
    expect(screen.getByText('Row 2: Email is already in use.')).toBeInTheDocument()
    expect(onImported).not.toHaveBeenCalled()
  })
})
