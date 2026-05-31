import type {
  AnalysisSnapshot,
  MemoryProfile,
  NormalizedTaskModel,
  Problem,
  ProjectState,
  SporadicServerAnalysis,
  TaskAnalysis
} from '../model/project';
import { SPORADIC_SERVER_TASK_ID } from '../model/project';
import { calculateScheduleLcm } from './lcm';
import {
  BUFFER_WARNING_RATIO,
  ITERATIVE_RTA_MAX_ITERATIONS,
  LCM_TICK_WARNING_THRESHOLD,
  RAM_WARNING_RATIO
} from './config';
import { calculateEffectivePriorities } from './priority';
import { createTickGridProblems, millisecondsToTicks } from './time';

export function analyzeProject(projectState: ProjectState): AnalysisSnapshot {
  performance.mark?.('chronoweave-analysis-start');

  const schedulingActors = createSchedulingActors(projectState);
  const lcm = calculateScheduleLcm(
    schedulingActors,
    projectState.global.tick_ms
  );
  const tickGridProblems = createTickGridProblems(
    schedulingActors,
    projectState.global.tick_ms
  );
  const priority = calculateEffectivePriorities(schedulingActors);
  const taskAnalyses = createTaskAnalyses(
    projectState.tasks,
    schedulingActors,
    priority.priorities
  );
  const memoryProfile = createMemoryProfile(projectState);
  const sporadicServerAnalysis = createSporadicServerAnalysis(
    projectState,
    priority.priorities
  );
  const aperiodicCapacityPercent = createAperiodicCapacityPercent(taskAnalyses);
  const problems = [
    createApproximateRtaInfo(),
    createIterativeRtaInfo(),
    ...lcm.problems,
    ...tickGridProblems,
    ...priority.problems,
    ...createTaskAnalysisProblems(projectState.tasks, taskAnalyses),
    ...createSporadicServerProblems(projectState, sporadicServerAnalysis),
    ...memoryProfile.problems
  ];

  performance.mark?.('chronoweave-analysis-end');
  performance.measure?.(
    'chronoweave-analysis-duration',
    'chronoweave-analysis-start',
    'chronoweave-analysis-end'
  );

  return {
    lcm_ticks: lcm.lcm_ticks,
    lcm_ms: lcm.lcm_ms,
    tasks: taskAnalyses,
    aperiodic_capacity_percent: aperiodicCapacityPercent,
    memory_profile: memoryProfile.profile,
    sporadic_server: sporadicServerAnalysis,
    problems
  };
}

function createSchedulingActors(
  projectState: ProjectState
): NormalizedTaskModel[] {
  const actors = [...projectState.tasks];
  const server = projectState.sporadic_server;

  if (server?.enabled === true) {
    actors.push({
      id: SPORADIC_SERVER_TASK_ID,
      name: 'SporadicServer',
      period_ms: server.period_ms,
      wcet_ms: server.budget_ms,
      deadline_ms: server.deadline_ms,
      priority_mode: server.priority_mode,
      manual_priority: server.manual_priority,
      stack: server.stack,
      domain_id: server.domain_id,
      description: 'Phase 2 bounded aperiodic execution server'
    });
  }

  return actors;
}

function createTaskAnalyses(
  tasks: NormalizedTaskModel[],
  schedulingActors: NormalizedTaskModel[],
  priorities: Map<string, number>
): TaskAnalysis[] {
  return tasks.map((task) => {
    const effectivePriority =
      priorities.get(task.id) ?? schedulingActors.length + 1;
    const higherPriorityTasks = schedulingActors.filter(
      (candidate) =>
        candidate.id !== task.id &&
        (priorities.get(candidate.id) ?? schedulingActors.length + 1) <
          effectivePriority
    );
    const bufferConsumedMs = roundMs(
      higherPriorityTasks.reduce((sum, candidate) => sum + candidate.wcet_ms, 0)
    );
    const bufferMs = roundMs(task.period_ms - task.wcet_ms);
    const bufferRemainingMs = roundMs(bufferMs - bufferConsumedMs);
    const approximateResponseTimeMs = roundMs(task.wcet_ms + bufferConsumedMs);
    const iterativeRta = calculateIterativeRta(task, higherPriorityTasks);

    return {
      task_id: task.id,
      effective_deadline_ms: task.deadline_ms,
      effective_priority: effectivePriority,
      buffer_ms: bufferMs,
      buffer_consumed_ms: bufferConsumedMs,
      buffer_remaining_ms: bufferRemainingMs,
      approximate_response_time_ms: approximateResponseTimeMs,
      iterative_response_time_ms: iterativeRta.response_time_ms,
      iterative_schedulable: iterativeRta.schedulable,
      rta_iterations: iterativeRta.iterations,
      schedulable:
        task.wcet_ms <= task.period_ms &&
        bufferRemainingMs >= 0 &&
        approximateResponseTimeMs <= task.deadline_ms &&
        iterativeRta.schedulable
    };
  });
}

