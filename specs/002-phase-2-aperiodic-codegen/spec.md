# Feature Specification: Phase 2 Aperiodic and Codegen Extension

**Feature Branch**: `002-phase-2-aperiodic-codegen`

**Created**: 2026-05-30

**Status**: Draft

**Input**: User description: "Move Chronoweave into Phase 2 by adding aperiodic task input, Sporadic Server budget and period, iterative RTA, and a FreeRTOS code generation plugin while preserving Phase 1 ProjectFile compatibility."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Phase 1 files still load (Priority: P1)

As an embedded engineer, I want ProjectFile `0.1` designs exported from Phase 1 to keep loading unchanged so that Phase 2 does not invalidate earlier work.

**Why this priority**: Compatibility is the foundation for every later extension. Phase 2 must build on the stable intermediate representation rather than replacing it.

**Independent Test**: Import the Phase 1 Motor Control fixture and verify that tasks, AnalysisSnapshot, Problems, and export still behave as before.

**Acceptance Scenarios**:

1. **Given** a valid ProjectFile `0.1`, **When** it is imported in Phase 2, **Then** it normalizes with empty `aperiodic_tasks`, no Sporadic Server, and no schema errors.
2. **Given** a Phase 1 periodic-only state, **When** analysis runs, **Then** Phase 1 approximate analysis remains visible and iterative RTA fields are also available.

---

### User Story 2 - Bound aperiodic work with Sporadic Server (Priority: P1)

As an embedded engineer, I want to add aperiodic work and configure a Sporadic Server budget/period so that I can see whether non-periodic demand fits the current RTOS design.

**Why this priority**: Phase 2's primary design upgrade is moving from periodic-only modeling to bounded non-periodic demand.

**Independent Test**: Import a ProjectFile `0.2` containing aperiodic tasks and a Sporadic Server, then verify server capacity, Problems, memory impact, and RTA interference.

**Acceptance Scenarios**:

1. **Given** a ProjectFile `0.2` with aperiodic tasks and enabled server, **When** analysis runs, **Then** the server appears as bounded interference in iterative RTA.
2. **Given** aperiodic WCET demand exceeds server budget, **When** analysis runs, **Then** Problems shows a warning linked to the Sporadic Server model.
3. **Given** aperiodic tasks exist without an enabled server, **When** analysis runs, **Then** Problems warns that aperiodic work has no execution budget.

---

### User Story 3 - Compare approximate and iterative RTA (Priority: P1)

As an embedded engineer, I want to compare Phase 1 approximate RTA with iterative fixed-priority RTA so that I can understand when the optimistic estimate hides deadline risk.

**Why this priority**: The roadmap explicitly calls for a more conservative analysis upgrade. The comparison keeps analysis honest while preserving Phase 1 behavior.

**Independent Test**: Use a fixture where higher-priority interference recurs more than once within a lower-priority response window and verify iterative RTA is greater than the approximate response.

**Acceptance Scenarios**:

1. **Given** a task set with recurring higher-priority interference, **When** iterative RTA converges, **Then** `iterative_response_time_ms` is reported for each periodic task.
2. **Given** iterative RTA exceeds a task deadline, **When** analysis completes, **Then** Problems reports an iterative deadline miss.

---

### User Story 4 - Generate FreeRTOS preview files (Priority: P2)

As an embedded engineer, I want a FreeRTOS generation plugin to produce source/header previews from ProjectFile so that Chronoweave can become a bridge from design to implementation.

**Why this priority**: Code generation is useful only after the analysis model is stable. Keeping it as a plugin protects the UI and analysis boundaries.

**Independent Test**: Run the FreeRTOS generator against a normalized ProjectState and verify deterministic generated file names and task/server definitions.

**Acceptance Scenarios**:

1. **Given** a ProjectFile with periodic tasks, **When** FreeRTOS generation runs, **Then** generated files contain task handles, stack sizes, periods, and priorities.
2. **Given** an enabled Sporadic Server, **When** generation runs, **Then** generated files include a server task stub and aperiodic dispatch hook.

### Edge Cases

