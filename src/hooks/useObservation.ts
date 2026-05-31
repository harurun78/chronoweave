import { useMemo } from 'react';
import { compareObservedTasks } from '../trace/compare';
import type { ObservationComparisonResult, ObservedTask } from '../trace/types';
import type { ProjectState } from '../model/project';

export function useObservation(
  projectState: ProjectState,
  observedTasks: ObservedTask[]
): ObservationComparisonResult {
  return useMemo(
    () =>
      observedTasks.length === 0
        ? { comparisons: [], problems: [] }
        : compareObservedTasks(projectState, observedTasks),
    [observedTasks, projectState]
  );
}
