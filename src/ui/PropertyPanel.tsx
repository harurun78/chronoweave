import type { RefObject } from 'react';
import type { NormalizedTaskModel } from '../model/project';
import { NumberInput, StackSelect } from './inputs';
import { messages } from '../i18n/messages.en';

interface PropertyPanelProps {
  selectedTask?: NormalizedTaskModel;
  ramCapacity?: number;
  nameInputRef?: RefObject<HTMLInputElement>;
  onUpdateRamCapacity: (value: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<NormalizedTaskModel>) => void;
}

export function PropertyPanel({
  selectedTask,
  ramCapacity,
  nameInputRef,
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
          ref={nameInputRef}
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
