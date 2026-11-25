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
