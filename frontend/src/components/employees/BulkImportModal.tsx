import { useState, type ChangeEvent } from 'react'
import { toast } from 'react-toastify'
import Modal from '@/components/common/Modal'
import { bulkCreateEmployeesHandler, type BulkEmployeeRow } from '@/lib/features/employee.feature'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { downloadTextFile, parseCsv } from '@/utils/csv'
import type { EmployeeStatus, Gender } from '@/types'

const COLUMNS = [
  'employeeCode',
  'firstName',
  'lastName',
  'email',
  'phone',
  'dateOfBirth',
  'gender',
  'departmentName',
  'designation',
  'joiningDate',
  'salary',
  'status',
] as const

const MAX_ROWS = 200
const TEMPLATE = `${COLUMNS.join(',')}\nEMP-1001,Asha,Patil,asha@company.com,+91 98765 43210,1995-04-12,Female,Engineering,Software Engineer,2022-06-01,85000,Active\n`

interface BulkImportModalProps {
  onClose: () => void
  onImported: () => void
}

/** Turns the CSV text into API rows. Returns an error message if the file layout is wrong. */
const toRows = (text: string): { rows: BulkEmployeeRow[] } | { error: string } => {
  const [header, ...lines] = parseCsv(text)
  if (!header) return { error: 'The file is empty.' }

  const index = new Map(header.map((name, i) => [name.toLowerCase(), i]))
  const missing = COLUMNS.filter((column) => column !== 'status' && !index.has(column.toLowerCase()))
  if (missing.length > 0) return { error: `Missing column(s): ${missing.join(', ')}` }
  if (lines.length === 0) return { error: 'The file has no employee rows.' }
  if (lines.length > MAX_ROWS) return { error: `You can import at most ${MAX_ROWS} employees at a time.` }

  const rows = lines.map((cells) => {
    const get = (column: (typeof COLUMNS)[number]) => cells[index.get(column.toLowerCase()) ?? -1] ?? ''

    return {
      employeeCode: get('employeeCode'),
      firstName: get('firstName'),
      lastName: get('lastName'),
      email: get('email'),
      phone: get('phone'),
      dateOfBirth: get('dateOfBirth'),
      gender: get('gender') as Gender,
      departmentName: get('departmentName'),
      designation: get('designation'),
      joiningDate: get('joiningDate'),
      salary: Number(get('salary')),
      status: (get('status') || 'Active') as EmployeeStatus,
    }
  })

  return { rows }
}

const BulkImportModal = ({ onClose, onImported }: BulkImportModalProps) => {
  const dispatch = useAppDispatch()
  const saving = useAppSelector((state) => state.employee.saving)

  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<BulkEmployeeRow[]>([])
  const [fileError, setFileError] = useState('')
  const [serverErrors, setServerErrors] = useState<string[]>([])

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setRows([])
    setFileError('')
    setServerErrors([])
    if (!file) return

    setFileName(file.name)
    const result = toRows(await file.text())

    if ('error' in result) setFileError(result.error)
    else setRows(result.rows)
  }

  const handleImport = async () => {
    setServerErrors([])

    try {
      const response = await dispatch(bulkCreateEmployeesHandler(rows)).unwrap()
      toast.success(response.message)
      onImported()
    } catch (err) {
      const { error, errors } = err as { error?: string; errors?: string[] }
      setServerErrors(errors?.length ? errors : [error ?? 'Something went wrong.'])
    }
  }

  return (
    <Modal title="Import Employees" onClose={onClose}>
      <p className="text-sm text-muted">
        Upload a CSV file with one employee per row (max {MAX_ROWS}). The whole file is rejected if any row has a problem, so nothing is partially imported.
      </p>
      <button type="button" onClick={() => downloadTextFile('employees-template.csv', TEMPLATE)} className="mt-2 text-sm font-medium text-primary hover:underline">
        Download CSV template
      </button>

      <input
        type="file"
        accept=".csv,text/csv"
        onChange={handleFile}
        aria-label="CSV file"
        className="mt-4 block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary"
      />

      {fileError && <p className="mt-3 text-sm text-red-500">{fileError}</p>}

      {rows.length > 0 && (
        <p className="mt-3 text-sm">
          <span className="font-medium">{fileName}</span>: {rows.length} employee{rows.length > 1 ? 's' : ''} ready to import.
        </p>
      )}

      {serverErrors.length > 0 && (
        <ul className="mt-3 max-h-48 list-disc space-y-1 overflow-y-auto rounded-lg bg-red-50 p-3 pl-7 text-sm text-red-600">
          {serverErrors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-page">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleImport}
          disabled={rows.length === 0 || saving}
          className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {saving ? 'Importing...' : 'Import'}
        </button>
      </div>
    </Modal>
  )
}

export default BulkImportModal
