import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import InputField from '@/components/fields/InputField'
import SelectField from '@/components/fields/SelectField'
import type { EmployeePayload } from '@/lib/features/employee.feature'
import type { Department, Employee } from '@/types'

const MIN_AGE = 18

const isoDate = (date: Date) => date.toISOString().slice(0, 10)

const schema = yup.object({
  employeeCode: yup
    .string()
    .trim()
    .required('Employee code is required')
    .matches(/^[A-Za-z0-9-]{3,20}$/, 'Use 3-20 letters, numbers or hyphens'),
  firstName: yup.string().trim().max(50, 'Max 50 characters').required('First name is required'),
  lastName: yup.string().trim().max(50, 'Max 50 characters').required('Last name is required'),
  email: yup.string().trim().required('Email is required').email('Enter a valid email address').max(150),
  phone: yup
    .string()
    .trim()
    .required('Phone is required')
    .matches(/^\+?[0-9\s-]{7,15}$/, 'Enter a valid phone number'),
  dateOfBirth: yup
    .string()
    .required('Date of birth is required')
    .test('min-age', `Employee must be at least ${MIN_AGE} years old`, (value) => {
      if (!value) return false
      const limit = new Date()
      limit.setFullYear(limit.getFullYear() - MIN_AGE)
      return value <= isoDate(limit)
    }),
  // A normal test() (not oneOf): yup runs oneOf before required, which would hide the "required" message.
  gender: yup
    .string()
    .required('Gender is required')
    .test('valid-gender', 'Select a gender', (value) => ['Male', 'Female', 'Other'].includes(value)),
  departmentId: yup.number().typeError('Select a department').min(1, 'Select a department').required('Department is required'),
  designation: yup.string().trim().max(100, 'Max 100 characters').required('Designation is required'),
  joiningDate: yup.string().required('Joining date is required'),
  salary: yup.number().typeError('Enter a valid salary').min(0, 'Salary cannot be negative').max(99999999.99, 'Salary is too large').required('Salary is required'),
  status: yup.string().oneOf(['Active', 'Inactive']).required('Status is required'),
})

type EmployeeFormValues = yup.InferType<typeof schema>

interface EmployeeFormProps {
  employee?: Employee | null
  departments: Department[]
  saving: boolean
  onSubmit: (data: EmployeePayload) => void
  onCancel: () => void
}

const EmployeeForm = ({ employee, departments, saving, onSubmit, onCancel }: EmployeeFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      employeeCode: employee?.employeeCode ?? '',
      firstName: employee?.firstName ?? '',
      lastName: employee?.lastName ?? '',
      email: employee?.email ?? '',
      phone: employee?.phone ?? '',
      dateOfBirth: employee?.dateOfBirth ?? '',
      gender: employee?.gender ?? undefined,
      departmentId: employee?.departmentId,
      designation: employee?.designation ?? '',
      joiningDate: employee?.joiningDate ?? '',
      salary: employee?.salary,
      status: employee?.status ?? 'Active',
    },
  })

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values as EmployeePayload))} noValidate className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InputField label="Employee Code" name="employeeCode" placeholder="EMP-1001" register={register} errors={errors} />
        <SelectField
          label="Status"
          name="status"
          options={[
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
          ]}
          register={register}
          errors={errors}
        />
        <InputField label="First Name" name="firstName" autoComplete="off" register={register} errors={errors} />
        <InputField label="Last Name" name="lastName" autoComplete="off" register={register} errors={errors} />
        <InputField label="Email" name="email" type="email" autoComplete="off" register={register} errors={errors} />
        <InputField label="Phone" name="phone" type="tel" placeholder="+91 98765 43210" autoComplete="off" register={register} errors={errors} />
        <InputField label="Date of Birth" name="dateOfBirth" type="date" register={register} errors={errors} />
        <SelectField
          label="Gender"
          name="gender"
          options={[
            { value: 'Male', label: 'Male' },
            { value: 'Female', label: 'Female' },
            { value: 'Other', label: 'Other' },
          ]}
          register={register}
          errors={errors}
        />
        <SelectField
          label="Department"
          name="departmentId"
          options={departments.map((d) => ({ value: d.id, label: d.name }))}
          register={register}
          errors={errors}
        />
        <InputField label="Designation" name="designation" register={register} errors={errors} />
        <InputField label="Joining Date" name="joiningDate" type="date" register={register} errors={errors} />
        <InputField label="Monthly Salary (INR)" name="salary" type="number" register={register} errors={errors} />
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-page">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
          {saving ? 'Saving...' : employee ? 'Update Employee' : 'Create Employee'}
        </button>
      </div>
    </form>
  )
}

export default EmployeeForm
