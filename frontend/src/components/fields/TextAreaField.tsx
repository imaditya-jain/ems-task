import clsx from 'clsx'
import type { FieldErrors, FieldValues, Path, UseFormRegister } from 'react-hook-form'

interface TextAreaFieldProps<T extends FieldValues> {
  label: string
  name: Path<T>
  placeholder?: string
  rows?: number
  register: UseFormRegister<T>
  errors?: FieldErrors<T>
}

const TextAreaField = <T extends FieldValues>({ label, name, placeholder, rows = 3, register, errors }: TextAreaFieldProps<T>) => {
  const error = errors?.[name]?.message as string | undefined

  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <textarea
        id={name}
        rows={rows}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        {...register(name)}
        className={clsx(
          'block w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none transition',
          'placeholder:text-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/20',
          error ? 'border-red-500' : 'border-border',
        )}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}

export default TextAreaField
