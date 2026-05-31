import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';

import { validateProjectFile } from '../../src/schema/projectFile';

const schemaPath = join(
  process.cwd(),
  'specs/004-heterogeneous-soc-design/contracts/project-file.schema.json'
);
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateJsonSchema = ajv.compile(schema);

function bothAccept(input: unknown): {
  jsonSchema: boolean;
  zod: boolean;
} {
  const jsonSchema = validateJsonSchema(input);
  const zodResult = validateProjectFile(input);
  return { jsonSchema, zod: zodResult.ok };
}

const validProject = {
  version: '0.3',
  global: {
    tick_ms: 1,
    stack_presets: { low: 512, mid: 2048, high: 4096 }
  },
  domains: [{ id: 'rtos', name: 'RTOS', kind: 'rtos', core_count: 1 }],
  tasks: [
    {
      id: 'task1',
      name: 'Task 1',
      period_ms: 10,
      wcet_ms: 1,
      stack: 'low',
      domain_id: 'rtos'
    }
  ],
  channels: [
    {
      id: 'ch1',
      producer_task_id: 'task1',
      consumer_task_id: 'task1',
      transport: 'shared_memory',
      latency_budget_ms: 5
    }
  ],
  stochastic_events: [
    {
      id: 'ev1',
      name: 'Event',
      domain_id: 'rtos',
      mean_interarrival_ms: 100,
      consumer_task_id: 'task1'
    }
  ]
};

describe('ProjectFile v0.3 JSON Schema <-> Zod contract parity (T006)', () => {
  it('both validators accept a fully populated v0.3 ProjectFile', () => {
    const verdict = bothAccept(validProject);
    expect(verdict.jsonSchema).toBe(true);
    expect(verdict.zod).toBe(true);
  });

  it('both validators reject missing required version', () => {
    const invalid = { ...validProject };
    delete (invalid as { version?: string }).version;
    const verdict = bothAccept(invalid);
    expect(verdict.jsonSchema).toBe(false);
    expect(verdict.zod).toBe(false);
  });

  it('both validators reject an unknown top-level field', () => {
    const invalid = { ...validProject, unknown_field: 'oops' };
    const verdict = bothAccept(invalid);
    expect(verdict.jsonSchema).toBe(false);
    expect(verdict.zod).toBe(false);
  });

  it('both validators reject a domain with unsupported kind', () => {
    const invalid = {
      ...validProject,
      domains: [{ id: 'rtos', name: 'X', kind: 'bogus', core_count: 1 }]
    };
    const verdict = bothAccept(invalid);
    expect(verdict.jsonSchema).toBe(false);
    expect(verdict.zod).toBe(false);
  });

  it('both validators reject a channel with non-positive latency_budget_ms', () => {
    const invalid = {
      ...validProject,
      channels: [
        {
          id: 'ch1',
          producer_task_id: 'task1',
          consumer_task_id: 'task1',
          transport: 'shared_memory',
          latency_budget_ms: 0
        }
      ]
    };
    const verdict = bothAccept(invalid);
    expect(verdict.jsonSchema).toBe(false);
    expect(verdict.zod).toBe(false);
  });

  it('both validators reject a stochastic event without consumer_task_id', () => {
    const invalid = {
      ...validProject,
      stochastic_events: [
        {
          id: 'ev1',
          name: 'Event',
          domain_id: 'rtos',
          mean_interarrival_ms: 100
        }
      ]
    };
    const verdict = bothAccept(invalid);
    expect(verdict.jsonSchema).toBe(false);
    expect(verdict.zod).toBe(false);
  });

  it('both validators reject manual priority_mode without manual_priority', () => {
    const invalid = {
      ...validProject,
      tasks: [
        {
          ...validProject.tasks[0],
          priority_mode: 'manual'
        }
      ]
    };
    const verdict = bothAccept(invalid);
    expect(verdict.jsonSchema).toBe(false);
    expect(verdict.zod).toBe(false);
  });
});
