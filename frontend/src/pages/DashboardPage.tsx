import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartCard from '@/components/analytics/ChartCard'
import StatCard from '@/components/analytics/StatCard'
import Spinner from '@/components/common/Spinner'
import { fetchOverviewHandler } from '@/lib/features/analytics.feature'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { todayLocal } from '@/utils/attendance'
import { attendanceColors, chartColors } from '@/utils/chartColors'
import { formatCurrency } from '@/utils/format'

const DashboardPage = () => {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const { overview, loading, error } = useAppSelector((state) => state.analytics)

  useEffect(() => {
    dispatch(fetchOverviewHandler(todayLocal()))
  }, [dispatch])

  if (error && !overview) return <p className="text-sm text-red-500">{error}</p>
  if (!overview) return loading ? <Spinner /> : null

  const today = overview.todayAttendance
  const attendanceData = [
    { name: 'Present', value: today.present, color: attendanceColors.present },
    { name: 'Late', value: today.late, color: attendanceColors.late },
    { name: 'Half Day', value: today.halfDay, color: attendanceColors.halfDay },
    { name: 'Leave', value: today.leave, color: attendanceColors.leave },
    { name: 'Absent', value: today.absent, color: attendanceColors.absent },
    { name: 'Not marked', value: today.notMarked, color: chartColors.slate },
  ]

  return (
    <section>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Welcome back, {user?.fullName}.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total employees" value={overview.totalEmployees} hint={`${overview.activeEmployees} active · ${overview.inactiveEmployees} inactive`} />
        <StatCard label="Departments" value={overview.departments} />
        <StatCard label="New hires this month" value={overview.newHiresThisMonth} />
        <StatCard label="Monthly payroll" value={formatCurrency(overview.monthlyPayroll)} hint={`Average ${formatCurrency(overview.averageSalary)} per active employee`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard title="Today's attendance" description={`${today.notMarked} active employee${today.notMarked === 1 ? '' : 's'} not marked yet`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Employees" radius={[6, 6, 0, 0]}>
                  {attendanceData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="font-semibold">Quick actions</h3>
          <div className="mt-4 flex flex-col gap-2 text-sm font-medium">
            <Link to="/employees/new" className="rounded-lg border border-border px-4 py-3 hover:bg-page">Add an employee</Link>
            <Link to="/attendance" className="rounded-lg border border-border px-4 py-3 hover:bg-page">Mark today's attendance</Link>
            <Link to="/performance" className="rounded-lg border border-border px-4 py-3 hover:bg-page">Add a performance review</Link>
            <Link to="/analytics" className="rounded-lg border border-border px-4 py-3 hover:bg-page">View workforce analytics</Link>
            <Link to="/reports" className="rounded-lg border border-border px-4 py-3 hover:bg-page">Download reports</Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default DashboardPage
