import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

import {
  DEFAULT_DOMAIN_ID,
  PROJECT_FILE_LATEST_VERSION,
  PROJECT_FILE_V02_VERSION,
  PROJECT_FILE_VERSION,
  SPORADIC_SERVER_TASK_ID,
  type NormalizedProjectFile,
  type Problem,
  type ProblemSource,
  type ProjectFile,
  type SporadicServerConfig,
  type TaskFile
} from '../model/project';

const stackPresetsSchema = z
  .object({
    low: z.number().int().positive(),
    mid: z.number().int().positive(),
    high: z.number().int().positive()
  })
  .strict();

const globalSettingsSchema = z
  .object({
    tick_ms: z.number().positive(),
    stack_presets: stackPresetsSchema,
    ram_capacity: z.number().int().positive().optional()
  })
  .strict();

const taskFileSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .regex(/^[a-zA-Z0-9_-]+$/),
    name: z.string().min(1),
    period_ms: z.number().positive(),
    wcet_ms: z.number().positive(),
    deadline_ms: z.number().positive().optional(),
    priority_mode: z.enum(['auto', 'manual']).optional(),
    manual_priority: z.number().int().optional(),
    stack: z.enum(['low', 'mid', 'high']),
    domain_id: z.string().min(1).optional(),
    core_index: z.number().int().nonnegative().optional(),
    description: z.string().optional()
  })
  .strict()
  .superRefine((task, context) => {
    if (task.priority_mode === 'manual' && task.manual_priority === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['manual_priority'],
        message: 'manual_priority is required when priority_mode is manual'
      });
    }
  });

const aperiodicTaskFileSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .regex(/^[a-zA-Z0-9_-]+$/),
    name: z.string().min(1),
    wcet_ms: z.number().positive(),
    deadline_ms: z.number().positive().optional(),
    stack: z.enum(['low', 'mid', 'high']),
    domain_id: z.string().min(1).optional(),
    description: z.string().optional()
  })
  .strict();

const sporadicServerSchema = z
  .object({
    enabled: z.boolean(),
    budget_ms: z.number().positive(),
    period_ms: z.number().positive(),
    deadline_ms: z.number().positive().optional(),
    priority_mode: z.enum(['auto', 'manual']).optional(),
    manual_priority: z.number().int().optional(),
    stack: z.enum(['low', 'mid', 'high']),
    domain_id: z.string().min(1).optional(),
    core_index: z.number().int().nonnegative().optional()
  })
  .strict()
  .superRefine((server, context) => {
    if (
      server.priority_mode === 'manual' &&
      server.manual_priority === undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['manual_priority'],
        message: 'manual_priority is required when priority_mode is manual'
      });
    }
  });

const codegenSettingsSchema = z
  .object({
    plugin: z.literal('freertos'),
    namespace: z.string().min(1).optional()
  })
  .strict();

const domainSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .regex(/^[a-zA-Z0-9_-]+$/),
    name: z.string().min(1),
    kind: z.enum(['baremetal', 'rtos', 'linux', 'fpga']),
    core_count: z.number().int().positive(),
    description: z.string().optional()
  })
  .strict();

const channelSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .regex(/^[a-zA-Z0-9_-]+$/),
    producer_task_id: z.string().min(1),
    consumer_task_id: z.string().min(1),
    transport: z.enum(['shared_memory', 'mailbox', 'queue']),
    latency_budget_ms: z.number().positive(),
    description: z.string().optional()
  })
  .strict();

const stochasticEventSourceSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .regex(/^[a-zA-Z0-9_-]+$/),
    name: z.string().min(1),
    domain_id: z.string().min(1),
    mean_interarrival_ms: z.number().positive(),
    std_dev_ms: z.number().nonnegative().optional(),
    consumer_task_id: z.string().min(1),
    description: z.string().optional()
  })
  .strict();

