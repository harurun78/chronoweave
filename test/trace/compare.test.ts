import { describe, expect, it } from 'vitest';

import { normalizedProjectToProjectState } from '../../src/io/projectFileIo';
import { motorControlOneAxisProject } from '../../src/samples/motorControl';
import { compareObservedTasks } from '../../src/trace/compare';
import { parseTraceCsv } from '../../src/trace/csvTrace';

describe('design and observation comparison', () => {
  it('reports WCET overrun, period drift, missing observation, and extra observation', () => {
    const projectState = normalizedProjectToProjectState(
      motorControlOneAxisProject
    );
    const trace = parseTraceCsv(`
task,start_ms,end_ms
ISR_Timer,0,0.05
ISR_Timer,1,1.05
MotorCtrl_X,0,3.2
MotorCtrl_X,10,13.1
SensorFusion,0,6.1
SensorFusion,24,30
ExtraMonitor,5,5.5
ExtraMonitor,15,15.5
`);

    expect(trace.ok).toBe(true);

    if (!trace.ok) {
      return;
    }

    const comparison = compareObservedTasks(projectState, trace.observed_tasks);

    expect(comparison.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'observation-motorctrl-x-wcet-overrun' }),
        expect.objectContaining({
          id: 'observation-sensorfusion-period-drift'
        }),
        expect.objectContaining({
          id: 'observation-extramonitor-extra-observation'
        })
      ])
    );
    expect(
      comparison.comparisons.find((row) => row.task_name === 'MotorCtrl_X')
    ).toMatchObject({
      status: 'matched',
      design_wcet_ms: 3,
      observed_max_execution_ms: 3.2
    });
  });

  it('reports missing design observations', () => {
    const projectState = normalizedProjectToProjectState(
      motorControlOneAxisProject
    );
    const comparison = compareObservedTasks(projectState, [
      {
        name: 'ISR_Timer',
        sample_count: 2,
        period_estimate_ms: 1,
        execution_time_avg_ms: 0.05,
        execution_time_min_ms: 0.05,
        execution_time_max_ms: 0.05
      }
    ]);

    expect(comparison.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'observation-motorctrl-x-missing-observation'
        }),
        expect.objectContaining({
          id: 'observation-sensorfusion-missing-observation'
        })
      ])
    );
  });
});
