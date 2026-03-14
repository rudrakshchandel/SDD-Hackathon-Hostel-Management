import { test, expect } from '@playwright/test';

test.describe('Revenue and Hostel Config', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@hostel.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display revenue ledger and summary cards', async ({ page }) => {
    await page.goto('/revenue');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Revenue Ledger' })).toBeVisible();
    
    // Verify summary cards
    await expect(page.locator('dt:has-text("Total Invoiced")')).toBeVisible();
    await expect(page.locator('dt:has-text("Total Collected")')).toBeVisible();
    await expect(page.locator('dt:has-text("Total Due")')).toBeVisible();

    // Verify presence of "Download Fees CSV" button
    await expect(page.locator('text=Download Fees CSV')).toBeVisible();

    // Verify at least one hostel entry exists (if data seeded)
    const hostelEntries = await page.locator('article').all();
    if (hostelEntries.length > 0) {
      await expect(hostelEntries[0]).toBeVisible();
    }
  });

  test('should manage hostel configuration profile', async ({ page }) => {
    await page.goto('/hostel');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Hostel Configuration' })).toBeVisible();
    
    // Check profile form
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toBeVisible();
    
    // Update profile
    const newName = `Hostel ${Date.now()}`;
    await nameInput.fill(newName);
    await page.click('button:has-text("Update Hostel")');
    
    await expect(page.locator('text=Hostel profile updated')).toBeVisible();
  });

  test('should display and interact with the structure tree', async ({ page }) => {
    await page.goto('/hostel');
    await page.waitForLoadState('networkidle');

    // Verify Block addition form
    await expect(page.getByPlaceholder('New block name')).toBeVisible();

    // Expand first block if exists
    const blockButton = page.locator('button:has-text("Block:")').first();
    if (await blockButton.isVisible()) {
      await blockButton.click();
      await expect(page.locator('text=Save Block')).toBeVisible();
      
      // Expand floor if exists
      const floorButton = page.locator('button:has-text("Floor ")').first();
      if (await floorButton.isVisible()) {
        await floorButton.click();
        await expect(page.locator('text=Save Floor')).toBeVisible();
      }
    }
  });
});
