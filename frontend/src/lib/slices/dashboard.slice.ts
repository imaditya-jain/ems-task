import { createSlice } from '@reduxjs/toolkit'
import { fetchDashboardHandler, type DashboardData } from '@/lib/features/dashboard.feature'

interface DashboardState {
  data: DashboardData | null
  loading: boolean
  error: string
}

const initialState: DashboardState = { data: null, loading: false, error: '' }

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardHandler.pending, (state) => {
        state.loading = true
        state.error = ''
      })
      .addCase(fetchDashboardHandler.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload
      })
      .addCase(fetchDashboardHandler.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload?.error ?? 'Something went wrong.'
      })
  },
})

export default dashboardSlice.reducer
