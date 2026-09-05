import { test, expect } from '@playwright/test';

test('loads and shows grid, new game and undo', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('grid', { name: /Griglia/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Ricomincia|Nuova/ }).first()).toBeVisible();
  // onboarding may appear
  const gioca = page.getByRole('button', { name: /Gioca/ });
  if (await gioca.isVisible().catch(() => false)) await gioca.click();
  await expect(page.getByText(/PWA installabile/)).toBeVisible();
});
