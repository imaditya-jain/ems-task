import { useEffect, useState } from 'react'
import clsx from 'clsx'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ChartCard from '@/components/analytics/ChartCard'
import StatCard from '@/components/analytics/StatCard'
import Spinner from '@/components/common/Spinner'
import { fetchDepartmentsHandler } from '@/lib/features/department.feature'
import {
  fetchAttendancePatternsHandler,
  fetchDepartmentGrowthHandler,
  fetchHiringTrendHandler,
} from '@/lib/features/analytics.feature'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { todayLocal } from '@/utils/attendance'
import { attendanceColors, chartColors, formatMonthLabel, formatPercent, seriesColors } from '@/utils/chartColors'

type Tab = 'workforce' | 'attendance'

const controlClass = 'h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

const daysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const AnalyticsPage = () => {
  const dispatch = useAppDispatch()
  const departments = useAppSelector((state) => state.department.items)
  const { hiringTrend, departmentGrowth, attendancePatterns, loading, error } = useAppSelector((state) => state.analytics)

  const [tab, setTab] = useState<Tab>('workforce')
  const [months, setMonths] = useState(12)
  const [from, setFrom] = useState(() => daysAgo(29))
  const [to, setTo] = useState(todayLocal)
  const [departmentId, setDepartmentId] = useState('')

  const rangeInvalid = Boolean(from && to && from > to)

  useEffect(() => {
    dispatch(fetchDepartmentsHandler(undefined))
  }, [dispatch])

  useEffect(() => {
    dispatch(fetchHiringTrendHandler(months))
    dispatch(fetchDepartmentGrowthHandler(months))
  }, [dispatch, months])

  useEffect(() => {
    if (!from || !to || rangeInvalid) return
    dispatch(fetchAttendancePatternsHandler({ from, to, departmentId: departmentId ? Number(departmentId) : undefined }))
  }, [dispatch, from, to, departmentId, rangeInvalid])

  // Flatten the per-department series into one row per month so recharts can draw one line per department.
  const growthRows = departmentGrowth?.months.map((month, index) => ({
    month: formatMonthLabel(month),
    ...Object.fromEntries(departmentGrowth.departments.map((d) => [d.department, d.headcount[index]])),
  }))

  const tabButton = (value: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(value)}
      className={clsx('rounded-lg px-4 py-2 text-sm font-medium transition', tab === value ? 'bg-primary text-white' : 'text-muted hover:bg-page hover:text-foreground')}
    >
      {label}
    </button>
  )

  return (
    <section>
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Hiring trends, department growth and attendance patterns.</p>

      <div className="mb-6 flex gap-2 rounded-xl border border-border bg-surface p-1 sm:w-fit">
        {tabButton('workforce', 'Hiring & Growth')}
        {tabButton('attendance', 'Attendance Patterns')}
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {tab === 'workforce' && (
        <>
          <div className="mb-4 flex items-center gap-3">
            <label htmlFor="months" className="text-sm font-medium">Period</label>
            <select id="months" value={months} onChange={(e) => setMonths(Number(e.target.value))} className={controlClass}>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
              <option value={24}>Last 24 months</option>
              <option value={36}>Last 36 months</option>
            </select>
          </div>

          {!hiringTrend || !departmentGrowth ? (
            loading ? <Spinner /> : null
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Hires in period" value={hiringTrend.totalHires} />
                <StatCard label="Average hires per month" value={hiringTrend.averageHiresPerMonth} />
                <StatCard label="Busiest hiring month" value={hiringTrend.peakMonth ? formatMonthLabel(hiringTrend.peakMonth) : '—'} />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <ChartCard title="Hiring trend" description="New hires per month (bars) and total headcount (line)." empty={hiringTrend.points.length === 0}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={hiringTrend.points.map((p) => ({ ...p, month: formatMonthLabel(p.month) }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" />
                      {/* Two axes: hires per month are tiny next to total headcount, so they get their own scale */}
                      <YAxis yAxisId="hires" allowDecimals={false} />
                      <YAxis yAxisId="headcount" orientation="right" allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="hires" dataKey="hires" name="New hires" fill={chartColors.primary} radius={[6, 6, 0, 0]} />
                      <Line yAxisId="headcount" dataKey="headcount" name="Headcount" stroke={chartColors.green} strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Department growth" description="Headcount at the end of each month, by department." empty={departmentGrowth.departments.length === 0}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={growthRows}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      {departmentGrowth.departments.map((d, i) => (
                        <Line key={d.department} dataKey={d.department} stroke={seriesColors[i % seriesColors.length]} strokeWidth={2} dot={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-page text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">Department</th>
                      <th className="px-4 py-3 text-right font-medium">Headcount now</th>
                      <th className="px-4 py-3 text-right font-medium">Change in period</th>
                      <th className="px-4 py-3 text-right font-medium">Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentGrowth.departments.map((d) => (
                      <tr key={d.department} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium">{d.department}</td>
                        <td className="px-4 py-3 text-right">{d.current}</td>
                        <td className={clsx('px-4 py-3 text-right', d.change > 0 && 'text-green-600')}>{d.change > 0 ? `+${d.change}` : d.change}</td>
                        <td className="px-4 py-3 text-right">{d.growthPercent == null ? 'New' : `${d.growthPercent}%`}</td>
                      </tr>
                    ))}
                    {departmentGrowth.departments.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-6 text-muted">No employees yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'attendance' && (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} aria-label="From date" className={controlClass} />
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} aria-label="To date" className={controlClass} />
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} aria-label="Department" className={controlClass}>
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          {rangeInvalid && <p className="mb-4 text-sm text-red-500">The start date cannot be after the end date.</p>}

          {!attendancePatterns ? (
            loading ? <Spinner /> : null
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <StatCard label="Attendance rate" value={formatPercent(attendancePatterns.totals.attendanceRate)} hint="Present + Late + ½ Half Day, excluding Leave" />
                <StatCard label="Present days" value={attendancePatterns.totals.present} />
                <StatCard label="Late days" value={attendancePatterns.totals.late} />
                <StatCard label="Leave days" value={attendancePatterns.totals.leave} />
                <StatCard label="Absent days" value={attendancePatterns.totals.absent} />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <ChartCard title="Pattern by weekday" description="Which days see the most lateness or absence." empty={attendancePatterns.daily.length === 0}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendancePatterns.byWeekday.map((w) => ({ ...w, weekday: w.weekday.slice(0, 3) }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="weekday" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="present" name="Present" stackId="a" fill={attendanceColors.present} />
                      <Bar dataKey="late" name="Late" stackId="a" fill={attendanceColors.late} />
                      <Bar dataKey="halfDay" name="Half Day" stackId="a" fill={attendanceColors.halfDay} />
                      <Bar dataKey="leave" name="Leave" stackId="a" fill={attendanceColors.leave} />
                      <Bar dataKey="absent" name="Absent" stackId="a" fill={attendanceColors.absent} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Daily attendance rate" description="Share of countable days attended, per day." empty={attendancePatterns.daily.length === 0}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={attendancePatterns.daily.map((d) => ({ date: d.date.slice(5), rate: d.attendanceRate == null ? null : Math.round(d.attendanceRate * 1000) / 10 }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} unit="%" />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Line dataKey="rate" name="Attendance rate" stroke={chartColors.primary} strokeWidth={2} dot={false} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
                <div className="border-b border-border px-4 py-3 font-semibold">Most frequently late or absent</div>
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-page text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">Employee</th>
                      <th className="px-4 py-3 font-medium">Department</th>
                      <th className="px-4 py-3 text-right font-medium">Late</th>
                      <th className="px-4 py-3 text-right font-medium">Absent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendancePatterns.frequentlyLateOrAbsent.map((e) => (
                      <tr key={e.employeeCode} className="border-b border-border last:border-0">
                        <td className="px-4 py-3"><p className="font-medium">{e.employeeName}</p><p className="text-muted">{e.employeeCode}</p></td>
                        <td className="px-4 py-3">{e.department}</td>
                        <td className="px-4 py-3 text-right">{e.late}</td>
                        <td className="px-4 py-3 text-right">{e.absent}</td>
                      </tr>
                    ))}
                    {attendancePatterns.frequentlyLateOrAbsent.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-6 text-muted">No late or absent days in this period.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}

export default AnalyticsPage
