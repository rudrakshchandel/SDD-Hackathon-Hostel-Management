import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should redirect an unauthenticated user to the login page', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should allow a user to log in', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Default admin credentials
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    
    // Submit the form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
    await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible({ timeout: 15000 });
  });
});
