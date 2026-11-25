import type { AttendanceStatus } from '@/types'

export const attendanceStatuses: { value: AttendanceStatus; label: string; badge: string }[] = [
  { value: 'Present', label: 'Present', badge: 'bg-green-100 text-green-700' },
  { value: 'Late', label: 'Late', badge: 'bg-amber-100 text-amber-700' },
  { value: 'HalfDay', label: 'Half Day', badge: 'bg-sky-100 text-sky-700' },
  { value: 'Leave', label: 'Leave', badge: 'bg-violet-100 text-violet-700' },
  { value: 'Absent', label: 'Absent', badge: 'bg-red-100 text-red-700' },
]

export const statusLabel = (status: AttendanceStatus) => attendanceStatuses.find((s) => s.value === status)?.label ?? status

/** Today as yyyy-MM-dd in the user's local time zone (toISOString would give the UTC date). */
export const todayLocal = () => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
