import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  migrateProjectFile,
  parseProjectFileJson,
  parseProjectFileYaml,
  validateProjectFile
} from '../../src/schema/projectFile';

const fixtureDirectory = join(process.cwd(), 'test/fixtures/project-files');

function readFixture(fileName: string) {
  return readFileSync(join(fixtureDirectory, fileName), 'utf8');
}

describe('ProjectFile schema validation and normalization', () => {
  it('validates the Motor Control 1-axis YAML fixture', () => {
    const result = parseProjectFileYaml(
      readFixture('motor-control-1-axis.yaml')
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.normalizedProjectFile.tasks.map((task) => task.name)).toEqual(
      ['ISR_Timer', 'MotorCtrl_X', 'SensorFusion']
    );
    expect(result.normalizedProjectFile.tasks[0].wcet_ms).toBe(0.05);
  });

  it('validates YAML and JSON through the same logical schema', () => {
    const yamlResult = parseProjectFileYaml(
      readFixture('motor-control-1-axis.yaml')
    );
    const jsonResult = parseProjectFileJson(
      readFixture('motor-control-1-axis.json')
    );

    expect(yamlResult.ok).toBe(true);
    expect(jsonResult.ok).toBe(true);

    if (!yamlResult.ok || !jsonResult.ok) {
      return;
    }

    expect(jsonResult.normalizedProjectFile).toEqual(
      yamlResult.normalizedProjectFile
    );
  });

  it('normalizes omitted deadline and priority mode defaults', () => {
    const result = parseProjectFileYaml(readFixture('defaults.yaml'));

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.normalizedProjectFile.tasks[0]).toMatchObject({
      deadline_ms: 5,
      priority_mode: 'auto'
    });
    expect(result.normalizedProjectFile.aperiodic_tasks).toEqual([]);
  });

  it('validates ProjectFile v0.2 aperiodic tasks and Sporadic Server', () => {
    const result = parseProjectFileYaml(readFixture('phase-2-aperiodic.yaml'));

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.normalizedProjectFile).toMatchObject({
      version: '0.2',
      aperiodic_tasks: [
        expect.objectContaining({ id: 'diagnostics-request', wcet_ms: 1.5 })
      ],
      sporadic_server: expect.objectContaining({
        enabled: true,
        deadline_ms: 20,
        priority_mode: 'manual'
      }),
      codegen: { plugin: 'freertos', namespace: 'MotorDemo' }
    });
  });

  it('rejects duplicate ids across periodic and aperiodic tasks', () => {
    const result = validateProjectFile({
      version: '0.2',
      global: {
        tick_ms: 1,
        stack_presets: { low: 512, mid: 2048, high: 4096 }
      },
      tasks: [
        {
          id: 'shared-id',
          name: 'Periodic',
          period_ms: 10,
          wcet_ms: 1,
          stack: 'low'
        }
      ],
      aperiodic_tasks: [
        {
          id: 'shared-id',
          name: 'Aperiodic',
          wcet_ms: 1,
          stack: 'low'
        }
      ]
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(
      result.problems.map((problem) => problem.message).join('\n')
    ).toContain('Duplicate task id: shared-id');
  });

  it('rejects invalid schema values as schema/import problems', () => {
    const result = parseProjectFileYaml(readFixture('invalid-schema.yaml'));

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ level: 'error', source: 'import' })
      ])
    );
    expect(
      result.problems.map((problem) => problem.message).join('\n')
    ).toContain('wcet_ms');
  });

  it('reports invalid YAML syntax as an import problem', () => {
    const result = parseProjectFileYaml(readFixture('invalid-syntax.yaml'));

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.problems[0]).toMatchObject({
      id: 'import-yaml-syntax',
      level: 'error',
      source: 'import'
    });
  });

  it('rejects unknown task fields because the ProjectFile contract is strict', () => {
    const result = parseProjectFileYaml(readFixture('unknown-field.yaml'));

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(
      result.problems.map((problem) => problem.message).join('\n')
    ).toContain('Unrecognized key');
  });

  it('rejects duplicate task ids as schema problems', () => {
    const result = parseProjectFileYaml(readFixture('duplicate-task-id.yaml'));

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(
      result.problems.map((problem) => problem.message).join('\n')
    ).toContain('Duplicate task id: duplicate-task');
  });

  it('requires manual priority when priority mode is manual', () => {
    const result = validateProjectFile({
      version: '0.1',
      global: {
        tick_ms: 1,
        stack_presets: { low: 512, mid: 2048, high: 4096 }
      },
      tasks: [
        {
          id: 'manual-task',
          name: 'ManualTask',
          period_ms: 10,
          wcet_ms: 1,
          priority_mode: 'manual',
          stack: 'low'
        }
      ]
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(
      result.problems.map((problem) => problem.message).join('\n')
    ).toContain('manual_priority is required');
  });

  it.each([
    'lcm-warning.yaml',
    'high-utilization.yaml',
    'memory-warning.yaml',
    'phase-2-budget-exceeded.yaml',
    'phase-2-no-server.yaml',
    'phase-2-iterative-deadline-miss.yaml'
  ])('keeps the %s analysis fixture schema-valid', (fixtureName) => {
    const result = parseProjectFileYaml(readFixture(fixtureName));

    expect(result.ok).toBe(true);
  });
});

