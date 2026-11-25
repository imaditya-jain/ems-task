import clsx from 'clsx'
import type { FieldErrors, FieldValues, Path, UseFormRegister } from 'react-hook-form'

export interface SelectOption {
  value: string | number
  label: string
}

interface SelectFieldProps<T extends FieldValues> {
  label: string
  name: Path<T>
  options: SelectOption[]
  placeholder?: string
  register: UseFormRegister<T>
  errors?: FieldErrors<T>
}

const SelectField = <T extends FieldValues>({ label, name, options, placeholder = 'Select...', register, errors }: SelectFieldProps<T>) => {
  const error = errors?.[name]?.message as string | undefined

  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <select
        id={name}
        aria-invalid={Boolean(error)}
        {...register(name)}
        className={clsx(
          'block h-11 w-full rounded-lg border bg-surface px-3 text-sm outline-none transition',
          'focus:border-primary focus:ring-2 focus:ring-primary/20',
          error ? 'border-red-500' : 'border-border',
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}

export default SelectField
