import { useEffect, useState } from 'react'
import Spinner from '@/components/common/Spinner'
import AttendanceStatusBadge from '@/components/attendance/AttendanceStatusBadge'
import { fetchMonthlyAttendanceHandler } from '@/lib/features/attendance.feature'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { formatDate } from '@/utils/format'
import { todayLocal } from '@/utils/attendance'

const SummaryTile = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl border border-border px-4 py-3">
    <p className="text-xs text-muted">{label}</p>
    <p className="text-xl font-semibold">{value}</p>
  </div>
)

/** Month picker + summary + day list for one employee. Used on the employee detail page. */
const AttendanceHistory = ({ employeeId }: { employeeId: number }) => {
  const dispatch = useAppDispatch()
  const { monthly, loading, error } = useAppSelector((state) => state.attendance)
  const [month, setMonth] = useState(todayLocal().slice(0, 7))

  useEffect(() => {
    if (month) dispatch(fetchMonthlyAttendanceHandler({ employeeId, month }))
  }, [dispatch, employeeId, month])

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Attendance</h2>
        <input
          type="month"
          value={month}
          max={todayLocal().slice(0, 7)}
          onChange={(event) => setMonth(event.target.value)}
          aria-label="Attendance month"
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : loading || !monthly ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <SummaryTile label="Present" value={monthly.summary.present} />
            <SummaryTile label="Late" value={monthly.summary.late} />
            <SummaryTile label="Half Day" value={monthly.summary.halfDay} />
            <SummaryTile label="Leave" value={monthly.summary.leave} />
            <SummaryTile label="Absent" value={monthly.summary.absent} />
          </div>

          {monthly.records.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No attendance recorded for this month.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-muted">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.records.map((record) => (
                    <tr key={record.date} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4">{formatDate(record.date)}</td>
                      <td className="py-2 pr-4">
                        <AttendanceStatusBadge status={record.status} />
                      </td>
                      <td className="py-2 text-muted">{record.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AttendanceHistory
