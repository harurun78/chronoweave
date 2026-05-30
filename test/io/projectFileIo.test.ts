import { describe, expect, it } from 'vitest';

import {
  normalizedProjectToProjectState,
  parseSerializedProjectFile,
  projectStateToProjectFile,
  serializeProjectFile
} from '../../src/io/projectFileIo';
import { createInitialProjectState } from '../../src/samples/motorControl';

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
});
