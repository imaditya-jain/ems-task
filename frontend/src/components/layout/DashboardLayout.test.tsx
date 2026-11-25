import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { loginUserHandler } from '@/lib/features/auth.feature'
import { makeStore } from '@/lib/store'
import { renderWithProviders } from '@/test/utils'

const setup = () => {
  const store = makeStore()
  store.dispatch(
    loginUserHandler.fulfilled({ success: true, data: { user: { id: 1, fullName: 'Aditya Burse', email: 'a@b.com', role: 'Admin' } } }, 'req', { email: 'a', password: 'b' }),
  )

  return renderWithProviders(
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<p>Dashboard content</p>} />
        <Route path="/employees" element={<p>Employees content</p>} />
      </Route>
    </Routes>,
    { route: '/dashboard', store },
  )
}

describe('DashboardLayout', () => {
  it('shows every section in the sidebar navigation', () => {
    setup()

    const nav = screen.getByRole('navigation', { name: 'Main' })
    for (const label of ['Dashboard', 'Employees', 'Attendance', 'Performance', 'Analytics', 'Departments', 'Reports']) {
      expect(nav).toHaveTextContent(label)
    }
  })

  it('shows the signed-in user and a logout button', () => {
    setup()

    expect(screen.getByText('Aditya Burse')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument()
  })

  it('renders the page content next to the sidebar', () => {
    setup()

    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
  })

  it('opens the drawer from the menu button and closes it with Escape', async () => {
    setup()
    const menu = screen.getByRole('button', { name: 'Menu' })
    expect(menu).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(menu)
    expect(menu).toHaveAttribute('aria-expanded', 'true')
    expect(document.body.style.overflow).toBe('hidden') // the page behind must not scroll

    await userEvent.keyboard('{Escape}')
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    expect(document.body.style.overflow).toBe('')
  })

  it('closes the drawer after choosing a page', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))

    await userEvent.click(screen.getByRole('link', { name: 'Employees' }))

    expect(screen.getByText('Employees content')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false')
  })
})
