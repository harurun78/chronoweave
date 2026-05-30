export const PROJECT_FILE_VERSION = '0.1' as const;

export type ProjectFileVersion = typeof PROJECT_FILE_VERSION;
export type StackPresetName = 'low' | 'mid' | 'high';
export type PriorityMode = 'auto' | 'manual';
export type ProblemLevel = 'error' | 'warning' | 'info';
export type ProblemSource = 'schema' | 'analysis' | 'performance' | 'import';

export interface StackPresets {
  low: number;
  mid: number;
  high: number;
}

export interface GlobalSettings {
  tick_ms: number;
  stack_presets: StackPresets;
  ram_capacity?: number;
}

export interface TaskFile {
  id: string;
  name: string;
  period_ms: number;
  wcet_ms: number;
  deadline_ms?: number;
  priority_mode?: PriorityMode;
  manual_priority?: number;
  stack: StackPresetName;
  description?: string;
}

export interface ProjectFile {
  version: ProjectFileVersion;
  global: GlobalSettings;
  tasks: TaskFile[];
}

export interface NormalizedTaskModel extends Omit<
  TaskFile,
  'deadline_ms' | 'priority_mode'
> {
  deadline_ms: number;
  priority_mode: PriorityMode;
}

export interface NormalizedProjectFile {
  version: ProjectFileVersion;
  global: GlobalSettings;
  tasks: NormalizedTaskModel[];
}

export interface ProjectState extends NormalizedProjectFile {
  selectedTaskId?: string;
}

export type TaskModel = NormalizedTaskModel;

export interface TaskAnalysis {
  task_id: string;
  effective_deadline_ms: number;
  effective_priority: number;
  buffer_ms: number;
  buffer_consumed_ms: number;
  buffer_remaining_ms: number;
  approximate_response_time_ms: number;
  schedulable: boolean;
}

export interface MemoryProfile {
  series: number[];
  peak_bytes: number;
  capacity_bytes?: number;
}

export interface Problem {
  id: string;
  level: ProblemLevel;
  message: string;
  task_id?: string;
  source: ProblemSource;
}

export interface AnalysisSnapshot {
  lcm_ticks: number;
  lcm_ms: number;
  tasks: TaskAnalysis[];
  aperiodic_capacity_percent: number;
  memory_profile: MemoryProfile;
  problems: Problem[];
}
