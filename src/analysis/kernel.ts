import type {
  AnalysisSnapshot,
  MemoryProfile,
  NormalizedTaskModel,
  Problem,
  ProjectState,
  TaskAnalysis
} from '../model/project';
import { calculateScheduleLcm, LCM_TICK_WARNING_THRESHOLD } from './lcm';
import { calculateEffectivePriorities } from './priority';
import { createTickGridProblems, millisecondsToTicks } from './time';

export const BUFFER_WARNING_RATIO = 0.1;
export const RAM_WARNING_RATIO = 0.9;

export function analyzeProject(projectState: ProjectState): AnalysisSnapshot {
  performance.mark?.('chronoweave-analysis-start');

  const lcm = calculateScheduleLcm(
    projectState.tasks,
    projectState.global.tick_ms
  );
  const tickGridProblems = createTickGridProblems(
    projectState.tasks,
    projectState.global.tick_ms
  );
  const priority = calculateEffectivePriorities(projectState.tasks);
  const taskAnalyses = createTaskAnalyses(
    projectState.tasks,
    priority.priorities
  );
  const memoryProfile = createMemoryProfile(projectState);
  const aperiodicCapacityPercent = createAperiodicCapacityPercent(taskAnalyses);
  const problems = [
    createApproximateRtaInfo(),
    ...lcm.problems,
    ...tickGridProblems,
    ...priority.problems,
    ...createTaskAnalysisProblems(projectState.tasks, taskAnalyses),
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
    problems
  };
}

function createTaskAnalyses(
  tasks: NormalizedTaskModel[],
  priorities: Map<string, number>
): TaskAnalysis[] {
  return tasks.map((task) => {
    const effectivePriority = priorities.get(task.id) ?? tasks.length + 1;
    const higherPriorityTasks = tasks.filter(
      (candidate) =>
        (priorities.get(candidate.id) ?? tasks.length + 1) < effectivePriority
    );
    const bufferConsumedMs = roundMs(
      higherPriorityTasks.reduce((sum, candidate) => sum + candidate.wcet_ms, 0)
    );
    const bufferMs = roundMs(task.period_ms - task.wcet_ms);
    const bufferRemainingMs = roundMs(bufferMs - bufferConsumedMs);
    const approximateResponseTimeMs = roundMs(task.wcet_ms + bufferConsumedMs);

    return {
      task_id: task.id,
      effective_deadline_ms: task.deadline_ms,
      effective_priority: effectivePriority,
      buffer_ms: bufferMs,
      buffer_consumed_ms: bufferConsumedMs,
      buffer_remaining_ms: bufferRemainingMs,
      approximate_response_time_ms: approximateResponseTimeMs,
      schedulable:
        task.wcet_ms <= task.period_ms &&
        bufferRemainingMs >= 0 &&
        approximateResponseTimeMs <= task.deadline_ms
    };
  });
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
  const lcm = calculateScheduleLcm(projectState.tasks, tickMilliseconds);
  const sampleTicks = Math.min(lcm.lcm_ticks, LCM_TICK_WARNING_THRESHOLD);
  const series = Array.from({ length: sampleTicks }, (_, tickIndex) => {
    const tickTimeMs = tickIndex * tickMilliseconds;
    return projectState.tasks.reduce(
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

function roundMs(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
