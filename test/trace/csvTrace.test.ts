import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  parseTraceCsv,
  TRACE_CSV_MAX_BYTES,
  TRACE_CSV_MAX_ROWS
} from '../../src/trace/csvTrace';

const fixtureDirectory = join(process.cwd(), 'test/fixtures/traces');

function readTrace(fileName: string) {
  return readFileSync(join(fixtureDirectory, fileName), 'utf8');
}

describe('generic CSV trace parser', () => {
  it('parses trace events and estimates observed tasks', () => {
    const result = parseTraceCsv(readTrace('motor-observation.csv'));

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.events).toHaveLength(9);
    expect(result.observed_tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'ISR_Timer',
          sample_count: 3,
          period_estimate_ms: 1,
          execution_time_max_ms: 0.05
        }),
        expect.objectContaining({
          name: 'MotorCtrl_X',
          sample_count: 2,
          period_estimate_ms: 10,
          execution_time_avg_ms: 3.15,
          execution_time_max_ms: 3.2
        }),
        expect.objectContaining({
          name: 'SensorFusion',
          sample_count: 2,
          period_estimate_ms: 24,
          execution_time_max_ms: 6.1
        })
      ])
    );
  });

  it('accepts flexible header order and reports invalid rows', () => {
    const result = parseTraceCsv(readTrace('invalid-observation.csv'));

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'trace-import-row-2-interval' }),
        expect.objectContaining({ id: 'trace-import-row-3-timestamp' })
      ])
    );
  });
});

describe('parseTraceCsv size and row limits', () => {
  it('rejects input exceeding TRACE_CSV_MAX_BYTES', () => {
    const header = 'task,start_ms,end_ms\n';
    const row = 'taskA,0,1\n';
    const padding = 'x'.repeat(TRACE_CSV_MAX_BYTES + 10);
    const oversized = header + row + padding;
    const result = parseTraceCsv(oversized);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problems[0].id).toBe('trace-import-size-limit');
    }
  });

  it('rejects input exceeding TRACE_CSV_MAX_ROWS', () => {
    const header = 'task,start_ms,end_ms\n';
    const rows = Array.from({ length: TRACE_CSV_MAX_ROWS + 5 })
      .map(() => 'a,0,1')
      .join('\n');
    const result = parseTraceCsv(header + rows);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problems[0].id).toBe('trace-import-row-limit');
    }
  });
});
