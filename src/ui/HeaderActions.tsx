import type { ChangeEvent, RefObject } from 'react';

import type { ProjectFileFormat } from '../io/projectFileIo';
import { messages } from '../i18n/messages.en';

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
    <div className="header-actions" aria-label={messages.projectActions.label}>
      <button type="button" onClick={onLoadSampleMotor}>
        {messages.projectActions.loadSampleMotor}
      </button>
      <button type="button" onClick={onLoadSampleAperiodic}>
        {messages.projectActions.loadSampleAperiodic}
      </button>
      <button type="button" onClick={() => importInputRef.current?.click()}>
        {messages.projectActions.import}
      </button>
      <button type="button" onClick={() => traceInputRef.current?.click()}>
        {messages.projectActions.importTraceCsv}
      </button>
      <button type="button" onClick={() => onExport('yaml')}>
        {messages.projectActions.exportYaml}
      </button>
      <button type="button" onClick={() => onExport('json')}>
        Export JSON
      </button>
      <button type="button" onClick={onGenerateFreeRtos}>
        {messages.projectActions.generateFreeRtos}
      </button>
      <button type="button" disabled={!canUndo} onClick={onUndo}>
        {messages.projectActions.undo}
      </button>
      <button type="button" disabled={!canRedo} onClick={onRedo}>
        {messages.projectActions.redo}
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
