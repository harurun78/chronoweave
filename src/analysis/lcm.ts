import type { NormalizedTaskModel, Problem } from '../model/project';
import { millisecondsToTicks } from './time';
import { LCM_TICK_WARNING_THRESHOLD } from './config';

export interface LcmResult {
  lcm_ticks: number;
  lcm_ms: number;
  problems: Problem[];
}

export function calculateLcm(values: number[]): number {
  return values.reduce((currentLcm, value) => lcm(currentLcm, value), 1);
}

export function calculateScheduleLcm(
  tasks: NormalizedTaskModel[],
  tickMilliseconds: number
): LcmResult {
  const periodTicks = tasks
    .map((task) => millisecondsToTicks(task.period_ms, tickMilliseconds))
    .filter((ticks): ticks is number => ticks !== null);

  const lcmTicks = periodTicks.length > 0 ? calculateLcm(periodTicks) : 0;
  const problems: Problem[] = [];

  if (lcmTicks > LCM_TICK_WARNING_THRESHOLD) {
    problems.push({
      id: 'analysis-lcm-too-large',
      level: 'warning',
      message: `LCM window is ${lcmTicks} ticks, above the Phase 1 target of ${LCM_TICK_WARNING_THRESHOLD} ticks.`,
      source: 'analysis'
    });
  }

  return {
    lcm_ticks: lcmTicks,
    lcm_ms: lcmTicks * tickMilliseconds,
    problems
  };
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }

  return a;
}

function lcm(left: number, right: number): number {
  if (left === 0 || right === 0) {
    return 0;
  }

  return Math.abs((left / gcd(left, right)) * right);
}

export { LCM_TICK_WARNING_THRESHOLD };
