import { describe, expect, it } from 'vitest'
import reducer, { clearSelectedEmployee } from '@/lib/slices/employee.slice'
import {
  bulkCreateEmployeesHandler,
  bulkDeleteEmployeesHandler,
  deleteEmployeeHandler,
  fetchEmployeeByIdHandler,
  fetchEmployeesHandler,
} from '@/lib/features/employee.feature'
import type { Employee } from '@/types'

const employee = (id: number): Employee => ({
  id, employeeCode: `EMP-${id}`, firstName: 'A', lastName: 'B', fullName: 'A B', email: 'a@b.com', phone: '1234567',
  dateOfBirth: '1990-01-01', gender: 'Male', departmentId: 1, departmentName: 'Eng', designation: 'Dev',
  joiningDate: '2020-01-01', salary: 1000, status: 'Active', createdAt: '2026-01-01T00:00:00Z',
})

const params = { page: 1, pageSize: 10 }
const initial = reducer(undefined, { type: 'init' })

describe('employee slice', () => {
  it('list: stores items and pagination from the server', () => {
    const state = reducer(
      initial,
      fetchEmployeesHandler.fulfilled(
        { success: true, data: { items: [employee(1), employee(2)], page: 2, pageSize: 10, totalCount: 25, totalPages: 3 } },
        'req',
        params,
      ),
    )

    expect(state.items).toHaveLength(2)
    expect(state.pagination).toEqual({ page: 2, pageSize: 10, totalCount: 25, totalPages: 3 })
    expect(state.loading).toBe(false)
  })

  it('list: pending shows loading, rejected stores the error', () => {
    expect(reducer(initial, fetchEmployeesHandler.pending('req', params)).loading).toBe(true)

    const failed = reducer(initial, fetchEmployeesHandler.rejected(null, 'req', params, { success: false, error: 'Boom' }))
    expect(failed.error).toBe('Boom')
  })

  it('detail: clears the previous employee while loading, then stores the new one', () => {
    const loaded = reducer(initial, fetchEmployeeByIdHandler.fulfilled({ success: true, data: { employee: employee(7) } }, 'req', 7))
    expect(loaded.selected?.id).toBe(7)

    const loadingAgain = reducer(loaded, fetchEmployeeByIdHandler.pending('req', 8))
    expect(loadingAgain.selected).toBeNull()
  })

  it('clearSelectedEmployee resets the detail and error', () => {
    const state = reducer({ ...initial, selected: employee(1), error: 'x' }, clearSelectedEmployee())

    expect(state.selected).toBeNull()
    expect(state.error).toBe('')
  })

  it.each([
    ['delete', deleteEmployeeHandler.pending('req', 1), deleteEmployeeHandler.fulfilled({ success: true }, 'req', 1)],
    ['bulk delete', bulkDeleteEmployeesHandler.pending('req', [1]), bulkDeleteEmployeesHandler.fulfilled({ success: true, data: { count: 1 } }, 'req', [1])],
    ['bulk create', bulkCreateEmployeesHandler.pending('req', []), bulkCreateEmployeesHandler.fulfilled({ success: true, data: { count: 1 } }, 'req', [])],
  ])('%s: saving is true while in flight and false when it finishes', (_name, pending, fulfilled) => {
    const saving = reducer(initial, pending)
    expect(saving.saving).toBe(true)
    expect(reducer(saving, fulfilled).saving).toBe(false)
  })

  it('saving is reset when a write fails', () => {
    const saving = reducer(initial, deleteEmployeeHandler.pending('req', 1))

    const failed = reducer(saving, deleteEmployeeHandler.rejected(null, 'req', 1, { success: false, error: 'x' }))

    expect(failed.saving).toBe(false)
  })
})
