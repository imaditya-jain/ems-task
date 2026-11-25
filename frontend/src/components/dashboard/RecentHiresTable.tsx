import clsx from 'clsx'
import { Link } from 'react-router-dom'
import Avatar from '@/components/common/Avatar'
import type { Employee } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'
import DashboardCard from './DashboardCard'

const RecentHiresTable = ({ employees, payroll, className }: { employees: Employee[]; payroll: number; className?: string }) => (
  <DashboardCard title="Recent hires" to="/employees" className={className}>
    {employees.length === 0 ? (
      <p className="text-sm text-muted">No employees yet.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="pb-3 font-medium">Name</th>
              <th className="hidden pb-3 font-medium md:table-cell">Title</th>
              <th className="hidden pb-3 font-medium sm:table-cell">Salary</th>
              <th className="hidden pb-3 font-medium lg:table-cell">Joined</th>
              <th className="pb-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="border-t border-line">
                <td className="py-2.5 pr-3">
                  <Link to={`/employees/${employee.id}`} className="flex items-center gap-3 hover:underline">
                    <Avatar name={employee.fullName} />
                    <span>
                      <span className="block font-medium">{employee.fullName}</span>
                      {/* the Title column is hidden on small screens, so show the title here instead */}
                      <span className="block text-xs text-muted md:hidden">{employee.designation}</span>
                    </span>
                  </Link>
                </td>
                <td className="hidden py-2.5 pr-3 text-muted md:table-cell">{employee.designation}</td>
                <td className="hidden py-2.5 pr-3 sm:table-cell">{formatCurrency(employee.salary)}</td>
                <td className="hidden whitespace-nowrap py-2.5 pr-3 text-muted lg:table-cell">{formatDate(employee.joiningDate)}</td>
                <td className="py-2.5 text-right">
                  <span
                    className={clsx(
                      'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                      employee.status === 'Active' ? 'bg-accent text-on-accent' : 'bg-track text-muted',
                    )}
                  >
                    {employee.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
      Monthly payroll (active employees): <span className="font-semibold text-foreground">{formatCurrency(payroll)}</span>
    </p>
  </DashboardCard>
)

export default RecentHiresTable
