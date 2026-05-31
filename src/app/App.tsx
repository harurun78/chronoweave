import { useDrag } from '@use-gesture/react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { messages } from '../i18n/messages.en';

import { generateFreeRtosFiles } from '../codegen/freertos';
import {
  normalizedProjectToProjectState,
  parseSerializedProjectFile,
  serializeProjectFile,
  type ProjectFileFormat
} from '../io/projectFileIo';
import type {
  AnalysisSnapshot,
  GeneratedFile,
  NormalizedTaskModel,
  Problem,
  ProjectState,
  StackPresetName,
  TaskAnalysis
} from '../model/project';
import {
  createDuplicatedAxisTask,
  motorControlWithAperiodicProject
} from '../samples/motorControl';
import {
  analysisSnapshotAtom,
  projectHistoryAtom,
  projectStateAtom,
  redoProjectStateAtom,
  replaceProjectStateAtom,
  resetProjectStateAtom,
  undoProjectStateAtom,
  updateProjectStateAtom
} from '../state/projectState';
import { compareObservedTasks } from '../trace/compare';
import { parseTraceCsv } from '../trace/csvTrace';
import type { ObservedTask, TaskObservationComparison } from '../trace/types';
import './App.css';

const GANTT_WIDTH = 720;
const ROW_HEIGHT = 46;

