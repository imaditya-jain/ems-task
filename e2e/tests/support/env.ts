/**
 * Test-only credentials and ports. These match the values playwright.config.ts passes to the API it starts,
 * and are meaningless outside a throw-away test database.
 */
export const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5273)
export const API_PORT = Number(process.env.E2E_API_PORT ?? 5180)

export const WEB_URL = `http://localhost:${WEB_PORT}`
export const API_URL = `http://localhost:${API_PORT}`

export const ADMIN = { email: 'admin@ems.test', password: 'Admin@12345', name: 'System Admin' }

/** Created by the demo-data seeder. Used by the login/logout tests so the admin session in .auth stays valid. */
export const DEMO_HR = { email: 'hr.demo@ems.test', password: 'Demo@12345', name: 'Demo HR' }

export const DB_CONNECTION =
  process.env.E2E_DB_CONNECTION ?? 'Server=127.0.0.1;Port=3308;Database=ems_e2e;User=root;Password=e2e_root_password'

/** Seeded by the demo-data seeder: 5 departments, 30 employees (EMP-1001..EMP-1030, 2 inactive). */
export const SEED = {
  departments: ['Engineering', 'Human Resources', 'Sales', 'Finance', 'Operations'],
  employeeCount: 30,
  inactiveCount: 2,
  firstEmployee: { code: 'EMP-1001', name: 'Aarav Sharma', department: 'Engineering' },
}
