export const PROJECT_FILE_VERSION = '0.1' as const;
export const PROJECT_FILE_LATEST_VERSION = '0.2' as const;
export const SPORADIC_SERVER_TASK_ID = 'sporadic-server' as const;

export type ProjectFileVersion =
  | typeof PROJECT_FILE_VERSION
  | typeof PROJECT_FILE_LATEST_VERSION;
export type StackPresetName = 'low' | 'mid' | 'high';
export type PriorityMode = 'auto' | 'manual';
export type ProblemLevel = 'error' | 'warning' | 'info';
export type ProblemSource = 'schema' | 'analysis' | 'performance' | 'import';
export type CodegenPlugin = 'freertos';

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

export interface AperiodicTaskFile {
  id: string;
  name: string;
  wcet_ms: number;
  deadline_ms?: number;
  stack: StackPresetName;
  description?: string;
}

export interface SporadicServerConfig {
  enabled: boolean;
  budget_ms: number;
  period_ms: number;
  deadline_ms?: number;
  priority_mode?: PriorityMode;
  manual_priority?: number;
  stack: StackPresetName;
}

export interface CodegenSettings {
  plugin: CodegenPlugin;
  namespace?: string;
}

export interface ProjectFile {
  version: ProjectFileVersion;
  global: GlobalSettings;
  tasks: TaskFile[];
  aperiodic_tasks?: AperiodicTaskFile[];
  sporadic_server?: SporadicServerConfig;
  codegen?: CodegenSettings;
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
  aperiodic_tasks: AperiodicTaskFile[];
  sporadic_server?: NormalizedSporadicServerConfig;
  codegen?: CodegenSettings;
}

export interface ProjectState extends NormalizedProjectFile {
  selectedTaskId?: string;
}

export type TaskModel = NormalizedTaskModel;

export interface NormalizedSporadicServerConfig extends Omit<
  SporadicServerConfig,
  'deadline_ms' | 'priority_mode'
> {
  deadline_ms: number;
  priority_mode: PriorityMode;
}

export interface TaskAnalysis {
  task_id: string;
  effective_deadline_ms: number;
  effective_priority: number;
  buffer_ms: number;
  buffer_consumed_ms: number;
  buffer_remaining_ms: number;
  approximate_response_time_ms: number;
  iterative_response_time_ms: number;
  iterative_schedulable: boolean;
  rta_iterations: number;
  schedulable: boolean;
}

export interface SporadicServerAnalysis {
  enabled: boolean;
  budget_ms: number;
  period_ms: number;
  effective_priority: number;
  capacity_utilization_percent: number;
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
  sporadic_server?: SporadicServerAnalysis;
  problems: Problem[];
}

export interface GeneratedFile {
  path: string;
  content: string;
}
