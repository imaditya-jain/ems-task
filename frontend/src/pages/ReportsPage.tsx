import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import ReportCard from '@/components/reports/ReportCard'
import { fetchDepartmentsHandler } from '@/lib/features/department.feature'
import { downloadReportHandler, type DownloadReportParams, type ReportFormat, type ReportType } from '@/lib/features/report.feature'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { todayLocal } from '@/utils/attendance'
import type { EmployeeStatus } from '@/types'

const controlClass = 'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block text-sm">
    <span className="mb-1 block font-medium">{label}</span>
    {children}
  </label>
)

const monthStart = () => `${todayLocal().slice(0, 7)}-01`

const ReportsPage = () => {
  const dispatch = useAppDispatch()
  const departments = useAppSelector((state) => state.department.items)

  const [directoryDepartment, setDirectoryDepartment] = useState('')
  const [directoryStatus, setDirectoryStatus] = useState<EmployeeStatus | ''>('')
  const [attendanceDepartment, setAttendanceDepartment] = useState('')
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(todayLocal)
  const [salaryDepartment, setSalaryDepartment] = useState('')
  const [salaryStatus, setSalaryStatus] = useState<EmployeeStatus>('Active')

  useEffect(() => {
    dispatch(fetchDepartmentsHandler(undefined))
  }, [dispatch])

  const download = async (params: DownloadReportParams) => {
    try {
      await dispatch(downloadReportHandler(params)).unwrap()
      toast.success('Report downloaded.')
    } catch (err) {
      toast.error((err as { error?: string }).error ?? 'Something went wrong.')
    }
  }

  const departmentOptions = (
    <>
      <option value="">All departments</option>
      {departments.map((d) => (
        <option key={d.id} value={d.id}>
          {d.name}
        </option>
      ))}
    </>
  )

  const dateRangeInvalid = Boolean(from && to && from > to)

  const handleAttendance = (format: ReportFormat) => {
    if (!from || !to) return toast.error('Select both a start and an end date.')
    if (dateRangeInvalid) return toast.error('The start date cannot be after the end date.')

    download({ report: 'attendance', format, departmentId: attendanceDepartment ? Number(attendanceDepartment) : undefined, from, to })
  }

  const run = (report: ReportType, format: ReportFormat, extra: Partial<DownloadReportParams> = {}) =>
    download({ report, format, ...extra })

  return (
    <section>
      <h1 className="text-2xl font-semibold">Reports</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Generate PDF or Excel reports for HR records.</p>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReportCard
          report="employee-directory"
          title="Employee Directory"
          description="Contact and job details for every employee."
          onDownload={(format) =>
            run('employee-directory', format, {
              departmentId: directoryDepartment ? Number(directoryDepartment) : undefined,
              status: directoryStatus || undefined,
            })
          }
        >
          <Field label="Department">
            <select value={directoryDepartment} onChange={(e) => setDirectoryDepartment(e.target.value)} className={controlClass}>
              {departmentOptions}
            </select>
          </Field>
          <Field label="Status">
            <select value={directoryStatus} onChange={(e) => setDirectoryStatus(e.target.value as EmployeeStatus | '')} className={controlClass}>
              <option value="">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </Field>
        </ReportCard>

        <ReportCard
          report="departments"
          title="Department Summary"
          description="Headcount and payroll totals for each department."
          onDownload={(format) => run('departments', format)}
        />

        <ReportCard
          report="attendance"
          title="Attendance Report"
          description="Present, late, half-day, leave and absent days per employee for a period."
          onDownload={handleAttendance}
        >
          <Field label="From">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={controlClass} />
          </Field>
          <Field label="To">
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={controlClass} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Department">
              <select value={attendanceDepartment} onChange={(e) => setAttendanceDepartment(e.target.value)} className={controlClass}>
                {departmentOptions}
              </select>
            </Field>
          </div>
          {dateRangeInvalid && <p className="text-sm text-red-500 sm:col-span-2">The start date cannot be after the end date.</p>}
        </ReportCard>

        <ReportCard
          report="salary"
          title="Salary Report"
          description="Monthly and annual salary per employee with payroll totals."
          onDownload={(format) =>
            run('salary', format, { departmentId: salaryDepartment ? Number(salaryDepartment) : undefined, status: salaryStatus })
          }
        >
          <Field label="Department">
            <select value={salaryDepartment} onChange={(e) => setSalaryDepartment(e.target.value)} className={controlClass}>
              {departmentOptions}
            </select>
          </Field>
          <Field label="Status">
            <select value={salaryStatus} onChange={(e) => setSalaryStatus(e.target.value as EmployeeStatus)} className={controlClass}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </Field>
        </ReportCard>
      </div>
    </section>
  )
}

export default ReportsPage
