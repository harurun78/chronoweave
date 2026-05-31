import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  normalizedProjectToProjectState,
  serializeProjectFile
} from '../../src/io/projectFileIo';
import { parseProjectFileYaml } from '../../src/schema/projectFile';

const fixtureDirectory = join(process.cwd(), 'test/fixtures/project-files');

function readFixture(fileName: string): string {
  return readFileSync(join(fixtureDirectory, fileName), 'utf8');
}

describe('channel persistence roundtrip', () => {
  it('preserves canonical two-domain channel YAML byte-for-byte', () => {
    const fixtureText = readFixture('two-domain-channel.yaml');
    const parsed = parseProjectFileYaml(fixtureText);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const projectState = normalizedProjectToProjectState(
      parsed.normalizedProjectFile
    );
    const serialized = serializeProjectFile(projectState, 'yaml');

    expect(serialized).toBe(fixtureText);
  });
});
