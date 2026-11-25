import { createAsyncThunk } from '@reduxjs/toolkit'
import { apiRequest, toRejectError } from '@/lib/api'
import type { AttendancePatterns, DepartmentGrowth, Employee, HiringTrend, Overview, Paged, PerformanceMetrics, RejectError } from '@/types'

export interface DashboardData {
  overview: Overview
  hiring: HiringTrend
  growth: DepartmentGrowth
  attendance: AttendancePatterns
  performance: PerformanceMetrics
  recentEmployees: Employee[]
}

/** Loads everything the dashboard shows in parallel (one failed request fails the whole load). */
export const fetchDashboardHandler = createAsyncThunk<DashboardData, { today: string; from: string }, { rejectValue: RejectError }>(
  'dashboard/fetch',
  async ({ today, from }, { rejectWithValue }) => {
    try {
      const [overview, hiring, growth, attendance, performance, recent] = await Promise.all([
        apiRequest<Overview>(`/analytics/overview?today=${today}`),
        apiRequest<HiringTrend>('/analytics/hiring-trend?months=3'),
        apiRequest<DepartmentGrowth>('/analytics/department-growth?months=3'),
        apiRequest<AttendancePatterns>(`/analytics/attendance-patterns?from=${from}&to=${today}`),
        apiRequest<PerformanceMetrics>('/performance/metrics'),
        apiRequest<Paged<Employee>>('/employees?sortBy=joiningDate&descending=true&page=1&pageSize=6'),
      ])

      return {
        overview: overview.data!,
        hiring: hiring.data!,
        growth: growth.data!,
        attendance: attendance.data!,
        performance: performance.data!,
        recentEmployees: recent.data!.items,
      }
    } catch (error) {
      return rejectWithValue(toRejectError(error))
    }
  },
)
