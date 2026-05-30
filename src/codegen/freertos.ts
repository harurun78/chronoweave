import type { GeneratedFile, ProjectState } from '../model/project';
import { SPORADIC_SERVER_TASK_ID } from '../model/project';
import { analyzeProject } from '../analysis/kernel';

export function generateFreeRtosFiles(
  projectState: ProjectState
): GeneratedFile[] {
  const namespace = sanitizeSymbol(
    projectState.codegen?.namespace ?? 'Chronoweave'
  );
  const analysis = analyzeProject(projectState);
  const taskDeclarations = projectState.tasks
    .map((task) => {
      const taskAnalysis = analysis.tasks.find(
        (candidate) => candidate.task_id === task.id
      );
      return [
        `static TaskHandle_t ${sanitizeSymbol(task.name)}Handle = NULL;`,
        `static void ${sanitizeSymbol(task.name)}Task(void *argument);`,
        `#define ${sanitizeSymbol(task.name).toUpperCase()}_PERIOD_MS ${task.period_ms}`,
        `#define ${sanitizeSymbol(task.name).toUpperCase()}_STACK_BYTES ${projectState.global.stack_presets[task.stack]}`,
        `#define ${sanitizeSymbol(task.name).toUpperCase()}_PRIORITY ${taskAnalysis?.effective_priority ?? 0}`
      ].join('\n');
    })
    .join('\n\n');
  const taskCreates = projectState.tasks
    .map((task) => {
      const symbol = sanitizeSymbol(task.name);
      return `  xTaskCreate(${symbol}Task, "${task.name}", ${projectState.global.stack_presets[task.stack]} / sizeof(StackType_t), NULL, ${analysis.tasks.find((candidate) => candidate.task_id === task.id)?.effective_priority ?? 0}, &${symbol}Handle);`;
    })
    .join('\n');
  const taskStubs = projectState.tasks
    .map((task) => {
      const symbol = sanitizeSymbol(task.name);
      return `static void ${symbol}Task(void *argument)\n{\n  (void)argument;\n  const TickType_t periodTicks = pdMS_TO_TICKS(${task.period_ms});\n  TickType_t lastWakeTime = xTaskGetTickCount();\n\n  for (;;) {\n    /* TODO: implement ${task.name}. WCET budget: ${task.wcet_ms} ms. */\n    vTaskDelayUntil(&lastWakeTime, periodTicks);\n  }\n}`;
    })
    .join('\n\n');
  const serverSection = createSporadicServerSection(projectState);

  return [
    {
      path: `${namespace}_tasks.h`,
      content: `#pragma once\n\n#include "FreeRTOS.h"\n#include "task.h"\n\nvoid ${namespace}_CreateTasks(void);\n`
    },
    {
      path: `${namespace}_tasks.c`,
      content: `#include "${namespace}_tasks.h"\n\n${taskDeclarations}${serverSection.declarations}\n\nvoid ${namespace}_CreateTasks(void)\n{\n${taskCreates}${serverSection.createCall}\n}\n\n${taskStubs}${serverSection.stub}\n`
    }
  ];
}

export function sanitizeSymbol(input: string): string {
  const sanitized = input
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  const safe = sanitized.length > 0 ? sanitized : 'Generated';
  return /^[0-9]/.test(safe) ? `_${safe}` : safe;
}

function createSporadicServerSection(projectState: ProjectState): {
  declarations: string;
  createCall: string;
  stub: string;
} {
  const server = projectState.sporadic_server;
  if (server?.enabled !== true) {
    return { declarations: '', createCall: '', stub: '' };
  }

  const namespace = sanitizeSymbol(
    projectState.codegen?.namespace ?? 'Chronoweave'
  );
  const serverPriority =
    analyzeProject(projectState).sporadic_server?.effective_priority ?? 0;
  const dispatchCases = projectState.aperiodic_tasks
    .map(
      (task) =>
        `    /* TODO: dispatch ${task.name}. WCET budget: ${task.wcet_ms} ms. */`
    )
    .join('\n');

  return {
    declarations: `\n\nstatic TaskHandle_t ${namespace}SporadicServerHandle = NULL;\nstatic void ${namespace}SporadicServerTask(void *argument);\n#define ${namespace.toUpperCase()}_SPORADIC_SERVER_BUDGET_MS ${server.budget_ms}\n#define ${namespace.toUpperCase()}_SPORADIC_SERVER_PERIOD_MS ${server.period_ms}\n#define ${namespace.toUpperCase()}_SPORADIC_SERVER_PRIORITY ${serverPriority}`,
    createCall: `\n  xTaskCreate(${namespace}SporadicServerTask, "${SPORADIC_SERVER_TASK_ID}", ${projectState.global.stack_presets[server.stack]} / sizeof(StackType_t), NULL, ${serverPriority}, &${namespace}SporadicServerHandle);`,
    stub: `\n\nstatic void ${namespace}SporadicServerTask(void *argument)\n{\n  (void)argument;\n  const TickType_t periodTicks = pdMS_TO_TICKS(${server.period_ms});\n  TickType_t lastWakeTime = xTaskGetTickCount();\n\n  for (;;) {\n${dispatchCases || '    /* No aperiodic tasks configured. */'}\n    vTaskDelayUntil(&lastWakeTime, periodTicks);\n  }\n}`
  };
}
