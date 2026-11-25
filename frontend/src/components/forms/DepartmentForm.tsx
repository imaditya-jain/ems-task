import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import InputField from '@/components/fields/InputField'
import TextAreaField from '@/components/fields/TextAreaField'
import type { DepartmentPayload } from '@/lib/features/department.feature'
import type { Department } from '@/types'

const schema = yup.object({
  name: yup.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters').required('Department name is required'),
  description: yup.string().trim().max(255, 'Description cannot exceed 255 characters').default(''),
})

type DepartmentFormValues = yup.InferType<typeof schema>

interface DepartmentFormProps {
  department?: Department | null
  saving: boolean
  onSubmit: (data: DepartmentPayload) => void
  onCancel: () => void
}

const DepartmentForm = ({ department, saving, onSubmit, onCancel }: DepartmentFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DepartmentFormValues>({
    resolver: yupResolver(schema),
    defaultValues: { name: department?.name ?? '', description: department?.description ?? '' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <InputField label="Name" name="name" placeholder="e.g. Engineering" register={register} errors={errors} />
      <TextAreaField label="Description" name="description" placeholder="What does this department do? (optional)" register={register} errors={errors} />
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-page">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
          {saving ? 'Saving...' : department ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  )
}

export default DepartmentForm
