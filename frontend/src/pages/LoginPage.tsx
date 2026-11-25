import ThemeToggle from '@/components/common/ThemeToggle'
import LoginForm from '@/components/forms/LoginForm'

const LoginPage = () => (
  <main className="relative flex min-h-screen items-center justify-center px-4">
    <ThemeToggle className="absolute right-4 top-4" />
    <div className="w-full max-w-md rounded-3xl border border-glass-line bg-surface p-8 shadow-card backdrop-blur">
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Sign in to manage employees, attendance and reports.</p>
      <LoginForm />
    </div>
  </main>
)

export default LoginPage
