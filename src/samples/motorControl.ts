import type {
  NormalizedProjectFile,
  ProjectState,
  TaskModel
} from '../model/project';

export const motorControlOneAxisProject: NormalizedProjectFile = {
  version: '0.1',
  global: {
    tick_ms: 1,
    stack_presets: {
      low: 512,
      mid: 2048,
      high: 4096
    },
    ram_capacity: 65536
  },
  tasks: [
    {
      id: 'isr-timer',
      name: 'ISR_Timer',
      period_ms: 1,
      wcet_ms: 0.05,
      deadline_ms: 1,
      priority_mode: 'auto',
      stack: 'low'
    },
    {
      id: 'motorctrl-x',
      name: 'MotorCtrl_X',
      period_ms: 10,
      wcet_ms: 3,
      deadline_ms: 10,
      priority_mode: 'auto',
      stack: 'mid'
    },
    {
      id: 'sensor-fusion',
      name: 'SensorFusion',
      period_ms: 20,
      wcet_ms: 6,
      deadline_ms: 20,
      priority_mode: 'auto',
      stack: 'mid',
      description: 'IMU + encoder fusion'
    }
  ],
  aperiodic_tasks: []
};

export const motorControlWithAperiodicProject: NormalizedProjectFile = {
  ...structuredCloneProject(motorControlOneAxisProject),
  version: '0.2',
  aperiodic_tasks: [
    {
      id: 'diagnostics-request',
      name: 'DiagnosticsRequest',
      wcet_ms: 1.5,
      deadline_ms: 50,
      stack: 'low',
      description: 'On-demand diagnostic command handling'
    }
  ],
  sporadic_server: {
    enabled: true,
    budget_ms: 2,
    period_ms: 20,
    deadline_ms: 20,
    priority_mode: 'manual',
    manual_priority: 3,
    stack: 'mid'
  },
  codegen: {
    plugin: 'freertos',
    namespace: 'MotorDemo'
  }
};

export function createInitialProjectState(): ProjectState {
  return {
    ...structuredCloneProject(motorControlOneAxisProject),
    selectedTaskId: 'motorctrl-x'
  };
}

export function createDuplicatedAxisTask(sourceTask: TaskModel): TaskModel {
  return {
    ...sourceTask,
    id: 'motorctrl-y',
    name: 'MotorCtrl_Y',
    description: 'Duplicated Y axis control task'
  };
}

function structuredCloneProject(
  project: NormalizedProjectFile
): NormalizedProjectFile {
  return {
    ...project,
    global: {
      ...project.global,
      stack_presets: { ...project.global.stack_presets }
    },
    tasks: project.tasks.map((task) => ({ ...task })),
    aperiodic_tasks: project.aperiodic_tasks.map((task) => ({ ...task })),
    sporadic_server:
      project.sporadic_server === undefined
        ? undefined
        : { ...project.sporadic_server },
    codegen: project.codegen === undefined ? undefined : { ...project.codegen }
  };
}
