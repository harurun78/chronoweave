import { describe, expect, it } from 'vitest';

import { calculateLcm, calculateScheduleLcm } from '../../src/analysis/lcm';
import type { NormalizedTaskModel } from '../../src/model/project';

describe('analysis LCM helpers', () => {
  it('calculates the least common multiple for integer tick periods', () => {
    expect(calculateLcm([1, 10, 20])).toBe(20);
    expect(calculateLcm([127, 131])).toBe(16637);
  });

  it('calculates schedule LCM in ticks and milliseconds', () => {
    const tasks: NormalizedTaskModel[] = [
      createTask('isr-timer', 1),
      createTask('motorctrl-x', 10),
      createTask('sensor-fusion', 20)
    ];

    expect(calculateScheduleLcm(tasks, 1)).toMatchObject({
      lcm_ticks: 20,
      lcm_ms: 20,
      problems: []
    });
  });

  it('creates a warning when the LCM exceeds the Phase 1 target', () => {
    const tasks: NormalizedTaskModel[] = [
      createTask('slow-a', 127),
      createTask('slow-b', 131)
    ];

    expect(calculateScheduleLcm(tasks, 1)).toMatchObject({
      lcm_ticks: 16637,
      lcm_ms: 16637,
      problems: [
        expect.objectContaining({
          id: 'analysis-lcm-too-large',
          level: 'warning',
          source: 'analysis'
        })
      ]
    });
  });

  it('ignores off-grid periods so tick-grid validation can report them separately', () => {
    const tasks: NormalizedTaskModel[] = [
      createTask('aligned', 10),
      createTask('off-grid', 7.25)
    ];

    expect(calculateScheduleLcm(tasks, 0.5)).toMatchObject({
      lcm_ticks: 20,
      lcm_ms: 10
    });
  });
});

function createTask(id: string, periodMs: number): NormalizedTaskModel {
  return {
    id,
    name: id,
    period_ms: periodMs,
    wcet_ms: 1,
    deadline_ms: periodMs,
    priority_mode: 'auto',
    stack: 'low'
  };
}
