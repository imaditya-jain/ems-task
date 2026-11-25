export interface User {
  id: number
  fullName: string
  email: string
  role: 'Admin' | 'HR'
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  error?: string
  errors?: string[]
  data?: T
}

export interface RejectError {
  success: boolean
  error: string
  errors?: string[]
}

export interface Department {
  id: number
  name: string
  description: string | null
  createdAt: string
}

export type Gender = 'Male' | 'Female' | 'Other'
export type EmployeeStatus = 'Active' | 'Inactive'

export interface Employee {
  id: number
  employeeCode: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  gender: Gender
  departmentId: number
  departmentName: string
  designation: string
  joiningDate: string
  salary: number
  status: EmployeeStatus
  createdAt: string
}

export interface Paged<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'HalfDay' | 'Leave'

export interface DailyAttendanceRow {
  employeeId: number
  employeeCode: string
  fullName: string
  departmentName: string
  /** null = not marked yet */
  status: AttendanceStatus | null
  notes: string | null
}

export interface AttendanceRecord {
  date: string
  status: AttendanceStatus
  notes: string | null
}

export interface AttendanceSummary {
  present: number
  absent: number
  late: number
  halfDay: number
  leave: number
  total: number
}

export interface MonthlyAttendance {
  month: string
  records: AttendanceRecord[]
  summary: AttendanceSummary
}

// ---- Analytics -------------------------------------------------------------------------------
export interface Overview {
  totalEmployees: number
  activeEmployees: number
  inactiveEmployees: number
  departments: number
  newHiresThisMonth: number
  monthlyPayroll: number
  averageSalary: number
  todayAttendance: { date: string; present: number; late: number; halfDay: number; leave: number; absent: number; notMarked: number }
}

export interface HiringTrend {
  points: { month: string; hires: number; headcount: number }[]
  totalHires: number
  averageHiresPerMonth: number
  peakMonth: string | null
}

export interface DepartmentGrowth {
  months: string[]
  departments: { department: string; headcount: number[]; current: number; change: number; growthPercent: number | null }[]
}

export interface StatusTotals {
  present: number
  late: number
  halfDay: number
  leave: number
  absent: number
  attendanceRate: number | null
}

export interface AttendancePatterns {
  from: string
  to: string
  totals: StatusTotals
  byWeekday: ({ weekday: string } & StatusTotals)[]
  daily: ({ date: string } & StatusTotals)[]
  frequentlyLateOrAbsent: { employeeCode: string; employeeName: string; department: string; late: number; absent: number }[]
}

// ---- Performance -----------------------------------------------------------------------------
export interface PerformanceReview {
  id: number
  employeeId: number
  employeeCode: string
  employeeName: string
  departmentName: string
  year: number
  quarter: number
  qualityScore: number
  productivityScore: number
  teamworkScore: number
  overallRating: number
  ratingLabel: string
  comments: string | null
  createdAt: string
}

export interface Performer {
  employeeCode: string
  employeeName: string
  department: string
  period: string
  overall: number
}

export interface PerformanceMetrics {
  summary: { reviewCount: number; averageOverall: number; averageQuality: number; averageProductivity: number; averageTeamwork: number }
  distribution: { label: string; count: number }[]
  byDepartment: { department: string; reviewCount: number; averageOverall: number }[]
  topPerformers: Performer[]
  needsImprovement: Performer[]
  trend: { period: string; averageOverall: number; reviewCount: number }[]
}

export interface EmployeeOption {
  id: number
  employeeCode: string
  fullName: string
}
