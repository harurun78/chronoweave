# Implementation Plan: RTOS Task Design Kernel

**Branch**: `001-rtos-task-design-kernel` | **Date**: 2026-05-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-rtos-task-design-kernel/spec.md`

**Note**: This plan is created inside a spec-only repository. Implementation code is not stored here.

## Summary

Build Chronoweave Phase 1 as a static React + TypeScript web app. Users import a Motor Control 1-axis sample, add `MotorCtrl_Y`, adjust WCET through an SVG Gantt, see buffer/memory/Problems update from derived analysis, and export/import YAML/JSON ProjectFiles with roundtrip fidelity.

## Technical Context

**Language/Version**: TypeScript on current Node.js LTS; exact Node version to be fixed in implementation repository.

**Primary Dependencies**: React, Vite, Jotai, @use-gesture/react, @tanstack/react-table, react-resizable-panels, Zod or equivalent schema library, yaml parser, Vitest, React Testing Library, Playwright or equivalent E2E tool.

**Storage**: Local browser file import/export only. No server storage in Phase 1.

**Testing**: Unit tests for model/schema/analysis, integration tests for Jotai/UI connections, E2E for representative scenario, performance measurements for drag/recompute/import/export.

**Target Platform**: Desktop browsers on developer machines; static deploy to GitHub Pages or Vercel.

**Project Type**: Static frontend app plus reusable analysis/schema modules.

**Performance Goals**: WCET drag visible response at least 30fps equivalent; ProjectState commit to redraw p95 <= 100ms for <=10 tasks and LCM <=10,000 ticks; import/export <=300ms for <=100KB files, or measurement plus remediation plan.

**Constraints**: No backend, no Web Worker/Wasm requirement, no code generation, no trace import, no non-periodic task input in Phase 1.

**Scale/Scope**: Single-core periodic RTOS tasks using RMA and approximate RTA/buffer model.

## Constitution Check

| Principle | Check | Status |
|---|---|---|
| Interactive Design Loop First | All panels derive from ProjectState and AnalysisSnapshot | PASS |
| ProjectFile As Stable Intermediate Representation | YAML/JSON ProjectFile v0.1 is part of Phase 1 | PASS |
| Analysis Honesty | Approximate RTA disclosure Info is mandatory | PASS |
| Responsive UI Is A Requirement | Performance budgets are in spec and tasks | PASS |
| Modular Boundaries For Future Phases | Code generation and trace import are excluded from Phase 1 | PASS |

## Project Structure

### Documentation (this feature)

```text
specs/001-rtos-task-design-kernel/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
└── contracts/
    └── project-file.schema.json
```

### Source Code (implementation repository)

```text
src/
├── app/
├── state/
├── model/
├── schema/
├── analysis/
├── samples/
├── ui/
└── io/

test/
├── fixtures/
├── model/
├── schema/
├── analysis/
├── ui/
└── e2e/
```

**Structure Decision**: Keep model/schema/analysis reusable and independent from React components. UI renders derived data and writes ProjectState through explicit update actions.

## Phase Plan

## Project Foundation

### スコープ

Create a Vite + React + TypeScript app with initial layout and test tooling.

### 受け入れ条件

- [ ] React app boots in development and production build.
- [ ] TypeScript strict is enabled.
- [ ] Test tooling for unit/integration/E2E is configured.
- [ ] 3-pane shell renders placeholder panels.

### スコープ外

- Feature-complete task editing.

### 検証方法

- Build, type-check, smoke render test.

## ProjectFile Schema And Fixtures

### スコープ

Implement ProjectFile v0.1 validation, normalization, and Motor Control fixtures.

### 受け入れ条件

- [ ] YAML and JSON are validated by the same logical schema.
- [ ] Motor Control 1-axis fixture validates.
- [ ] invalid fixture reports schema/import Problems.

### スコープ外

- Phase 2 schema extensions.

### 検証方法

- Schema unit tests and roundtrip tests.

## Analysis Kernel

### スコープ

Implement pure ProjectState -> AnalysisSnapshot calculations.

### 受け入れ条件

- [ ] LCM, RMA priority, approximate response time, buffers, aperiodic capacity, memory profile, and Problems are computed.
- [ ] Approximate RTA Info is always included.
- [ ] Analysis handles invalid inputs by producing Problems instead of crashing.

### スコープ外

- Iterative RTA and Sporadic Server.

### 検証方法

- Analysis unit tests and snapshot tests.

## Editing UI

### スコープ

Implement task list, Gantt WCET drag, property panel, gauges, memory profile, Problems, and Undo/Redo.

### 受け入れ条件

- [ ] Editing in list/property/Gantt updates ProjectState.
- [ ] Derived panels update from AnalysisSnapshot.
- [ ] Problems click selects or highlights related task.
- [ ] Undo/Redo works for task/settings changes.

### スコープ外

- Timeline zoom/pan.

### 検証方法

- Component integration tests and representative E2E.

## Import Export Workflow

### スコープ

Implement file import/export UI and roundtrip restoration.

### 受け入れ条件

- [ ] YAML/JSON export excludes transient UI state.
- [ ] YAML/JSON import validates and normalizes before replacing ProjectState.
- [ ] Failed import preserves current state.
- [ ] Export/import roundtrip preserves normalized ProjectFile and AnalysisSnapshot.

### スコープ外

- Cloud save and auto-save.

### 検証方法

- IO unit tests and E2E roundtrip.

## Performance And Release Gate

### スコープ

Measure Phase 1 performance budgets and complete release gate.

### 受け入れ条件

- [ ] WCET drag responsiveness is measured.
- [ ] commit-to-redraw p95 is measured for representative and synthetic fixtures.
- [ ] import/export time is measured.
- [ ] Any unmet budget has a documented remediation plan.

### スコープ外

- Worker/Wasm implementation unless required by measurements.

### 検証方法

- Production build performance marks and E2E measurements.

## Complexity Tracking

No constitution violations are currently required.