describe('ProjectFile migrator (T005)', () => {
  it('migrates a v0.1 ProjectFile to v0.3 with the default domain', () => {
    const result = parseProjectFileYaml(
      readFixture('motor-control-1-axis.yaml')
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.projectFile.version).toBe('0.1');

    const migrated = migrateProjectFile(result.projectFile);

    expect(migrated.version).toBe('0.3');
    expect(migrated.domains).toEqual([
      { id: 'default', name: 'Default RTOS', kind: 'rtos', core_count: 1 }
    ]);
    expect(migrated.channels).toEqual([]);
    expect(migrated.stochastic_events).toEqual([]);
    migrated.tasks.forEach((task) => {
      expect(task.domain_id).toBe('default');
    });
    expect(migrated.tasks.map((t) => t.id)).toEqual(
      result.projectFile.tasks.map((t) => t.id)
    );
    expect(migrated.global).toEqual(result.projectFile.global);
  });

  it('migrates a v0.2 ProjectFile preserving aperiodic and sporadic fields', () => {
    const result = parseProjectFileYaml(readFixture('phase-2-aperiodic.yaml'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.projectFile.version).toBe('0.2');

    const migrated = migrateProjectFile(result.projectFile);

    expect(migrated.version).toBe('0.3');
    expect(migrated.domains?.[0]?.id).toBe('default');
    migrated.aperiodic_tasks?.forEach((task) => {
      expect(task.domain_id).toBe('default');
    });
    if (migrated.sporadic_server) {
      expect(migrated.sporadic_server.domain_id).toBe('default');
    }
    expect(migrated.aperiodic_tasks?.map((t) => t.id)).toEqual(
      result.projectFile.aperiodic_tasks?.map((t) => t.id)
    );
  });

  it('is idempotent on a v0.3 ProjectFile', () => {
    const v03Input = {
      version: '0.3' as const,
      global: {
        tick_ms: 1,
        stack_presets: { low: 512, mid: 2048, high: 4096 }
      },
      domains: [
        { id: 'rtos', name: 'RTOS', kind: 'rtos' as const, core_count: 1 }
      ],
      tasks: [
        {
          id: 't1',
          name: 'T1',
          period_ms: 10,
          wcet_ms: 1,
          stack: 'low' as const,
          domain_id: 'rtos'
        }
      ]
    };
    const result = validateProjectFile(v03Input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const migrated = migrateProjectFile(result.projectFile);
    expect(migrated).toBe(result.projectFile);
  });
});
