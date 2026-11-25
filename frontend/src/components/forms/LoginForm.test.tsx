import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'react-toastify'
import LoginForm from '@/components/forms/LoginForm'
import { jsonResponse, renderWithRoutes } from '@/test/utils'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('LoginForm', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  const setup = () => renderWithRoutes(<LoginForm />, { path: '/dashboard', marker: 'Dashboard reached' })

  it('requires an email and a password', async () => {
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a malformed email without calling the API', async () => {
    setup()

    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email')
    await userEvent.type(screen.getByLabelText('Password'), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a password shorter than 6 characters', async () => {
    setup()

    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com')
    await userEvent.type(screen.getByLabelText('Password'), '123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument()
  })

  it('signs in, stores the user in Redux and navigates to the dashboard', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, message: 'Logged in successfully.', data: { user: { id: 1, fullName: 'Admin', email: 'a@b.com', role: 'Admin' } } }),
    )
    const { store } = setup()

    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('Dashboard reached')).toBeInTheDocument()
    expect(store.getState().auth).toMatchObject({ isAuthenticated: true, user: { fullName: 'Admin' } })
    expect(toast.success).toHaveBeenCalledWith('Logged in successfully.')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/v1/auth/login')
    expect(JSON.parse(init?.body as string)).toEqual({ email: 'a@b.com', password: 'secret123' })
  })

  it('shows the server error and stays on the form when the credentials are wrong', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false, error: 'Invalid email or password.' }, 401))
    const { store } = setup()

    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Invalid email or password.'))
    expect(screen.queryByText('Dashboard reached')).not.toBeInTheDocument()
    expect(store.getState().auth.isAuthenticated).toBe(false)
  })

  it('disables the button while signing in', async () => {
    let finish: (r: Response) => void = () => {}
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (finish = resolve)))
    setup()

    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByRole('button', { name: 'Signing in...' })).toBeDisabled()
    finish(jsonResponse({ success: false, error: 'x' }, 401))
  })
})
