import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

import { describe, expect, it } from 'vitest';

import { analyzeProject } from '../../src/analysis/kernel';
import { normalizedProjectToProjectState } from '../../src/io/projectFileIo';
import { parseProjectFileYaml } from '../../src/schema/projectFile';

const fixtureDirectory = join(process.cwd(), 'test/fixtures/project-files');
const RUN_COUNT = 9;
const PERF_THRESHOLD_MS = 200;

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

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middleIndex - 1] + sorted[middleIndex]) / 2;
  }

  return sorted[middleIndex];
}

describe('multicore analysis performance', () => {
  it('keeps median re-analysis time within 200 ms for 10-task/2-core/2-domain fixture', () => {
    const projectState = loadProjectState('perf-10task-2core-2domain.yaml');

    // Warm-up run avoids counting one-time module/JIT costs.
    analyzeProject(projectState);

    const durationsMs = Array.from({ length: RUN_COUNT }, () => {
      const start = performance.now();
      const snapshot = analyzeProject(projectState);
      const duration = performance.now() - start;

      expect(snapshot.domains).toHaveLength(2);
      return duration;
    });

    const medianMs = median(durationsMs);

    expect(medianMs).toBeLessThanOrEqual(PERF_THRESHOLD_MS);
  });
});
