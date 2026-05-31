import { useDrag } from '@use-gesture/react';
import { useRef } from 'react';

import type { NormalizedTaskModel, TaskAnalysis } from '../model/project';
import { GANTT_WIDTH, ROW_HEIGHT } from './ganttLayout';

interface GanttChartProps {
  analyses: TaskAnalysis[];
  lcmMs: number;
  selectedTaskId?: string;
  tasks: NormalizedTaskModel[];
  onSelectTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<NormalizedTaskModel>) => void;
}

export function GanttChart({
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
      aria-label="Periodic task timeline preview"
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
