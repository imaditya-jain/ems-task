import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import clsx from 'clsx'
import { IoAdd, IoArrowDown, IoArrowUp, IoCloudUploadOutline, IoCreateOutline, IoEyeOutline, IoTrashOutline } from 'react-icons/io5'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import Pagination from '@/components/common/Pagination'
import Spinner from '@/components/common/Spinner'
import StatusBadge from '@/components/common/StatusBadge'
import BulkImportModal from '@/components/employees/BulkImportModal'
import { fetchDepartmentsHandler } from '@/lib/features/department.feature'
import { bulkDeleteEmployeesHandler, deleteEmployeeHandler, fetchEmployeesHandler } from '@/lib/features/employee.feature'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { useDebounce } from '@/utils/useDebounce'
import { formatCurrency, formatDate } from '@/utils/format'
import type { Employee, EmployeeStatus } from '@/types'

const PAGE_SIZE = 10

const columns = [
  { label: 'Employee', sortKey: 'name' },
  { label: 'Code', sortKey: 'code' },
  { label: 'Department', sortKey: 'department' },
  { label: 'Joined', sortKey: 'joiningDate' },
  { label: 'Salary', sortKey: 'salary' },
  { label: 'Status', sortKey: null },
] as const

const selectClass = 'h-11 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