- ProjectFile `0.1` has no Phase 2 fields.
- ProjectFile `0.2` omits `aperiodic_tasks` and `sporadic_server`.
- Aperiodic task IDs duplicate periodic task IDs.
- Sporadic Server uses manual priority without `manual_priority`.
- Sporadic Server period is not aligned to tick grid.
- Server budget is greater than its period.
- Iterative RTA does not converge before the iteration limit.
- Generated code names contain spaces or unsupported characters.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST accept and normalize ProjectFile versions `0.1` and `0.2`.
- **FR-002**: System MUST preserve Phase 1 periodic-only ProjectFile behavior without requiring migration.
- **FR-003**: System MUST model optional `aperiodic_tasks` with WCET, optional deadline, stack, and description.
- **FR-004**: System MUST model optional `sporadic_server` with enabled flag, budget, period, optional deadline, priority mode, manual priority, and stack.
- **FR-005**: System MUST validate duplicate IDs across periodic and aperiodic tasks.
- **FR-006**: System MUST warn when aperiodic work exists without an enabled Sporadic Server.
- **FR-007**: System MUST warn when total configured aperiodic WCET exceeds the Sporadic Server budget.
- **FR-008**: System MUST include enabled Sporadic Server interference in iterative RTA.
- **FR-009**: System MUST calculate fixed-priority iterative RTA for periodic tasks while retaining Phase 1 approximate response fields.
- **FR-010**: System MUST report iterative deadline misses as Problems.
- **FR-011**: System MUST expose Sporadic Server analysis with priority, capacity utilization, and schedulability.
- **FR-012**: System MUST implement FreeRTOS generation as a pure plugin/module that accepts normalized ProjectState and returns generated text files.
- **FR-013**: System MUST generate deterministic FreeRTOS file names and symbol names from ProjectFile inputs.
- **FR-014**: System MUST keep trace import, multicore scheduling, and heterogeneous SoC modeling out of Phase 2 scope.

### Key Entities _(include if feature involves data)_

- **ProjectFile v0.2**: Backward-compatible persistence contract adding Phase 2 optional fields.
- **AperiodicTaskFile**: Non-periodic execution demand served by Sporadic Server.
- **SporadicServerConfig**: Budget, period, priority, and stack configuration for bounded aperiodic execution.
- **IterativeRtaResult**: Conservative response-time result derived by fixed-priority recurrence.
- **SporadicServerAnalysis**: Capacity and schedulability result for the configured server.
- **CodegenSettings**: Plugin and naming configuration for generation modules.
- **GeneratedFile**: Deterministic code generation output with path and text content.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All Phase 1 fixtures and tests continue to pass after ProjectFile `0.2` support is added.
- **SC-002**: A ProjectFile `0.2` fixture with aperiodic tasks and Sporadic Server validates and produces server analysis.
- **SC-003**: Iterative RTA fixture demonstrates a response time greater than Phase 1 approximate RTA for at least one task.
- **SC-004**: Deadline miss and no-server/budget-exceeded Problems are covered by tests.
- **SC-005**: FreeRTOS generator unit tests verify generated file paths and core task/server declarations.
- **SC-006**: Validation gate passes: lint, type-check, unit/integration tests, E2E, format check, build, and npm audit.

## Assumptions

- Phase 2 builds on the Phase 1 React/Vite/TypeScript architecture.
- ProjectFile `0.2` can be introduced without changing the existing `tasks` field shape.
- Sporadic Server is represented as a bounded fixed-priority server, not as a full replenishment event simulation.
- FreeRTOS generation starts as deterministic preview text, not a complete board support package.

## Scope Boundaries

### In Scope

- Backward-compatible ProjectFile `0.2` schema and normalization.
- Aperiodic task records.
- Sporadic Server budget/period model.
- Fixed-priority iterative RTA.
- FreeRTOS generator module/plugin.

### Out of Scope

- Trace log import.
- Linux probabilistic scheduling.
- Multicore allocation.
- Heterogeneous SoC domain modeling.
- Complete FreeRTOS project scaffolding and vendor HAL integration.

### Dependencies

- Phase 1 ProjectFile schema and normalization.
- Phase 1 analysis kernel and priority semantics.
- Phase 1 UI and import/export workflow.

### Verification

- Validate Phase 1 and Phase 2 fixtures.
- Compare approximate and iterative RTA in analysis unit tests.
- Verify FreeRTOS generation with snapshot-like unit tests.
- Run the full release gate before closing Phase 2 tasks.
