import { stringify as stringifyYaml } from 'yaml';

import type {
  NormalizedProjectFile,
  ProjectFile,
  ProjectState
} from '../model/project';
import { DEFAULT_DOMAIN_ID } from '../model/project';
import { PROJECT_FILE_LATEST_VERSION } from '../model/project';
import {
  parseProjectFileJson,
  parseProjectFileYaml,
  type ProjectFileValidationResult
} from '../schema/projectFile';

export type ProjectFileFormat = 'yaml' | 'json';

export function projectStateToProjectFile(
  projectState: ProjectState
): ProjectFile {
  const hasPhaseTwoFields =
    projectState.aperiodic_tasks.length > 0 ||
    projectState.sporadic_server !== undefined ||
    projectState.codegen !== undefined;
  const defaultDomain = projectState.domains[0];
  const hasPhaseFourFields =
    projectState.domains.length !== 1 ||
    defaultDomain?.id !== DEFAULT_DOMAIN_ID ||
    defaultDomain?.name !== 'Default RTOS' ||
    defaultDomain?.kind !== 'rtos' ||
    defaultDomain?.core_count !== 1 ||
    projectState.tasks.some(
      (task) =>
        task.domain_id !== DEFAULT_DOMAIN_ID || task.core_index !== undefined
    ) ||
    projectState.aperiodic_tasks.some(
      (task) => task.domain_id !== DEFAULT_DOMAIN_ID
    ) ||
    (projectState.sporadic_server?.domain_id !== undefined &&
      projectState.sporadic_server.domain_id !== DEFAULT_DOMAIN_ID) ||
    projectState.channels.length > 0 ||
    projectState.stochastic_events.length > 0;

  return {
    version:
      hasPhaseTwoFields || hasPhaseFourFields
        ? PROJECT_FILE_LATEST_VERSION
        : projectState.version,
    global: {
      ...projectState.global,
      stack_presets: { ...projectState.global.stack_presets }
    },
    ...(hasPhaseFourFields
      ? {
          domains: projectState.domains.map((domain) => ({ ...domain }))
        }
      : {}),
    tasks: projectState.tasks.map((task) => ({ ...task })),
    ...(projectState.aperiodic_tasks.length > 0
      ? {
          aperiodic_tasks: projectState.aperiodic_tasks.map((task) => ({
            ...task
          }))
        }
      : {}),
    ...(projectState.sporadic_server === undefined
      ? {}
      : { sporadic_server: { ...projectState.sporadic_server } }),
    ...(hasPhaseFourFields
      ? {
          channels: projectState.channels.map((channel) => ({ ...channel })),
          stochastic_events: projectState.stochastic_events.map((event) => ({
            ...event
          }))
        }
      : {}),
    ...(projectState.codegen === undefined
      ? {}
      : { codegen: { ...projectState.codegen } })
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
    aperiodic_tasks: projectFile.aperiodic_tasks.map((task) => ({ ...task })),
    sporadic_server:
      projectFile.sporadic_server === undefined
        ? undefined
        : { ...projectFile.sporadic_server },
    codegen:
      projectFile.codegen === undefined
        ? undefined
        : { ...projectFile.codegen },
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
