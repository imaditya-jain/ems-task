import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IoAdd, IoCalendarOutline, IoDocumentTextOutline } from 'react-icons/io5'
import AttendanceRateCard from '@/components/dashboard/AttendanceRateCard'
import HeroStats from '@/components/dashboard/HeroStats'
import PresenceCards from '@/components/dashboard/PresenceCards'
import RecentHiresTable from '@/components/dashboard/RecentHiresTable'
import SpotlightCard from '@/components/dashboard/SpotlightCard'
import TodayRingCard from '@/components/dashboard/TodayRingCard'
import WorkforceCard from '@/components/dashboard/WorkforceCard'
import Spinner from '@/components/common/Spinner'
import { fetchDashboardHandler } from '@/lib/features/dashboard.feature'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { todayLocal } from '@/utils/attendance'
import { firstNameOf, formatToday, greetingFor } from '@/utils/greeting'

const daysAgoLocal = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const pill = 'flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium'

const DashboardPage = () => {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const { data, loading, error } = useAppSelector((state) => state.dashboard)
  const [now] = useState(() => new Date())

  useEffect(() => {
    dispatch(fetchDashboardHandler({ today: todayLocal(), from: daysAgoLocal(29) }))
  }, [dispatch])


  return (
    <section>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight sm:text-4xl">
            {greetingFor(now.getHours())}, <span className="font-medium">{firstNameOf(user?.fullName)}</span>
          </h1>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link to="/employees/new" className={`${pill} border border-glass-line bg-glass hover:bg-surface-solid`}>
              <IoAdd className="text-lg" />
              Add employee
            </Link>
            <span className={`${pill} border border-glass-line bg-glass`}>
              <IoCalendarOutline className="text-lg" />
              {formatToday(now)}
            </span>
            <Link to="/reports" className={`${pill} bg-primary text-on-primary hover:bg-primary-dark`}>
              <IoDocumentTextOutline className="text-lg" />
              Download report
            </Link>
          </div>
        </div>

        {data && <HeroStats data={data} className="lg:max-w-xl lg:flex-1" />}
      </div>

      {!data && (loading ? <Spinner /> : error ? <p className="mt-6 text-sm text-red-500">{error}</p> : null)}

      {data && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
          <AttendanceRateCard attendance={data.attendance} className="md:col-span-2 xl:col-span-5" />
          <PresenceCards overview={data.overview} className="xl:col-span-3" />
          <TodayRingCard overview={data.overview} className="xl:col-span-4" />
          <SpotlightCard performer={data.performance.topPerformers[0]} className="xl:col-span-4 2xl:col-span-3" />
          <WorkforceCard growth={data.growth} className="xl:col-span-8 2xl:order-6 2xl:col-span-3" />
          <RecentHiresTable employees={data.recentEmployees} payroll={data.overview.monthlyPayroll} className="md:col-span-2 xl:col-span-12 2xl:order-5 2xl:col-span-6" />
        </div>
      )}
    </section>
  )
}

export default DashboardPage
