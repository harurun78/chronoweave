import type {
  CoreAnalysis,
  Domain,
  StackPresets,
  NormalizedTaskModel,
  Problem,
  TaskAnalysis
} from '../model/project';
import { calculateScheduleLcm } from './lcm';
import { calculateEffectivePriorities } from './priority';
import { millisecondsToTicks } from './time';

const RTA_MAX_ITERATIONS = 50;

export interface MulticoreDomainResult {
  coreAssignments: Record<number, NormalizedTaskModel[]>;
  taskAnalyses: TaskAnalysis[];
  problems: Problem[];
}

export interface CoreStackAnalysisOptions {
  domain: Domain;
  tasks: NormalizedTaskModel[];
  stackPresets: StackPresets;
  tickMs: number;
  sampleTickLimit: number;
  coreLimit?: number;
}

export function analyzeMulticoreDomain(
  domain: Domain,
  tasks: NormalizedTaskModel[]
): MulticoreDomainResult {
  const { coreAssignments, problems } = assignTasksToCores(domain, tasks);

  const taskAnalyses = Object.entries(coreAssignments)
    .flatMap(([, coreTasks]) => analyzeCoreTasks(coreTasks))
    .sort((left, right) => left.task_id.localeCompare(right.task_id));

  return {
    coreAssignments,
    taskAnalyses,
    problems
  };
}

export function createCoreAnalysesWithStackOccupancy(
  options: CoreStackAnalysisOptions
): CoreAnalysis[] {
  const {
    domain,
    tasks,
    stackPresets,
    tickMs,
    sampleTickLimit,
    coreLimit = domain.core_count
  } = options;
  const { coreAssignments } = assignTasksToCores(domain, tasks);
  const analyzedCoreCount = Math.min(domain.core_count, coreLimit);
  const lcm = calculateScheduleLcm(tasks, tickMs);
  const sampleTicks = Math.min(lcm.lcm_ticks, sampleTickLimit);

  return Array.from({ length: analyzedCoreCount }, (_, coreIndex) => {
    const coreTasks = coreAssignments[coreIndex] ?? [];
    const stackOccupancySeries = Array.from(
      { length: sampleTicks },
      (_, tickIndex) =>
        coreTasks.reduce((usageBytes, task) => {
          const periodTicks = millisecondsToTicks(task.period_ms, tickMs);
          if (periodTicks === null || periodTicks === 0) {
            return usageBytes;
          }

          const offsetMs = (tickIndex % periodTicks) * tickMs;
          return offsetMs < task.wcet_ms
            ? usageBytes + stackPresets[task.stack]
            : usageBytes;
        }, 0)
    );

    return {
      core_index: coreIndex,
      task_ids: coreTasks.map((task) => task.id),
      stack_occupancy_series: stackOccupancySeries,
      stack_peak_bytes: Math.max(0, ...stackOccupancySeries)
    };
  });
}

function assignTasksToCores(
  domain: Domain,
  tasks: NormalizedTaskModel[]
): {
  coreAssignments: Record<number, NormalizedTaskModel[]>;
  problems: Problem[];
} {
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

  return {
    coreAssignments,
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
