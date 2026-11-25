import { createAsyncThunk } from '@reduxjs/toolkit'
import { apiRequest, toRejectError } from '@/lib/api'
import type { ApiResponse, AttendancePatterns, DepartmentGrowth, HiringTrend, Overview, RejectError } from '@/types'

type RejectConfig = { rejectValue: RejectError }

export const fetchOverviewHandler = createAsyncThunk<ApiResponse<Overview>, string, RejectConfig>(
  'analytics/overview',
  async (today, { rejectWithValue }) => {
    try {
      return await apiRequest<Overview>(`/analytics/overview?today=${today}`)
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)

export const fetchHiringTrendHandler = createAsyncThunk<ApiResponse<HiringTrend>, number, RejectConfig>(
  'analytics/hiring-trend',
  async (months, { rejectWithValue }) => {
    try {
      return await apiRequest<HiringTrend>(`/analytics/hiring-trend?months=${months}`)
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)

export const fetchDepartmentGrowthHandler = createAsyncThunk<ApiResponse<DepartmentGrowth>, number, RejectConfig>(
  'analytics/department-growth',
  async (months, { rejectWithValue }) => {
    try {
      return await apiRequest<DepartmentGrowth>(`/analytics/department-growth?months=${months}`)
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)

export interface AttendancePatternParams {
  from: string
  to: string
  departmentId?: number
}

export const fetchAttendancePatternsHandler = createAsyncThunk<ApiResponse<AttendancePatterns>, AttendancePatternParams, RejectConfig>(
  'analytics/attendance-patterns',
  async ({ from, to, departmentId }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams({ from, to })
      if (departmentId) query.set('departmentId', String(departmentId))
      return await apiRequest<AttendancePatterns>(`/analytics/attendance-patterns?${query.toString()}`)
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)
