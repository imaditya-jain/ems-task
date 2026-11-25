import { createSlice } from '@reduxjs/toolkit'
import type { DailyAttendanceRow, MonthlyAttendance } from '@/types'
import {
  fetchDailyAttendanceHandler,
  fetchMonthlyAttendanceHandler,
  markAttendanceHandler,
} from '@/lib/features/attendance.feature'

interface AttendanceState {
  rows: DailyAttendanceRow[]
  monthly: MonthlyAttendance | null
  loading: boolean
  saving: boolean
  error: string
}

const initialState: AttendanceState = {
  rows: [],
  monthly: null,
  loading: false,
  saving: false,
  error: '',
}

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDailyAttendanceHandler.pending, (state) => {
        state.loading = true
        state.error = ''
      })
      .addCase(fetchDailyAttendanceHandler.fulfilled, (state, action) => {
        state.loading = false
        state.rows = action.payload.data?.rows ?? []
      })
      .addCase(fetchDailyAttendanceHandler.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload?.error ?? 'Something went wrong.'
      })

      .addCase(fetchMonthlyAttendanceHandler.pending, (state) => {
        state.loading = true
        state.error = ''
      })
      .addCase(fetchMonthlyAttendanceHandler.fulfilled, (state, action) => {
        state.loading = false
        state.monthly = action.payload.data ?? null
      })
      .addCase(fetchMonthlyAttendanceHandler.rejected, (state, action) => {
        state.loading = false
        state.monthly = null
        state.error = action.payload?.error ?? 'Something went wrong.'
      })

      .addCase(markAttendanceHandler.pending, (state) => {
        state.saving = true
      })
      .addCase(markAttendanceHandler.fulfilled, (state) => {
        state.saving = false
      })
      .addCase(markAttendanceHandler.rejected, (state) => {
        state.saving = false
      })
  },
})

export default attendanceSlice.reducer
