import { test, expect } from '@playwright/test';

test.describe('Electricity Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@hostel.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should update electricity settings', async ({ page }) => {
    await page.goto('/electricity/settings');
    await page.waitForLoadState('networkidle');

    // Change settings
    await page.selectOption('select[name="electricityType"]', 'METER_BASED');
    await page.fill('input[name="electricityRatePerUnit"]', '12.5');
    await page.selectOption('select[name="billingCycle"]', 'MONTHLY');
    await page.selectOption('select[name="electricitySplitMode"]', 'STAY_DURATION');

    await page.click('button:has-text("Save Settings")');
    
    // Check for success toast (assuming toast appears)
    await expect(page.locator('text=Electricity settings updated')).toBeVisible();
    
    // Refresh and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('select[name="electricityType"]')).toHaveValue('METER_BASED');
    await expect(page.locator('input[name="electricityRatePerUnit"]')).toHaveValue('12.5');
  });

  test('should assign a meter to a room', async ({ page }) => {
    await page.goto('/electricity/readings');
    await page.waitForLoadState('networkidle');

    // Fill assign meter form
    const meterNumber = `MTR-${Date.now()}`;
    await page.selectOption('select[name="roomId"]', { index: 1 }); // Pick first available room
    await page.fill('input[name="meterNumber"]', meterNumber);
    await page.fill('input[name="installationDate"]', '2024-01-01');

    await page.click('button:has-text("Assign Meter")');
    await expect(page.locator('text=Meter assigned')).toBeVisible();

    // Verify it appears in readings dropdown
    await expect(page.locator('select[name="meterId"]')).toContainText(meterNumber);
  });

  test('should record a meter reading', async ({ page }) => {
    await page.goto('/electricity/readings');
    await page.waitForLoadState('networkidle');

    // Select first meter
    const meterSelect = page.locator('select[name="meterId"]');
    const meterOptions = await meterSelect.locator('option').all();
    if (meterOptions.length <= 1) {
        // Create one if none exists
        await page.selectOption('select[name="roomId"]', { index: 1 });
        await page.fill('input[name="meterNumber"]', `MTR-${Date.now()}`);
        await page.fill('input[name="installationDate"]', '2024-01-01');
        await page.click('button:has-text("Assign Meter")');
        await page.waitForTimeout(1000);
    }

    await page.selectOption('select[name="meterId"]', { index: 1 });
    await page.fill('input[name="currentReading"]', '150.5');
    await page.fill('input[name="readingDate"]', '2024-03-01');
    await page.fill('input[name="notes"]', 'E2E Test Reading');

    await page.click('button:has-text("Save Reading")');
    await expect(page.locator('text=Reading recorded')).toBeVisible();

    // Verify it appears in recent readings table
    await expect(page.locator('table')).toContainText('150.5');
    await expect(page.locator('table')).toContainText('E2E Test Reading');
  });

  test('should display electricity reports page', async ({ page }) => {
    await page.goto('/electricity/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Electricity Usage Reports/i })).toBeVisible();
  });
});
