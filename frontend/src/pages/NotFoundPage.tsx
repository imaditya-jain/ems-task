import { Link } from 'react-router-dom'

const NotFoundPage = () => (
  <main className="flex min-h-screen flex-col items-center justify-center gap-2">
    <h1 className="text-4xl font-semibold">404</h1>
    <p className="text-muted">The page you are looking for does not exist.</p>
    <Link to="/dashboard" className="mt-2 font-medium text-primary hover:underline">
      Go to dashboard
    </Link>
  </main>
)

export default NotFoundPage
