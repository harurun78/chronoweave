# Tasks: RTOS Task Design Kernel

**Input**: Design documents from `specs/001-rtos-task-design-kernel/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [data-model.md](data-model.md), [research.md](research.md), [contracts/project-file.schema.json](contracts/project-file.schema.json)

## Phase 1: Setup

- [x] T001 Create Vite + React + TypeScript app foundation with strict TypeScript settings
- [x] T002 Configure npm scripts for lint, type-check, unit tests, E2E tests, and build
- [x] T003 Add Jotai, @use-gesture/react, @tanstack/react-table, react-resizable-panels, schema validation, and YAML parser dependencies
- [x] T004 Create 3-pane app shell with placeholders for task list, Gantt, property panel, gauges, memory profile, and Problems

## Phase 2: ProjectFile Schema And Fixtures

- [ ] T005 Define ProjectFile, GlobalSettings, TaskModel, ProjectState, AnalysisSnapshot, MemoryProfile, and Problem TypeScript types
- [ ] T006 Implement ProjectFile v0.1 schema validation matching [contracts/project-file.schema.json](contracts/project-file.schema.json)
- [ ] T007 Implement ProjectFile normalization for default `deadline_ms` and `priority_mode`
- [ ] T008 Add Motor Control 1-axis YAML fixture with `ISR_Timer`, `MotorCtrl_X`, and `SensorFusion`
- [ ] T009 Add invalid schema, LCM warning, high-utilization optimistic-bias, and memory warning fixtures
- [ ] T010 Add schema and normalization unit tests for YAML and JSON

## Phase 3: Analysis Kernel

- [ ] T011 Implement ms-to-microseconds conversion while preserving fractional WCET values
- [ ] T012 Implement tick-grid validation for `period_ms` and `deadline_ms`
- [ ] T013 Implement LCM calculation and LCM > 10,000 tick warning
- [ ] T014 Implement RMA auto priority and manual priority validation
- [ ] T015 Implement approximate RTA, buffer consumed, and buffer remaining calculations
- [ ] T016 Implement aperiodic capacity gauge derivation from lowest-priority task buffer remaining
- [ ] T017 Implement memory profile series, peak bytes, and RAM capacity warning
- [ ] T018 Implement Problems generation for schema, import, analysis, and approximate RTA Info
- [ ] T019 Add AnalysisSnapshot unit and snapshot tests for representative fixtures

## Phase 4: State And History

- [ ] T020 Implement ProjectState atom and derived AnalysisSnapshot atom
- [ ] T021 Implement project update actions for task add, duplicate, delete, edit, and settings edit
- [ ] T022 Implement shallow Undo/Redo history for persistent ProjectState changes
- [ ] T023 Add state and history unit tests

## Phase 5: UI Panels

- [ ] T024 Implement task list editor with add/delete/duplicate and cell editing
- [ ] T025 Implement SVG Gantt rendering for periodic tasks over LCM window
- [ ] T026 Implement WCET right-edge drag using @use-gesture/react
- [ ] T027 Implement property panel for name, period, WCET, deadline, priority mode, manual priority, stack, and description
- [ ] T028 Implement buffer gauges and aperiodic capacity gauge
- [ ] T029 Implement memory profile waveform and peak/capacity display
- [ ] T030 Implement Problems panel with Error/Warning/Info display and task focus on click
- [ ] T031 Add component integration tests for list edit, property edit, Gantt drag, panel updates, and Problems click

## Phase 6: Import Export Workflow

- [ ] T032 Implement YAML export excluding transient UI state
- [ ] T033 Implement JSON export excluding transient UI state
- [ ] T034 Implement YAML import with validate-before-replace behavior
- [ ] T035 Implement JSON import with validate-before-replace behavior
- [ ] T036 Add export/import roundtrip tests comparing normalized ProjectFile and AnalysisSnapshot

## Phase 7: Representative E2E And Performance

- [ ] T037 Add E2E for import Motor Control 1-axis sample -> duplicate `MotorCtrl_Y` -> drag WCET -> export YAML -> reset -> import YAML
- [ ] T038 Add E2E assertion that approximate RTA Info is always visible
- [ ] T039 Add performance marks for WCET drag visual response and ProjectState commit-to-redraw
- [ ] T040 Add performance marks for YAML/JSON import/export of <=100KB fixtures
- [ ] T041 Record Phase 1 performance budget results and remediation plan for any missed budget

## Phase 8: Release Gate

- [ ] T042 Verify unit tests pass
- [ ] T043 Verify integration tests pass
- [ ] T044 Verify representative E2E passes
- [ ] T045 Verify production build passes
- [ ] T046 Review Phase 1 scope boundaries: no non-periodic task input, no iterative RTA, no code generation, no trace import

## Dependencies

- T001-T004 before all implementation tasks
- T005-T010 before analysis, UI, and IO tasks
- T011-T019 before panel rendering tasks that depend on AnalysisSnapshot
- T020-T023 before UI mutation tasks
- T024-T031 before representative E2E
- T032-T036 before export/import E2E
- T037-T041 before release gate

## Parallelizable Examples

- T011-T014 can be implemented in parallel after T005-T010
- T024 task list and T027 property panel can be implemented in parallel after T020-T023
- T028 gauges and T029 memory profile can be implemented in parallel after T011-T019
- T032 YAML export and T033 JSON export can be implemented in parallel after T020-T023

## Notes

- Keep analysis kernel pure and independent from React.
- Do not introduce Worker/Wasm unless performance measurements justify it.
- Do not add Phase 2 code generation to Phase 1 tasks.
