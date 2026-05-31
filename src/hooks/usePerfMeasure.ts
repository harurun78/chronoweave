import { useMemo } from 'react';

export interface PerfMeasure {
  mark: (label: string) => void;
  measure: (name: string, startMark: string, endMark: string) => void;
}

export function usePerfMeasure(): PerfMeasure {
  return useMemo(
    () => ({
      mark: (label) => {
        performance.mark?.(label);
      },
      measure: (name, startMark, endMark) => {
        performance.measure?.(name, startMark, endMark);
      }
    }),
    []
  );
}
