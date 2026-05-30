import { stringify as stringifyYaml } from 'yaml';

import type {
  NormalizedProjectFile,
  ProjectFile,
  ProjectState
} from '../model/project';
import {
  parseProjectFileJson,
  parseProjectFileYaml,
  type ProjectFileValidationResult
} from '../schema/projectFile';

export type ProjectFileFormat = 'yaml' | 'json';

export function projectStateToProjectFile(
  projectState: ProjectState
): ProjectFile {
  return {
    version: projectState.version,
    global: {
      ...projectState.global,
      stack_presets: { ...projectState.global.stack_presets }
    },
    tasks: projectState.tasks.map((task) => ({ ...task }))
  };
}

export function normalizedProjectToProjectState(
  projectFile: NormalizedProjectFile,
  selectedTaskId = projectFile.tasks[0]?.id
): ProjectState {
  return {
    ...projectFile,
    global: {
      ...projectFile.global,
      stack_presets: { ...projectFile.global.stack_presets }
    },
    tasks: projectFile.tasks.map((task) => ({ ...task })),
    selectedTaskId
  };
}

export function serializeProjectFile(
  projectState: ProjectState,
  format: ProjectFileFormat
): string {
  const projectFile = projectStateToProjectFile(projectState);

  if (format === 'json') {
    return `${JSON.stringify(projectFile, null, 2)}\n`;
  }

  return stringifyYaml(projectFile, { singleQuote: true });
}

export function parseSerializedProjectFile(
  input: string,
  format: ProjectFileFormat
): ProjectFileValidationResult {
  return format === 'json'
    ? parseProjectFileJson(input)
    : parseProjectFileYaml(input);
}
