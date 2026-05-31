import type { Problem } from '../model/project';
import type { ObservedTask, TraceEvent, TraceImportResult } from './types';

const REQUIRED_HEADERS = ['task', 'start_ms', 'end_ms'] as const;

export const TRACE_CSV_MAX_BYTES = 100 * 1024;
export const TRACE_CSV_MAX_ROWS = 10_000;

export function parseTraceCsv(input: string): TraceImportResult {
  const byteLength =
    typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(input).byteLength
      : input.length;
  if (byteLength > TRACE_CSV_MAX_BYTES) {
    return traceFailure(
      'size-limit',
      `Trace CSV is ${byteLength} bytes, exceeding the ${TRACE_CSV_MAX_BYTES}-byte limit.`
    );
  }
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return traceFailure('empty', 'Trace CSV is empty.');
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  const missingHeader = REQUIRED_HEADERS.find(
    (header) => !headerIndex.has(header)
  );

  if (missingHeader !== undefined) {
    return traceFailure(
      'missing-header',
      `Trace CSV is missing required header: ${missingHeader}.`
    );
  }

  const problems: Problem[] = [];
  const events: TraceEvent[] = [];

  const dataRowCount = lines.length - 1;
  if (dataRowCount > TRACE_CSV_MAX_ROWS) {
    return traceFailure(
      'row-limit',
      `Trace CSV has ${dataRowCount} data rows, exceeding the ${TRACE_CSV_MAX_ROWS}-row limit.`
    );
  }

  lines.slice(1).forEach((line, rowOffset) => {
    const rowNumber = rowOffset + 2;
    const values = parseCsvLine(line);
    const taskName = values[headerIndex.get('task') ?? -1]?.trim() ?? '';
    const startText = values[headerIndex.get('start_ms') ?? -1]?.trim() ?? '';
    const endText = values[headerIndex.get('end_ms') ?? -1]?.trim() ?? '';
    const startMs = Number(startText);
    const endMs = Number(endText);

    if (taskName.length === 0) {
      problems.push(
        traceProblem(
          `row-${rowNumber}-task`,
          `Trace row ${rowNumber} has an empty task name.`
        )
      );
      return;
    }

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      problems.push(
        traceProblem(
          `row-${rowNumber}-timestamp`,
          `Trace row ${rowNumber} has non-numeric timestamps.`
        )
      );
      return;
    }

    if (endMs <= startMs) {
      problems.push(
        traceProblem(
          `row-${rowNumber}-interval`,
          `Trace row ${rowNumber} end_ms must be greater than start_ms.`
        )
      );
      return;
    }

    events.push({
      task_name: taskName,
      start_ms: startMs,
      end_ms: endMs
    });
  });

  if (problems.length > 0) {
    return { ok: false, problems };
  }

  return {
    ok: true,
    events,
    observed_tasks: estimateObservedTasks(events),
    problems: []
  };
}

export function estimateObservedTasks(events: TraceEvent[]): ObservedTask[] {
  const groupedEvents = new Map<string, TraceEvent[]>();

  events.forEach((event) => {
    groupedEvents.set(event.task_name, [
      ...(groupedEvents.get(event.task_name) ?? []),
      event
    ]);
  });

  return Array.from(groupedEvents.entries())
    .map(([taskName, taskEvents]) => {
      const sortedEvents = [...taskEvents].sort(
        (left, right) => left.start_ms - right.start_ms
      );
      const durations = sortedEvents.map((event) =>
        roundMs(event.end_ms - event.start_ms)
      );
      const deltas = sortedEvents
        .slice(1)
        .map((event, index) =>
          roundMs(event.start_ms - sortedEvents[index].start_ms)
        );
      const periodEstimate = deltas.length > 0 ? average(deltas) : undefined;

      return {
        name: taskName,
        sample_count: sortedEvents.length,
        ...(periodEstimate === undefined
          ? {}
          : { period_estimate_ms: periodEstimate }),
        execution_time_avg_ms: average(durations),
        execution_time_min_ms: Math.min(...durations),
        execution_time_max_ms: Math.max(...durations)
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current);
  return values;
}

function traceFailure(idSuffix: string, message: string): TraceImportResult {
  return {
    ok: false,
    problems: [traceProblem(idSuffix, message)]
  };
}

function traceProblem(idSuffix: string, message: string): Problem {
  return {
    id: `trace-import-${idSuffix}`,
    level: 'error',
    message,
    source: 'import'
  };
}

function average(values: number[]): number {
  return roundMs(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function roundMs(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
