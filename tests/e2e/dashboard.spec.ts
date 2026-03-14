import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@hostel.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display all analytic sections', async ({ page }) => {
    // Direct check for headings
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
    
    // Check occupancy section
    await expect(page.getByRole('heading', { name: 'Occupancy Summary' })).toBeVisible();
    await expect(page.locator('dt:has-text("Total Beds")')).toBeVisible();
    await expect(page.locator('dt:has-text("Occupied Beds")')).toBeVisible();
    await expect(page.locator('dt:has-text("Vacant Beds")')).toBeVisible();

    // Check revenue section
    await expect(page.getByRole('heading', { name: 'Revenue Summary' })).toBeVisible();
    await expect(page.locator('dt:has-text("Invoiced")')).toBeVisible();
    await expect(page.locator('dt:has-text("Collected")')).toBeVisible();
    await expect(page.locator('dt:has-text("Dues")')).toBeVisible();

    // Check operations section
    await expect(page.getByRole('heading', { name: 'Operations Snapshot' })).toBeVisible();
    await expect(page.locator('text=Active Complaints')).toBeVisible();
    await expect(page.locator('text=Pending Dues')).toBeVisible();
  });

  test('should display the AI assistant card', async ({ page }) => {
    await expect(page.locator('h2:has-text("AI Assistant")')).toBeVisible();
    await expect(page.getByPlaceholder(/What's vacancy in first floor\?/i)).toBeVisible();
  });

  test('should navigate to other pages from sidebar/nav', async ({ page }) => {
    // Test navigation to Rooms
    await page.click('nav >> text=Rooms');
    await page.waitForURL('**/rooms');
    await expect(page.getByRole('heading', { name: 'Rooms Dashboard' })).toBeVisible();

    // Navigate back to Dashboard
    await page.click('nav >> text=Dashboard');
    await page.waitForURL('**/dashboard');
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
  });
});
