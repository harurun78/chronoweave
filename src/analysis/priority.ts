import type { NormalizedTaskModel, Problem } from '../model/project';

export interface PriorityResult {
  priorities: Map<string, number>;
  problems: Problem[];
}

export function calculateEffectivePriorities(
  tasks: NormalizedTaskModel[]
): PriorityResult {
  const priorities = new Map<string, number>();
  const problems: Problem[] = [];
  const usedManualPriorities = new Map<number, string>();
  const taskCount = tasks.length;

  tasks.forEach((task) => {
    if (task.priority_mode !== 'manual') {
      return;
    }

    const manualPriority = task.manual_priority;

    if (
      manualPriority === undefined ||
      manualPriority < 1 ||
      manualPriority > taskCount
    ) {
      problems.push({
        id: `analysis-${task.id}-manual-priority-range`,
        level: 'error',
        message: `${task.name} manual priority must be between 1 and ${taskCount}.`,
        task_id: task.id,
        source: 'analysis'
      });
      return;
    }

    const existingTaskId = usedManualPriorities.get(manualPriority);
    if (existingTaskId !== undefined) {
      problems.push({
        id: `analysis-${task.id}-manual-priority-duplicate`,
        level: 'error',
        message: `${task.name} manual priority ${manualPriority} duplicates another task.`,
        task_id: task.id,
        source: 'analysis'
      });
      problems.push({
        id: `analysis-${existingTaskId}-manual-priority-duplicate`,
        level: 'error',
        message: `Manual priority ${manualPriority} is duplicated by another task.`,
        task_id: existingTaskId,
        source: 'analysis'
      });
      return;
    }

    usedManualPriorities.set(manualPriority, task.id);
    priorities.set(task.id, manualPriority);
  });

  const availablePriorities = Array.from(
    { length: taskCount },
    (_, index) => index + 1
  ).filter((priority) => !usedManualPriorities.has(priority));

  const autoTasks = tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => task.priority_mode === 'auto')
    .sort(
      (left, right) =>
        left.task.period_ms - right.task.period_ms || left.index - right.index
    );

  autoTasks.forEach(({ task }, index) => {
    priorities.set(
      task.id,
      availablePriorities[index] ?? taskCount + index + 1
    );
  });

  tasks.forEach((task, index) => {
    if (!priorities.has(task.id)) {
      priorities.set(task.id, taskCount + index + 1);
    }
  });

  return { priorities, problems };
}
