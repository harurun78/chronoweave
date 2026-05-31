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

function createTwoDomainProjectState() {
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

  return projectState;
}

describe('analysis kernel multi-domain orchestration', () => {
  it('keeps priorities and response times isolated per domain', () => {
    const snapshot = analyzeProject(createTwoDomainProjectState());

    expect(
      snapshot.tasks.find((task) => task.task_id === 'isr-timer')
    ).toMatchObject({
      effective_priority: 1,
      iterative_response_time_ms: 0.05
    });
    expect(
      snapshot.tasks.find((task) => task.task_id === 'sensor-fusion')
    ).toMatchObject({
      effective_priority: 2,
      iterative_response_time_ms: 6.35
    });
    expect(
      snapshot.tasks.find((task) => task.task_id === 'motorctrl-x')
    ).toMatchObject({
      effective_priority: 1,
      iterative_response_time_ms: 3
    });

    // Same manual priority is valid across separate domains.
    expect(
      snapshot.problems.some((problem) =>
        problem.id.includes('manual-priority-duplicate')
      )
    ).toBe(false);
  });

  it('merges domain-scoped problems with stable unique ids', () => {
    const snapshot = analyzeProject(createTwoDomainProjectState());

    expect(snapshot.domains).toHaveLength(2);
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
});
