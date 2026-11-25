import type { DepartmentGrowth } from '@/types'
import DashboardCard from './DashboardCard'

const segmentColours = ['bg-accent', 'bg-primary', 'bg-sage-dark', 'bg-teal']

/** Headcount share per department: a segmented bar plus a legend. Small departments are grouped as "Others". */
const WorkforceCard = ({ growth, className }: { growth: DepartmentGrowth; className?: string }) => {
  const sorted = [...growth.departments].sort((a, b) => b.current - a.current)
  const total = sorted.reduce((sum, d) => sum + d.current, 0)

  const top = sorted.slice(0, 3).map((d) => ({ name: d.department, count: d.current }))
  const others = sorted.slice(3).reduce((sum, d) => sum + d.current, 0)
  const segments = others > 0 ? [...top, { name: 'Others', count: others }] : top

  const share = (count: number) => (total === 0 ? 0 : Math.round((count / total) * 100))

  return (
    <DashboardCard title="Workforce by department" to="/departments" className={className}>
      {total === 0 ? (
        <p className="text-sm text-muted">No employees yet.</p>
      ) : (
        <>
          <div className="flex items-end gap-1.5 text-xs text-muted" aria-hidden="true">
            {segments.map((segment) => (
              <span key={segment.name} style={{ flexGrow: segment.count }} className="min-w-0 basis-0 truncate">
                {share(segment.count)}%
              </span>
            ))}
          </div>
          <div className="mt-1.5 flex h-12 gap-1.5" role="img" aria-label="Employees per department">
            {segments.map((segment, index) => (
              <span
                key={segment.name}
                style={{ flexGrow: segment.count }}
                className={`min-w-2 basis-0 rounded-full ${segmentColours[index % segmentColours.length]}`}
              />
            ))}
          </div>

          <ul className="mt-5 divide-y divide-line text-sm">
            {segments.map((segment, index) => (
              <li key={segment.name} className="flex items-center justify-between py-2.5">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className={`h-3 w-3 shrink-0 rounded-full ${segmentColours[index % segmentColours.length]}`} />
                  <span className="truncate font-medium">{segment.name}</span>
                </span>
                <span className="text-muted">
                  {segment.count} · {share(segment.count)}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </DashboardCard>
  )
}

export default WorkforceCard
