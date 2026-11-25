import { createAsyncThunk } from '@reduxjs/toolkit'
import { apiRequest, toRejectError } from '@/lib/api'
import type { ApiResponse, Employee, EmployeeStatus, Gender, Paged, RejectError } from '@/types'

export interface EmployeePayload {
  employeeCode: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  gender: Gender
  departmentId: number
  designation: string
  joiningDate: string
  salary: number
  status: EmployeeStatus
}

/** One row of a bulk import: department is referenced by name. */
export type BulkEmployeeRow = Omit<EmployeePayload, 'departmentId'> & { departmentName: string }

export interface EmployeeListParams {
  search?: string
  departmentId?: number
  status?: EmployeeStatus
  sortBy?: string
  descending?: boolean
  page: number
  pageSize: number
}

type RejectConfig = { rejectValue: RejectError }
type ItemResponse = ApiResponse<{ employee: Employee }>
type CountResponse = ApiResponse<{ count: number }>

const buildQuery = (params: EmployeeListParams) => {
  const query = new URLSearchParams()
  query.set('page', String(params.page))
  query.set('pageSize', String(params.pageSize))
  if (params.search) query.set('search', params.search)
  if (params.departmentId) query.set('departmentId', String(params.departmentId))
  if (params.status) query.set('status', params.status)
  if (params.sortBy) {
    query.set('sortBy', params.sortBy)
    query.set('descending', String(Boolean(params.descending)))
  }
  return query.toString()
}

export const fetchEmployeesHandler = createAsyncThunk<ApiResponse<Paged<Employee>>, EmployeeListParams, RejectConfig>(
  'employees/fetch-all',
  async (params, { rejectWithValue }) => {
    try {
      return await apiRequest<Paged<Employee>>(`/employees?${buildQuery(params)}`)
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)

export const fetchEmployeeByIdHandler = createAsyncThunk<ItemResponse, number, RejectConfig>(
  'employees/fetch-one',
  async (id, { rejectWithValue }) => {
    try {
      return await apiRequest<{ employee: Employee }>(`/employees/${id}`)
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)

export const createEmployeeHandler = createAsyncThunk<ItemResponse, EmployeePayload, RejectConfig>(
  'employees/create',
  async (payload, { rejectWithValue }) => {
    try {
      return await apiRequest<{ employee: Employee }>('/employees', { method: 'POST', body: payload })
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)

export const updateEmployeeHandler = createAsyncThunk<ItemResponse, { id: number; data: EmployeePayload }, RejectConfig>(
  'employees/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      return await apiRequest<{ employee: Employee }>(`/employees/${id}`, { method: 'PUT', body: data })
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)

export const deleteEmployeeHandler = createAsyncThunk<ApiResponse, number, RejectConfig>(
  'employees/delete',
  async (id, { rejectWithValue }) => {
    try {
      return await apiRequest(`/employees/${id}`, { method: 'DELETE' })
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)

export const bulkDeleteEmployeesHandler = createAsyncThunk<CountResponse, number[], RejectConfig>(
  'employees/bulk-delete',
  async (ids, { rejectWithValue }) => {
    try {
      return await apiRequest<{ count: number }>('/employees/bulk-delete', { method: 'POST', body: { ids } })
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)

export const bulkCreateEmployeesHandler = createAsyncThunk<CountResponse, BulkEmployeeRow[], RejectConfig>(
  'employees/bulk-create',
  async (employees, { rejectWithValue }) => {
    try {
      return await apiRequest<{ count: number }>('/employees/bulk', { method: 'POST', body: { employees } })
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)
