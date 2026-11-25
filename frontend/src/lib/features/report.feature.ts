import { createAsyncThunk } from '@reduxjs/toolkit'
import { authFetch } from '@/lib/auth-fetch'
import type { EmployeeStatus, RejectError } from '@/types'

export type ReportType = 'employee-directory' | 'departments' | 'attendance' | 'salary'
export type ReportFormat = 'pdf' | 'excel'

export interface DownloadReportParams {
  report: ReportType
  format: ReportFormat
  departmentId?: number
  status?: EmployeeStatus
  from?: string
  to?: string
}

const fileNameFromHeader = (header: string | null, fallback: string) => {
  const match = header?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  return match ? decodeURIComponent(match[1]) : fallback
}

const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/**
 * Downloads a report as a file. The endpoint streams a PDF/XLSX (not JSON), so this bypasses apiRequest
 * but still goes through authFetch to get silent token refresh.
 */
export const downloadReportHandler = createAsyncThunk<string, DownloadReportParams, { rejectValue: RejectError }>(
  'reports/download',
  async ({ report, format, departmentId, status, from, to }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams({ format })
      if (departmentId) query.set('departmentId', String(departmentId))
      if (status) query.set('status', status)
      if (from) query.set('from', from)
      if (to) query.set('to', to)

      const response = await authFetch(`/api/v1/reports/${report}?${query.toString()}`)

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        return rejectWithValue({ success: false, error: result?.error ?? 'Could not generate the report.' })
      }

      const fileName = fileNameFromHeader(response.headers.get('Content-Disposition'), `${report}.${format === 'pdf' ? 'pdf' : 'xlsx'}`)
      saveBlob(await response.blob(), fileName)

      return fileName
    } catch (error) {
      return rejectWithValue({ success: false, error: error instanceof Error ? error.message : 'Something went wrong.' })
    }
  },
)