export function App() {
  const [projectState, setProjectState] = useAtom(projectStateAtom);
  const analysisSnapshot = useAtomValue(analysisSnapshotAtom);
  const history = useAtomValue(projectHistoryAtom);
  const updateProjectState = useSetAtom(updateProjectStateAtom);
  const replaceProjectState = useSetAtom(replaceProjectStateAtom);
  const resetProjectState = useSetAtom(resetProjectStateAtom);
  const undoProjectState = useSetAtom(undoProjectStateAtom);
  const redoProjectState = useSetAtom(redoProjectStateAtom);
  const importInputRef = useRef<HTMLInputElement>(null);
  const traceInputRef = useRef<HTMLInputElement>(null);
  const [lastImportProblems, setLastImportProblems] = useState<Problem[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [observedTasks, setObservedTasks] = useState<ObservedTask[]>([]);
  const [traceImportProblems, setTraceImportProblems] = useState<Problem[]>([]);

  useEffect(() => {
    performance.mark?.('chronoweave-project-state-redraw');
    if (
      performance.getEntriesByName?.('chronoweave-project-state-commit-start')
        .length
    ) {
      performance.measure?.(
        'chronoweave-project-state-commit-to-redraw',
        'chronoweave-project-state-commit-start',
        'chronoweave-project-state-redraw'
      );
    }
  }, [analysisSnapshot, projectState]);

  const selectedTask =
    projectState.tasks.find(
      (task) => task.id === projectState.selectedTaskId
    ) ?? projectState.tasks[0];
  const observationComparison = useMemo(
    () =>
      observedTasks.length === 0
        ? { comparisons: [], problems: [] }
        : compareObservedTasks(projectState, observedTasks),
    [observedTasks, projectState]
  );
  const problems = [
    ...lastImportProblems,
    ...traceImportProblems,
    ...analysisSnapshot.problems,
    ...observationComparison.problems
  ];

  function selectTask(taskId: string) {
    setProjectState((current) => ({ ...current, selectedTaskId: taskId }));
  }

  function updateTask(taskId: string, patch: Partial<NormalizedTaskModel>) {
    performance.mark?.('chronoweave-project-state-commit-start');
    updateProjectState((current) => ({
      ...current,
      selectedTaskId: taskId,
      tasks: current.tasks.map((task) =>
        task.id === taskId ? { ...task, ...patch } : task
      )
    }));
  }

  function addTask() {
    performance.mark?.('chronoweave-project-state-commit-start');
    const index = projectState.tasks.length + 1;
    const task: NormalizedTaskModel = {
      id: `task-${index}`,
      name: `Task_${index}`,
      period_ms: 10,
      wcet_ms: 1,
      deadline_ms: 10,
      priority_mode: 'auto',
      stack: 'low'
    };

    updateProjectState((current) => ({
      ...current,
      selectedTaskId: task.id,
      tasks: [...current.tasks, task]
    }));
  }

  function duplicateSelectedTask() {
    performance.mark?.('chronoweave-project-state-commit-start');
    const sourceTask =
      selectedTask ??
      projectState.tasks.find((task) => task.name === 'MotorCtrl_X');
    if (sourceTask === undefined) {
      return;
    }

    const duplicatedTask =
      sourceTask.name === 'MotorCtrl_X'
        ? createDuplicatedAxisTask(sourceTask)
        : {
            ...sourceTask,
            id: `${sourceTask.id}-copy-${projectState.tasks.length + 1}`,
            name: `${sourceTask.name}_Copy`
          };

    updateProjectState((current) => ({
      ...current,
      selectedTaskId: duplicatedTask.id,
      tasks: [
        ...current.tasks.filter((task) => task.id !== duplicatedTask.id),
        duplicatedTask
      ]
    }));
  }

  function deleteSelectedTask() {
    performance.mark?.('chronoweave-project-state-commit-start');
    if (selectedTask === undefined || projectState.tasks.length <= 1) {
      return;
    }

    updateProjectState((current) => {
      const tasks = current.tasks.filter((task) => task.id !== selectedTask.id);
      return { ...current, selectedTaskId: tasks[0]?.id, tasks };
    });
  }

  function updateGlobalRamCapacity(value: string) {
    performance.mark?.('chronoweave-project-state-commit-start');
    updateProjectState((current) => ({
      ...current,
      global: {
        ...current.global,
        ram_capacity: value === '' ? undefined : Number(value)
      }
    }));
  }

  function loadPhaseTwoSample() {
    performance.mark?.('chronoweave-project-state-commit-start');
    setGeneratedFiles([]);
    replaceProjectState(
      normalizedProjectToProjectState(
        motorControlWithAperiodicProject,
        'diagnostics-request'
      )
    );
  }

  function generateFreeRtosPreview() {
    performance.mark?.('chronoweave-codegen-start');
    const files = generateFreeRtosFiles(projectState);
    performance.mark?.('chronoweave-codegen-end');
    performance.measure?.(
      'chronoweave-codegen',
      'chronoweave-codegen-start',
      'chronoweave-codegen-end'
    );
    setGeneratedFiles(files);
  }

  async function importTraceCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';

    if (file === undefined) {
      return;
    }

    performance.mark?.('chronoweave-trace-import-start');
    const result = parseTraceCsv(await file.text());
    performance.mark?.('chronoweave-trace-import-end');
    performance.measure?.(
      'chronoweave-trace-import',
      'chronoweave-trace-import-start',
      'chronoweave-trace-import-end'
    );

    if (!result.ok) {
      setTraceImportProblems(result.problems);
      return;
    }

    setTraceImportProblems(result.problems);
    setObservedTasks(result.observed_tasks);
  }

  function exportProject(format: ProjectFileFormat) {
    performance.mark?.(`chronoweave-export-${format}-start`);
    const serializedProject = serializeProjectFile(projectState, format);
    performance.mark?.(`chronoweave-export-${format}-end`);
    performance.measure?.(
      `chronoweave-export-${format}`,
      `chronoweave-export-${format}-start`,
      `chronoweave-export-${format}-end`
    );
    const blob = new Blob([serializedProject], {
      type: format === 'json' ? 'application/json' : 'application/x-yaml'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chronoweave-project.${format === 'json' ? 'json' : 'yaml'}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';

    if (file === undefined) {
      return;
    }

    performance.mark?.('chronoweave-import-start');
    const text = await file.text();
    const format = file.name.endsWith('.json') ? 'json' : 'yaml';
    const result = parseSerializedProjectFile(text, format);
    performance.mark?.('chronoweave-import-end');
    performance.measure?.(
      'chronoweave-import',
      'chronoweave-import-start',
      'chronoweave-import-end'
    );

    if (!result.ok) {
      setLastImportProblems(result.problems);
      return;
    }

    setLastImportProblems([]);
    setTraceImportProblems([]);
    setObservedTasks([]);
    setGeneratedFiles([]);
    performance.mark?.('chronoweave-project-state-commit-start');
    replaceProjectState(
      normalizedProjectToProjectState(result.normalizedProjectFile)
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">{messages.app.eyebrow}</p>
          <h1>{messages.app.title}</h1>
        </div>
        <div
          className="header-actions"
          aria-label={messages.projectActions.label}
        >
          <button type="button" onClick={resetProjectState}>
            {messages.projectActions.loadSampleMotor}
          </button>
          <button type="button" onClick={loadPhaseTwoSample}>
            {messages.projectActions.loadSampleAperiodic}
          </button>
          <button type="button" onClick={() => importInputRef.current?.click()}>
            {messages.projectActions.import}
          </button>
          <button type="button" onClick={() => traceInputRef.current?.click()}>
            {messages.projectActions.importTraceCsv}
          </button>
          <button type="button" onClick={() => exportProject('yaml')}>
            {messages.projectActions.exportYaml}
          </button>
          <button type="button" onClick={() => exportProject('json')}>
            {messages.projectActions.exportJson}
          </button>
          <button type="button" onClick={generateFreeRtosPreview}>
            {messages.projectActions.generateFreeRtos}
          </button>
          <button
            type="button"
            disabled={history.past.length === 0}
            onClick={undoProjectState}
          >
            {messages.projectActions.undo}
          </button>
          <button
            type="button"
            disabled={history.future.length === 0}
            onClick={redoProjectState}
          >
            {messages.projectActions.redo}
          </button>
          <input
            ref={importInputRef}
            className="visually-hidden"
            data-testid="project-file-input"
            type="file"
            accept=".yaml,.yml,.json,application/json,application/x-yaml,text/yaml"
            onChange={importProject}
          />
          <input
            ref={traceInputRef}
            className="visually-hidden"
            data-testid="trace-file-input"
            type="file"
            accept=".csv,text/csv"
            onChange={importTraceCsv}
          />
        </div>
      </header>

      <main className="workspace-grid">
        <section className="panel task-panel" aria-labelledby="task-list-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{messages.panels.taskList.eyebrow}</p>
              <h2 id="task-list-title">{messages.panels.taskList.title}</h2>
            </div>
            <span className="count-pill">
              {projectState.tasks.length} {messages.panels.taskList.countSuffix}
            </span>
          </div>
          <div className="panel-actions">
            <button type="button" onClick={addTask}>
              {messages.panels.taskList.add}
            </button>
            <button type="button" onClick={duplicateSelectedTask}>
              {messages.panels.taskList.duplicate}
            </button>
            <button
              type="button"
              onClick={deleteSelectedTask}
              disabled={projectState.tasks.length <= 1}
            >
              {messages.panels.taskList.delete}
            </button>
          </div>
          <TaskTable
            analyses={analysisSnapshot.tasks}
            selectedTaskId={selectedTask?.id}
            tasks={projectState.tasks}
            onSelectTask={selectTask}
            onUpdateTask={updateTask}
          />
        </section>

        <section
          className="center-stack"
          aria-label={messages.workspace.analysisLabel}
        >
          <section className="panel gantt-panel" aria-labelledby="gantt-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{messages.panels.gantt.eyebrow}</p>
                <h2 id="gantt-title">{messages.panels.gantt.title}</h2>
              </div>
              <span className="count-pill">
                {messages.panels.gantt.lcmPrefix} {analysisSnapshot.lcm_ms}{' '}
                {messages.panels.gantt.lcmSuffix}
              </span>
            </div>
            <GanttChart
              analyses={analysisSnapshot.tasks}
              lcmMs={analysisSnapshot.lcm_ms}
              selectedTaskId={selectedTask?.id}
              tasks={projectState.tasks}
              onSelectTask={selectTask}
              onUpdateTask={updateTask}
            />
          </section>

          <section
            className="metric-grid"
            aria-label={messages.workspace.derivedLabel}
          >
            <BufferPanel
              analyses={analysisSnapshot.tasks}
              tasks={projectState.tasks}
            />
            <MemoryPanel analysisSnapshot={analysisSnapshot} />
            <PhaseTwoPanel
              analysisSnapshot={analysisSnapshot}
              projectState={projectState}
            />
          </section>

          <ProblemsPanel problems={problems} onSelectTask={selectTask} />
          <ObservationPanel comparisons={observationComparison.comparisons} />
          <CodegenPreview files={generatedFiles} />
        </section>

        <PropertyPanel
          selectedTask={selectedTask}
          ramCapacity={projectState.global.ram_capacity}
          onUpdateRamCapacity={updateGlobalRamCapacity}
          onUpdateTask={updateTask}
        />
      </main>
    </div>
  );
}

function ObservationPanel({
  comparisons
}: {
  comparisons: TaskObservationComparison[];
}) {
  if (comparisons.length === 0) {
    return null;
  }

  return (
    <section
      className="panel observation-panel"
      aria-labelledby="observation-title"
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Trace</p>
          <h2 id="observation-title">{messages.panels.observation.title}</h2>
        </div>
        <span className="count-pill">{comparisons.length} rows</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Status</th>
            <th>Design P</th>
            <th>Observed P</th>
            <th>Design WCET</th>
            <th>Observed Max</th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((comparison) => (
            <tr key={`${comparison.task_name}-${comparison.status}`}>
              <td>{comparison.task_name}</td>
              <td>{comparison.status}</td>
              <td>{formatOptionalMs(comparison.design_period_ms)}</td>
              <td>{formatOptionalMs(comparison.observed_period_ms)}</td>
              <td>{formatOptionalMs(comparison.design_wcet_ms)}</td>
              <td>{formatOptionalMs(comparison.observed_max_execution_ms)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function formatOptionalMs(value: number | undefined) {
  return value === undefined ? '-' : `${value} ms`;
}

function PhaseTwoPanel({
  analysisSnapshot,
  projectState
}: {
  analysisSnapshot: AnalysisSnapshot;
  projectState: ProjectState;
}) {
  const server = analysisSnapshot.sporadic_server;

  return (
    <article className="panel metric-panel phase-two-panel">
      <p className="eyebrow">{messages.panels.phase.phaseTwo}</p>
      <h2>Iterative RTA</h2>
      <div className="analysis-list">
        {analysisSnapshot.tasks.map((taskAnalysis) => {
          const task = projectState.tasks.find(
            (candidate) => candidate.id === taskAnalysis.task_id
          );
          return (
            <div key={taskAnalysis.task_id}>
              <span>{task?.name ?? taskAnalysis.task_id}</span>
              <strong>{taskAnalysis.iterative_response_time_ms} ms</strong>
            </div>
          );
        })}
      </div>
      <div className="server-summary">
        <span>{projectState.aperiodic_tasks.length} aperiodic tasks</span>
        <strong>
          Server{' '}
          {server?.enabled === true
            ? `${server.capacity_utilization_percent}%`
            : 'off'}
        </strong>
      </div>
    </article>
  );
}

function CodegenPreview({ files }: { files: GeneratedFile[] }) {
  if (files.length === 0) {
    return null;
  }

  return (
    <section className="panel codegen-preview" aria-labelledby="codegen-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{messages.panels.codegen.eyebrow}</p>
          <h2 id="codegen-title">FreeRTOS Preview</h2>
        </div>
        <span className="count-pill">{files.length} files</span>
      </div>
      {files.map((file) => (
        <details key={file.path} open={file.path.endsWith('.c')}>
          <summary>{file.path}</summary>
          <pre>{file.content}</pre>
        </details>
      ))}
    </section>
  );
}

interface TaskTableProps {
  analyses: TaskAnalysis[];
  selectedTaskId?: string;
  tasks: NormalizedTaskModel[];
  onSelectTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<NormalizedTaskModel>) => void;
}

function TaskTable({
  analyses,
  selectedTaskId,
  tasks,
  onSelectTask,
  onUpdateTask
}: TaskTableProps) {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Period</th>
          <th>WCET</th>
          <th>Stack</th>
          <th>Priority</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => {
          const analysis = analyses.find(
            (candidate) => candidate.task_id === task.id
          );
          return (
            <tr
              className={task.id === selectedTaskId ? 'selected-row' : ''}
              key={task.id}
              onClick={() => onSelectTask(task.id)}
            >
              <td>
                <input
                  aria-label={`${task.name} name`}
                  value={task.name}
                  onChange={(event) =>
                    onUpdateTask(task.id, { name: event.currentTarget.value })
                  }
                />
              </td>
              <td>
                <NumberInput
                  ariaLabel={`${task.name} period`}
                  value={task.period_ms}
                  onChange={(value) =>
                    onUpdateTask(task.id, {
                      period_ms: value,
                      deadline_ms: value
                    })
                  }
                />
              </td>
              <td>
                <NumberInput
                  ariaLabel={`${task.name} wcet`}
                  step={0.05}
                  value={task.wcet_ms}
                  onChange={(value) =>
                    onUpdateTask(task.id, { wcet_ms: value })
                  }
                />
              </td>
              <td>
                <StackSelect
                  ariaLabel={`${task.name} stack`}
                  value={task.stack}
                  onChange={(stack) => onUpdateTask(task.id, { stack })}
                />
              </td>
              <td>{analysis?.effective_priority ?? '-'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

interface GanttChartProps {
  analyses: TaskAnalysis[];
  lcmMs: number;
  selectedTaskId?: string;
  tasks: NormalizedTaskModel[];
  onSelectTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<NormalizedTaskModel>) => void;
}

function GanttChart({
  analyses,
  lcmMs,
  selectedTaskId,
  tasks,
  onSelectTask,
  onUpdateTask
}: GanttChartProps) {
  const chartHeight = Math.max(ROW_HEIGHT * tasks.length, ROW_HEIGHT);
  const safeLcmMs = Math.max(lcmMs, 1);

  return (
    <svg
      className="gantt-svg"
      role="img"
      aria-label={messages.panels.gantt.ariaTimeline}
      viewBox={`0 0 ${GANTT_WIDTH} ${chartHeight}`}
    >
      {tasks.map((task, taskIndex) => (
        <GanttTaskRow
          analysis={analyses.find((candidate) => candidate.task_id === task.id)}
          key={task.id}
          lcmMs={safeLcmMs}
          selected={task.id === selectedTaskId}
          task={task}
          taskIndex={taskIndex}
          onSelectTask={onSelectTask}
          onUpdateTask={onUpdateTask}
        />
      ))}
    </svg>
  );
}

interface GanttTaskRowProps {
  analysis?: TaskAnalysis;
  lcmMs: number;
  selected: boolean;
  task: NormalizedTaskModel;
  taskIndex: number;
  onSelectTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<NormalizedTaskModel>) => void;
}

function GanttTaskRow({
  analysis,
  lcmMs,
  selected,
  task,
  taskIndex,
  onSelectTask,
  onUpdateTask
}: GanttTaskRowProps) {
  const dragStartWcet = useRef(task.wcet_ms);
  const pixelsPerMs = GANTT_WIDTH / lcmMs;
  const y = taskIndex * ROW_HEIGHT + 10;
  const periodCount = Math.max(1, Math.floor(lcmMs / task.period_ms));
  const barWidth = Math.max(4, task.wcet_ms * pixelsPerMs);
  const bind = useDrag(({ first, last, movement: [movementX] }) => {
    if (first) {
      dragStartWcet.current = task.wcet_ms;
      performance.mark?.('chronoweave-wcet-drag-start');
    }

    const nextWcet = Math.max(
      0.05,
      Math.round((dragStartWcet.current + movementX / pixelsPerMs) * 20) / 20
    );
    onUpdateTask(task.id, { wcet_ms: nextWcet });

    if (last) {
      performance.mark?.('chronoweave-wcet-drag-end');
      performance.measure?.(
        'chronoweave-wcet-drag',
        'chronoweave-wcet-drag-start',
        'chronoweave-wcet-drag-end'
      );
    }
  });
  const statusClass =
    analysis?.schedulable === false
      ? 'bar-error'
      : selected
        ? 'bar-selected'
        : '';

  return (
    <g onClick={() => onSelectTask(task.id)}>
      <text className="gantt-label" x="0" y={y + 17}>
        {task.name}
      </text>
      <rect
        className="gantt-track"
        x="128"
        y={y}
        width={GANTT_WIDTH - 140}
        height="22"
      />
      {Array.from({ length: periodCount }, (_, periodIndex) => {
        const x =
          128 + ((periodIndex * task.period_ms) / lcmMs) * (GANTT_WIDTH - 140);
        return (
          <g key={`${task.id}-${periodIndex}`}>
            <rect
              className={`gantt-bar ${statusClass}`}
              data-testid={`gantt-bar-${task.id}`}
              x={x}
              y={y + 2}
              width={Math.max(4, barWidth * 0.8)}
              height="18"
              rx="3"
            />
            {periodIndex === 0 ? (
              <rect
                {...bind()}
                className="gantt-handle"
                data-testid={`wcet-handle-${task.id}`}
                x={x + Math.max(4, barWidth * 0.8) - 4}
                y={y}
                width="8"
                height="22"
                rx="2"
              />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

function BufferPanel({
  analyses,
  tasks
}: {
  analyses: TaskAnalysis[];
  tasks: NormalizedTaskModel[];
}) {
  const lowestRemaining = Math.min(
    ...analyses.map((analysis) => analysis.buffer_remaining_ms)
  );
  return (
    <article className="panel metric-panel">
      <p className="eyebrow">{messages.panels.buffer.eyebrow}</p>
      <h2>Gauges</h2>
      <div className="gauge-list">
        {analyses.map((analysis) => {
          const task = tasks.find(
            (candidate) => candidate.id === analysis.task_id
          );
          const percent =
            task === undefined
              ? 0
              : Math.max(
                  0,
                  Math.min(
                    100,
                    Math.round(
                      (analysis.buffer_remaining_ms / task.period_ms) * 100
                    )
                  )
                );
          return (
            <div className="mini-gauge" key={analysis.task_id}>
              <span>{task?.name ?? analysis.task_id}</span>
              <div className="gauge">
                <span style={{ width: `${percent}%` }} />
              </div>
              <strong>{analysis.buffer_remaining_ms} ms</strong>
            </div>
          );
        })}
      </div>
      <strong>
        Aperiodic capacity reference:{' '}
        {Number.isFinite(lowestRemaining) ? lowestRemaining : 0} ms
      </strong>
    </article>
  );
}

function MemoryPanel({
  analysisSnapshot
}: {
  analysisSnapshot: AnalysisSnapshot;
}) {
  const profile = analysisSnapshot.memory_profile;
  const maxBytes = Math.max(profile.capacity_bytes ?? 0, profile.peak_bytes, 1);
  const bars = profile.series.slice(0, 24);

  return (
    <article className="panel metric-panel">
      <p className="eyebrow">{messages.panels.memory.eyebrow}</p>
      <h2>Profile</h2>
      <div
        className="memory-wave"
        aria-label={messages.panels.memory.waveformLabel}
      >
        {bars.map((bytes, index) => (
          <span
            key={`${bytes}-${index}`}
            style={{ height: `${Math.max(6, (bytes / maxBytes) * 100)}%` }}
          />
        ))}
      </div>
      <strong>{profile.peak_bytes} bytes peak</strong>
      {profile.capacity_bytes !== undefined ? (
        <p>{profile.capacity_bytes} bytes capacity</p>
      ) : null}
    </article>
  );
}

function ProblemsPanel({
  problems,
  onSelectTask
}: {
  problems: Problem[];
  onSelectTask: (taskId: string) => void;
}) {
  return (
    <section className="panel problems-panel" aria-labelledby="problems-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Validation</p>
          <h2 id="problems-title">{messages.panels.problems.title}</h2>
        </div>
      </div>
      <ul>
        {problems.map((problem) => (
          <li className={`problem-${problem.level}`} key={problem.id}>
            <button
              type="button"
              disabled={problem.task_id === undefined}
              onClick={() => problem.task_id && onSelectTask(problem.task_id)}
            >
              {problem.level}
            </button>
            {problem.message}
          </li>
        ))}
      </ul>
    </section>
  );
}

interface PropertyPanelProps {
  selectedTask?: NormalizedTaskModel;
  ramCapacity?: number;
  onUpdateRamCapacity: (value: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<NormalizedTaskModel>) => void;
}

function PropertyPanel({
  selectedTask,
  ramCapacity,
  onUpdateRamCapacity,
  onUpdateTask
}: PropertyPanelProps) {
  if (selectedTask === undefined) {
    return (
      <aside
        className="panel property-panel"
        aria-label={messages.panels.property.label}
      />
    );
  }

  return (
    <aside className="panel property-panel" aria-labelledby="property-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Selection</p>
          <h2 id="property-title">{messages.panels.property.title}</h2>
        </div>
      </div>
      <label>
        Name
        <input
          value={selectedTask.name}
          onChange={(event) =>
            onUpdateTask(selectedTask.id, { name: event.currentTarget.value })
          }
        />
      </label>
      <label>
        Period ms
        <NumberInput
          value={selectedTask.period_ms}
          onChange={(value) =>
            onUpdateTask(selectedTask.id, { period_ms: value })
          }
        />
      </label>
      <label>
        WCET ms
        <NumberInput
          step={0.05}
          value={selectedTask.wcet_ms}
          onChange={(value) =>
            onUpdateTask(selectedTask.id, { wcet_ms: value })
          }
        />
      </label>
      <label>
        Deadline ms
        <NumberInput
          value={selectedTask.deadline_ms}
          onChange={(value) =>
            onUpdateTask(selectedTask.id, { deadline_ms: value })
          }
        />
      </label>
      <label>
        Priority mode
        <select
          value={selectedTask.priority_mode}
          onChange={(event) =>
            onUpdateTask(selectedTask.id, {
              priority_mode: event.currentTarget.value as 'auto' | 'manual'
            })
          }
        >
          <option value="auto">auto</option>
          <option value="manual">manual</option>
        </select>
      </label>
      <label>
        Manual priority
        <NumberInput
          disabled={selectedTask.priority_mode !== 'manual'}
          value={selectedTask.manual_priority ?? 1}
          onChange={(value) =>
            onUpdateTask(selectedTask.id, {
              manual_priority: Math.round(value)
            })
          }
        />
      </label>
      <label>
        Stack
        <StackSelect
          value={selectedTask.stack}
          onChange={(stack) => onUpdateTask(selectedTask.id, { stack })}
        />
      </label>
      <label>
        Description
        <textarea
          value={selectedTask.description ?? ''}
          onChange={(event) =>
            onUpdateTask(selectedTask.id, {
              description: event.currentTarget.value
            })
          }
        />
      </label>
      <label>
        RAM capacity bytes
        <input
          value={ramCapacity ?? ''}
          type="number"
          min="1"
          onChange={(event) => onUpdateRamCapacity(event.currentTarget.value)}
        />
      </label>
    </aside>
  );
}

function NumberInput({
  ariaLabel,
  disabled,
  step = 1,
  value,
  onChange
}: {
  ariaLabel?: string;
  disabled?: boolean;
  step?: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      aria-label={ariaLabel}
      disabled={disabled}
      min="0"
      step={step}
      type="number"
      value={value}
      onChange={(event) => onChange(Number(event.currentTarget.value))}
    />
  );
}

function StackSelect({
  ariaLabel,
  value,
  onChange
}: {
  ariaLabel?: string;
  value: StackPresetName;
  onChange: (value: StackPresetName) => void;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) =>
        onChange(event.currentTarget.value as StackPresetName)
      }
    >
      <option value="low">low</option>
      <option value="mid">mid</option>
      <option value="high">high</option>
    </select>
  );
}
