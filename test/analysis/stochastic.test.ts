import { describe, expect, it } from 'vitest';

import { stochasticToAperiodic } from '../../src/analysis/stochastic';
import type {
  NormalizedTaskModel,
  StochasticEventSource
} from '../../src/model/project';

const tasks: NormalizedTaskModel[] = [
  {
    id: 'cmd-handler',
    name: 'CmdHandler',
    period_ms: 20,
    wcet_ms: 0.8,
    deadline_ms: 20,
    priority_mode: 'auto',
    stack: 'low',
    domain_id: 'rtos'
  },
  {
    id: 'control-loop',
    name: 'ControlLoop',
    period_ms: 5,
    wcet_ms: 1.2,
    deadline_ms: 5,
    priority_mode: 'auto',
    stack: 'mid',
    domain_id: 'rtos',
    core_index: 0
  }
];

const linuxEvent: StochasticEventSource = {
  id: 'linux-cmd',
  name: 'Linux Command',
  domain_id: 'linux',
  mean_interarrival_ms: 50,
  std_dev_ms: 10,
  consumer_task_id: 'cmd-handler'
};

describe('stochastic event adapter', () => {
  it('adds synthetic aperiodic load and provenance info for event sources', () => {
    const result = stochasticToAperiodic([linuxEvent], tasks);

    expect(result.syntheticAperiodicTasks).toEqual([
      expect.objectContaining({
        id: 'stochastic-linux-cmd',
        name: 'Linux Command -> CmdHandler',
        wcet_ms: 0.8,
        domain_id: 'rtos'
      })
    ]);
    expect(result.analyses).toEqual([
      {
        event_id: 'linux-cmd',
        consumer_task_id: 'cmd-handler',
        synthetic_min_interarrival_ms: 50
      }
    ]);
    expect(result.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'analysis-stochastic-linux-cmd-mean-as-min-interarrival',
          level: 'info',
          task_id: 'cmd-handler',
          domain_id: 'rtos'
        })
      ])
    );
  });

  it('removes synthetic load when event list is empty', () => {
    const result = stochasticToAperiodic([], tasks);

    expect(result.syntheticAperiodicTasks).toEqual([]);
    expect(result.analyses).toEqual([]);
    expect(result.problems).toEqual([]);
  });

  it('reports an error when the consumer task does not exist', () => {
    const result = stochasticToAperiodic(
      [
        {
          ...linuxEvent,
          id: 'linux-missing',
          consumer_task_id: 'missing-task'
        }
      ],
      tasks
    );

    expect(result.syntheticAperiodicTasks).toEqual([]);
    expect(result.analyses).toEqual([]);
    expect(result.problems).toEqual([
      expect.objectContaining({
        id: 'analysis-stochastic-linux-missing-missing-consumer',
        level: 'error'
      })
    ]);
  });
});
