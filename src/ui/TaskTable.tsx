import type { NormalizedTaskModel, TaskAnalysis } from '../model/project';
import { NumberInput, StackSelect } from './inputs';

interface TaskTableProps {
  analyses: TaskAnalysis[];
  selectedTaskId?: string;
  tasks: NormalizedTaskModel[];
  onSelectTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<NormalizedTaskModel>) => void;
}

export function TaskTable({
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
