import { expect, test as setup } from '@playwright/test'
import { ADMIN } from './support/env'

/** Signs in once as the admin and saves the session cookies for every other test. */
setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Password', { exact: true }).fill(ADMIN.password)
  await page.getByRole('button', { name: 'Sign In' }).click()

  await expect(page).toHaveURL(/\/dashboard/)
  await page.context().storageState({ path: 'tests/.auth/admin.json' })
})
