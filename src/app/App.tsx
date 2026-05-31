import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';

import { generateFreeRtosFiles } from '../codegen/freertos';
import {
  normalizedProjectToProjectState,
  parseSerializedProjectFile,
  serializeProjectFile,
  type ProjectFileFormat
} from '../io/projectFileIo';
import type {
  ChannelTransport,
  GeneratedFile,
  NormalizedTaskModel,
  Problem
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
import { activeDomainIdAtom } from '../state/projectState';
import { useObservation } from '../hooks/useObservation';
import { usePerfMeasure } from '../hooks/usePerfMeasure';
import { useTraceImport } from '../hooks/useTraceImport';
import { BufferPanel } from '../ui/BufferPanel';
import { CodegenPreview } from '../ui/CodegenPreview';
import { ChannelPanel } from '../ui/ChannelPanel';
import { DomainTabs } from '../ui/DomainTabs';
import { GanttChart } from '../ui/GanttChart';
import { HeaderActions } from '../ui/HeaderActions';
import { MemoryPanel } from '../ui/MemoryPanel';
import { ObservationPanel } from '../ui/ObservationPanel';
import { PhaseTwoPanel } from '../ui/PhaseTwoPanel';
import { ProblemsPanel } from '../ui/ProblemsPanel';
import { StochasticEventPanel } from '../ui/StochasticEventPanel';
import { PropertyPanel } from '../ui/PropertyPanel';
import { TaskTable } from '../ui/TaskTable';

import './App.css';
import { messages } from '../i18n/messages.en';

export function App() {
  const [projectState, setProjectState] = useAtom(projectStateAtom);
  const [activeDomainId, setActiveDomainId] = useAtom(activeDomainIdAtom);
  const analysisSnapshot = useAtomValue(analysisSnapshotAtom);
  const history = useAtomValue(projectHistoryAtom);
  const updateProjectState = useSetAtom(updateProjectStateAtom);
  const replaceProjectState = useSetAtom(replaceProjectStateAtom);
  const resetProjectState = useSetAtom(resetProjectStateAtom);
  const undoProjectState = useSetAtom(undoProjectStateAtom);
  const redoProjectState = useSetAtom(redoProjectStateAtom);
  const importInputRef = useRef<HTMLInputElement>(null);
  const traceInputRef = useRef<HTMLInputElement>(null);
  const propertyNameInputRef = useRef<HTMLInputElement>(null);
  const [lastImportProblems, setLastImportProblems] = useState<Problem[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const trace = useTraceImport();
  const perf = usePerfMeasure();

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

  const visibleTasks = projectState.tasks.filter(
    (task) => task.domain_id === activeDomainId
  );
  const visibleTaskIds = new Set(visibleTasks.map((task) => task.id));
  const visibleAnalyses = analysisSnapshot.tasks.filter((analysis) =>
    visibleTaskIds.has(analysis.task_id)
  );
  const activeDomainAnalysis = analysisSnapshot.domains?.find(
    (domain) => domain.domain_id === activeDomainId
  );
  const selectedTask =
    visibleTasks.find((task) => task.id === projectState.selectedTaskId) ??
    visibleTasks[0];
  const observationComparison = useObservation(
    projectState,
    trace.observedTasks
  );
  const problems = [
    ...lastImportProblems,
    ...trace.traceImportProblems,
    ...analysisSnapshot.problems,
    ...observationComparison.problems
  ];

  function selectTask(taskId: string) {
    const task = projectState.tasks.find(
      (candidate) => candidate.id === taskId
    );
    if (task !== undefined) {
      setActiveDomainId(task.domain_id);
    }

    setProjectState((current) => ({ ...current, selectedTaskId: taskId }));
  }

  function updateTask(taskId: string, patch: Partial<NormalizedTaskModel>) {
    perf.mark('chronoweave-project-state-commit-start');
    updateProjectState((current) => ({
      ...current,
      selectedTaskId: taskId,
      tasks: current.tasks.map((task) =>
        task.id === taskId ? { ...task, ...patch } : task
      )
    }));
  }

  function addTask() {
    perf.mark('chronoweave-project-state-commit-start');
    const index = projectState.tasks.length + 1;
    const task: NormalizedTaskModel = {
      id: `task-${index}`,
      name: `Task_${index}`,
      period_ms: 10,
      wcet_ms: 1,
      deadline_ms: 10,
      priority_mode: 'auto',
      stack: 'low',
      domain_id: activeDomainId ?? projectState.domains[0]?.id ?? 'default'
    };

    updateProjectState((current) => ({
      ...current,
      selectedTaskId: task.id,
      tasks: [...current.tasks, task]
    }));
  }

  function duplicateSelectedTask() {
    perf.mark('chronoweave-project-state-commit-start');
    if (selectedTask === undefined) {
      return;
    }

    const duplicatedTask =
      selectedTask.name === 'MotorCtrl_X'
        ? createDuplicatedAxisTask(selectedTask)
        : {
            ...selectedTask,
            id: `${selectedTask.id}-copy-${projectState.tasks.length + 1}`,
            name: `${selectedTask.name}_Copy`
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
    perf.mark('chronoweave-project-state-commit-start');
    if (selectedTask === undefined || projectState.tasks.length <= 1) {
      return;
    }

    updateProjectState((current) => {
      const tasks = current.tasks.filter((task) => task.id !== selectedTask.id);
      return { ...current, selectedTaskId: tasks[0]?.id, tasks };
    });
  }

  function updateGlobalRamCapacity(value: string) {
    perf.mark('chronoweave-project-state-commit-start');
    updateProjectState((current) => ({
      ...current,
      global: {
        ...current.global,
        ram_capacity: value === '' ? undefined : Number(value)
      }
    }));
  }

  function createChannel(draft: {
    producer_task_id: string;
    consumer_task_id: string;
    transport: ChannelTransport;
    latency_budget_ms: number;
  }) {
    perf.mark('chronoweave-project-state-commit-start');
    updateProjectState((current) => {
      let index = current.channels.length + 1;
      let id = `channel-${index}`;

      while (current.channels.some((channel) => channel.id === id)) {
        index += 1;
        id = `channel-${index}`;
      }

      return {
        ...current,
        version: '0.3',
        channels: [...current.channels, { id, ...draft }]
      };
    });
  }

  function deleteChannel(channelId: string) {
    perf.mark('chronoweave-project-state-commit-start');
    updateProjectState((current) => ({
      ...current,
      channels: current.channels.filter((channel) => channel.id !== channelId)
    }));
  }

  function createStochasticEvent(draft: {
    name: string;
    domain_id: string;
    mean_interarrival_ms: number;
    std_dev_ms?: number;
    consumer_task_id: string;
  }) {
    perf.mark('chronoweave-project-state-commit-start');
    updateProjectState((current) => {
      let index = current.stochastic_events.length + 1;
      let id = `stochastic-${index}`;

      while (current.stochastic_events.some((event) => event.id === id)) {
        index += 1;
        id = `stochastic-${index}`;
      }

      return {
        ...current,
        version: '0.3',
        stochastic_events: [...current.stochastic_events, { id, ...draft }]
      };
    });
  }

  function deleteStochasticEvent(eventId: string) {
    perf.mark('chronoweave-project-state-commit-start');
    updateProjectState((current) => ({
      ...current,
      stochastic_events: current.stochastic_events.filter(
        (event) => event.id !== eventId
      )
    }));
  }

  function loadPhaseTwoSample() {
    perf.mark('chronoweave-project-state-commit-start');
    setGeneratedFiles([]);
    replaceProjectState(
      normalizedProjectToProjectState(
        motorControlWithAperiodicProject,
        'diagnostics-request'
      )
    );
  }

  function generateFreeRtosPreview() {
    perf.mark('chronoweave-codegen-start');
    const files = generateFreeRtosFiles(projectState);
    perf.mark('chronoweave-codegen-end');
    perf.measure(
      'chronoweave-codegen',
      'chronoweave-codegen-start',
      'chronoweave-codegen-end'
    );
    setGeneratedFiles(files);
  }

  function exportProject(format: ProjectFileFormat) {
    perf.mark(`chronoweave-export-${format}-start`);
    const serializedProject = serializeProjectFile(projectState, format);
    perf.mark(`chronoweave-export-${format}-end`);
    perf.measure(
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

    perf.mark('chronoweave-import-start');
    const text = await file.text();
    const format = file.name.endsWith('.json') ? 'json' : 'yaml';
    const result = parseSerializedProjectFile(text, format);
    perf.mark('chronoweave-import-end');
    perf.measure(
      'chronoweave-import',
      'chronoweave-import-start',
      'chronoweave-import-end'
    );

    if (!result.ok) {
      setLastImportProblems(result.problems);
      return;
    }

    setLastImportProblems([]);
    trace.reset();
    setGeneratedFiles([]);
    perf.mark('chronoweave-project-state-commit-start');
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
        <HeaderActions
          canRedo={history.future.length > 0}
          canUndo={history.past.length > 0}
          importInputRef={importInputRef}
          traceInputRef={traceInputRef}
          onExport={exportProject}
          onGenerateFreeRtos={generateFreeRtosPreview}
          onImportProject={importProject}
          onImportTrace={trace.importTraceCsv}
          onLoadSampleAperiodic={loadPhaseTwoSample}
          onLoadSampleMotor={resetProjectState}
          onRedo={redoProjectState}
          onUndo={undoProjectState}
        />
      </header>

      <main className="workspace-grid">
        <section className="panel task-panel" aria-labelledby="task-list-title">
          <DomainTabs />
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{messages.panels.taskList.eyebrow}</p>
              <h2 id="task-list-title">{messages.panels.taskList.title}</h2>
            </div>
            <span className="count-pill">
              {visibleTasks.length} {messages.panels.taskList.countSuffix}
            </span>
          </div>
          <div className="panel-actions">
            <button type="button" onClick={addTask}>
              {messages.panels.taskList.add}
            </button>
            <button
              type="button"
              onClick={duplicateSelectedTask}
              disabled={selectedTask === undefined}
            >
              {messages.panels.taskList.duplicate}
            </button>
            <button
              type="button"
              onClick={deleteSelectedTask}
              disabled={
                projectState.tasks.length <= 1 || selectedTask === undefined
              }
            >
              {messages.panels.taskList.delete}
            </button>
          </div>
          <TaskTable
            analyses={visibleAnalyses}
            selectedTaskId={selectedTask?.id}
            tasks={visibleTasks}
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
              analyses={visibleAnalyses}
              cores={activeDomainAnalysis?.cores}
              lcmMs={analysisSnapshot.lcm_ms}
              selectedTaskId={selectedTask?.id}
              tasks={visibleTasks}
              onSelectTask={selectTask}
              onUpdateTask={updateTask}
            />
          </section>

          <section
            className="metric-grid"
            aria-label={messages.workspace.derivedLabel}
          >
            <BufferPanel analyses={visibleAnalyses} tasks={visibleTasks} />
            <MemoryPanel
              analysisSnapshot={analysisSnapshot}
              activeDomainAnalysis={activeDomainAnalysis}
            />
            <PhaseTwoPanel
              analysisSnapshot={analysisSnapshot}
              projectState={projectState}
            />
          </section>

          <ProblemsPanel
            problems={problems}
            onSelectTask={selectTask}
            onFocusProperty={() => propertyNameInputRef.current?.focus()}
          />
          <ChannelPanel
            channels={projectState.channels}
            tasks={projectState.tasks}
            onCreateChannel={createChannel}
            onDeleteChannel={deleteChannel}
          />
          <StochasticEventPanel
            domains={projectState.domains}
            events={projectState.stochastic_events}
            tasks={projectState.tasks}
            onCreateEvent={createStochasticEvent}
            onDeleteEvent={deleteStochasticEvent}
          />
          <ObservationPanel comparisons={observationComparison.comparisons} />
          <CodegenPreview files={generatedFiles} />
        </section>

        <PropertyPanel
          domains={projectState.domains}
          selectedTask={selectedTask}
          ramCapacity={projectState.global.ram_capacity}
          nameInputRef={propertyNameInputRef}
          onUpdateRamCapacity={updateGlobalRamCapacity}
          onUpdateTask={updateTask}
        />
      </main>
    </div>
  );
}
