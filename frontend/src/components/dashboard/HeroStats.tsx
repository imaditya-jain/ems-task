import clsx from 'clsx'
import type { DashboardData } from '@/lib/features/dashboard.feature'

interface StatProps {
  testId: string
  value: string | number
  label: string
  badge: string
}

const Stat = ({ testId, value, label, badge }: StatProps) => (
  <div data-testid={testId}>
    {/* On phones the badge sits under the number so neither can wrap or overflow */}
    <p className="flex flex-col items-start gap-1.5 sm:flex-row sm:gap-1.5">
      <span className="text-4xl font-light leading-none tracking-tight sm:text-5xl xl:text-6xl">{value}</span>
      <span className="whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-on-accent sm:mt-1">{badge}</span>
    </p>
    <p className="mt-2 text-xs text-muted sm:text-sm">{label}</p>
  </div>
)

/** The three big headline numbers at the top right of the dashboard. */
const HeroStats = ({ data, className }: { data: DashboardData; className?: string }) => {
  const { overview, hiring, performance } = data
  const activeShare = overview.totalEmployees === 0 ? 0 : Math.round((overview.activeEmployees / overview.totalEmployees) * 100)

  const points = hiring.points
  const change = points.length >= 2 ? points[points.length - 1].hires - points[points.length - 2].hires : 0
  const changeLabel = change > 0 ? `+${change}` : String(change)

  return (
    <div className={clsx('grid grid-cols-3 gap-4 sm:gap-8', className)}>
      <Stat testId="hero-employees" value={overview.totalEmployees} label="Employees" badge={`${activeShare}%`} />
      <Stat testId="hero-hires" value={overview.newHiresThisMonth} label="New hires this month" badge={`${changeLabel} vs last`} />
      <Stat
        testId="hero-rating"
        value={performance.summary.reviewCount === 0 ? '—' : performance.summary.averageOverall.toFixed(1)}
        label="Average rating"
        badge={`${performance.summary.reviewCount} reviews`}
      />
    </div>
  )
}

export default HeroStats
