import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { analyzeProject } from '../../src/analysis/kernel';
import { normalizedProjectToProjectState } from '../../src/io/projectFileIo';
import type {
  AnalysisSnapshot,
  ProjectFileVersion
} from '../../src/model/project';
import {
  migrateProjectFile,
  normalizeProjectFile,
  parseProjectFileYaml,
  validateProjectFile
} from '../../src/schema/projectFile';

const fixtureDirectory = join(process.cwd(), 'test/fixtures/project-files');
const rtaToleranceRatio = 0.01;

function readFixture(fileName: string) {
  return readFileSync(join(fixtureDirectory, fileName), 'utf8');
}

function parseFixture(fileName: string) {
  const result = parseProjectFileYaml(readFixture(fileName));

  if (!result.ok) {
    throw new Error(
      result.problems.map((problem) => problem.message).join('\n')
    );
  }

  return result;
}

function analyzeFixture(fileName: string) {
  const result = parseFixture(fileName);
  return analyzeProject(
    normalizedProjectToProjectState(result.normalizedProjectFile)
  );
}

function analyzeMigratedFixture(fileName: string) {
  const result = parseFixture(fileName);
  const migrated = migrateProjectFile(result.projectFile);
  const validation = validateProjectFile(migrated);

  if (!validation.ok) {
    throw new Error(
      validation.problems.map((problem) => problem.message).join('\n')
    );
  }

  return {
    source: result,
    migrated,
    snapshot: analyzeProject(
      normalizedProjectToProjectState(normalizeProjectFile(migrated))
    )
  };
}

function maxRtaDeltaRatio(
  baselineSnapshot: AnalysisSnapshot,
  migratedSnapshot: AnalysisSnapshot
) {
  return Math.max(
    ...baselineSnapshot.tasks.map((baselineTask) => {
      const migratedTask = migratedSnapshot.tasks.find(
        (task) => task.task_id === baselineTask.task_id
      );

      expect(migratedTask).toBeDefined();
      if (!migratedTask) return Number.POSITIVE_INFINITY;

      return (
        Math.abs(
          migratedTask.iterative_response_time_ms -
            baselineTask.iterative_response_time_ms
        ) / baselineTask.iterative_response_time_ms
      );
    })
  );
}

function expectDefaultDomainMigration(
  fileName: string,
  sourceVersion: ProjectFileVersion
) {
  const result = analyzeMigratedFixture(fileName);

  expect(result.source.projectFile.version).toBe(sourceVersion);
  expect(result.migrated.version).toBe('0.3');
  expect(result.migrated.domains).toEqual([
    { id: 'default', name: 'Default RTOS', kind: 'rtos', core_count: 1 }
  ]);
  expect(result.migrated.channels).toEqual([]);
  expect(result.migrated.stochastic_events).toEqual([]);
  result.migrated.tasks.forEach((task) => {
    expect(task.domain_id).toBe('default');
  });
  result.migrated.aperiodic_tasks?.forEach((task) => {
    expect(task.domain_id).toBe('default');
  });
  if (result.migrated.sporadic_server) {
    expect(result.migrated.sporadic_server.domain_id).toBe('default');
  }

  return result;
}

describe('legacy ProjectFile migration regression (T007)', () => {
  it('migrates v0.1 fixture to v0.3 with unchanged task RTA within 1%', () => {
    const baselineSnapshot = analyzeFixture('legacy-v01.yaml');
    const migrated = expectDefaultDomainMigration('legacy-v01.yaml', '0.1');

    expect(migrated.snapshot.tasks.map((task) => task.task_id)).toEqual(
      baselineSnapshot.tasks.map((task) => task.task_id)
    );
    expect(
      maxRtaDeltaRatio(baselineSnapshot, migrated.snapshot)
    ).toBeLessThanOrEqual(rtaToleranceRatio);
  });

  it('migrates v0.2 fixture to v0.3 preserving Phase 2 RTA within 1%', () => {
    const baselineSnapshot = analyzeFixture('legacy-v02.yaml');
    const migrated = expectDefaultDomainMigration('legacy-v02.yaml', '0.2');

    expect(migrated.snapshot.tasks.map((task) => task.task_id)).toEqual(
      baselineSnapshot.tasks.map((task) => task.task_id)
    );
    expect(
      maxRtaDeltaRatio(baselineSnapshot, migrated.snapshot)
    ).toBeLessThanOrEqual(rtaToleranceRatio);
    expect(migrated.snapshot.sporadic_server).toEqual(
      baselineSnapshot.sporadic_server
    );
  });
});
