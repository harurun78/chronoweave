import type { ChangeEvent, RefObject } from 'react';

import type { ProjectFileFormat } from '../io/projectFileIo';

interface HeaderActionsProps {
  canRedo: boolean;
  canUndo: boolean;
  importInputRef: RefObject<HTMLInputElement>;
  traceInputRef: RefObject<HTMLInputElement>;
  onExport: (format: ProjectFileFormat) => void;
  onGenerateFreeRtos: () => void;
  onImportProject: (event: ChangeEvent<HTMLInputElement>) => void;
  onImportTrace: (event: ChangeEvent<HTMLInputElement>) => void;
  onLoadSampleAperiodic: () => void;
  onLoadSampleMotor: () => void;
  onRedo: () => void;
  onUndo: () => void;
}

export function HeaderActions({
  canRedo,
  canUndo,
  importInputRef,
  traceInputRef,
  onExport,
  onGenerateFreeRtos,
  onImportProject,
  onImportTrace,
  onLoadSampleAperiodic,
  onLoadSampleMotor,
  onRedo,
  onUndo
}: HeaderActionsProps) {
  return (
    <div className="header-actions" aria-label="Project actions">
      <button type="button" onClick={onLoadSampleMotor}>
        Motor Control 1-axis
      </button>
      <button type="button" onClick={onLoadSampleAperiodic}>
        Motor Control + Aperiodic
      </button>
      <button type="button" onClick={() => importInputRef.current?.click()}>
        Import
      </button>
      <button type="button" onClick={() => traceInputRef.current?.click()}>
        Import Trace CSV
      </button>
      <button type="button" onClick={() => onExport('yaml')}>
        Export YAML
      </button>
      <button type="button" onClick={() => onExport('json')}>
        Export JSON
      </button>
      <button type="button" onClick={onGenerateFreeRtos}>
        Generate FreeRTOS
      </button>
      <button type="button" disabled={!canUndo} onClick={onUndo}>
        Undo
      </button>
      <button type="button" disabled={!canRedo} onClick={onRedo}>
        Redo
      </button>
      <input
        ref={importInputRef}
        className="visually-hidden"
        data-testid="project-file-input"
        type="file"
        accept=".yaml,.yml,.json,application/json,application/x-yaml,text/yaml"
        onChange={onImportProject}
      />
      <input
        ref={traceInputRef}
        className="visually-hidden"
        data-testid="trace-file-input"
        type="file"
        accept=".csv,text/csv"
        onChange={onImportTrace}
      />
    </div>
  );
}
