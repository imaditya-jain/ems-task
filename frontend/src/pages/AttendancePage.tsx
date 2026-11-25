import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import Spinner from '@/components/common/Spinner'
import { fetchDepartmentsHandler } from '@/lib/features/department.feature'
import { fetchDailyAttendanceHandler, markAttendanceHandler } from '@/lib/features/attendance.feature'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { attendanceStatuses, todayLocal } from '@/utils/attendance'
import { useDebounce } from '@/utils/useDebounce'
import type { AttendanceStatus } from '@/types'

interface RowChange {
  status: AttendanceStatus | ''
  notes: string
}

const controlClass = 'h-11 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

const AttendancePage = () => {
  const dispatch = useAppDispatch()
  const departments = useAppSelector((state) => state.department.items)
  const { rows, loading, saving, error } = useAppSelector((state) => state.attendance)

  const [date, setDate] = useState(todayLocal)
  const [departmentId, setDepartmentId] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)

  // Only the rows the user touched are kept here. The value shown is `changes[id] ?? server value`,
  // so filtering/searching never loses unsaved edits.
  const [changes, setChanges] = useState<Record<number, RowChange>>({})

  const loadSheet = useCallback(() => {
    dispatch(
      fetchDailyAttendanceHandler({
        date,
        departmentId: departmentId ? Number(departmentId) : undefined,
        search: debouncedSearch.trim() || undefined,
      }),
    )
  }, [dispatch, date, departmentId, debouncedSearch])

  useEffect(() => {
    dispatch(fetchDepartmentsHandler(undefined))
  }, [dispatch])

  useEffect(() => {
    loadSheet()
  }, [loadSheet])

  const valueFor = (employeeId: number): RowChange => {
    const row = rows.find((r) => r.employeeId === employeeId)
    return changes[employeeId] ?? { status: row?.status ?? '', notes: row?.notes ?? '' }
  }

  const updateRow = (employeeId: number, patch: Partial<RowChange>) =>
    setChanges((prev) => ({ ...prev, [employeeId]: { ...valueFor(employeeId), ...patch } }))

  const markAllPresent = () =>
    setChanges((prev) => {
      const next = { ...prev }
      rows.forEach((row) => {
        next[row.employeeId] = { ...valueFor(row.employeeId), status: 'Present' }
      })
      return next
    })

  const handleDateChange = (value: string) => {
    if (!value) return
    setDate(value)
    setChanges({}) // edits belong to a specific date
  }

  const counts = useMemo(() => {
    const result: Record<string, number> = { unmarked: 0 }
    attendanceStatuses.forEach((s) => (result[s.value] = 0))

    rows.forEach((row) => {
      const status = changes[row.employeeId]?.status ?? row.status ?? ''
      result[status || 'unmarked']++
    })

    return result
  }, [rows, changes])

  const pendingRecords = Object.entries(changes)
    .filter(([, change]) => change.status !== '')
    .map(([employeeId, change]) => ({
      employeeId: Number(employeeId),
      status: change.status as AttendanceStatus,
      notes: change.notes.trim() || undefined,
    }))

  const handleSave = async () => {
    try {
      const response = await dispatch(markAttendanceHandler({ date, records: pendingRecords })).unwrap()
      toast.success(response.message)
      setChanges({})
      loadSheet()
    } catch (err) {
      toast.error((err as { error?: string }).error ?? 'Something went wrong.')
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Attendance</h1>
          <p className="mt-1 text-sm text-muted">Mark daily attendance for active employees.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={markAllPresent} disabled={rows.length === 0} className="h-10 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-page disabled:opacity-50">
            Mark all Present
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pendingRecords.length === 0 || saving}
            className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-dark disabled:opacity-60"
          >
            {saving ? 'Saving...' : `Save${pendingRecords.length > 0 ? ` (${pendingRecords.length})` : ''}`}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input type="date" value={date} max={todayLocal()} onChange={(event) => handleDateChange(event.target.value)} aria-label="Attendance date" className={controlClass} />
        <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} aria-label="Filter by department" className={controlClass}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or code..." aria-label="Search employees" className={`${controlClass} lg:col-span-2`} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-sm" aria-label="Attendance summary">
        {attendanceStatuses.map((s) => (
          <span key={s.value} className={`rounded-full px-3 py-1 font-medium ${s.badge}`}>
            {s.label}: {counts[s.value]}
          </span>
        ))}
        <span className="rounded-full bg-slate-200 px-3 py-1 font-medium text-slate-600">Not marked: {counts.unmarked}</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        {loading && rows.length === 0 ? (
          <Spinner />
        ) : error ? (
          <p className="p-6 text-sm text-red-500">{error}</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted">No active employees found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-page text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const value = valueFor(row.employeeId)

                return (
                  <tr key={row.employeeId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.fullName}</p>
                      <p className="text-muted">{row.employeeCode}</p>
                    </td>
                    <td className="px-4 py-3">{row.departmentName}</td>
                    <td className="px-4 py-3">
                      <select
                        value={value.status}
                        onChange={(event) => updateRow(row.employeeId, { status: event.target.value as AttendanceStatus | '' })}
                        aria-label={`Status for ${row.fullName}`}
                        className="h-10 w-36 rounded-lg border border-border bg-surface px-2 text-sm outline-none focus:border-primary"
                      >
                        <option value="">Not marked</option>
                        {attendanceStatuses.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={value.notes}
                        maxLength={255}
                        onChange={(event) => updateRow(row.employeeId, { notes: event.target.value })}
                        placeholder="Optional"
                        aria-label={`Notes for ${row.fullName}`}
                        className="h-10 w-full min-w-40 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

export default AttendancePage
