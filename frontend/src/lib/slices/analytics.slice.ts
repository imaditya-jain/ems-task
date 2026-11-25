import { createSlice } from '@reduxjs/toolkit'
import type { AttendancePatterns, DepartmentGrowth, HiringTrend, Overview } from '@/types'
import {
  fetchAttendancePatternsHandler,
  fetchDepartmentGrowthHandler,
  fetchHiringTrendHandler,
  fetchOverviewHandler,
} from '@/lib/features/analytics.feature'

interface AnalyticsState {
  overview: Overview | null
  hiringTrend: HiringTrend | null
  departmentGrowth: DepartmentGrowth | null
  attendancePatterns: AttendancePatterns | null
  loading: boolean
  error: string
}

const initialState: AnalyticsState = {
  overview: null,
  hiringTrend: null,
  departmentGrowth: null,
  attendancePatterns: null,
  loading: false,
  error: '',
}

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOverviewHandler.fulfilled, (state, action) => {
        state.overview = action.payload.data ?? null
      })
      .addCase(fetchHiringTrendHandler.fulfilled, (state, action) => {
        state.hiringTrend = action.payload.data ?? null
      })
      .addCase(fetchDepartmentGrowthHandler.fulfilled, (state, action) => {
        state.departmentGrowth = action.payload.data ?? null
      })
      .addCase(fetchAttendancePatternsHandler.fulfilled, (state, action) => {
        state.attendancePatterns = action.payload.data ?? null
      })
      .addMatcher(
        (action) => /^analytics\/.+\/pending$/.test(action.type),
        (state) => {
          state.loading = true
          state.error = ''
        },
      )
      .addMatcher(
        (action) => /^analytics\/.+\/fulfilled$/.test(action.type),
        (state) => {
          state.loading = false
        },
      )
      .addMatcher(
        (action) => /^analytics\/.+\/rejected$/.test(action.type),
        (state, action) => {
          state.loading = false
          state.error = (action as { payload?: { error?: string } }).payload?.error ?? 'Something went wrong.'
        },
      )
  },
})

export default analyticsSlice.reducer
