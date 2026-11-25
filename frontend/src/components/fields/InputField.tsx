import { useState } from 'react'
import clsx from 'clsx'
import type { FieldErrors, FieldValues, Path, UseFormRegister } from 'react-hook-form'
import { IoEye, IoEyeOff } from 'react-icons/io5'

interface InputFieldProps<T extends FieldValues> {
  label: string
  name: Path<T>
  type?: string
  placeholder?: string
  register: UseFormRegister<T>
  errors?: FieldErrors<T>
  autoComplete?: string
}

const InputField = <T extends FieldValues>({
  label,
  name,
  type = 'text',
  placeholder,
  register,
  errors,
  autoComplete,
}: InputFieldProps<T>) => {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const error = errors?.[name]?.message as string | undefined

  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          type={isPassword && showPassword ? 'text' : type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          {...register(name)}
          className={clsx(
            'block h-11 w-full rounded-lg border bg-surface px-3 text-sm outline-none transition',
            'placeholder:text-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/20',
            error ? 'border-red-500' : 'border-border',
            isPassword && 'pr-10',
          )}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-foreground"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <IoEyeOff /> : <IoEye />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}

export default InputField
