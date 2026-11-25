import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import InputField from '@/components/fields/InputField'
import SelectField from '@/components/fields/SelectField'
import TextAreaField from '@/components/fields/TextAreaField'
import type { ReviewPayload } from '@/lib/features/performance.feature'
import type { EmployeeOption, PerformanceReview } from '@/types'

const currentYear = new Date().getFullYear()

const score = (label: string) =>
  yup.number().typeError(`${label} score is required`).min(1, 'Minimum score is 1').max(5, 'Maximum score is 5').required(`${label} score is required`)

const schema = yup.object({
  employeeId: yup.number().typeError('Select an employee').min(1, 'Select an employee').required('Employee is required'),
  year: yup.number().typeError('Enter a valid year').min(2000, 'Enter a valid year').max(currentYear, 'Year cannot be in the future').required('Year is required'),
  quarter: yup.number().typeError('Select a quarter').min(1).max(4).required('Quarter is required'),
  qualityScore: score('Quality'),
  productivityScore: score('Productivity'),
  teamworkScore: score('Teamwork'),
  comments: yup.string().trim().max(500, 'Comments cannot exceed 500 characters').default(''),
})

type ReviewFormValues = yup.InferType<typeof schema>

const scoreOptions = [
  { value: 1, label: '1 - Poor' },
  { value: 2, label: '2 - Fair' },
  { value: 3, label: '3 - Good' },
  { value: 4, label: '4 - Very good' },
  { value: 5, label: '5 - Excellent' },
]

const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1

interface ReviewFormProps {
  review?: PerformanceReview | null
  employees: EmployeeOption[]
  saving: boolean
  onSubmit: (data: ReviewPayload) => void
  onCancel: () => void
}

const ReviewForm = ({ review, employees, saving, onSubmit, onCancel }: ReviewFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      employeeId: review?.employeeId,
      year: review?.year ?? currentYear,
      quarter: review?.quarter ?? currentQuarter,
      qualityScore: review?.qualityScore,
      productivityScore: review?.productivityScore,
      teamworkScore: review?.teamworkScore,
      comments: review?.comments ?? '',
    },
  })

  // Editing keeps the employee fixed (the API does not allow moving a review), but the option list only holds
  // ACTIVE employees, so make sure the reviewed employee is always selectable.
  const options = employees.map((e) => ({ value: e.id, label: `${e.fullName} (${e.employeeCode})` }))
  if (review && !options.some((o) => o.value === review.employeeId)) {
    options.unshift({ value: review.employeeId, label: `${review.employeeName} (${review.employeeCode})` })
  }

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values as ReviewPayload))} noValidate className="flex flex-col gap-4">
      <fieldset disabled={Boolean(review)} className="contents">
        <SelectField label="Employee" name="employeeId" options={options} placeholder="Select employee..." register={register} errors={errors} />
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <InputField label="Year" name="year" type="number" register={register} errors={errors} />
        <SelectField
          label="Quarter"
          name="quarter"
          options={[1, 2, 3, 4].map((q) => ({ value: q, label: `Q${q}` }))}
          register={register}
          errors={errors}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SelectField label="Quality" name="qualityScore" options={scoreOptions} register={register} errors={errors} />
        <SelectField label="Productivity" name="productivityScore" options={scoreOptions} register={register} errors={errors} />
        <SelectField label="Teamwork" name="teamworkScore" options={scoreOptions} register={register} errors={errors} />
      </div>

      <TextAreaField label="Comments" name="comments" placeholder="Strengths, areas to improve... (optional)" register={register} errors={errors} />

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-page">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
          {saving ? 'Saving...' : review ? 'Update Review' : 'Create Review'}
        </button>
      </div>
    </form>
  )
}

export default ReviewForm
