import { createAsyncThunk } from '@reduxjs/toolkit'
import { apiRequest, toRejectError } from '@/lib/api'
import type { ApiResponse, EmployeeOption, Paged, PerformanceMetrics, PerformanceReview, RejectError } from '@/types'

type RejectConfig = { rejectValue: RejectError }
type ItemResponse = ApiResponse<{ review: PerformanceReview }>

export interface ReviewPayload {
  employeeId: number
  year: number
  quarter: number
  qualityScore: number
  productivityScore: number
  teamworkScore: number
  comments?: string
}

export interface ReviewListParams {
  search?: string
  departmentId?: number
  year?: number
  quarter?: number
  page: number
  pageSize: number
}

export interface MetricsParams {
  departmentId?: number
  year?: number
  quarter?: number
}

const toQuery = (params: object) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  })
  return query.toString()
}

export const fetchReviewsHandler = createAsyncThunk<ApiResponse<Paged<PerformanceReview>>, ReviewListParams, RejectConfig>(
  'performance/fetch-reviews',
  async (params, { rejectWithValue }) => {
    try {
      return await apiRequest<Paged<PerformanceReview>>(`/performance?${toQuery(params)}`)
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)

export const fetchMetricsHandler = createAsyncThunk<ApiResponse<PerformanceMetrics>, MetricsParams, RejectConfig>(
  'performance/fetch-metrics',
  async (params, { rejectWithValue }) => {
    try {
      return await apiRequest<PerformanceMetrics>(`/performance/metrics?${toQuery(params)}`)
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)

export const fetchEmployeeOptionsHandler = createAsyncThunk<ApiResponse<{ employees: EmployeeOption[] }>, void, RejectConfig>(
  'performance/fetch-employee-options',
  async (_, { rejectWithValue }) => {
    try {
      return await apiRequest<{ employees: EmployeeOption[] }>('/employees/options')
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)

export const createReviewHandler = createAsyncThunk<ItemResponse, ReviewPayload, RejectConfig>(
  'performance/create-review',
  async (payload, { rejectWithValue }) => {
    try {
      return await apiRequest<{ review: PerformanceReview }>('/performance', { method: 'POST', body: payload })
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)

export const updateReviewHandler = createAsyncThunk<ItemResponse, { id: number; data: ReviewPayload }, RejectConfig>(
  'performance/update-review',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      return await apiRequest<{ review: PerformanceReview }>(`/performance/${id}`, { method: 'PUT', body: data })
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)

export const deleteReviewHandler = createAsyncThunk<ApiResponse, number, RejectConfig>(
  'performance/delete-review',
  async (id, { rejectWithValue }) => {
    try {
      return await apiRequest(`/performance/${id}`, { method: 'DELETE' })
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)
