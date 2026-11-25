import { createAsyncThunk } from '@reduxjs/toolkit'
import { apiRequest, toRejectError } from '@/lib/api'
import type { ApiResponse, AttendanceStatus, DailyAttendanceRow, MonthlyAttendance, RejectError } from '@/types'

export interface DailyAttendanceParams {
  date: string
  departmentId?: number
  search?: string
}

export interface MarkAttendancePayload {
  date: string
  records: { employeeId: number; status: AttendanceStatus; notes?: string }[]
}

type RejectConfig = { rejectValue: RejectError }

export const fetchDailyAttendanceHandler = createAsyncThunk<
  ApiResponse<{ rows: DailyAttendanceRow[] }>,
  DailyAttendanceParams,
  RejectConfig
>('attendance/fetch-daily', async (params, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams({ date: params.date })
    if (params.departmentId) query.set('departmentId', String(params.departmentId))
    if (params.search) query.set('search', params.search)

    return await apiRequest<{ rows: DailyAttendanceRow[] }>(`/attendance?${query.toString()}`)
  } catch (error) {
    return rejectWithValue(toRejectError(error))
  }
})

export const markAttendanceHandler = createAsyncThunk<ApiResponse<{ count: number }>, MarkAttendancePayload, RejectConfig>(
  'attendance/mark',
  async (payload, { rejectWithValue }) => {
    try {
      return await apiRequest<{ count: number }>('/attendance', { method: 'POST', body: payload })
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)

export const fetchMonthlyAttendanceHandler = createAsyncThunk<
  ApiResponse<MonthlyAttendance>,
  { employeeId: number; month: string },
  RejectConfig
>('attendance/fetch-monthly', async ({ employeeId, month }, { rejectWithValue }) => {
  try {
    return await apiRequest<MonthlyAttendance>(`/attendance/employees/${employeeId}?month=${month}`)
  } catch (error) {
    return rejectWithValue(toRejectError(error))
  }
})
