import { useDrag } from '@use-gesture/react';
import { useRef } from 'react';

import type {
  CoreAnalysis,
  NormalizedTaskModel,
  TaskAnalysis
} from '../model/project';
import { GANTT_WIDTH, ROW_HEIGHT } from './ganttLayout';
import { messages } from '../i18n/messages.en';

const WCET_MIN_MS = 0.05;
const WCET_STEP_MS = 0.05;

interface GanttChartProps {
  analyses: TaskAnalysis[];
  cores?: CoreAnalysis[];
  lcmMs: number;
  selectedTaskId?: string;
  tasks: NormalizedTaskModel[];
  onSelectTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<NormalizedTaskModel>) => void;
}

export function GanttChart({
  analyses,
  cores,
  lcmMs,
  selectedTaskId,
  tasks,
  onSelectTask,
  onUpdateTask
}: GanttChartProps) {
  const tasksById = new Map(tasks.map((task) => [task.id, task] as const));
  const rows =
    cores !== undefined && cores.length > 0
      ? cores.map((core) => ({
          id: `core-${core.core_index}`,
          label: `Core ${core.core_index}`,
          tasks: core.task_ids
            .map((taskId) => tasksById.get(taskId))
            .filter((task): task is NormalizedTaskModel => task !== undefined),
          testId: `gantt-core-row-${core.core_index}`
        }))
      : tasks.map((task) => ({
          id: task.id,
          label: task.name,
          tasks: [task],
          testId: `gantt-task-row-${task.id}`
        }));
  const chartHeight = Math.max(ROW_HEIGHT * rows.length, ROW_HEIGHT);
  const safeLcmMs = Math.max(lcmMs, 1);

  return (
    <svg
      className="gantt-svg"
      role="img"
      aria-label={messages.panels.gantt.ariaTimeline}
      viewBox={`0 0 ${GANTT_WIDTH} ${chartHeight}`}
    >
      {rows.map((row, rowIndex) => (
        <GanttTaskRow
          analyses={analyses}
          key={row.id}
          label={row.label}
          lcmMs={safeLcmMs}
          selectedTaskId={selectedTaskId}
          tasks={row.tasks}
          rowIndex={rowIndex}
          testId={row.testId}
          onSelectTask={onSelectTask}
          onUpdateTask={onUpdateTask}
        />
      ))}
    </svg>
  );
}

interface GanttTaskRowProps {
  analyses: TaskAnalysis[];
  label: string;
  lcmMs: number;
  selectedTaskId?: string;
  tasks: NormalizedTaskModel[];
  rowIndex: number;
  testId: string;
  onSelectTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<NormalizedTaskModel>) => void;
}

function GanttTaskRow({
  analyses,
  label,
  lcmMs,
  selectedTaskId,
  tasks,
  rowIndex,
  testId,
  onSelectTask,
  onUpdateTask
}: GanttTaskRowProps) {
  const dragStartWcet = useRef(0);
  const pixelsPerMs = GANTT_WIDTH / lcmMs;
  const y = rowIndex * ROW_HEIGHT + 10;

  return (
    <g role="row" data-testid={testId}>
      <text className="gantt-label" x="0" y={y + 17}>
        {label}
      </text>
      <rect
        className="gantt-track"
        x="128"
        y={y}
        width={GANTT_WIDTH - 140}
        height="22"
      />
      {tasks.map((task, taskIndex) => (
        <GanttTaskBar
          analysis={analyses.find((candidate) => candidate.task_id === task.id)}
          key={task.id}
          lcmMs={lcmMs}
          pixelsPerMs={pixelsPerMs}
          rowY={y}
          selected={task.id === selectedTaskId}
          showHandle={tasks.length === 1 && taskIndex === 0}
          task={task}
          taskIndex={taskIndex}
          taskLaneCount={tasks.length}
          dragStartWcet={dragStartWcet}
          onSelectTask={onSelectTask}
          onUpdateTask={onUpdateTask}
        />
      ))}
    </g>
  );
}

interface GanttTaskBarProps {
  analysis?: TaskAnalysis;
  lcmMs: number;
  pixelsPerMs: number;
  rowY: number;
  selected: boolean;
  showHandle: boolean;
  task: NormalizedTaskModel;
  taskIndex: number;
  taskLaneCount: number;
  dragStartWcet: { current: number };
  onSelectTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<NormalizedTaskModel>) => void;
}

function GanttTaskBar({
  analysis,
  lcmMs,
  pixelsPerMs,
  rowY,
  selected,
  showHandle,
  task,
  taskIndex,
  taskLaneCount,
  dragStartWcet,
  onSelectTask,
  onUpdateTask
}: GanttTaskBarProps) {
  const periodCount = Math.max(1, Math.floor(lcmMs / task.period_ms));
  const barWidth = Math.max(4, task.wcet_ms * pixelsPerMs);
  const laneHeight = Math.max(6, 18 / Math.max(taskLaneCount, 1));
  const barY = rowY + 2 + taskIndex * laneHeight;
  const barHeight = Math.max(4, laneHeight - 2);

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
      {Array.from({ length: periodCount }, (_, periodIndex) => {
        const x =
          128 + ((periodIndex * task.period_ms) / lcmMs) * (GANTT_WIDTH - 140);
        return (
          <g key={`${task.id}-${periodIndex}`}>
            <rect
              className={`gantt-bar ${statusClass}`}
              data-testid={`gantt-bar-${task.id}`}
              x={x}
              y={barY}
              width={Math.max(4, barWidth * 0.8)}
              height={barHeight}
              rx="3"
            />
            {periodIndex === 0 && showHandle ? (
              <rect
                {...bind()}
                className="gantt-handle"
                data-testid={`wcet-handle-${task.id}`}
                role="slider"
                tabIndex={0}
                aria-label={`WCET handle for ${task.name}`}
                aria-valuemin={WCET_MIN_MS}
                aria-valuemax={lcmMs}
                aria-valuenow={task.wcet_ms}
                aria-orientation="horizontal"
                onKeyDown={(event) => {
                  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
                    return;
                  }
                  event.preventDefault();
                  const delta =
                    event.key === 'ArrowRight' ? WCET_STEP_MS : -WCET_STEP_MS;
                  const next = Math.max(
                    WCET_MIN_MS,
                    Math.round((task.wcet_ms + delta) * 100) / 100
                  );
                  if (next !== task.wcet_ms) {
                    performance.mark?.('chronoweave-wcet-keyboard');
                    onUpdateTask(task.id, { wcet_ms: next });
                  }
                }}
                x={x + Math.max(4, barWidth * 0.8) - 4}
                y={rowY}
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
