import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import 'react-toastify/dist/ReactToastify.css'
import ThemeSync from '@/providers/ThemeSync'
import StoreProvider from '@/providers/StoreProvider'
import AuthSessionProvider from '@/providers/AuthSessionProvider'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PublicRoute from '@/components/auth/PublicRoute'
import Spinner from '@/components/common/Spinner'
import DashboardLayout from '@/components/layout/DashboardLayout'

// Each page is its own chunk, so heavy dependencies (e.g. the charts) load only on the pages that use them.
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const DepartmentsPage = lazy(() => import('@/pages/DepartmentsPage'))
const EmployeesPage = lazy(() => import('@/pages/EmployeesPage'))
const EmployeeFormPage = lazy(() => import('@/pages/EmployeeFormPage'))
const EmployeeDetailPage = lazy(() => import('@/pages/EmployeeDetailPage'))
const AttendancePage = lazy(() => import('@/pages/AttendancePage'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage'))
const PerformancePage = lazy(() => import('@/pages/PerformancePage'))
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

const App = () => (
  <StoreProvider>
    <AuthSessionProvider>
      <BrowserRouter>
        <Suspense fallback={<Spinner fullScreen />}>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/employees/new" element={<EmployeeFormPage />} />
                <Route path="/employees/:id" element={<EmployeeDetailPage />} />
                <Route path="/employees/:id/edit" element={<EmployeeFormPage />} />
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/performance" element={<PerformancePage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/departments" element={<DepartmentsPage />} />
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <ThemeSync />
    </AuthSessionProvider>
  </StoreProvider>
)

export default App
