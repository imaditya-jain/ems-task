import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import Spinner from '@/components/common/Spinner'
import EmployeeForm from '@/components/forms/EmployeeForm'
import { fetchDepartmentsHandler } from '@/lib/features/department.feature'
import {
  createEmployeeHandler,
  fetchEmployeeByIdHandler,
  updateEmployeeHandler,
  type EmployeePayload,
} from '@/lib/features/employee.feature'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { clearSelectedEmployee } from '@/lib/slices/employee.slice'

/** One page for both "Add Employee" (/employees/new) and "Edit Employee" (/employees/:id/edit). */
const EmployeeFormPage = () => {
  const { id } = useParams()
  const employeeId = id ? Number(id) : null
  const isEdit = employeeId !== null

  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const departments = useAppSelector((state) => state.department.items)
  const { selected, loading, saving, error } = useAppSelector((state) => state.employee)

  useEffect(() => {
    dispatch(fetchDepartmentsHandler(undefined))

    if (employeeId !== null) dispatch(fetchEmployeeByIdHandler(employeeId))
    else dispatch(clearSelectedEmployee())

    return () => {
      dispatch(clearSelectedEmployee())
    }
  }, [dispatch, employeeId])

  const handleSubmit = async (data: EmployeePayload) => {
    try {
      const response = isEdit
        ? await dispatch(updateEmployeeHandler({ id: employeeId, data })).unwrap()
        : await dispatch(createEmployeeHandler(data)).unwrap()

      toast.success(response.message)
      navigate('/employees')
    } catch (err) {
      toast.error((err as { error?: string }).error ?? 'Something went wrong.')
    }
  }

  const waitingForEmployee = isEdit && !selected && !error

  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold">{isEdit ? 'Edit Employee' : 'Add Employee'}</h1>
      <p className="mb-6 mt-1 text-sm text-muted">{isEdit ? 'Update the employee details below.' : 'Fill in the details to add a new employee.'}</p>

      <div className="rounded-2xl border border-border bg-surface p-6">
        {error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : loading || waitingForEmployee ? (
          <Spinner />
        ) : (
          // key forces the form to re-initialise its default values when the loaded employee changes
          <EmployeeForm
            key={selected?.id ?? 'new'}
            employee={selected}
            departments={departments}
            saving={saving}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/employees')}
          />
        )}
      </div>
    </section>
  )
}

export default EmployeeFormPage
