import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('renders core workspace at mobile viewport (480x800)', async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 800 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Chronoweave' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Task List' })).toBeVisible();
  // Page must not introduce horizontal page-level scroll wider than viewport + 1px tolerance.
  const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect(docWidth).toBeLessThanOrEqual(viewportWidth + 1);
});

test('renders core workspace at tablet viewport (768x1024)', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Chronoweave' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Task List' })).toBeVisible();
});
