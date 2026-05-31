import type { Problem } from '../model/project';

export interface TraceEvent {
  task_name: string;
  start_ms: number;
  end_ms: number;
}

export interface ObservedTask {
  name: string;
  sample_count: number;
  period_estimate_ms?: number;
  execution_time_avg_ms: number;
  execution_time_min_ms: number;
  execution_time_max_ms: number;
}

export type TraceImportResult =
  | {
      ok: true;
      events: TraceEvent[];
      observed_tasks: ObservedTask[];
      problems: Problem[];
    }
  | {
      ok: false;
      problems: Problem[];
    };

export interface TaskObservationComparison {
  task_name: string;
  status: 'matched' | 'missing-observation' | 'extra-observation';
  design_period_ms?: number;
  observed_period_ms?: number;
  design_wcet_ms?: number;
  observed_max_execution_ms?: number;
  problems: Problem[];
}

export interface ObservationComparisonResult {
  comparisons: TaskObservationComparison[];
  problems: Problem[];
}
