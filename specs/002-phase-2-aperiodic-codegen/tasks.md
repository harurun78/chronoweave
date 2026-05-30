# Tasks: Phase 2 Aperiodic and Codegen Extension

**Input**: Design documents from `specs/002-phase-2-aperiodic-codegen/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [data-model.md](data-model.md), [research.md](research.md), [contracts/project-file-v0.2.schema.json](contracts/project-file-v0.2.schema.json)

## Phase 1: Spec And Compatibility Setup

- [x] T001 Create Spec Kit feature branch and Phase 2 specification artifacts
- [x] T002 Add ProjectFile v0.2 schema contract and quickstart example
- [x] T003 Add Phase 2 fixtures for aperiodic server, budget exceeded, no server, and iterative deadline miss

## Phase 2: ProjectFile v0.2 Foundation

- [x] T004 Extend model types for ProjectFile `0.1`/`0.2`, aperiodic tasks, Sporadic Server, codegen settings, and generated files
- [x] T005 Extend Zod validation and normalization while preserving Phase 1 `0.1` behavior
- [x] T006 Extend import/export helpers to preserve Phase 2 fields and transient-state exclusion
- [x] T007 Add schema and IO tests for backward compatibility, duplicate IDs, and Phase 2 roundtrip

## Phase 3: Iterative RTA And Server Analysis

- [x] T008 Implement fixed-priority iterative RTA helper with convergence cutoff
- [x] T009 Include enabled Sporadic Server as interference in iterative RTA
- [x] T010 Add server capacity analysis and Problems for no-server, budget exceeded, server budget > period, tick-grid, deadline miss, and non-convergence
- [x] T011 Extend AnalysisSnapshot tests for approximate vs iterative RTA comparison

## Phase 4: FreeRTOS Codegen Plugin

- [x] T012 Add pure FreeRTOS generator module with deterministic `GeneratedFile[]` output
- [x] T013 Generate periodic task declarations, priorities, periods, stack sizes, and task stubs
- [x] T014 Generate Sporadic Server task stub and aperiodic dispatch hook when enabled
- [x] T015 Add codegen unit tests for filenames, symbol sanitization, and core declarations

## Phase 5: UI Workflow Integration

- [x] T016 Add Phase 2 import sample and UI affordance for aperiodic/server state
- [x] T017 Display iterative RTA and Sporadic Server analysis in existing panels without hiding Phase 1 approximate Info
- [x] T018 Add codegen preview/export action wired to the FreeRTOS generator
- [x] T019 Add component integration and E2E smoke tests for Phase 2 workflow

## Phase 6: Release Gate

- [x] T020 Verify lint, type-check, unit/integration tests, E2E, format check, build, and npm audit
- [x] T021 Review Phase 2 scope boundaries: no trace import, no multicore allocation, no vendor BSP generation
- [x] T022 Create/update GitHub Issues for remaining Phase 2 slices if implementation is split

## Dependencies

- T001-T003 before schema implementation
- T004-T007 before analysis/codegen consume Phase 2 fields
- T008-T011 before UI displays iterative RTA
- T012-T015 before codegen UI integration
- T016-T019 before release gate

## Parallelizable Examples

- T008 iterative RTA helper and T012 codegen module can proceed after T004-T007
- T013 periodic codegen and T014 server codegen can be implemented in parallel after T012
- T016 UI sample import and T017 analysis display can be implemented in parallel after T011

## Notes

- Keep Phase 2 additions backward-compatible with Phase 1 ProjectFile exports.
- Keep code generation pure and React-independent.
- Do not implement trace import or multicore scheduling in Phase 2.