const EmployeesPage = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const departments = useAppSelector((state) => state.department.items)
  const { items, pagination, loading, saving, error } = useAppSelector((state) => state.employee)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [departmentId, setDepartmentId] = useState('')
  const [status, setStatus] = useState<EmployeeStatus | ''>('')
  const [sortBy, setSortBy] = useState('name')
  const [descending, setDescending] = useState(false)
  const [page, setPage] = useState(1)

  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [deleting, setDeleting] = useState<Employee | null>(null)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const loadEmployees = useCallback(() => {
    dispatch(
      fetchEmployeesHandler({
        search: debouncedSearch.trim() || undefined,
        departmentId: departmentId ? Number(departmentId) : undefined,
        status: status || undefined,
        sortBy,
        descending,
        page,
        pageSize: PAGE_SIZE,
      }),
    )
  }, [dispatch, debouncedSearch, departmentId, status, sortBy, descending, page])

  useEffect(() => {
    dispatch(fetchDepartmentsHandler(undefined))
  }, [dispatch])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  // Changing any filter sends the user back to page 1 and clears the selection.
  const resetPaging = () => {
    setPage(1)
    setSelectedIds([])
  }

  const handleSort = (key: string) => {
    if (key === sortBy) setDescending((prev) => !prev)
    else {
      setSortBy(key)
      setDescending(false)
    }
    resetPaging()
  }

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage)
    setSelectedIds([])
  }

  const allOnPageSelected = items.length > 0 && items.every((e) => selectedIds.includes(e.id))

  const toggleAll = () => setSelectedIds(allOnPageSelected ? [] : items.map((e) => e.id))

  const toggleOne = (id: number) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  // After deleting the last row(s) of a page, step back so the user is not left on an empty page.
  const reloadAfterDelete = (removed: number) => {
    setSelectedIds([])
    if (removed >= items.length && page > 1) setPage(page - 1)
    else loadEmployees()
  }

  const handleDelete = async () => {
    if (!deleting) return

    try {
      const response = await dispatch(deleteEmployeeHandler(deleting.id)).unwrap()
      toast.success(response.message)
      reloadAfterDelete(1)
    } catch (err) {
      toast.error((err as { error?: string }).error ?? 'Something went wrong.')
    } finally {
      setDeleting(null)
    }
  }

  const handleBulkDelete = async () => {
    try {
      const response = await dispatch(bulkDeleteEmployeesHandler(selectedIds)).unwrap()
      toast.success(response.message)
      reloadAfterDelete(selectedIds.length)
    } catch (err) {
      toast.error((err as { error?: string }).error ?? 'Something went wrong.')
    } finally {
      setConfirmBulkDelete(false)
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="mt-1 text-sm text-muted">{pagination.totalCount} total</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmBulkDelete(true)}
              className="flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
            >
              <IoTrashOutline className="text-lg" />
              Delete ({selectedIds.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-page"
          >
            <IoCloudUploadOutline className="text-lg" />
            Import CSV
          </button>
          <Link to="/employees/new" className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-dark">
            <IoAdd className="text-lg" />
            Add Employee
          </Link>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            resetPaging()
          }}
          placeholder="Search name, email, code..."
          aria-label="Search employees"
          className={clsx(selectClass, 'lg:col-span-2')}
        />
        <select
          value={departmentId}
          onChange={(event) => {
            setDepartmentId(event.target.value)
            resetPaging()
          }}
          aria-label="Filter by department"
          className={selectClass}
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as EmployeeStatus | '')
            resetPaging()
          }}
          aria-label="Filter by status"
          className={selectClass}
        >
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        {loading && items.length === 0 ? (
          <Spinner />
        ) : error ? (
          <p className="p-6 text-sm text-red-500">{error}</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-muted">No employees found.</p>
        ) : (
          <table className={clsx('w-full text-left text-sm', loading && 'opacity-60')}>
            <thead className="border-b border-border bg-page text-muted">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} aria-label="Select all on this page" />
                </th>
                {columns.map(({ label, sortKey }) => (
                  <th key={label} className="whitespace-nowrap px-4 py-3 font-medium">
                    {sortKey ? (
                      <button type="button" onClick={() => handleSort(sortKey)} className="flex items-center gap-1 hover:text-foreground">
                        {label}
                        {sortBy === sortKey && (descending ? <IoArrowDown /> : <IoArrowUp />)}
                      </button>
                    ) : (
                      label
                    )}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((employee) => (
                <tr key={employee.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedIds.includes(employee.id)} onChange={() => toggleOne(employee.id)} aria-label={`Select ${employee.fullName}`} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{employee.fullName}</p>
                    <p className="text-muted">{employee.email}</p>
                  </td>
                  <td className="px-4 py-3">{employee.employeeCode}</td>
                  <td className="px-4 py-3">
                    <p>{employee.departmentName}</p>
                    <p className="text-muted">{employee.designation}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{formatDate(employee.joiningDate)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatCurrency(employee.salary)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={employee.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => navigate(`/employees/${employee.id}`)} aria-label={`View ${employee.fullName}`} className="rounded-lg p-2 text-muted hover:bg-page hover:text-primary">
                        <IoEyeOutline className="text-lg" />
                      </button>
                      <button type="button" onClick={() => navigate(`/employees/${employee.id}/edit`)} aria-label={`Edit ${employee.fullName}`} className="rounded-lg p-2 text-muted hover:bg-page hover:text-primary">
                        <IoCreateOutline className="text-lg" />
                      </button>
                      <button type="button" onClick={() => setDeleting(employee)} aria-label={`Delete ${employee.fullName}`} className="rounded-lg p-2 text-muted hover:bg-page hover:text-red-600">
                        <IoTrashOutline className="text-lg" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} totalCount={pagination.totalCount} pageSize={pagination.pageSize} onPageChange={handlePageChange} />
      </div>

      {deleting && (
        <ConfirmDialog
          title="Delete employee"
          message={`Are you sure you want to delete ${deleting.fullName} (${deleting.employeeCode})? This cannot be undone.`}
          loading={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      {confirmBulkDelete && (
        <ConfirmDialog
          title="Delete selected employees"
          message={`Are you sure you want to delete ${selectedIds.length} selected employee${selectedIds.length > 1 ? 's' : ''}? This cannot be undone.`}
          confirmLabel={`Delete ${selectedIds.length}`}
          loading={saving}
          onConfirm={handleBulkDelete}
          onCancel={() => setConfirmBulkDelete(false)}
        />
      )}

      {importOpen && (
        <BulkImportModal
          onClose={() => setImportOpen(false)}
          onImported={() => {
            setImportOpen(false)
            resetPaging()
            loadEmployees()
          }}
        />
      )}
    </section>
  )
}

export default EmployeesPage
