import type { NormalizedTaskModel, Problem } from '../model/project';

export const MICROSECONDS_PER_MILLISECOND = 1000;

export function millisecondsToMicroseconds(milliseconds: number): number {
  return Math.round(milliseconds * MICROSECONDS_PER_MILLISECOND);
}

export function isOnTickGrid(
  milliseconds: number,
  tickMilliseconds: number
): boolean {
  const valueMicroseconds = millisecondsToMicroseconds(milliseconds);
  const tickMicroseconds = millisecondsToMicroseconds(tickMilliseconds);

  return tickMicroseconds > 0 && valueMicroseconds % tickMicroseconds === 0;
}

export function millisecondsToTicks(
  milliseconds: number,
  tickMilliseconds: number
): number | null {
  if (!isOnTickGrid(milliseconds, tickMilliseconds)) {
    return null;
  }

  return (
    millisecondsToMicroseconds(milliseconds) /
    millisecondsToMicroseconds(tickMilliseconds)
  );
}

export function createTickGridProblems(
  tasks: NormalizedTaskModel[],
  tickMilliseconds: number
): Problem[] {
  return tasks.flatMap((task) => {
    const problems: Problem[] = [];

    if (!isOnTickGrid(task.period_ms, tickMilliseconds)) {
      problems.push({
        id: `analysis-${task.id}-period-tick-grid`,
        level: 'error',
        message: `${task.name} period_ms must align to the ${tickMilliseconds} ms tick grid.`,
        task_id: task.id,
        source: 'analysis'
      });
    }

    if (!isOnTickGrid(task.deadline_ms, tickMilliseconds)) {
      problems.push({
        id: `analysis-${task.id}-deadline-tick-grid`,
        level: 'error',
        message: `${task.name} deadline_ms must align to the ${tickMilliseconds} ms tick grid.`,
        task_id: task.id,
        source: 'analysis'
      });
    }

    return problems;
  });
}
