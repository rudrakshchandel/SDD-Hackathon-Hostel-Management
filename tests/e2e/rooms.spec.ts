import { test, expect } from '@playwright/test';

test.describe('Rooms Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Log in before testing rooms
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
  });

  test('should display the electricity section for rooms with meters', async ({ page }) => {
    // Go to rooms page
    await page.goto('/rooms');

    // Wait for the rooms to load (e.g. Room 102 which has an AC and meter)
    await expect(page.locator('text=Room 102').first()).toBeVisible();

    // Click to expand the room details (assuming they are in a details/summary or a clickable card)
    // Based on the screenshot we know the rooms are displayed. The details component is often a `<details>` element 
    // or expands on click. Let's just look for "Electricity" text if it's already visible or inside the tile.
    
    // Click the room card to expand it
    await page.click('text=Room 102 - A/F1');
    const roomCard = page.locator('.glass-panel', { hasText: 'Room 102 - A/F1' }).first();

    // Assert that the Electricity section is visible by checking the meter details
    await expect(roomCard.getByText('Electricity Meter: A-102-MTR-1')).toBeVisible();
    await expect(roomCard.getByText('No bill generated yet')).toBeVisible();
  });
});
