# Feature Specification: Phase 3 Observation Trace Import

**Feature Branch**: `003-observation-trace-import`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "Move Chronoweave into Phase 3 by importing observation traces, estimating task timing from logs, comparing observed tasks with the design model, and surfacing differences as Problems and a comparison view."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Import generic CSV trace (Priority: P1)

As an embedded engineer, I want to import a generic CSV trace so that I can derive observed task timing without depending on a vendor-specific parser first.

**Why this priority**: Trace import is the entry point for Phase 3. A generic CSV adapter makes the workflow testable and keeps vendor adapters out of the first slice.

**Independent Test**: Import a CSV with `task,start_ms,end_ms` rows and verify observed task estimates are produced.

**Acceptance Scenarios**:

1. **Given** a valid generic CSV trace, **When** user imports it, **Then** Chronoweave derives observed tasks with sample count, period estimate, average execution time, and max execution time.
2. **Given** invalid CSV rows, **When** import is attempted, **Then** the current design state is preserved and import Problems are shown.

---

### User Story 2 - Compare observation with design (Priority: P1)

As an embedded engineer, I want observed task timing compared with my ProjectState so that I can identify drift between design assumptions and measured behavior.

**Why this priority**: The core value of observation integration is not simply reading traces, but closing the loop against the design model.

**Independent Test**: Load a design and a fixture trace where one task exceeds WCET and another task has period drift, then verify comparison Problems.

**Acceptance Scenarios**:

1. **Given** observed max execution exceeds design WCET, **When** comparison runs, **Then** Problems reports an observation WCET overrun.
2. **Given** observed period differs from design period by more than 10%, **When** comparison runs, **Then** Problems reports period drift.
3. **Given** a design task has no observation, **When** comparison runs, **Then** Problems reports a missing observation warning.
4. **Given** an observed task is not in design, **When** comparison runs, **Then** Problems reports an extra observation warning.

---

### User Story 3 - Inspect comparison in UI (Priority: P2)

As an embedded engineer, I want an Observation panel that lists design-vs-observed timing so that I can review trace evidence next to the analysis panels.

**Why this priority**: Problems capture actionable differences, while a compact comparison view makes debugging less cryptic.

**Independent Test**: Import a trace through the UI and verify the Observation panel displays matched and unmatched task rows.

**Acceptance Scenarios**:

1. **Given** a trace has been imported, **When** the UI updates, **Then** the Observation panel shows task name, status, design period/WCET, and observed period/max execution.
2. **Given** no trace has been imported, **When** the UI renders, **Then** the Observation panel remains unobtrusive and does not affect ProjectFile export.

### Edge Cases

- CSV has headers in a different order.
- CSV includes blank lines.
- CSV has non-numeric timestamps.
- A row has `end_ms <= start_ms`.
- A task has only one observed sample, so period cannot be estimated.
- Observed task name does not match any design task.
- Design task name is absent from the trace.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST parse generic CSV traces with `task`, `start_ms`, and `end_ms` columns.
- **FR-002**: System MUST reject invalid trace rows as import Problems without replacing ProjectState.
- **FR-003**: System MUST estimate observed task execution average, minimum, maximum, and sample count.
- **FR-004**: System MUST estimate observed period from start-to-start deltas when at least two samples exist.
- **FR-005**: System MUST compare observed tasks to design tasks by exact task name.
- **FR-006**: System MUST report observed max execution greater than design WCET as an Error Problem.
- **FR-007**: System MUST report observed period drift greater than 10% as a Warning Problem.
- **FR-008**: System MUST report missing design observations and extra observed tasks as Warning Problems.
- **FR-009**: System MUST expose comparison rows for a UI Observation panel.
- **FR-010**: System MUST keep trace observations transient and exclude them from ProjectFile export in this slice.
- **FR-011**: System MUST keep vendor-specific Tracealyzer/SystemView complete support out of the first Phase 3 slice.

### Key Entities _(include if feature involves data)_

- **TraceEvent**: Normalized execution interval with task name, start time, and end time.
- **ObservedTask**: Estimated timing summary derived from TraceEvents.
- **TraceImportResult**: Parser output containing observations or import Problems.
- **TaskObservationComparison**: Design-vs-observed row with status and Problems.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Valid generic CSV fixture imports and produces expected ObservedTask estimates.
- **SC-002**: Invalid CSV fixture produces import Problems and leaves the design state unchanged.
- **SC-003**: Comparison tests cover WCET overrun, period drift, missing observation, and extra observation.
- **SC-004**: UI/E2E smoke test imports trace CSV and shows Observation comparison rows and Problems.
- **SC-005**: Existing Phase 1 and Phase 2 workflows remain passing.
- **SC-006**: Full local gate passes: lint, type-check, unit/integration tests, E2E, format check, build, and npm audit.

## Assumptions

- Initial trace timestamps are milliseconds.
- Generic CSV is the interchange adapter for first Phase 3 implementation.
- Exact task-name matching is acceptable for the first comparison workflow.
- Observation data is transient UI/session state and is not persisted in ProjectFile yet.

## Scope Boundaries

### In Scope

- Generic CSV trace parser.
- Observed task timing estimates.
- Design-vs-observation comparison.
- Problems for observation differences.
- UI import action and comparison panel.

### Out of Scope

- Complete Tracealyzer/SystemView parser support.
- Binary trace parsing.
- Persisting observations in ProjectFile.
- Statistical scheduling or probabilistic analysis.
- Multicore trace reconstruction.

### Dependencies

- Phase 1 ProjectState and TaskModel.
- Phase 1 Problems model.
- Phase 2 UI/import patterns.

### Verification

- Trace parser unit tests.
- Comparison unit tests.
- UI integration and E2E smoke tests.
- Full local validation gate.
