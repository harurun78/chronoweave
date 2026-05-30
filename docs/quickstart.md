# Quickstart: RTOS Task Design Kernel

This quickstart describes the expected implementation repository workflow for Chronoweave Phase 1.

## 1. Install and Run

```bash
npm install
npm run dev
```

Open the dev server URL shown by Vite.

## 2. Load Sample

1. Click `Motor Control 1-axis` in the sample list.
2. Confirm task list includes `ISR_Timer`, `MotorCtrl_X`, and `SensorFusion`.
3. Confirm Problems includes the approximate RTA Info entry and no Error for the baseline sample.

## 3. Add One Axis

1. Duplicate `MotorCtrl_X`.
2. Rename the duplicate to `MotorCtrl_Y`.
3. Keep period 10ms, WCET 3ms, stack mid.
4. Confirm Gantt, buffer gauges, memory profile, and Problems update.

## 4. Adjust WCET

1. Drag the right edge of `SensorFusion` or `MotorCtrl_Y` Gantt bar.
2. Confirm the bar updates during drag.
3. Confirm derived panels update after commit.

## 5. Export and Import

1. Export YAML.
2. Reset the current project.
3. Import the exported YAML.
4. Confirm tasks, settings, Problems, buffer gauges, and memory profile match the pre-export state.

## 6. Run Tests

```bash
npm run lint
npm run type-check
npm run test:run
npm run test:e2e
npm run build
```

## Expected Release Gate

- Unit tests pass.
- Integration tests pass.
- Representative E2E passes.
- Performance measurements are recorded for WCET drag, recompute, import, and export.