import type { Overview } from '@/types'
import DashboardCard from './DashboardCard'
import ProgressRing from './ProgressRing'

const TodayRingCard = ({ overview, className }: { overview: Overview; className?: string }) => {
  const today = overview.todayAttendance
  const active = overview.activeEmployees
  const marked = Math.max(active - today.notMarked, 0)

  const legend = [
    { label: 'Late', value: today.late, dot: 'bg-[#e2a23b]' },
    { label: 'Half day', value: today.halfDay, dot: 'bg-[#5aa6d4]' },
    { label: 'Leave', value: today.leave, dot: 'bg-[#8d7fd1]' },
    { label: 'Absent', value: today.absent, dot: 'bg-[#e0675a]' },
  ]

  return (
    <DashboardCard title="Attendance marked today" to="/attendance" className={className}>
      <div className="py-2">
        <ProgressRing value={active === 0 ? 0 : marked / active}>
          <span className="text-4xl font-light tracking-tight">
            {marked}
            <span className="text-xl text-muted">/{active}</span>
          </span>
          <span className="mt-1 text-xs text-muted">Marked today</span>
        </ProgressRing>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {legend.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-muted">
              <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
              {item.label}
            </span>
            <span className="font-medium">{item.value}</span>
          </li>
        ))}
      </ul>
    </DashboardCard>
  )
}

export default TodayRingCard
