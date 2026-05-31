import type {
  Domain,
  NormalizedTaskModel,
  Problem,
  TaskAnalysis
} from '../model/project';
import { calculateEffectivePriorities } from './priority';

const RTA_MAX_ITERATIONS = 50;

export interface MulticoreDomainResult {
  coreAssignments: Record<number, NormalizedTaskModel[]>;
  taskAnalyses: TaskAnalysis[];
  problems: Problem[];
}

export function analyzeMulticoreDomain(
  domain: Domain,
  tasks: NormalizedTaskModel[]
): MulticoreDomainResult {
  const coreAssignments: Record<number, NormalizedTaskModel[]> =
    Object.fromEntries(
      Array.from({ length: domain.core_count }, (_, coreIndex) => [
        coreIndex,
        [] as NormalizedTaskModel[]
      ])
    );
  const problems: Problem[] = [];

  tasks.forEach((task) => {
    if (domain.core_count > 1 && task.core_index === undefined) {
      problems.push({
        id: `analysis-${task.id}-missing-core-index`,
        level: 'error',
        message: `${task.name}: Core index is required for multicore domain ${domain.name}.`,
        task_id: task.id,
        domain_id: domain.id,
        source: 'analysis'
      });
      return;
    }

    const coreIndex = task.core_index ?? 0;
    if (coreIndex < 0 || coreIndex >= domain.core_count) {
      problems.push({
        id: `analysis-${task.id}-core-index-out-of-range`,
        level: 'error',
        message: `${task.name}: Core index ${coreIndex} must be within 0-${domain.core_count - 1} for domain ${domain.name}.`,
        task_id: task.id,
        domain_id: domain.id,
        source: 'analysis'
      });
      return;
    }

    coreAssignments[coreIndex].push(task);
  });

  const taskAnalyses = Object.entries(coreAssignments)
    .flatMap(([, coreTasks]) => analyzeCoreTasks(coreTasks))
    .sort((left, right) => left.task_id.localeCompare(right.task_id));

  return {
    coreAssignments,
    taskAnalyses,
    problems
  };
}

function analyzeCoreTasks(tasks: NormalizedTaskModel[]): TaskAnalysis[] {
  if (tasks.length === 0) {
    return [];
  }

  const priorityResult = calculateEffectivePriorities(tasks);
  const analysesById = new Map<string, TaskAnalysis>();

  tasks.forEach((task) => {
    const effectivePriority =
      priorityResult.priorities.get(task.id) ?? tasks.length;
    const responseTime = calculateIterativeResponseTime(
      task,
      tasks,
      priorityResult.priorities
    );
    const bufferMs = roundMs(task.period_ms - task.wcet_ms);
    const bufferConsumedMs = roundMs(
      Math.max(0, responseTime.response_time_ms - task.wcet_ms)
    );
    const bufferRemainingMs = roundMs(bufferMs - bufferConsumedMs);

    analysesById.set(task.id, {
      task_id: task.id,
      effective_deadline_ms: task.deadline_ms,
      effective_priority: effectivePriority,
      buffer_ms: bufferMs,
      buffer_consumed_ms: bufferConsumedMs,
      buffer_remaining_ms: bufferRemainingMs,
      approximate_response_time_ms: responseTime.response_time_ms,
      iterative_response_time_ms: responseTime.response_time_ms,
      iterative_schedulable: responseTime.schedulable,
      rta_iterations: responseTime.iterations,
      schedulable:
        responseTime.schedulable &&
        responseTime.response_time_ms <= task.deadline_ms
    });
  });

  return tasks
    .map((task) => analysesById.get(task.id))
    .filter((analysis): analysis is TaskAnalysis => analysis !== undefined);
}

function calculateIterativeResponseTime(
  target: NormalizedTaskModel,
  tasks: NormalizedTaskModel[],
  priorities: Map<string, number>
): { response_time_ms: number; schedulable: boolean; iterations: number } {
  const targetPriority = priorities.get(target.id) ?? Number.MAX_SAFE_INTEGER;
  const higherPriorityTasks = tasks.filter((task) => {
    if (task.id === target.id) {
      return false;
    }

    return (
      (priorities.get(task.id) ?? Number.MAX_SAFE_INTEGER) < targetPriority
    );
  });

  let responseTimeMs = target.wcet_ms;

  for (let iteration = 1; iteration <= RTA_MAX_ITERATIONS; iteration += 1) {
    const interferenceMs = higherPriorityTasks.reduce((sum, task) => {
      const releases = Math.ceil(responseTimeMs / task.period_ms);
      return sum + releases * task.wcet_ms;
    }, 0);
    const nextResponseTimeMs = roundMs(target.wcet_ms + interferenceMs);

    if (nextResponseTimeMs === responseTimeMs) {
      return {
        response_time_ms: nextResponseTimeMs,
        schedulable: nextResponseTimeMs <= target.deadline_ms,
        iterations: iteration
      };
    }

    responseTimeMs = nextResponseTimeMs;
  }

  return {
    response_time_ms: responseTimeMs,
    schedulable: false,
    iterations: RTA_MAX_ITERATIONS
  };
}

function roundMs(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
