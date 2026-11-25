import { createSlice } from '@reduxjs/toolkit'
import type { Employee, Paged } from '@/types'
import { fetchEmployeeByIdHandler, fetchEmployeesHandler } from '@/lib/features/employee.feature'

interface EmployeeState {
  items: Employee[]
  pagination: Omit<Paged<Employee>, 'items'>
  /** the employee shown on the detail / edit pages */
  selected: Employee | null
  loading: boolean
  /** true while a create/update/delete/import request is in flight */
  saving: boolean
  error: string
}

const initialState: EmployeeState = {
  items: [],
  pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0 },
  selected: null,
  loading: false,
  saving: false,
  error: '',
}

const employeeSlice = createSlice({
  name: 'employee',
  initialState,
  reducers: {
    clearSelectedEmployee: (state) => {
      state.selected = null
      state.error = ''
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployeesHandler.pending, (state) => {
        state.loading = true
        state.error = ''
      })
      .addCase(fetchEmployeesHandler.fulfilled, (state, action) => {
        state.loading = false
        const data = action.payload.data
        if (data) {
          state.items = data.items
          state.pagination = { page: data.page, pageSize: data.pageSize, totalCount: data.totalCount, totalPages: data.totalPages }
        }
      })
      .addCase(fetchEmployeesHandler.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload?.error ?? 'Something went wrong.'
      })

      .addCase(fetchEmployeeByIdHandler.pending, (state) => {
        state.loading = true
        state.error = ''
        state.selected = null
      })
      .addCase(fetchEmployeeByIdHandler.fulfilled, (state, action) => {
        state.loading = false
        state.selected = action.payload.data?.employee ?? null
      })
      .addCase(fetchEmployeeByIdHandler.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload?.error ?? 'Something went wrong.'
      })

      // Lists are re-fetched by the page after a write, so the server stays the source of truth for paging/sorting.
      .addMatcher(
        (action) => /^employees\/(create|update|delete|bulk-delete|bulk-create)\/pending$/.test(action.type),
        (state) => {
          state.saving = true
        },
      )
      .addMatcher(
        (action) => /^employees\/(create|update|delete|bulk-delete|bulk-create)\/(fulfilled|rejected)$/.test(action.type),
        (state) => {
          state.saving = false
        },
      )
  },
})


export const { clearSelectedEmployee } = employeeSlice.actions
export default employeeSlice.reducer
