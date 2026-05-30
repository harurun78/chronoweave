import { createStore } from 'jotai/vanilla';
import { describe, expect, it } from 'vitest';

import {
  analysisSnapshotAtom,
  projectHistoryAtom,
  projectStateAtom,
  redoProjectStateAtom,
  undoProjectStateAtom,
  updateProjectStateAtom
} from '../../src/state/projectState';

describe('ProjectState atoms and history', () => {
  it('derives AnalysisSnapshot and tracks undo/redo for persistent changes', () => {
    const store = createStore();

    expect(store.get(analysisSnapshotAtom).tasks).toHaveLength(3);

    store.set(updateProjectStateAtom, (current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === 'motorctrl-x' ? { ...task, wcet_ms: 4 } : task
      )
    }));

    expect(store.get(projectHistoryAtom).past).toHaveLength(1);
    expect(
      store
        .get(projectStateAtom)
        .tasks.find((task) => task.id === 'motorctrl-x')?.wcet_ms
    ).toBe(4);

    store.set(undoProjectStateAtom);
    expect(
      store
        .get(projectStateAtom)
        .tasks.find((task) => task.id === 'motorctrl-x')?.wcet_ms
    ).toBe(3);

    store.set(redoProjectStateAtom);
    expect(
      store
        .get(projectStateAtom)
        .tasks.find((task) => task.id === 'motorctrl-x')?.wcet_ms
    ).toBe(4);
  });
});
