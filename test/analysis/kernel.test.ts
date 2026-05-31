import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { analyzeProject } from '../../src/analysis/kernel';
import { normalizedProjectToProjectState } from '../../src/io/projectFileIo';
import { parseProjectFileYaml } from '../../src/schema/projectFile';

const fixtureDirectory = join(process.cwd(), 'test/fixtures/project-files');

function loadProjectState(fileName: string) {
  const result = parseProjectFileYaml(
    readFileSync(join(fixtureDirectory, fileName), 'utf8')
  );
  if (!result.ok) {
    throw new Error(
      result.problems.map((problem) => problem.message).join('\n')
    );
  }

  return normalizedProjectToProjectState(result.normalizedProjectFile);
}

describe('analysis kernel', () => {
  it('creates a representative AnalysisSnapshot for the Motor Control fixture', () => {
    const snapshot = analyzeProject(
      loadProjectState('motor-control-1-axis.yaml')
    );

    expect(snapshot).toMatchObject({
      lcm_ticks: 20,
      lcm_ms: 20,
      aperiodic_capacity_percent: 48,
      memory_profile: {
        peak_bytes: 4608,
        capacity_bytes: 65536
      }
    });
    expect(snapshot.tasks).toEqual([
      expect.objectContaining({
        task_id: 'isr-timer',
        effective_priority: 1,
        buffer_remaining_ms: 0.95,
        schedulable: true
      }),
      expect.objectContaining({
        task_id: 'motorctrl-x',
        effective_priority: 2,
        buffer_remaining_ms: 6.95,
        schedulable: true
      }),
      expect.objectContaining({
        task_id: 'sensor-fusion',
        effective_priority: 3,
        buffer_remaining_ms: 10.95,
        schedulable: true
      })
    ]);
    expect(snapshot.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'analysis-approximate-rta-info',
          level: 'info'
        }),
        expect.objectContaining({
          id: 'analysis-iterative-rta-info',
          level: 'info'
        })
      ])
    );
    expect(snapshot.domains).toBeUndefined();
    expect(
      snapshot.problems.every((problem) => problem.domain_id === undefined)
    ).toBe(true);
  });

  it('analyzes two domains independently and merges domain-scoped problems', () => {
    const projectState = loadProjectState('motor-control-1-axis.yaml');
    projectState.version = '0.3';
    projectState.domains = [
      { id: 'rtos', name: 'RTOS', kind: 'rtos', core_count: 1 },
      { id: 'baremetal', name: 'Baremetal', kind: 'baremetal', core_count: 1 }
    ];
    projectState.tasks = projectState.tasks.map((task) => {
      if (task.id === 'motorctrl-x') {
        return {
          ...task,
          domain_id: 'baremetal',
          priority_mode: 'manual',
          manual_priority: 1
        };
      }

      return {
        ...task,
        domain_id: 'rtos',
        priority_mode: 'manual',
        manual_priority: task.id === 'isr-timer' ? 1 : 2
      };
    });

    const snapshot = analyzeProject(projectState);
    const rtosDomain = snapshot.domains?.find(
      (domain) => domain.domain_id === 'rtos'
    );
    const baremetalDomain = snapshot.domains?.find(
      (domain) => domain.domain_id === 'baremetal'
    );

    expect(snapshot.domains).toHaveLength(2);
    expect(rtosDomain?.tasks.map((task) => task.task_id)).toEqual([
      'isr-timer',
      'sensor-fusion'
    ]);
    expect(baremetalDomain?.tasks.map((task) => task.task_id)).toEqual([
      'motorctrl-x'
    ]);
    expect(rtosDomain?.cores).toEqual([
      { core_index: 0, task_ids: ['isr-timer', 'sensor-fusion'] }
    ]);
    expect(baremetalDomain?.cores).toEqual([
      { core_index: 0, task_ids: ['motorctrl-x'] }
    ]);

    expect(
      snapshot.tasks.find((task) => task.task_id === 'sensor-fusion')
    ).toMatchObject({
      effective_priority: 2,
      buffer_consumed_ms: 0.05,
      approximate_response_time_ms: 6.05,
      iterative_response_time_ms: 6.35
    });
    expect(
      snapshot.tasks.find((task) => task.task_id === 'motorctrl-x')
    ).toMatchObject({
      effective_priority: 1,
      buffer_consumed_ms: 0,
      iterative_response_time_ms: 3
    });
    expect(
      snapshot.problems.some((problem) =>
        problem.id.includes('manual-priority-duplicate')
      )
    ).toBe(false);
    expect(snapshot.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'analysis-rtos-approximate-rta-info',
          domain_id: 'rtos'
        }),
        expect.objectContaining({
          id: 'analysis-baremetal-approximate-rta-info',
          domain_id: 'baremetal'
        })
      ])
    );
    expect(new Set(snapshot.problems.map((problem) => problem.id)).size).toBe(
      snapshot.problems.length
    );
  });

  it('caps excessive domain and core analysis fan-out with Problems', () => {
    const projectState = loadProjectState('motor-control-1-axis.yaml');
    projectState.version = '0.3';
    projectState.domains = Array.from({ length: 65 }, (_, index) => ({
      id: `domain-${index}`,
      name: `Domain ${index}`,
      kind: 'rtos' as const,
      core_count: index === 0 ? 65 : 1
    }));
    projectState.tasks = projectState.tasks.map((task) => ({
      ...task,
      domain_id: 'domain-0'
    }));

    const snapshot = analyzeProject(projectState);

    expect(snapshot.domains).toHaveLength(64);
    expect(snapshot.domains?.[0].cores).toHaveLength(64);
    expect(snapshot.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'analysis-domain-count-too-large' }),
        expect.objectContaining({
          id: 'analysis-domain-0-core-count-too-large',
          domain_id: 'domain-0'
        })
      ])
    );
  });

  it('reports merged RAM capacity warnings across domains', () => {
    const projectState = loadProjectState('motor-control-1-axis.yaml');
    projectState.version = '0.3';
    projectState.global.ram_capacity = 8192;
    projectState.domains = [
      { id: 'rtos', name: 'RTOS', kind: 'rtos', core_count: 1 },
      { id: 'baremetal', name: 'Baremetal', kind: 'baremetal', core_count: 1 }
    ];
    projectState.tasks = projectState.tasks.slice(0, 2).map((task, index) => ({
      ...task,
      period_ms: 10,
      wcet_ms: 1,
      deadline_ms: 10,
      stack: 'high',
      domain_id: index === 0 ? 'rtos' : 'baremetal'
    }));

    const snapshot = analyzeProject(projectState);
    const mergedMemoryProblem = snapshot.problems.find(
      (problem) => problem.id === 'analysis-ram-capacity-warning'
    );

    expect(snapshot.memory_profile.peak_bytes).toBe(8192);
    expect(mergedMemoryProblem).toBeDefined();
    expect(mergedMemoryProblem?.domain_id).toBeUndefined();
    expect(
      snapshot.problems.some(
        (problem) =>
          problem.id.includes('rtos-ram-capacity-warning') ||
          problem.id.includes('baremetal-ram-capacity-warning')
      )
    ).toBe(false);
  });

  it('merges channel validation results into AnalysisSnapshot', () => {
    const projectState = loadProjectState('motor-control-1-axis.yaml');
    projectState.version = '0.3';
    projectState.channels = [
      {
        id: 'ch-ok',
        producer_task_id: 'isr-timer',
        consumer_task_id: 'motorctrl-x',
        transport: 'mailbox',
        latency_budget_ms: 2
      },
      {
        id: 'ch-missing-consumer',
        producer_task_id: 'isr-timer',
        consumer_task_id: 'missing-consumer',
        transport: 'queue',
        latency_budget_ms: 1
      }
    ];

    const snapshot = analyzeProject(projectState);

    expect(snapshot.channels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ channel_id: 'ch-ok', valid: true }),
        expect.objectContaining({
          channel_id: 'ch-missing-consumer',
          valid: false
        })
      ])
    );
    expect(snapshot.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'analysis-channel-ch-missing-consumer-missing-consumer'
        })
      ])
    );
  });

  it('merges channel Problems once in multi-domain analysis', () => {
    const projectState = loadProjectState('motor-control-1-axis.yaml');
    projectState.version = '0.3';
    projectState.domains = [
      { id: 'rtos', name: 'RTOS', kind: 'rtos', core_count: 1 },
      { id: 'linux', name: 'Linux', kind: 'linux', core_count: 1 }
    ];
    projectState.tasks = projectState.tasks.map((task) => ({
      ...task,
      domain_id: task.id === 'isr-timer' ? 'rtos' : 'linux'
    }));
    projectState.channels = [
      {
        id: 'ch-cross-domain',
        producer_task_id: 'isr-timer',
        consumer_task_id: 'motorctrl-x',
        transport: 'shared_memory',
        latency_budget_ms: 2
      },
      {
        id: 'ch-missing-producer',
        producer_task_id: 'missing-producer',
        consumer_task_id: 'motorctrl-x',
        transport: 'queue',
        latency_budget_ms: 2
      }
    ];

    const snapshot = analyzeProject(projectState);
    const missingProducerProblems = snapshot.problems.filter(
      (problem) =>
        problem.id === 'analysis-channel-ch-missing-producer-missing-producer'
    );

    expect(snapshot.channels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          channel_id: 'ch-cross-domain',
          valid: true
        }),
        expect.objectContaining({
          channel_id: 'ch-missing-producer',
          valid: false
        })
      ])
    );
    expect(missingProducerProblems).toHaveLength(1);
  });

  it('reports large LCM, high utilization, and memory warning fixtures', () => {
    expect(
      analyzeProject(loadProjectState('lcm-warning.yaml')).problems
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'analysis-lcm-too-large' })
      ])
    );
    const highUtilizationProject = loadProjectState('high-utilization.yaml');
    highUtilizationProject.tasks = highUtilizationProject.tasks.map((task) =>
      task.id === 'control-slow' ? { ...task, wcet_ms: 7 } : task
    );

    expect(analyzeProject(highUtilizationProject).problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'analysis-control-slow-low-buffer' })
      ])
    );
    expect(
      analyzeProject(loadProjectState('memory-warning.yaml')).problems
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'analysis-ram-capacity-warning' })
      ])
    );
  });

  it('validates manual priority direction, range, and duplicates', () => {
    const projectState = loadProjectState('motor-control-1-axis.yaml');
    projectState.tasks = projectState.tasks.map((task, index) => ({
      ...task,
      priority_mode: 'manual',
      manual_priority: index === 2 ? 2 : index + 1
    }));

    expect(analyzeProject(projectState).problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'analysis-motorctrl-x-manual-priority-duplicate'
        }),
        expect.objectContaining({
          id: 'analysis-sensor-fusion-manual-priority-duplicate'
        })
      ])
    );

    projectState.tasks[2].manual_priority = 5;
    expect(analyzeProject(projectState).problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'analysis-sensor-fusion-manual-priority-range'
        })
      ])
    );
  });

  it('analyzes Phase 2 aperiodic work through Sporadic Server', () => {
    const snapshot = analyzeProject(loadProjectState('phase-2-aperiodic.yaml'));

    expect(snapshot.sporadic_server).toMatchObject({
      enabled: true,
      budget_ms: 2,
      period_ms: 20,
      effective_priority: 3,
      capacity_utilization_percent: 75,
      schedulable: true
    });
    expect(
      snapshot.tasks.find((task) => task.task_id === 'sensor-fusion')
    ).toMatchObject({
      effective_priority: 4,
      iterative_response_time_ms: 14.75,
      iterative_schedulable: true
    });
    expect(snapshot.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'analysis-iterative-rta-info' })
      ])
    );
  });

  it('reports Phase 2 server and iterative RTA Problems', () => {
    expect(
      analyzeProject(loadProjectState('phase-2-budget-exceeded.yaml')).problems
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'analysis-sporadic-server-budget-exceeded'
        })
      ])
    );
    expect(
      analyzeProject(loadProjectState('phase-2-no-server.yaml')).problems
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'analysis-aperiodic-no-sporadic-server' })
      ])
    );
    expect(
      analyzeProject(loadProjectState('phase-2-iterative-deadline-miss.yaml'))
        .problems
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'analysis-slow-iterative-deadline-miss' })
      ])
    );
  });
});
