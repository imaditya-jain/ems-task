import { IoPeopleOutline, IoMoonOutline } from 'react-icons/io5'
import type { Overview } from '@/types'
import DashboardCard from './DashboardCard'

const percent = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100))

/** Two stacked cards: how many people are at work today, and how many are away. */
const PresenceCards = ({ overview, className }: { overview: Overview; className?: string }) => {
  const today = overview.todayAttendance
  const present = today.present + today.late + today.halfDay
  const away = today.leave + today.absent
  const active = overview.activeEmployees

  return (
    <div className={`flex flex-col gap-4 ${className ?? ''}`}>
      <DashboardCard title="At work today" tone="sage" className="flex-1">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-glass">
          <IoPeopleOutline className="text-lg" />
        </div>
        <p className="flex items-end gap-2">
          <span className="text-5xl font-light leading-none tracking-tight">{percent(present, active)}%</span>
          <span className="mb-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-on-accent">{present} people</span>
        </p>
      </DashboardCard>

      <DashboardCard title="Away today" className="flex-1">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary">
          <IoMoonOutline className="text-lg" />
        </div>
        <p className="flex items-end gap-2">
          <span className="text-5xl font-light leading-none tracking-tight">{percent(away, active)}%</span>
          <span className="mb-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-on-accent">{away} people</span>
        </p>
        <p className="mt-2 text-xs text-muted">
          {today.leave} on leave · {today.absent} absent
        </p>
      </DashboardCard>
    </div>
  )
}

export default PresenceCards
