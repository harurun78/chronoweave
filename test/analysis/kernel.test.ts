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
