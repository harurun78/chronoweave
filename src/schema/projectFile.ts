import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

import {
  PROJECT_FILE_VERSION,
  type NormalizedProjectFile,
  type Problem,
  type ProblemSource,
  type ProjectFile,
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

export const projectFileSchema = z
  .object({
    version: z.literal(PROJECT_FILE_VERSION),
    global: globalSettingsSchema,
    tasks: z.array(taskFileSchema).min(1)
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
  return {
    ...projectFile,
    global: {
      ...projectFile.global,
      stack_presets: { ...projectFile.global.stack_presets }
    },
    tasks: projectFile.tasks.map(normalizeTaskFile)
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
