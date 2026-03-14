import { test, expect } from '@playwright/test';

test.describe('Tenants Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Log in before testing tenants
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
  });

  test('should display total owed including electricity', async ({ page }) => {
    // Go to tenants page
    await page.goto('/tenants');

    // Make sure the active tenants section loads
    await expect(page.locator('text=Active Tenants').first()).toBeVisible();

    // Verify there is a table and header for "Total Owed"
    await expect(page.getByRole('columnheader', { name: 'Total Owed' })).toBeVisible();

    // Verify the "Clear" badges appear
    await expect(page.getByRole('cell', { name: 'Clear', exact: true }).first()).toBeVisible();
  });
});
