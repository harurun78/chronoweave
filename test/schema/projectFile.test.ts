import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
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

  it.each(['lcm-warning.yaml', 'high-utilization.yaml', 'memory-warning.yaml'])(
    'keeps the %s analysis fixture schema-valid',
    (fixtureName) => {
      const result = parseProjectFileYaml(readFixture(fixtureName));

      expect(result.ok).toBe(true);
    }
  );
});
