import { createAsyncThunk } from '@reduxjs/toolkit'
import { apiRequest, toRejectError } from '@/lib/api'
import type { ApiResponse, Department, RejectError } from '@/types'

export interface DepartmentPayload {
  name: string
  description?: string
}

type ListResponse = ApiResponse<{ departments: Department[] }>
type ItemResponse = ApiResponse<{ department: Department }>

export const fetchDepartmentsHandler = createAsyncThunk<ListResponse, string | undefined, { rejectValue: RejectError }>(
  'departments/fetch-all',
  async (search, { rejectWithValue }) => {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : ''
      return await apiRequest<{ departments: Department[] }>(`/departments${query}`)
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)

export const createDepartmentHandler = createAsyncThunk<ItemResponse, DepartmentPayload, { rejectValue: RejectError }>(
  'departments/create',
  async (payload, { rejectWithValue }) => {
    try {
      return await apiRequest<{ department: Department }>('/departments', { method: 'POST', body: payload })
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)

export const updateDepartmentHandler = createAsyncThunk<
  ItemResponse,
  { id: number; data: DepartmentPayload },
  { rejectValue: RejectError }
>('departments/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    return await apiRequest<{ department: Department }>(`/departments/${id}`, { method: 'PUT', body: data })
  } catch (error) {
    return rejectWithValue(toRejectError(error))
  }
})

export const deleteDepartmentHandler = createAsyncThunk<number, number, { rejectValue: RejectError }>(
  'departments/delete',
  async (id, { rejectWithValue }) => {
    try {
      await apiRequest(`/departments/${id}`, { method: 'DELETE' })
      return id
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)
