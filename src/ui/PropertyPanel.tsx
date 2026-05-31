import { type RefObject, useEffect, useState } from 'react';
import type { Domain, NormalizedTaskModel } from '../model/project';
import { NumberInput, StackSelect } from './inputs';
import { messages } from '../i18n/messages.en';

interface PropertyPanelProps {
  domains: Domain[];
  selectedTask?: NormalizedTaskModel;
  ramCapacity?: number;
  nameInputRef?: RefObject<HTMLInputElement>;
  onUpdateRamCapacity: (value: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<NormalizedTaskModel>) => void;
}

export function PropertyPanel({
  domains,
  selectedTask,
  ramCapacity,
  nameInputRef,
  onUpdateRamCapacity,
  onUpdateTask
}: PropertyPanelProps) {
  const [domainDraftId, setDomainDraftId] = useState('');
  const [coreIndexDraft, setCoreIndexDraft] = useState('0');
  const [placementError, setPlacementError] = useState<string | undefined>();
  const selectedTaskId = selectedTask?.id;
  const selectedTaskDomainId = selectedTask?.domain_id ?? '';
  const selectedTaskCoreIndex = selectedTask?.core_index ?? 0;

  useEffect(() => {
    if (selectedTaskId === undefined) {
      setDomainDraftId('');
      setCoreIndexDraft('0');
      setPlacementError(undefined);
      return;
    }

    setDomainDraftId(selectedTaskDomainId);
    setCoreIndexDraft(String(selectedTaskCoreIndex));
    setPlacementError(undefined);
  }, [selectedTaskCoreIndex, selectedTaskDomainId, selectedTaskId]);

  if (selectedTask === undefined) {
    return (
      <aside
        className="panel property-panel"
        aria-label={messages.panels.property.label}
      />
    );
  }

  const task = selectedTask;
  const selectedDomain = domains.find((domain) => domain.id === domainDraftId);

  function saveTaskPlacement() {
    if (domainDraftId.trim() === '') {
      setPlacementError('Domain is required.');
      return;
    }

    if (selectedDomain === undefined) {
      setPlacementError('Selected domain does not exist.');
      return;
    }

    if (coreIndexDraft.trim() === '') {
      setPlacementError('Core index is required.');
      return;
    }

    const parsedCoreIndex = Number(coreIndexDraft);
    if (!Number.isInteger(parsedCoreIndex) || parsedCoreIndex < 0) {
      setPlacementError('Core index must be a non-negative integer.');
      return;
    }

    if (parsedCoreIndex >= selectedDomain.core_count) {
      setPlacementError(
        `Core index must be less than ${selectedDomain.core_count} for ${selectedDomain.name}.`
      );
      return;
    }

    setPlacementError(undefined);
    onUpdateTask(task.id, {
      domain_id: domainDraftId,
      core_index: selectedDomain.core_count > 1 ? parsedCoreIndex : undefined
    });
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
      <fieldset className="placement-editor" aria-label="Task placement">
        <legend>Task placement</legend>
        <label>
          Domain
          <select
            aria-label="Domain"
            value={domainDraftId}
            onChange={(event) => setDomainDraftId(event.currentTarget.value)}
          >
            <option value="">Select domain</option>
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Core index
          <input
            aria-label="Core index"
            type="number"
            min="0"
            value={coreIndexDraft}
            onChange={(event) => setCoreIndexDraft(event.currentTarget.value)}
          />
        </label>
        <button type="button" onClick={saveTaskPlacement}>
          Save placement
        </button>
        {placementError !== undefined ? (
          <p className="field-error" role="alert">
            {placementError}
          </p>
        ) : null}
      </fieldset>
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
