# Tasks: Phase 3 Observation Trace Import

**Input**: Design documents from `specs/003-observation-trace-import/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [data-model.md](data-model.md), [research.md](research.md), [contracts/generic-trace-csv.schema.md](contracts/generic-trace-csv.schema.md)

## Phase 1: Spec Setup

- [x] T001 Create Spec Kit feature branch and Phase 3 specification artifacts
- [x] T002 Define generic CSV trace contract and quickstart example

## Phase 2: Trace Parser Foundation

- [x] T003 Add TraceEvent, ObservedTask, TraceImportResult, and comparison types
- [x] T004 Implement generic CSV parser for `task`, `start_ms`, and `end_ms`
- [x] T005 Implement ObservedTask period and execution-time estimation
- [x] T006 Add valid and invalid CSV trace fixtures
- [x] T007 Add trace parser unit tests

## Phase 3: Design Comparison

- [x] T008 Implement design-vs-observation comparison by exact task name
- [x] T009 Generate Problems for WCET overrun, period drift, missing observation, and extra observation
- [x] T010 Add comparison unit tests

## Phase 4: UI Integration

- [x] T011 Add trace CSV import action and transient observation state
- [x] T012 Add Observation panel with comparison rows
- [x] T013 Merge observation Problems into Problems panel without exporting observation state
- [x] T014 Add UI integration tests for valid and invalid trace import
- [x] T015 Add Playwright smoke test for trace import workflow

## Phase 5: Release Gate

- [x] T016 Verify lint, type-check, unit/integration tests, E2E, format check, build, and npm audit
- [x] T017 Review Phase 3 scope boundaries: no vendor-complete parser, no binary trace parser, no ProjectFile persistence of observations

## Dependencies

- T001-T002 before implementation
- T003-T007 before comparison
- T008-T010 before UI Problems integration
- T011-T015 before release gate

## Notes

- Keep trace parser/comparison pure and React-independent.
- Observation data is transient in this slice.
- Do not implement vendor-specific complete parsers in the initial Phase 3 slice.
