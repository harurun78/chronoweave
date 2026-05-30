import { describe, expect, it } from 'vitest';

import {
  generateFreeRtosFiles,
  sanitizeSymbol
} from '../../src/codegen/freertos';
import { normalizedProjectToProjectState } from '../../src/io/projectFileIo';
import { motorControlWithAperiodicProject } from '../../src/samples/motorControl';

describe('FreeRTOS code generation', () => {
  it('sanitizes generated symbols deterministically', () => {
    expect(sanitizeSymbol('123 Motor Ctrl-X')).toBe('_123_Motor_Ctrl_X');
    expect(sanitizeSymbol('***')).toBe('Generated');
  });

  it('generates periodic task and Sporadic Server preview files', () => {
    const files = generateFreeRtosFiles(
      normalizedProjectToProjectState(motorControlWithAperiodicProject)
    );

    expect(files.map((file) => file.path)).toEqual([
      'MotorDemo_tasks.h',
      'MotorDemo_tasks.c'
    ]);
    expect(files[1].content).toContain('static void MotorCtrl_XTask');
    expect(files[1].content).toContain('MOTORCTRL_X_PRIORITY 2');
    expect(files[1].content).toContain('MotorDemoSporadicServerTask');
    expect(files[1].content).toContain('DiagnosticsRequest');
  });
});
