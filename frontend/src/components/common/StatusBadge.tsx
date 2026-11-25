import clsx from 'clsx'
import type { EmployeeStatus } from '@/types'

const StatusBadge = ({ status }: { status: EmployeeStatus }) => (
  <span
    className={clsx(
      'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
      status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600',
    )}
  >
    {status}
  </span>
)

export default StatusBadge
