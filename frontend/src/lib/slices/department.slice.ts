import { createSlice } from '@reduxjs/toolkit'
import type { Department } from '@/types'
import {
  createDepartmentHandler,
  deleteDepartmentHandler,
  fetchDepartmentsHandler,
  updateDepartmentHandler,
} from '@/lib/features/department.feature'

interface DepartmentState {
  items: Department[]
  loading: boolean
  /** true while a create/update/delete request is in flight (disables form buttons) */
  saving: boolean
  error: string
}

const initialState: DepartmentState = {
  items: [],
  loading: false,
  saving: false,
  error: '',
}

const sortByName = (items: Department[]) => items.sort((a, b) => a.name.localeCompare(b.name))

const departmentSlice = createSlice({
  name: 'department',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDepartmentsHandler.pending, (state) => {
        state.loading = true
        state.error = ''
      })
      .addCase(fetchDepartmentsHandler.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.data?.departments ?? []
      })
      .addCase(fetchDepartmentsHandler.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload?.error ?? 'Something went wrong.'
      })

      .addCase(createDepartmentHandler.fulfilled, (state, action) => {
        const created = action.payload.data?.department
        if (created) state.items = sortByName([...state.items, created])
        state.saving = false
      })
      .addCase(updateDepartmentHandler.fulfilled, (state, action) => {
        const updated = action.payload.data?.department
        if (updated) {
          state.items = sortByName(state.items.map((d) => (d.id === updated.id ? updated : d)))
        }
        state.saving = false
      })
      .addCase(deleteDepartmentHandler.fulfilled, (state, action) => {
        state.items = state.items.filter((d) => d.id !== action.payload)
        state.saving = false
      })

      .addMatcher(
        (action) => /^departments\/(create|update|delete)\/pending$/.test(action.type),
        (state) => {
          state.saving = true
        },
      )
      .addMatcher(
        (action) => /^departments\/(create|update|delete)\/rejected$/.test(action.type),
        (state) => {
          state.saving = false
        },
      )
  },
})

export default departmentSlice.reducer
