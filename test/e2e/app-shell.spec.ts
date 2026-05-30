import { expect, test } from '@playwright/test';

test('shows the initial Chronoweave workspace', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Chronoweave' })
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Task List' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Gantt' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Property Panel' })
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Problems' })).toBeVisible();
});
