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
import { useObservation } from '../hooks/useObservation';
import { usePerfMeasure } from '../hooks/usePerfMeasure';
import { useTraceImport } from '../hooks/useTraceImport';
import { BufferPanel } from '../ui/BufferPanel';
import { CodegenPreview } from '../ui/CodegenPreview';
import { GanttChart } from '../ui/GanttChart';
import { HeaderActions } from '../ui/HeaderActions';
import { MemoryPanel } from '../ui/MemoryPanel';
import { ObservationPanel } from '../ui/ObservationPanel';
import { PhaseTwoPanel } from '../ui/PhaseTwoPanel';
import { ProblemsPanel } from '../ui/ProblemsPanel';
import { PropertyPanel } from '../ui/PropertyPanel';
import { TaskTable } from '../ui/TaskTable';

import './App.css';

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

  const selectedTask =
    projectState.tasks.find(
      (task) => task.id === projectState.selectedTaskId
    ) ?? projectState.tasks[0];
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
      stack: 'low'
    };

    updateProjectState((current) => ({
      ...current,
      selectedTaskId: task.id,
      tasks: [...current.tasks, task]
    }));
  }

  function duplicateSelectedTask() {
    perf.mark('chronoweave-project-state-commit-start');
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
          <p className="eyebrow">RTOS Task Design Kernel</p>
          <h1>Chronoweave</h1>
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
          <div className="panel-heading">
            <div>
              <p className="eyebrow">ProjectState</p>
              <h2 id="task-list-title">Task List</h2>
            </div>
            <span className="count-pill">
              {projectState.tasks.length} tasks
            </span>
          </div>
          <div className="panel-actions">
            <button type="button" onClick={addTask}>
              Add
            </button>
            <button type="button" onClick={duplicateSelectedTask}>
              Duplicate
            </button>
            <button
              type="button"
              onClick={deleteSelectedTask}
              disabled={projectState.tasks.length <= 1}
            >
              Delete
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

        <section className="center-stack" aria-label="Analysis workspace">
          <section className="panel gantt-panel" aria-labelledby="gantt-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">AnalysisSnapshot</p>
                <h2 id="gantt-title">Gantt</h2>
              </div>
              <span className="count-pill">
                LCM {analysisSnapshot.lcm_ms} ms
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

          <section className="metric-grid" aria-label="Derived panels">
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
