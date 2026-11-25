import { describe, expect, it } from 'vitest'
import reducer from '@/lib/slices/department.slice'
import {
  createDepartmentHandler,
  deleteDepartmentHandler,
  fetchDepartmentsHandler,
  updateDepartmentHandler,
} from '@/lib/features/department.feature'
import type { Department } from '@/types'

const dept = (id: number, name: string): Department => ({ id, name, description: null, createdAt: '2026-01-01T00:00:00Z' })
const initial = reducer(undefined, { type: 'init' })
const withItems = reducer(initial, fetchDepartmentsHandler.fulfilled({ success: true, data: { departments: [dept(1, 'Engineering'), dept(2, 'Sales')] } }, 'req', undefined))

describe('department slice', () => {
  it('fetch: pending sets loading, fulfilled stores the list', () => {
    expect(reducer(initial, fetchDepartmentsHandler.pending('req', undefined)).loading).toBe(true)
    expect(withItems.items.map((d) => d.name)).toEqual(['Engineering', 'Sales'])
    expect(withItems.loading).toBe(false)
  })

  it('fetch: rejected stores the error', () => {
    const state = reducer(initial, fetchDepartmentsHandler.rejected(null, 'req', undefined, { success: false, error: 'Nope' }))

    expect(state.error).toBe('Nope')
    expect(state.loading).toBe(false)
  })

  it('create: inserts the new department and keeps the list sorted by name', () => {
    const state = reducer(withItems, createDepartmentHandler.fulfilled({ success: true, data: { department: dept(3, 'Finance') } }, 'req', { name: 'Finance' }))

    expect(state.items.map((d) => d.name)).toEqual(['Engineering', 'Finance', 'Sales'])
  })

  it('update: replaces the department in place and re-sorts', () => {
    const state = reducer(
      withItems,
      updateDepartmentHandler.fulfilled({ success: true, data: { department: dept(1, 'Zeta') } }, 'req', { id: 1, data: { name: 'Zeta' } }),
    )

    expect(state.items.map((d) => d.name)).toEqual(['Sales', 'Zeta'])
  })

  it('delete: removes the department by id', () => {
    const state = reducer(withItems, deleteDepartmentHandler.fulfilled(1, 'req', 1))

    expect(state.items.map((d) => d.id)).toEqual([2])
  })

  it('saving flag follows create/update/delete lifecycle', () => {
    const saving = reducer(withItems, createDepartmentHandler.pending('req', { name: 'X1' }))
    expect(saving.saving).toBe(true)

    const failed = reducer(saving, createDepartmentHandler.rejected(null, 'req', { name: 'X1' }, { success: false, error: 'dup' }))
    expect(failed.saving).toBe(false)

    const deleting = reducer(withItems, deleteDepartmentHandler.pending('req', 1))
    expect(deleting.saving).toBe(true)
  })
})
