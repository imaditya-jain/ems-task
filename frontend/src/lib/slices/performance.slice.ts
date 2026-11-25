import { createSlice } from '@reduxjs/toolkit'
import type { EmployeeOption, Paged, PerformanceMetrics, PerformanceReview } from '@/types'
import { fetchEmployeeOptionsHandler, fetchMetricsHandler, fetchReviewsHandler } from '@/lib/features/performance.feature'

interface PerformanceState {
  reviews: PerformanceReview[]
  pagination: Omit<Paged<PerformanceReview>, 'items'>
  metrics: PerformanceMetrics | null
  employeeOptions: EmployeeOption[]
  loading: boolean
  /** true while a create/update/delete request is in flight */
  saving: boolean
  error: string
}

const initialState: PerformanceState = {
  reviews: [],
  pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0 },
  metrics: null,
  employeeOptions: [],
  loading: false,
  saving: false,
  error: '',
}

const performanceSlice = createSlice({
  name: 'performance',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReviewsHandler.pending, (state) => {
        state.loading = true
        state.error = ''
      })
      .addCase(fetchReviewsHandler.fulfilled, (state, action) => {
        state.loading = false
        const data = action.payload.data
        if (data) {
          state.reviews = data.items
          state.pagination = { page: data.page, pageSize: data.pageSize, totalCount: data.totalCount, totalPages: data.totalPages }
        }
      })
      .addCase(fetchReviewsHandler.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload?.error ?? 'Something went wrong.'
      })

      .addCase(fetchMetricsHandler.fulfilled, (state, action) => {
        state.metrics = action.payload.data ?? null
      })
      .addCase(fetchEmployeeOptionsHandler.fulfilled, (state, action) => {
        state.employeeOptions = action.payload.data?.employees ?? []
      })

      .addMatcher(
        (action) => /^performance\/(create|update|delete)-review\/pending$/.test(action.type),
        (state) => {
          state.saving = true
        },
      )
      .addMatcher(
        (action) => /^performance\/(create|update|delete)-review\/(fulfilled|rejected)$/.test(action.type),
        (state) => {
          state.saving = false
        },
      )
  },
})

export default performanceSlice.reducer
