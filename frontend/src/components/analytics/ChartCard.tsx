import type { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  description?: string
  empty?: boolean
  emptyMessage?: string
  children: ReactNode
}

/** Titled card around a chart. Charts need an explicit height, so the body is fixed at 18rem. */
const ChartCard = ({ title, description, empty = false, emptyMessage = 'No data for the selected filters.', children }: ChartCardProps) => (
  <div className="rounded-2xl border border-glass-line bg-surface p-5 shadow-card backdrop-blur-xl backdrop-saturate-150">
    <h3 className="font-semibold">{title}</h3>
    {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    <div className="mt-4 h-72">
      {empty ? <div className="flex h-full items-center justify-center text-sm text-muted">{emptyMessage}</div> : children}
    </div>
  </div>
)

export default ChartCard