function calculateIterativeRta(
  task: NormalizedTaskModel,
  higherPriorityTasks: NormalizedTaskModel[]
): {
  response_time_ms: number;
  schedulable: boolean;
  iterations: number;
  converged: boolean;
} {
  let responseTimeMs = roundMs(task.wcet_ms);

  for (
    let iteration = 1;
    iteration <= ITERATIVE_RTA_MAX_ITERATIONS;
    iteration += 1
  ) {
    const nextResponseTimeMs = roundMs(
      task.wcet_ms +
        higherPriorityTasks.reduce(
          (sum, higherPriorityTask) =>
            sum +
            Math.ceil(responseTimeMs / higherPriorityTask.period_ms) *
              higherPriorityTask.wcet_ms,
          0
        )
    );

    if (nextResponseTimeMs === responseTimeMs) {
      return {
        response_time_ms: nextResponseTimeMs,
        schedulable: nextResponseTimeMs <= task.deadline_ms,
        iterations: iteration,
        converged: true
      };
    }

    responseTimeMs = nextResponseTimeMs;

    if (responseTimeMs > task.deadline_ms) {
      return {
        response_time_ms: responseTimeMs,
        schedulable: false,
        iterations: iteration,
        converged: true
      };
    }
  }

  return {
    response_time_ms: responseTimeMs,
    schedulable: false,
    iterations: ITERATIVE_RTA_MAX_ITERATIONS,
    converged: false
  };
}

function createTaskAnalysisProblems(
  tasks: NormalizedTaskModel[],
  analyses: TaskAnalysis[]
): Problem[] {
  return analyses.flatMap((analysis) => {
    const task = tasks.find((candidate) => candidate.id === analysis.task_id);
    if (task === undefined) {
      return [];
    }

    const problems: Problem[] = [];

    if (task.wcet_ms > task.period_ms) {
      problems.push(
        taskProblem(task, 'wcet-period', 'error', 'WCET exceeds period.')
      );
    }

    if (
      analysis.approximate_response_time_ms > analysis.effective_deadline_ms
    ) {
      problems.push(
        taskProblem(
          task,
          'deadline-miss',
          'error',
          `Approximate response time ${analysis.approximate_response_time_ms} ms exceeds deadline ${analysis.effective_deadline_ms} ms.`
        )
      );
    }

    if (analysis.iterative_response_time_ms > analysis.effective_deadline_ms) {
      problems.push(
        taskProblem(
          task,
          'iterative-deadline-miss',
          'error',
          `Iterative response time ${analysis.iterative_response_time_ms} ms exceeds deadline ${analysis.effective_deadline_ms} ms.`
        )
      );
    }

    if (
      !analysis.iterative_schedulable &&
      analysis.rta_iterations >= ITERATIVE_RTA_MAX_ITERATIONS
    ) {
      problems.push(
        taskProblem(
          task,
          'iterative-rta-non-converged',
          'error',
          `Iterative RTA did not converge within ${ITERATIVE_RTA_MAX_ITERATIONS} iterations.`
        )
      );
    }

    if (analysis.buffer_remaining_ms < 0) {
      problems.push(
        taskProblem(
          task,
          'negative-buffer',
          'error',
          'Buffer remaining is negative.'
        )
      );
    } else if (
      analysis.buffer_remaining_ms / task.period_ms <=
      BUFFER_WARNING_RATIO
    ) {
      problems.push(
        taskProblem(
          task,
          'low-buffer',
          'warning',
          'Buffer remaining is at or below 10% of period.'
        )
      );
    }

    return problems;
  });
}

function createSporadicServerAnalysis(
  projectState: ProjectState,
  priorities: Map<string, number>
): SporadicServerAnalysis | undefined {
  const server = projectState.sporadic_server;
  if (server === undefined) {
    return undefined;
  }

  const totalAperiodicWcetMs = projectState.aperiodic_tasks.reduce(
    (sum, task) => sum + task.wcet_ms,
    0
  );
  const capacityUtilizationPercent =
    server.budget_ms <= 0
      ? 0
      : clampPercent((totalAperiodicWcetMs / server.budget_ms) * 100);

  return {
    enabled: server.enabled,
    budget_ms: server.budget_ms,
    period_ms: server.period_ms,
    effective_priority:
      priorities.get(SPORADIC_SERVER_TASK_ID) ?? projectState.tasks.length + 1,
    capacity_utilization_percent: capacityUtilizationPercent,
    schedulable:
      server.enabled &&
      server.budget_ms <= server.period_ms &&
      totalAperiodicWcetMs <= server.budget_ms
  };
}

