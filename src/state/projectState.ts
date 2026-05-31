import { atom } from 'jotai';

import { analyzeProject } from '../analysis/kernel';
import type { NormalizedProjectFile, ProjectState } from '../model/project';
import { DEFAULT_DOMAIN_ID } from '../model/project';
import { createInitialProjectState } from '../samples/motorControl';

export interface ProjectHistory {
  past: NormalizedProjectFile[];
  future: NormalizedProjectFile[];
}

export const projectStateAtom = atom<ProjectState>(createInitialProjectState());
const activeDomainIdBaseAtom = atom<string | undefined>(undefined);
export const activeDomainIdAtom = atom(
  (get) => {
    const projectState = get(projectStateAtom);
    const activeDomainId = get(activeDomainIdBaseAtom);

    return activeDomainId !== undefined &&
      projectState.domains.some((domain) => domain.id === activeDomainId)
      ? activeDomainId
      : (projectState.domains[0]?.id ?? DEFAULT_DOMAIN_ID);
  },
  (_get, set, domainId: string | undefined) => {
    set(activeDomainIdBaseAtom, domainId);
  }
);
export const projectHistoryAtom = atom<ProjectHistory>({
  past: [],
  future: []
});
export const analysisSnapshotAtom = atom((get) =>
  analyzeProject(get(projectStateAtom))
);

export const updateProjectStateAtom = atom(
  null,
  (get, set, updater: (current: ProjectState) => ProjectState) => {
    const current = get(projectStateAtom);
    const next = updater(cloneProjectState(current));

    set(projectHistoryAtom, {
      past: [...get(projectHistoryAtom).past, persistentProject(current)],
      future: []
    });
    set(projectStateAtom, next);
  }
);

export const replaceProjectStateAtom = atom(
  null,
  (get, set, next: ProjectState) => {
    const current = get(projectStateAtom);
    set(projectHistoryAtom, {
      past: [...get(projectHistoryAtom).past, persistentProject(current)],
      future: []
    });
    set(projectStateAtom, cloneProjectState(next));
  }
);

export const resetProjectStateAtom = atom(null, (_get, set) => {
  set(projectHistoryAtom, { past: [], future: [] });
  set(projectStateAtom, createInitialProjectState());
});

export const undoProjectStateAtom = atom(null, (get, set) => {
  const history = get(projectHistoryAtom);
  const previous = history.past.at(-1);
  if (previous === undefined) {
    return;
  }

  const current = get(projectStateAtom);
  set(projectHistoryAtom, {
    past: history.past.slice(0, -1),
    future: [persistentProject(current), ...history.future]
  });
  set(projectStateAtom, {
    ...clonePersistentProject(previous),
    selectedTaskId: current.selectedTaskId
  });
});

export const redoProjectStateAtom = atom(null, (get, set) => {
  const history = get(projectHistoryAtom);
  const next = history.future[0];
  if (next === undefined) {
    return;
  }

  const current = get(projectStateAtom);
  set(projectHistoryAtom, {
    past: [...history.past, persistentProject(current)],
    future: history.future.slice(1)
  });
  set(projectStateAtom, {
    ...clonePersistentProject(next),
    selectedTaskId: current.selectedTaskId
  });
});

export function persistentProject(
  projectState: ProjectState
): NormalizedProjectFile {
  return {
    version: projectState.version,
    global: {
      ...projectState.global,
      stack_presets: { ...projectState.global.stack_presets }
    },
    domains: projectState.domains.map((domain) => ({ ...domain })),
    tasks: projectState.tasks.map((task) => ({ ...task })),
    aperiodic_tasks: projectState.aperiodic_tasks.map((task) => ({ ...task })),
    sporadic_server:
      projectState.sporadic_server === undefined
        ? undefined
        : { ...projectState.sporadic_server },
    channels: projectState.channels.map((channel) => ({ ...channel })),
    stochastic_events: projectState.stochastic_events.map((event) => ({
      ...event
    })),
    codegen:
      projectState.codegen === undefined
        ? undefined
        : { ...projectState.codegen }
  };
}

function cloneProjectState(projectState: ProjectState): ProjectState {
  return {
    ...clonePersistentProject(projectState),
    selectedTaskId: projectState.selectedTaskId
  };
}

function clonePersistentProject(
  projectFile: NormalizedProjectFile
): NormalizedProjectFile {
  return {
    ...projectFile,
    global: {
      ...projectFile.global,
      stack_presets: { ...projectFile.global.stack_presets }
    },
    domains: projectFile.domains.map((domain) => ({ ...domain })),
    tasks: projectFile.tasks.map((task) => ({ ...task })),
    aperiodic_tasks: projectFile.aperiodic_tasks.map((task) => ({ ...task })),
    sporadic_server:
      projectFile.sporadic_server === undefined
        ? undefined
        : { ...projectFile.sporadic_server },
    channels: projectFile.channels.map((channel) => ({ ...channel })),
    stochastic_events: projectFile.stochastic_events.map((event) => ({
      ...event
    })),
    codegen:
      projectFile.codegen === undefined ? undefined : { ...projectFile.codegen }
  };
}
