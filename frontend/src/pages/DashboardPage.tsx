import { useAppSelector } from '@/lib/hooks'

const DashboardPage = () => {
  const user = useAppSelector((state) => state.auth.user)

  return (
    <section>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">Welcome, {user?.fullName}.</p>
    </section>
  )
}

export default DashboardPage
