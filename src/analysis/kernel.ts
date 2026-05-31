import type {
  AnalysisSnapshot,
  CoreAnalysis,
  Domain,
  DomainAnalysis,
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

const DOMAIN_ANALYSIS_LIMIT = 64;
const CORE_ANALYSIS_LIMIT = 64;

export function analyzeProject(projectState: ProjectState): AnalysisSnapshot {
  performance.mark?.('chronoweave-analysis-start');

  const snapshot =
    projectState.domains.length > 1
      ? analyzeProjectByDomain(projectState)
      : analyzeProjectScope(projectState);

  performance.mark?.('chronoweave-analysis-end');
  performance.measure?.(
    'chronoweave-analysis-duration',
    'chronoweave-analysis-start',
    'chronoweave-analysis-end'
  );

  return snapshot;
}

function analyzeProjectScope(projectState: ProjectState): AnalysisSnapshot {
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
    ...createTaskPlacementProblems(projectState),
    ...createTaskAnalysisProblems(projectState.tasks, taskAnalyses),
    ...createSporadicServerProblems(projectState, sporadicServerAnalysis),
    ...memoryProfile.problems
  ];

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

function analyzeProjectByDomain(projectState: ProjectState): AnalysisSnapshot {
  const analyzedDomains = projectState.domains.slice(0, DOMAIN_ANALYSIS_LIMIT);
  const domainResults = analyzedDomains.map((domain) => {
    const domainProjectState = createDomainProjectState(projectState, domain);
    return {
      domain,
      projectState: domainProjectState,
      snapshot: analyzeProjectScope(domainProjectState)
    };
  });
  const taskAnalysisById = new Map(
    domainResults.flatMap((result) =>
      result.snapshot.tasks.map((task) => [task.task_id, task] as const)
    )
  );
  const tasks = projectState.tasks.flatMap((task) => {
    const analysis = taskAnalysisById.get(task.id);
    return analysis === undefined ? [] : [analysis];
  });
  const sporadicServerDomainId = projectState.sporadic_server?.domain_id;
  const sporadicServerAnalysis = domainResults.find(
    (result) => result.domain.id === sporadicServerDomainId
  )?.snapshot.sporadic_server;
  const memoryProfile = mergeMemoryProfiles(
    domainResults.map((result) => result.snapshot.memory_profile),
    projectState.global.ram_capacity
  );

  return {
    lcm_ticks: Math.max(
      0,
      ...domainResults.map((result) => result.snapshot.lcm_ticks)
    ),
    lcm_ms: Math.max(
      0,
      ...domainResults.map((result) => result.snapshot.lcm_ms)
    ),
    tasks,
    aperiodic_capacity_percent: mergeAperiodicCapacityPercent(
      domainResults.map((result) => result.snapshot)
    ),
    memory_profile: memoryProfile,
    sporadic_server: sporadicServerAnalysis,
    problems: [
      ...createTaskWithoutDomainProblems(projectState),
      ...createDomainFanOutLimitProblems(projectState.domains.length),
      ...domainResults.flatMap((result) => [
        ...tagDomainProblems(result.snapshot.problems, result.domain.id),
        ...createDomainCoreLimitProblems(result.domain)
      ]),
      ...createMergedMemoryProfileProblems(memoryProfile)
    ],
    domains: domainResults.map((result) =>
      createDomainAnalysis(
        result.domain,
        result.projectState.tasks,
        result.snapshot.tasks
      )
    )
  };
}

function createDomainProjectState(
  projectState: ProjectState,
  domain: Domain
): ProjectState {
  const tasks = projectState.tasks.filter(
    (task) => task.domain_id === domain.id
  );
  const selectedTaskId = tasks.some(
    (task) => task.id === projectState.selectedTaskId
  )
    ? projectState.selectedTaskId
    : tasks[0]?.id;

  return {
    ...projectState,
    domains: [domain],
    tasks,
    aperiodic_tasks: projectState.aperiodic_tasks.filter(
      (task) => task.domain_id === domain.id
    ),
    sporadic_server:
      projectState.sporadic_server?.domain_id === domain.id
        ? projectState.sporadic_server
        : undefined,
    stochastic_events: projectState.stochastic_events.filter(
      (event) => event.domain_id === domain.id
    ),
    selectedTaskId
  };
}

function createDomainAnalysis(
  domain: Domain,
  tasks: NormalizedTaskModel[],
  analyses: TaskAnalysis[]
): DomainAnalysis {
  return {
    domain_id: domain.id,
    tasks: analyses,
    cores: createCoreAnalyses(domain, tasks)
  };
}

function createCoreAnalyses(
  domain: Domain,
  tasks: NormalizedTaskModel[]
): CoreAnalysis[] {
  const analyzedCoreCount = Math.min(domain.core_count, CORE_ANALYSIS_LIMIT);
  const taskIdsByCore = Array.from(
    { length: analyzedCoreCount },
    () => [] as string[]
  );

  tasks.forEach((task) => {
    const coreIndex = task.core_index ?? 0;
    if (coreIndex >= 0 && coreIndex < analyzedCoreCount) {
      taskIdsByCore[coreIndex].push(task.id);
    }
  });

  return taskIdsByCore.map((taskIds, coreIndex) => ({
    core_index: coreIndex,
    task_ids: taskIds
  }));
}

function createDomainFanOutLimitProblems(domainCount: number): Problem[] {
  if (domainCount <= DOMAIN_ANALYSIS_LIMIT) {
    return [];
  }

  return [
    {
      id: 'analysis-domain-count-too-large',
      level: 'error',
      message: `Project declares ${domainCount} domains; Chronoweave analyzes the first ${DOMAIN_ANALYSIS_LIMIT} domains to avoid excessive analysis output.`,
      source: 'analysis'
    }
  ];
}

function createDomainCoreLimitProblems(domain: Domain): Problem[] {
  if (domain.core_count <= CORE_ANALYSIS_LIMIT) {
    return [];
  }

  return [
    {
      id: `analysis-${domain.id}-core-count-too-large`,
      level: 'error',
      message: `${domain.name}: Domain declares ${domain.core_count} cores; Chronoweave reports the first ${CORE_ANALYSIS_LIMIT} core analysis rows to avoid excessive analysis output.`,
      domain_id: domain.id,
      source: 'analysis'
    }
  ];
}

function createTaskWithoutDomainProblems(
  projectState: ProjectState
): Problem[] {
  const domainIds = new Set(projectState.domains.map((domain) => domain.id));

  return projectState.tasks.flatMap((task) => {
    if (task.domain_id.trim() === '') {
      return [
        {
          id: `analysis-${task.id}-missing-domain`,
          level: 'error',
          message: `${task.name}: Domain assignment is required.`,
          task_id: task.id,
          source: 'analysis'
        }
      ];
    }

    if (domainIds.has(task.domain_id)) {
      return [];
    }

    return [
      {
        id: `analysis-${task.id}-unknown-domain`,
        level: 'error',
        message: `${task.name}: Assigned domain '${task.domain_id}' does not exist.`,
        task_id: task.id,
        source: 'analysis'
      }
    ];
  });
}

function createTaskPlacementProblems(projectState: ProjectState): Problem[] {
  const domainById = new Map(
    projectState.domains.map((domain) => [domain.id, domain] as const)
  );

  return projectState.tasks.flatMap((task) => {
    if (task.domain_id.trim() === '') {
      return [
        {
          id: `analysis-${task.id}-missing-domain`,
          level: 'error',
          message: `${task.name}: Domain assignment is required.`,
          task_id: task.id,
          source: 'analysis'
        }
      ];
    }

    const domain = domainById.get(task.domain_id);
    if (domain === undefined) {
      return [
        {
          id: `analysis-${task.id}-unknown-domain`,
          level: 'error',
          message: `${task.name}: Assigned domain '${task.domain_id}' does not exist.`,
          task_id: task.id,
          source: 'analysis'
        }
      ];
    }

    const coreIndex = task.core_index ?? 0;
    if (coreIndex < 0 || coreIndex >= domain.core_count) {
      return [
        {
          id: `analysis-${task.id}-core-index-out-of-range`,
          level: 'error',
          message: `${task.name}: Core index ${coreIndex} must be within 0-${domain.core_count - 1} for domain ${domain.name}.`,
          task_id: task.id,
          domain_id: domain.id,
          source: 'analysis'
        }
      ];
    }

    return [];
  });
}

function mergeAperiodicCapacityPercent(snapshots: AnalysisSnapshot[]): number {
  if (snapshots.length === 0) {
    return 0;
  }

  return Math.min(
    ...snapshots.map((snapshot) => snapshot.aperiodic_capacity_percent)
  );
}

function mergeMemoryProfiles(
  profiles: MemoryProfile[],
  capacityBytes: number | undefined
): MemoryProfile {
  const maxSeriesLength = Math.max(
    0,
    ...profiles.map((profile) => profile.series.length)
  );
  const series = Array.from({ length: maxSeriesLength }, (_, sampleIndex) =>
    profiles.reduce(
      (sum, profile) => sum + (profile.series[sampleIndex] ?? 0),
      0
    )
  );

  return {
    series,
    peak_bytes: Math.max(0, ...series),
    capacity_bytes: capacityBytes
  };
}

function createMergedMemoryProfileProblems(profile: MemoryProfile): Problem[] {
  if (
    profile.capacity_bytes === undefined ||
    profile.capacity_bytes <= 0 ||
    profile.peak_bytes / profile.capacity_bytes < RAM_WARNING_RATIO
  ) {
    return [];
  }

  return [
    {
      id: 'analysis-ram-capacity-warning',
      level: 'warning',
      message: `Merged peak stack usage ${profile.peak_bytes} bytes is at or above 90% of RAM capacity ${profile.capacity_bytes} bytes.`,
      source: 'analysis'
    }
  ];
}

function tagDomainProblems(problems: Problem[], domainId: string): Problem[] {
  return problems.map((problem) => ({
    ...problem,
    id: createDomainProblemId(problem.id, domainId),
    domain_id: domainId
  }));
}

function createDomainProblemId(problemId: string, domainId: string): string {
  return problemId.startsWith('analysis-')
    ? `analysis-${domainId}-${problemId.slice('analysis-'.length)}`
    : `${domainId}-${problemId}`;
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
