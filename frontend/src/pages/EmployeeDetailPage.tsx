import { useEffect, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { IoArrowBack, IoCreateOutline } from 'react-icons/io5'
import AttendanceHistory from '@/components/attendance/AttendanceHistory'
import Spinner from '@/components/common/Spinner'
import StatusBadge from '@/components/common/StatusBadge'
import { fetchEmployeeByIdHandler } from '@/lib/features/employee.feature'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { clearSelectedEmployee } from '@/lib/slices/employee.slice'
import { formatCurrency, formatDate } from '@/utils/format'

const Detail = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <dt className="text-sm text-muted">{label}</dt>
    <dd className="mt-1 font-medium">{children}</dd>
  </div>
)

const EmployeeDetailPage = () => {
  const { id } = useParams()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { selected: employee, loading, error } = useAppSelector((state) => state.employee)

  useEffect(() => {
    dispatch(fetchEmployeeByIdHandler(Number(id)))
    return () => {
      dispatch(clearSelectedEmployee())
    }
  }, [dispatch, id])

  return (
    <section className="mx-auto max-w-4xl">
      <button type="button" onClick={() => navigate('/employees')} className="mb-4 flex items-center gap-2 text-sm text-muted hover:text-foreground">
        <IoArrowBack /> Back to employees
      </button>

      {error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : loading || !employee ? (
        <Spinner />
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{employee.fullName}</h1>
              <p className="mt-1 text-sm text-muted">
                {employee.designation} · {employee.departmentName}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={employee.status} />
              <Link
                to={`/employees/${employee.id}/edit`}
                className="flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium hover:bg-page"
              >
                <IoCreateOutline className="text-lg" /> Edit
              </Link>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Employee Code">{employee.employeeCode}</Detail>
            <Detail label="Email">{employee.email}</Detail>
            <Detail label="Phone">{employee.phone}</Detail>
            <Detail label="Date of Birth">{formatDate(employee.dateOfBirth)}</Detail>
            <Detail label="Gender">{employee.gender}</Detail>
            <Detail label="Joining Date">{formatDate(employee.joiningDate)}</Detail>
            <Detail label="Department">{employee.departmentName}</Detail>
            <Detail label="Designation">{employee.designation}</Detail>
            <Detail label="Monthly Salary">{formatCurrency(employee.salary)}</Detail>
          </dl>
        </div>
      )}

      {employee && <AttendanceHistory employeeId={employee.id} />}
    </section>
  )
}

export default EmployeeDetailPage
