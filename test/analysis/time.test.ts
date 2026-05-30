import { describe, expect, it } from 'vitest';

import {
  createTickGridProblems,
  isOnTickGrid,
  millisecondsToMicroseconds,
  millisecondsToTicks
} from '../../src/analysis/time';
import type { NormalizedTaskModel } from '../../src/model/project';

describe('analysis time helpers', () => {
  it('converts fractional milliseconds to integer microseconds without tick rounding', () => {
    expect(millisecondsToMicroseconds(0.05)).toBe(50);
    expect(millisecondsToMicroseconds(3.125)).toBe(3125);
  });

  it('checks whether periods and deadlines align to the tick grid', () => {
    expect(isOnTickGrid(10, 1)).toBe(true);
    expect(isOnTickGrid(7.5, 0.5)).toBe(true);
    expect(isOnTickGrid(7.25, 0.5)).toBe(false);
  });

  it('converts aligned millisecond values to ticks', () => {
    expect(millisecondsToTicks(20, 1)).toBe(20);
    expect(millisecondsToTicks(7.5, 0.5)).toBe(15);
    expect(millisecondsToTicks(7.25, 0.5)).toBeNull();
  });

  it('creates task-linked Problems for period and deadline tick-grid violations', () => {
    const task: NormalizedTaskModel = {
      id: 'off-grid-task',
      name: 'OffGridTask',
      period_ms: 7.25,
      wcet_ms: 1,
      deadline_ms: 7.75,
      priority_mode: 'auto',
      stack: 'low'
    };

    expect(createTickGridProblems([task], 0.5)).toEqual([
      expect.objectContaining({
        id: 'analysis-off-grid-task-period-tick-grid',
        level: 'error',
        task_id: 'off-grid-task'
      }),
      expect.objectContaining({
        id: 'analysis-off-grid-task-deadline-tick-grid',
        level: 'error',
        task_id: 'off-grid-task'
      })
    ]);
  });
});