function createSporadicServerProblems(
  projectState: ProjectState,
  serverAnalysis: SporadicServerAnalysis | undefined
): Problem[] {
  const problems: Problem[] = [];
  const server = projectState.sporadic_server;
  const totalAperiodicWcetMs = roundMs(
    projectState.aperiodic_tasks.reduce((sum, task) => sum + task.wcet_ms, 0)
  );

  if (projectState.aperiodic_tasks.length > 0 && server?.enabled !== true) {
    problems.push({
      id: 'analysis-aperiodic-no-sporadic-server',
      level: 'warning',
      message:
        'Aperiodic tasks exist but no enabled Sporadic Server budget is configured.',
      source: 'analysis'
    });
  }

  if (server === undefined) {
    return problems;
  }

  if (server.budget_ms > server.period_ms) {
    problems.push({
      id: 'analysis-sporadic-server-budget-period',
      level: 'error',
      message: `Sporadic Server budget ${server.budget_ms} ms exceeds period ${server.period_ms} ms.`,
      task_id: SPORADIC_SERVER_TASK_ID,
      source: 'analysis'
    });
  }

  if (server.enabled && totalAperiodicWcetMs > server.budget_ms) {
    problems.push({
      id: 'analysis-sporadic-server-budget-exceeded',
      level: 'warning',
      message: `Aperiodic WCET demand ${totalAperiodicWcetMs} ms exceeds Sporadic Server budget ${server.budget_ms} ms.`,
      task_id: SPORADIC_SERVER_TASK_ID,
      source: 'analysis'
    });
  }

  if (serverAnalysis?.schedulable === false && server.enabled) {
    problems.push({
      id: 'analysis-sporadic-server-not-schedulable',
      level: 'warning',
      message:
        'Sporadic Server configuration is not schedulable under Phase 2 checks.',
      task_id: SPORADIC_SERVER_TASK_ID,
      source: 'analysis'
    });
  }

  return problems;
}

function createAperiodicCapacityPercent(analyses: TaskAnalysis[]): number {
  if (analyses.length === 0) {
    return 0;
  }

  const lowestPriorityAnalysis = analyses.reduce((currentLowest, candidate) =>
    candidate.effective_priority > currentLowest.effective_priority
      ? candidate
      : currentLowest
  );

  const periodBudget =
    lowestPriorityAnalysis.buffer_ms +
    lowestPriorityAnalysis.approximate_response_time_ms;

  if (periodBudget <= 0) {
    return 0;
  }

  return clampPercent(
    (lowestPriorityAnalysis.buffer_remaining_ms / periodBudget) * 100
  );
}

function createMemoryProfile(projectState: ProjectState): {
  profile: MemoryProfile;
  problems: Problem[];
} {
  const {
    tick_ms: tickMilliseconds,
    stack_presets: stackPresets,
    ram_capacity: capacityBytes
  } = projectState.global;
  const schedulingActors = createSchedulingActors(projectState);
  const lcm = calculateScheduleLcm(schedulingActors, tickMilliseconds);
  const sampleTicks = Math.min(lcm.lcm_ticks, LCM_TICK_WARNING_THRESHOLD);
  const series = Array.from({ length: sampleTicks }, (_, tickIndex) => {
    const tickTimeMs = tickIndex * tickMilliseconds;
    return schedulingActors.reduce(
      (usageBytes, task) => {
        const periodTicks = millisecondsToTicks(
          task.period_ms,
          tickMilliseconds
        );
        if (periodTicks === null || periodTicks === 0) {
          return usageBytes;
        }

        const offsetMs = (tickIndex % periodTicks) * tickMilliseconds;
        return offsetMs < task.wcet_ms
          ? usageBytes + stackPresets[task.stack]
          : usageBytes;
      },
      tickTimeMs >= 0 ? 0 : 0
    );
  });
  const peakBytes = Math.max(0, ...series);
  const problems: Problem[] = [];

  if (
    capacityBytes !== undefined &&
    peakBytes / capacityBytes >= RAM_WARNING_RATIO
  ) {
    problems.push({
      id: 'analysis-ram-capacity-warning',
      level: 'warning',
      message: `Peak stack usage ${peakBytes} bytes is at or above 90% of RAM capacity ${capacityBytes} bytes.`,
      source: 'analysis'
    });
  }

  return {
    profile: {
      series,
      peak_bytes: peakBytes,
      capacity_bytes: capacityBytes
    },
    problems
  };
}

function taskProblem(
  task: NormalizedTaskModel,
  idSuffix: string,
  level: Problem['level'],
  message: string
): Problem {
  return {
    id: `analysis-${task.id}-${idSuffix}`,
    level,
    message: `${task.name}: ${message}`,
    task_id: task.id,
    source: 'analysis'
  };
}

function createApproximateRtaInfo(): Problem {
  return {
    id: 'analysis-approximate-rta-info',
    level: 'info',
    message:
      'Phase 1 approximate response time may be optimistic and is not a full schedulability proof.',
    source: 'analysis'
  };
}

function createIterativeRtaInfo(): Problem {
  return {
    id: 'analysis-iterative-rta-info',
    level: 'info',
    message:
      'Phase 2 iterative response time uses fixed-priority recurrence with bounded Sporadic Server interference when configured.',
    source: 'analysis'
  };
}

function roundMs(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export {
  BUFFER_WARNING_RATIO,
  ITERATIVE_RTA_MAX_ITERATIONS,
  LCM_TICK_WARNING_THRESHOLD,
  RAM_WARNING_RATIO
};
