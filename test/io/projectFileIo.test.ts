import { describe, expect, it } from 'vitest';

import {
  normalizedProjectToProjectState,
  parseSerializedProjectFile,
  projectStateToProjectFile,
  serializeProjectFile
} from '../../src/io/projectFileIo';
import { createInitialProjectState } from '../../src/samples/motorControl';
import { parseProjectFileYaml } from '../../src/schema/projectFile';

describe('ProjectFile IO', () => {
  it('exports YAML and JSON without transient UI state and imports them back', () => {
    const projectState = createInitialProjectState();
    const yaml = serializeProjectFile(projectState, 'yaml');
    const json = serializeProjectFile(projectState, 'json');

    expect(yaml).not.toContain('selectedTaskId');
    expect(json).not.toContain('selectedTaskId');

    const yamlResult = parseSerializedProjectFile(yaml, 'yaml');
    const jsonResult = parseSerializedProjectFile(json, 'json');

    expect(yamlResult.ok).toBe(true);
    expect(jsonResult.ok).toBe(true);

    if (!yamlResult.ok || !jsonResult.ok) {
      return;
    }

    expect(yamlResult.normalizedProjectFile).toEqual(
      jsonResult.normalizedProjectFile
    );
    expect(
      projectStateToProjectFile(
        normalizedProjectToProjectState(yamlResult.normalizedProjectFile)
      )
    ).toEqual(projectStateToProjectFile(projectState));
  });

  it('preserves Phase 2 fields through YAML roundtrip', () => {
    const result = parseProjectFileYaml(`
version: '0.2'
global:
  tick_ms: 1
  stack_presets:
    low: 512
    mid: 2048
    high: 4096
tasks:
  - id: control
    name: Control
    period_ms: 10
    wcet_ms: 2
    stack: mid
aperiodic_tasks:
  - id: diagnostics
    name: Diagnostics
    wcet_ms: 1
    stack: low
sporadic_server:
  enabled: true
  budget_ms: 2
  period_ms: 20
  stack: mid
codegen:
  plugin: freertos
  namespace: Demo
`);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    const projectState = normalizedProjectToProjectState(
      result.normalizedProjectFile
    );
    const serialized = serializeProjectFile(projectState, 'yaml');
    const roundtrip = parseSerializedProjectFile(serialized, 'yaml');

    expect(roundtrip.ok).toBe(true);

    if (!roundtrip.ok) {
      return;
    }

    expect(roundtrip.normalizedProjectFile).toEqual(
      result.normalizedProjectFile
    );
    expect(serialized).not.toContain('selectedTaskId');
  });
});
