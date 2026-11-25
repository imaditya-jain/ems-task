import LoginForm from '@/components/forms/LoginForm'

const LoginPage = () => (
  <main className="flex min-h-screen items-center justify-center px-4">
    <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Sign in to manage employees, attendance and reports.</p>
      <LoginForm />
    </div>
  </main>
)

export default LoginPage