export const projectFileSchema = z
  .object({
    version: z.enum([
      PROJECT_FILE_VERSION,
      PROJECT_FILE_V02_VERSION,
      PROJECT_FILE_LATEST_VERSION
    ]),
    global: globalSettingsSchema,
    domains: z.array(domainSchema).min(1).optional(),
    tasks: z.array(taskFileSchema).min(1),
    aperiodic_tasks: z.array(aperiodicTaskFileSchema).optional(),
    sporadic_server: sporadicServerSchema.optional(),
    channels: z.array(channelSchema).optional(),
    stochastic_events: z.array(stochasticEventSourceSchema).optional(),
    codegen: codegenSettingsSchema.optional()
  })
  .strict()
  .superRefine((projectFile, context) => {
    const seenTaskIds = new Set<string>();

    projectFile.tasks.forEach((task, taskIndex) => {
      if (seenTaskIds.has(task.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tasks', taskIndex, 'id'],
          message: `Duplicate task id: ${task.id}`
        });
      }

      seenTaskIds.add(task.id);
    });

    projectFile.aperiodic_tasks?.forEach((task, taskIndex) => {
      if (seenTaskIds.has(task.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['aperiodic_tasks', taskIndex, 'id'],
          message: `Duplicate task id: ${task.id}`
        });
      }

      seenTaskIds.add(task.id);
    });

    if (seenTaskIds.has(SPORADIC_SERVER_TASK_ID)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sporadic_server'],
        message: `Reserved task id is used by another task: ${SPORADIC_SERVER_TASK_ID}`
      });
    }

    if (
      projectFile.version === PROJECT_FILE_VERSION &&
      (projectFile.aperiodic_tasks !== undefined ||
        projectFile.sporadic_server !== undefined ||
        projectFile.codegen !== undefined)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['version'],
        message: `ProjectFile ${PROJECT_FILE_VERSION} cannot include Phase 2 fields; use ${PROJECT_FILE_V02_VERSION}`
      });
    }

    if (
      projectFile.version !== PROJECT_FILE_LATEST_VERSION &&
      (projectFile.domains !== undefined ||
        projectFile.channels !== undefined ||
        projectFile.stochastic_events !== undefined)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['version'],
        message: `Phase 4 fields (domains/channels/stochastic_events) require version ${PROJECT_FILE_LATEST_VERSION}`
      });
    }
  });

export type ProjectFileInput = z.input<typeof projectFileSchema>;

export type ProjectFileValidationResult =
  | {
      ok: true;
      projectFile: ProjectFile;
      normalizedProjectFile: NormalizedProjectFile;
    }
  | {
      ok: false;
      problems: Problem[];
    };

export function validateProjectFile(
  input: unknown,
  source: ProblemSource = 'schema'
): ProjectFileValidationResult {
  const parsed = projectFileSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      problems: parsed.error.issues.map((issue, issueIndex) =>
        createProblem(source, `schema-${issueIndex}`, formatZodIssue(issue))
      )
    };
  }

  return {
    ok: true,
    projectFile: parsed.data,
    normalizedProjectFile: normalizeProjectFile(parsed.data)
  };
}

