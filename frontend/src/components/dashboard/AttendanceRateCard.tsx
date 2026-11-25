import type { AttendancePatterns } from '@/types'
import { formatDate } from '@/utils/format'
import DashboardCard from './DashboardCard'
import DotMatrixChart from './DotMatrixChart'

const AttendanceRateCard = ({ attendance, className }: { attendance: AttendancePatterns; className?: string }) => {
  const rate = attendance.totals.attendanceRate
  const values = attendance.daily.slice(-30).map((day) => day.attendanceRate)

  return (
    <DashboardCard title="Attendance rate" to="/analytics" className={`flex flex-col ${className ?? ''}`}>
      <p className="text-5xl font-light tracking-tight sm:text-6xl">{rate == null ? '—' : `${Math.round(rate * 100)}%`}</p>
      <p className="mt-1 text-xs text-muted">Last 30 days, all departments</p>

      <div className="mt-5 flex-1">
        {values.length === 0 ? (
          <p className="text-sm text-muted">No attendance has been recorded yet.</p>
        ) : (
          <DotMatrixChart values={values} rows={12} label={`Daily attendance rate from ${attendance.from} to ${attendance.to}`} />
        )}
      </div>

      <div className="mt-3 flex justify-between text-xs text-muted">
        <span>{formatDate(attendance.from)}</span>
        <span>{formatDate(attendance.to)}</span>
      </div>
    </DashboardCard>
  )
}

export default AttendanceRateCard
