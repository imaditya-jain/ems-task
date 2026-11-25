import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import InputField from '@/components/fields/InputField'
import { loginUserHandler } from '@/lib/features/auth.feature'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'

const schema = yup.object({
  email: yup.string().trim().email('Enter a valid email address').required('Email is required'),
  password: yup.string().required('Password is required').min(6, 'Password must be at least 6 characters'),
})

type LoginFormValues = yup.InferType<typeof schema>

const LoginForm = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { loading } = useAppSelector((state) => state.auth)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: yupResolver(schema),
    mode: 'onBlur',
  })

  const handleOnLogin = async (data: LoginFormValues) => {
    try {
      const response = await dispatch(loginUserHandler(data)).unwrap()
      toast.success(response.message ?? 'Logged in successfully.')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      toast.error((error as { error?: string }).error ?? 'Something went wrong.')
    }
  }

  return (
    <form onSubmit={handleSubmit(handleOnLogin)} noValidate className="flex flex-col gap-4">
      <InputField label="Email" name="email" type="email" placeholder="you@company.com" autoComplete="email" register={register} errors={errors} />
      <InputField label="Password" name="password" type="password" autoComplete="current-password" register={register} errors={errors} />
      <button
        type="submit"
        disabled={loading}
        className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}

export default LoginForm