export function normalizeProjectFile(
  projectFile: ProjectFile
): NormalizedProjectFile {
  const domains =
    projectFile.domains && projectFile.domains.length > 0
      ? projectFile.domains.map((domain) => ({ ...domain }))
      : [
          {
            id: DEFAULT_DOMAIN_ID,
            name: 'Default RTOS',
            kind: 'rtos' as const,
            core_count: 1
          }
        ];
  const fallbackDomainId = domains[0]?.id ?? DEFAULT_DOMAIN_ID;
  return {
    ...projectFile,
    global: {
      ...projectFile.global,
      stack_presets: { ...projectFile.global.stack_presets }
    },
    domains,
    tasks: projectFile.tasks.map((task) => ({
      ...normalizeTaskFile(task),
      domain_id: task.domain_id ?? fallbackDomainId
    })),
    aperiodic_tasks:
      projectFile.aperiodic_tasks?.map((task) => ({
        ...task,
        domain_id: task.domain_id ?? fallbackDomainId
      })) ?? [],
    sporadic_server:
      projectFile.sporadic_server === undefined
        ? undefined
        : {
            ...normalizeSporadicServer(projectFile.sporadic_server),
            domain_id: projectFile.sporadic_server.domain_id ?? fallbackDomainId
          },
    channels: projectFile.channels?.map((channel) => ({ ...channel })) ?? [],
    stochastic_events:
      projectFile.stochastic_events?.map((event) => ({ ...event })) ?? [],
    codegen:
      projectFile.codegen === undefined ? undefined : { ...projectFile.codegen }
  };
}

export function migrateProjectFile(projectFile: ProjectFile): ProjectFile {
  if (projectFile.version === PROJECT_FILE_LATEST_VERSION) {
    return projectFile;
  }

  const domains =
    projectFile.domains && projectFile.domains.length > 0
      ? projectFile.domains.map((domain) => ({ ...domain }))
      : [
          {
            id: DEFAULT_DOMAIN_ID,
            name: 'Default RTOS',
            kind: 'rtos' as const,
            core_count: 1
          }
        ];
  const fallbackDomainId = domains[0]?.id ?? DEFAULT_DOMAIN_ID;

  return {
    ...projectFile,
    version: PROJECT_FILE_LATEST_VERSION,
    domains,
    tasks: projectFile.tasks.map((task) => ({
      ...task,
      domain_id: task.domain_id ?? fallbackDomainId
    })),
    aperiodic_tasks: projectFile.aperiodic_tasks?.map((task) => ({
      ...task,
      domain_id: task.domain_id ?? fallbackDomainId
    })),
    sporadic_server:
      projectFile.sporadic_server === undefined
        ? undefined
        : {
            ...projectFile.sporadic_server,
            domain_id: projectFile.sporadic_server.domain_id ?? fallbackDomainId
          },
    channels: projectFile.channels ?? [],
    stochastic_events: projectFile.stochastic_events ?? []
  };
}

export function parseProjectFileYaml(
  input: string
): ProjectFileValidationResult {
  try {
    return validateProjectFile(parseYaml(input), 'import');
  } catch (error) {
    return parseFailureToResult(error, 'yaml');
  }
}

export function parseProjectFileJson(
  input: string
): ProjectFileValidationResult {
  try {
    return validateProjectFile(JSON.parse(input), 'import');
  } catch (error) {
    return parseFailureToResult(error, 'json');
  }
}

function normalizeTaskFile(task: TaskFile) {
  return {
    ...task,
    deadline_ms: task.deadline_ms ?? task.period_ms,
    priority_mode: task.priority_mode ?? 'auto'
  };
}

function normalizeSporadicServer(server: SporadicServerConfig) {
  return {
    ...server,
    deadline_ms: server.deadline_ms ?? server.period_ms,
    priority_mode: server.priority_mode ?? 'auto'
  };
}

function parseFailureToResult(
  error: unknown,
  format: 'yaml' | 'json'
): ProjectFileValidationResult {
  return {
    ok: false,
    problems: [
      createProblem(
        'import',
        `${format}-syntax`,
        `Invalid ${format.toUpperCase()} ProjectFile: ${error instanceof Error ? error.message : 'unknown parse error'}`
      )
    ]
  };
}

function createProblem(
  source: ProblemSource,
  idSuffix: string,
  message: string
): Problem {
  return {
    id: `${source}-${idSuffix}`,
    level: 'error',
    message,
    source
  };
}

function formatZodIssue(issue: z.ZodIssue): string {
  const location = issue.path.length > 0 ? issue.path.join('.') : 'ProjectFile';
  return `${location}: ${issue.message}`;
}
