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
  data?: T
}

export interface RejectError {
  success: boolean
  error: string
}
