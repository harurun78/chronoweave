import { useCallback, useState, type ChangeEvent } from 'react';
import { parseTraceCsv } from '../trace/csvTrace';
import type { ObservedTask } from '../trace/types';
import type { Problem } from '../model/project';
import { usePerfMeasure } from './usePerfMeasure';

export interface UseTraceImportResult {
  observedTasks: ObservedTask[];
  traceImportProblems: Problem[];
  importTraceCsv: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  reset: () => void;
}

export function useTraceImport(): UseTraceImportResult {
  const perf = usePerfMeasure();
  const [observedTasks, setObservedTasks] = useState<ObservedTask[]>([]);
  const [traceImportProblems, setTraceImportProblems] = useState<Problem[]>([]);

  const importTraceCsv = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = '';
      if (file === undefined) {
        return;
      }

      perf.mark('chronoweave-trace-import-start');
      const result = parseTraceCsv(await file.text());
      perf.mark('chronoweave-trace-import-end');
      perf.measure(
        'chronoweave-trace-import',
        'chronoweave-trace-import-start',
        'chronoweave-trace-import-end'
      );

      if (!result.ok) {
        setTraceImportProblems(result.problems);
        return;
      }
      setTraceImportProblems(result.problems);
      setObservedTasks(result.observed_tasks);
    },
    [perf]
  );

  const reset = useCallback(() => {
    setObservedTasks([]);
    setTraceImportProblems([]);
  }, []);

  return { observedTasks, traceImportProblems, importTraceCsv, reset };
}
