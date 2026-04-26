import { expect, test } from '@playwright/test';

test('mounts the app shell', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#app')).toBeAttached();
  await expect(page.locator('[data-testid="hud-root"]')).toBeVisible();
  await expect(page.locator('[data-testid="canvas-host"]')).toBeVisible();
});
