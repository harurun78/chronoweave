import { expect, type Page, test } from '@playwright/test';

async function inputValueCount(page: Page, value: string) {
  return page
    .locator('input')
    .evaluateAll(
      (inputs, expectedValue) =>
        inputs.filter(
          (input) => (input as HTMLInputElement).value === expectedValue
        ).length,
      value
    );
}

async function measureDuration(page: Page, name: string) {
  return page.evaluate((measureName) => {
    const entries = performance.getEntriesByName(measureName, 'measure');
    return entries.at(-1)?.duration ?? Number.POSITIVE_INFINITY;
  }, name);
}

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

test('runs the representative Phase 1 design loop', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Motor Control 1-axis' }).click();
  await expect
    .poll(() => inputValueCount(page, 'ISR_Timer'))
    .toBeGreaterThan(0);
  await expect(
    page.getByText(/Phase 1 approximate response time/)
  ).toBeVisible();

  await page.getByRole('button', { name: 'Duplicate' }).click();
  await expect.poll(() => inputValueCount(page, 'MotorCtrl_Y')).toBe(2);

  const handle = page.getByTestId('wcet-handle-motorctrl-y');
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  if (box !== null) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 80, box.y + box.height / 2, { steps: 4 });
    await page.mouse.up();
  }

  await expect(page.getByText(/Aperiodic capacity reference/)).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export YAML' }).click();
  const download = await downloadPromise;
  const exportedPath = await download.path();
  expect(exportedPath).not.toBeNull();

  await page.getByRole('button', { name: 'Motor Control 1-axis' }).click();
  await expect.poll(() => inputValueCount(page, 'MotorCtrl_Y')).toBe(0);

  if (exportedPath !== null) {
    await page.getByTestId('project-file-input').setInputFiles(exportedPath);
  }

  await expect.poll(() => inputValueCount(page, 'MotorCtrl_Y')).toBe(1);
  await expect(
    page.getByText(/Phase 1 approximate response time/)
  ).toBeVisible();
  await expect
    .poll(() => measureDuration(page, 'chronoweave-export-yaml'))
    .toBeLessThan(300);
  await expect
    .poll(() => measureDuration(page, 'chronoweave-import'))
    .toBeLessThan(300);
  await expect
    .poll(() => measureDuration(page, 'chronoweave-wcet-drag'))
    .toBeLessThan(100);
  await expect
    .poll(() =>
      measureDuration(page, 'chronoweave-project-state-commit-to-redraw')
    )
    .toBeLessThan(100);
});
