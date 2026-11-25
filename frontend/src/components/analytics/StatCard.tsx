import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: ReactNode
  hint?: string
}

const StatCard = ({ label, value, hint }: StatCardProps) => (
  <div className="rounded-2xl border border-border bg-surface p-5">
    <p className="text-sm text-muted">{label}</p>
    <p className="mt-2 text-2xl font-semibold">{value}</p>
    {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
  </div>
)

export default StatCard
