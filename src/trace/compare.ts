import type { Problem, ProjectState } from '../model/project';
import type {
  ObservationComparisonResult,
  ObservedTask,
  TaskObservationComparison
} from './types';

export const PERIOD_DRIFT_WARNING_RATIO = 0.1;

export function compareObservedTasks(
  projectState: ProjectState,
  observedTasks: ObservedTask[],
  periodDriftWarningRatio = PERIOD_DRIFT_WARNING_RATIO
): ObservationComparisonResult {
  const observedByName = new Map(
    observedTasks.map((task) => [task.name, task])
  );
  const comparisons: TaskObservationComparison[] = [];
  const problems: Problem[] = [];

  projectState.tasks.forEach((designTask) => {
    const observedTask = observedByName.get(designTask.name);

    if (observedTask === undefined) {
      const problem = observationProblem(
        designTask.name,
        'missing-observation',
        'warning',
        `${designTask.name}: no observation was found in the imported trace.`
      );
      problems.push(problem);
      comparisons.push({
        task_name: designTask.name,
        status: 'missing-observation',
        design_period_ms: designTask.period_ms,
        design_wcet_ms: designTask.wcet_ms,
        problems: [problem]
      });
      return;
    }

    const taskProblems: Problem[] = [];

    if (observedTask.execution_time_max_ms > designTask.wcet_ms) {
      taskProblems.push(
        observationProblem(
          designTask.name,
          'wcet-overrun',
          'error',
          `${designTask.name}: observed max execution ${observedTask.execution_time_max_ms} ms exceeds design WCET ${designTask.wcet_ms} ms.`
        )
      );
    }

    if (observedTask.period_estimate_ms !== undefined) {
      const driftRatio =
        Math.abs(observedTask.period_estimate_ms - designTask.period_ms) /
        designTask.period_ms;
      if (driftRatio > periodDriftWarningRatio) {
        taskProblems.push(
          observationProblem(
            designTask.name,
            'period-drift',
            'warning',
            `${designTask.name}: observed period ${observedTask.period_estimate_ms} ms differs from design period ${designTask.period_ms} ms.`
          )
        );
      }
    }

    problems.push(...taskProblems);
    comparisons.push({
      task_name: designTask.name,
      status: 'matched',
      design_period_ms: designTask.period_ms,
      observed_period_ms: observedTask.period_estimate_ms,
      design_wcet_ms: designTask.wcet_ms,
      observed_max_execution_ms: observedTask.execution_time_max_ms,
      problems: taskProblems
    });
  });

  observedTasks.forEach((observedTask) => {
    if (projectState.tasks.some((task) => task.name === observedTask.name)) {
      return;
    }

    const problem = observationProblem(
      observedTask.name,
      'extra-observation',
      'warning',
      `${observedTask.name}: observed task is not present in the design model.`
    );
    problems.push(problem);
    comparisons.push({
      task_name: observedTask.name,
      status: 'extra-observation',
      observed_period_ms: observedTask.period_estimate_ms,
      observed_max_execution_ms: observedTask.execution_time_max_ms,
      problems: [problem]
    });
  });

  return { comparisons, problems };
}

function observationProblem(
  taskName: string,
  idSuffix: string,
  level: Problem['level'],
  message: string
): Problem {
  return {
    id: `observation-${sanitizeId(taskName)}-${idSuffix}`,
    level,
    message,
    source: 'analysis'
  };
}

function sanitizeId(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'task'
  );
}
