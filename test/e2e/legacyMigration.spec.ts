import { expect, test } from '@playwright/test';

test('loads a legacy fixture and preserves baseline analysis after migration', async ({
  page
}) => {
  await page.goto('/');

  await page
    .getByTestId('project-file-input')
    .setInputFiles('test/fixtures/project-files/legacy-v02.yaml');

  await expect(page.getByRole('tab', { name: 'Default RTOS' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await expect(page.getByRole('heading', { name: 'Task List' })).toBeVisible();
  await expect(page.getByLabel('MotorCtrl_X name')).toBeVisible();
  await expect(page.getByLabel('SensorFusion name')).toBeVisible();

  await expect(
    page.getByRole('heading', { name: 'Iterative RTA' })
  ).toBeVisible();
  await expect(page.getByText('1 aperiodic tasks')).toBeVisible();
  await expect(page.getByText('Server 75%')).toBeVisible();
  await expect(page.getByText(/Phase 2 iterative response time/)).toBeVisible();
});
