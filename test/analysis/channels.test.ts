import { describe, expect, it } from 'vitest';

import { validateChannels } from '../../src/analysis/channels';
import type { ProjectState } from '../../src/model/project';
import { createInitialProjectState } from '../../src/samples/motorControl';

function createProjectState(): ProjectState {
  const projectState = createInitialProjectState();
  projectState.version = '0.3';
  projectState.domains = [
    { id: 'rtos', name: 'RTOS', kind: 'rtos', core_count: 1 },
    { id: 'linux', name: 'Linux', kind: 'linux', core_count: 1 }
  ];
  projectState.tasks = projectState.tasks.map((task) => ({
    ...task,
    domain_id: task.id === 'isr-timer' ? 'rtos' : 'linux'
  }));

  return projectState;
}

describe('channel validator', () => {
  it('marks a valid cross-domain channel as valid without problems', () => {
    const projectState = createProjectState();
    projectState.channels = [
      {
        id: 'ch-valid',
        producer_task_id: 'isr-timer',
        consumer_task_id: 'motorctrl-x',
        transport: 'mailbox',
        latency_budget_ms: 2
      }
    ];

    const result = validateChannels(projectState);

    expect(result.channels).toEqual([
      {
        channel_id: 'ch-valid',
        valid: true,
        latency_budget_ms: 2
      }
    ]);
    expect(result.problems).toEqual([]);
  });

  it('reports dangling producer references', () => {
    const projectState = createProjectState();
    projectState.channels = [
      {
        id: 'ch-missing-producer',
        producer_task_id: 'missing-producer',
        consumer_task_id: 'motorctrl-x',
        transport: 'queue',
        latency_budget_ms: 5
      }
    ];

    const result = validateChannels(projectState);

    expect(result.channels[0]).toMatchObject({ valid: false });
    expect(result.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'analysis-channel-ch-missing-producer-missing-producer',
          level: 'error'
        })
      ])
    );
  });

  it('reports dangling consumer references', () => {
    const projectState = createProjectState();
    projectState.channels = [
      {
        id: 'ch-missing-consumer',
        producer_task_id: 'isr-timer',
        consumer_task_id: 'missing-consumer',
        transport: 'shared_memory',
        latency_budget_ms: 3
      }
    ];

    const result = validateChannels(projectState);

    expect(result.channels[0]).toMatchObject({ valid: false });
    expect(result.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'analysis-channel-ch-missing-consumer-missing-consumer',
          level: 'error'
        })
      ])
    );
  });

  it('emits a warning when both endpoints are in the same domain', () => {
    const projectState = createProjectState();
    projectState.channels = [
      {
        id: 'ch-same-domain',
        producer_task_id: 'motorctrl-x',
        consumer_task_id: 'sensor-fusion',
        transport: 'mailbox',
        latency_budget_ms: 1
      }
    ];

    const result = validateChannels(projectState);

    expect(result.channels[0]).toMatchObject({ valid: true });
    expect(result.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'analysis-channel-ch-same-domain-same-domain',
          level: 'warning'
        })
      ])
    );
  });
});
