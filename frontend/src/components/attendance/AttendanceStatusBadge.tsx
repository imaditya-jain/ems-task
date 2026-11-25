import clsx from 'clsx'
import type { AttendanceStatus } from '@/types'
import { attendanceStatuses } from '@/utils/attendance'

const AttendanceStatusBadge = ({ status }: { status: AttendanceStatus }) => {
  const config = attendanceStatuses.find((s) => s.value === status)

  return <span className={clsx('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', config?.badge)}>{config?.label ?? status}</span>
}

export default AttendanceStatusBadge
