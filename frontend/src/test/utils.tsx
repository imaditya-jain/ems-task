import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { makeStore, type AppStore } from '@/lib/store'

interface Options {
  route?: string
  store?: AppStore
}

/** Renders a component with a fresh Redux store and an in-memory router. */
export const renderWithProviders = (ui: ReactElement, { route = '/', store = makeStore() }: Options = {}) => ({
  store,
  ...render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </Provider>,
  ),
})

/** Same as renderWithProviders, but also renders a marker page at `path` so navigation can be asserted. */
export const renderWithRoutes = (ui: ReactElement, { path, marker }: { path: string; marker: string }, options: Options = {}) => {
  const store = options.store ?? makeStore()

  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[options.route ?? '/']}>
          <Routes>
            <Route path={options.route ?? '/'} element={ui} />
            <Route path={path} element={<div>{marker}</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    ),
  }
}

/** A minimal fetch Response for mocks. */
export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
