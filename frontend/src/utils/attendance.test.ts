import { afterEach, describe, expect, it, vi } from 'vitest'
import { attendanceStatuses, statusLabel, todayLocal } from '@/utils/attendance'

describe('todayLocal', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the local calendar date as yyyy-MM-dd', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 5, 23, 59)) // local time, 5 Jan 2026

    expect(todayLocal()).toBe('2026-01-05')
  })

  it('zero-pads month and day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 3, 8, 0))

    expect(todayLocal()).toBe('2026-09-03')
  })
})

describe('attendance statuses', () => {
  it('lists all five statuses', () => {
    expect(attendanceStatuses.map((s) => s.value)).toEqual(['Present', 'Late', 'HalfDay', 'Leave', 'Absent'])
  })

  it('has a human-readable label for HalfDay', () => {
    expect(statusLabel('HalfDay')).toBe('Half Day')
  })
})
