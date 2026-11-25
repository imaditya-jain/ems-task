import { expect, test } from '@playwright/test'
import { SEED } from './support/env'
import { expectToast, uid } from './support/helpers'

const addDepartment = async (page: import('@playwright/test').Page, name: string, description?: string) => {
  await page.getByRole('button', { name: 'Add Department' }).click()
  await page.getByLabel('Name', { exact: true }).fill(name)
  if (description) await page.getByLabel('Description').fill(description)
  await page.getByRole('button', { name: 'Create' }).click()
}

test.describe('Departments', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/departments')
    await expect(page.getByRole('heading', { name: 'Departments' })).toBeVisible()
  })

  test('lists the seeded demo departments', async ({ page }) => {
    for (const name of SEED.departments) {
      await expect(page.getByRole('cell', { name, exact: true })).toBeVisible()
    }
  })

  test('search filters the list', async ({ page }) => {
    await page.getByLabel('Search departments').fill('Engin')

    await expect(page.getByRole('cell', { name: 'Engineering', exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Sales', exact: true })).toHaveCount(0)
  })

  test('the form requires a name and rejects a one-letter name', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Department' }).click()

    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByText('Department name is required')).toBeVisible()

    await page.getByLabel('Name', { exact: true }).fill('A')
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByText('Name must be at least 2 characters')).toBeVisible()
  })

  test('creates a department and shows it in the list', async ({ page }) => {
    const name = `E2E Dept ${uid()}`

    await addDepartment(page, name, 'Created by Playwright')

    await expectToast(page, 'Department created successfully.')
    const row = page.getByRole('row', { name: new RegExp(name) })
    await expect(row).toBeVisible()
    await expect(row).toContainText('Created by Playwright')
  })

  test('a duplicate name is rejected, even with different letter case', async ({ page }) => {
    const name = `E2E Dup ${uid()}`
    await addDepartment(page, name)
    await expectToast(page, 'Department created successfully.')

    await addDepartment(page, name.toLowerCase())

    await expectToast(page, /already exists/)
    await expect(page.getByRole('dialog')).toBeVisible() // the form stays open so the user can fix it
  })

  test('renames a department', async ({ page, request }) => {
    const name = `E2E Rename ${uid()}`
    await request.post('/api/v1/departments', { data: { name } })
    await page.reload()

    await page.getByRole('button', { name: `Edit ${name}` }).click()
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue(name)
    await page.getByLabel('Name', { exact: true }).fill(`${name} v2`)
    await page.getByRole('button', { name: 'Update' }).click()

    await expectToast(page, 'Department updated successfully.')
    await expect(page.getByRole('cell', { name: `${name} v2`, exact: true })).toBeVisible()
  })

  test('deletes an empty department after confirmation', async ({ page, request }) => {
    const name = `E2E Delete ${uid()}`
    await request.post('/api/v1/departments', { data: { name } })
    await page.reload()

    await page.getByRole('button', { name: `Delete ${name}` }).click()
    await expect(page.getByRole('dialog')).toContainText(name)
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()

    await expectToast(page, 'Department deleted successfully.')
    await expect(page.getByRole('cell', { name, exact: true })).toHaveCount(0)
  })

  test('cancelling the confirmation keeps the department', async ({ page, request }) => {
    const name = `E2E Keep ${uid()}`
    await request.post('/api/v1/departments', { data: { name } })
    await page.reload()

    await page.getByRole('button', { name: `Delete ${name}` }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByRole('cell', { name, exact: true })).toBeVisible()
  })

  test('a department that still has employees cannot be deleted', async ({ page }) => {
    await page.getByRole('button', { name: 'Delete Engineering' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()

    await expectToast(page, /still has employees/)
    await expect(page.getByRole('cell', { name: 'Engineering', exact: true })).toBeVisible()
  })
})
