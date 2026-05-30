import { atom } from 'jotai';

import { analyzeProject } from '../analysis/kernel';
import type { NormalizedProjectFile, ProjectState } from '../model/project';
import { createInitialProjectState } from '../samples/motorControl';

export interface ProjectHistory {
  past: NormalizedProjectFile[];
  future: NormalizedProjectFile[];
}

export const projectStateAtom = atom<ProjectState>(createInitialProjectState());
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
    tasks: projectState.tasks.map((task) => ({ ...task }))
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
    tasks: projectFile.tasks.map((task) => ({ ...task }))
  };
}
