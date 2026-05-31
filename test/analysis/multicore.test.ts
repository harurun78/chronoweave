import { describe, expect, it } from 'vitest';

import { analyzeMulticoreDomain } from '../../src/analysis/multicore';
import type { Domain, NormalizedTaskModel } from '../../src/model/project';

const multicoreDomain: Domain = {
  id: 'rtos-dual-core',
  name: 'RTOS Dual Core',
  kind: 'rtos',
  core_count: 2
};

function createTasks(): NormalizedTaskModel[] {
  return [
    {
      id: 'core0-fast',
      name: 'Core0Fast',
      period_ms: 10,
      wcet_ms: 7,
      deadline_ms: 10,
      priority_mode: 'auto',
      stack: 'mid',
      domain_id: multicoreDomain.id,
      core_index: 0
    },
    {
      id: 'core0-slow',
      name: 'Core0Slow',
      period_ms: 20,
      wcet_ms: 5,
      deadline_ms: 20,
      priority_mode: 'auto',
      stack: 'mid',
      domain_id: multicoreDomain.id,
      core_index: 0
    },
    {
      id: 'core1-fast',
      name: 'Core1Fast',
      period_ms: 10,
      wcet_ms: 1,
      deadline_ms: 10,
      priority_mode: 'auto',
      stack: 'low',
      domain_id: multicoreDomain.id,
      core_index: 1
    },
    {
      id: 'core1-slow',
      name: 'Core1Slow',
      period_ms: 20,
      wcet_ms: 2,
      deadline_ms: 20,
      priority_mode: 'auto',
      stack: 'low',
      domain_id: multicoreDomain.id,
      core_index: 1
    }
  ];
}

describe('multicore kernel', () => {
  it('keeps priorities and RTA isolated per core', () => {
    const result = analyzeMulticoreDomain(multicoreDomain, createTasks());

    expect(result.problems).toEqual([]);
    expect(result.coreAssignments[0].map((task) => task.id)).toEqual([
      'core0-fast',
      'core0-slow'
    ]);
    expect(result.coreAssignments[1].map((task) => task.id)).toEqual([
      'core1-fast',
      'core1-slow'
    ]);

    const core0Fast = result.taskAnalyses.find(
      (analysis) => analysis.task_id === 'core0-fast'
    );
    const core0Slow = result.taskAnalyses.find(
      (analysis) => analysis.task_id === 'core0-slow'
    );
    const core1Fast = result.taskAnalyses.find(
      (analysis) => analysis.task_id === 'core1-fast'
    );
    const core1Slow = result.taskAnalyses.find(
      (analysis) => analysis.task_id === 'core1-slow'
    );

    expect(core0Fast?.effective_priority).toBe(1);
    expect(core0Slow?.effective_priority).toBe(2);
    expect(core1Fast?.effective_priority).toBe(1);
    expect(core1Slow?.effective_priority).toBe(2);

    // core1 response time remains low and is unaffected by core0 heavy load.
    expect(core1Slow?.iterative_response_time_ms).toBe(3);
    expect(core0Slow?.iterative_response_time_ms).toBeGreaterThan(
      core1Slow?.iterative_response_time_ms ?? 0
    );
  });

  it('reports invalid core pinning for missing and out-of-range assignments', () => {
    const invalidTasks: NormalizedTaskModel[] = [
      {
        id: 'missing-core',
        name: 'MissingCore',
        period_ms: 10,
        wcet_ms: 1,
        deadline_ms: 10,
        priority_mode: 'auto',
        stack: 'low',
        domain_id: multicoreDomain.id
      },
      {
        id: 'out-of-range',
        name: 'OutOfRange',
        period_ms: 20,
        wcet_ms: 2,
        deadline_ms: 20,
        priority_mode: 'auto',
        stack: 'mid',
        domain_id: multicoreDomain.id,
        core_index: 2
      }
    ];

    const result = analyzeMulticoreDomain(multicoreDomain, invalidTasks);

    expect(result.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'analysis-missing-core-missing-core-index',
          level: 'error'
        }),
        expect.objectContaining({
          id: 'analysis-out-of-range-core-index-out-of-range',
          level: 'error'
        })
      ])
    );
    expect(result.taskAnalyses).toEqual([]);
  });
});
