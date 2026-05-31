/**
 * UI string catalog (English).
 *
 * UI components should import strings from `messages` rather than hard-coding
 * literals so that follow-up i18n work (e.g. Japanese catalog) only requires
 * adding another file with the same shape.
 */

export const messages = {
  app: {
    eyebrow: 'RTOS Task Design Kernel',
    title: 'Chronoweave'
  },
  projectActions: {
    label: 'Project actions',
    loadSampleMotor: 'Motor Control 1-axis',
    loadSampleAperiodic: 'Motor Control + Aperiodic',
    import: 'Import',
    importTraceCsv: 'Import Trace CSV',
    exportYaml: 'Export YAML',
    exportJson: 'Export JSON',
    generateFreeRtos: 'Generate FreeRTOS',
    undo: 'Undo',
    redo: 'Redo'
  },
  workspace: {
    analysisLabel: 'Analysis workspace',
    derivedLabel: 'Derived panels'
  },
  panels: {
    taskList: {
      eyebrow: 'ProjectState',
      title: 'Task List',
      countSuffix: 'tasks',
      add: 'Add',
      duplicate: 'Duplicate',
      delete: 'Delete'
    },
    gantt: {
      eyebrow: 'AnalysisSnapshot',
      title: 'Gantt',
      lcmPrefix: 'LCM',
      lcmSuffix: 'ms',
      ariaTimeline: 'Periodic task timeline preview'
    },
    observation: {
      title: 'Observation'
    },
    codegen: {
      eyebrow: 'Codegen'
    },
    buffer: {
      eyebrow: 'Buffer'
    },
    memory: {
      eyebrow: 'Memory',
      waveformLabel: 'Memory profile waveform'
    },
    problems: {
      title: 'Problems'
    },
    property: {
      title: 'Property Panel',
      label: 'Property Panel'
    },
    phase: {
      phaseTwo: 'Phase 2'
    }
  }
} as const;

export type Messages = typeof messages;
