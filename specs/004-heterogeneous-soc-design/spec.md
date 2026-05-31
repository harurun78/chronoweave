# Feature Specification: Phase 4 Heterogeneous SoC Design

**Feature Branch**: `004-heterogeneous-soc-design`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "Extend Chronoweave to model heterogeneous SoCs: multiple execution domains (baremetal / RTOS / Linux / future FPGA), inter-domain communication channels, multicore preemption and stack occupancy per interval, and Linux-derived responses treated as stochastic or aperiodic input."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Model multiple execution domains (Priority: P1)

As a SoC architect, I want to define multiple execution domains (RTOS core, Linux core, baremetal core) within a single ProjectFile so that I can reason about the whole SoC instead of one core at a time.

**Why this priority**: Multi-domain modeling is the foundational entity for every other Phase 4 feature. Without it, channels and multicore analyses have nowhere to attach.

**Independent Test**: Create a project with two domains (one RTOS, one baremetal), assign tasks to each, and verify analysis runs per domain without cross-contamination.

**Acceptance Scenarios**:

1. **Given** a new ProjectFile, **When** the user adds an RTOS domain and a baremetal domain, **Then** each domain can host its own task set and analysis results.
2. **Given** a Phase 1/2/3 single-domain ProjectFile, **When** loaded in Phase 4, **Then** it is migrated transparently into a single default domain (backward compatible).

---

### User Story 2 - Inter-domain communication channels (Priority: P1)

As a SoC architect, I want to define communication channels between domains (shared memory, mailbox, message queue) so that I can capture data flow and end-to-end latency.

**Why this priority**: Channels are the second pillar of multi-domain modeling and unlock latency-budget analysis.

**Independent Test**: Define a channel from a Linux producer task to an RTOS consumer task and verify it is validated against schema and shown in the UI.

**Acceptance Scenarios**:

1. **Given** two tasks in different domains, **When** the user creates a channel between them, **Then** the channel appears with producer, consumer, transport type and latency budget.
2. **Given** a channel referencing a non-existent task, **When** validation runs, **Then** Problems reports the dangling reference.

---

### User Story 3 - Multicore preemption and stack occupancy (Priority: P2)

As a SoC architect, I want to see per-core Gantt rows and stack occupancy per interval so that I can verify preemption behavior and stack sizing on multicore RTOS.

**Why this priority**: Multicore is required to make per-domain analyses meaningful beyond single-core, but builds on the domain entity (P1).

**Independent Test**: Assign two tasks to two cores in the same RTOS domain and confirm the Gantt renders two parallel rows with independent preemption.

**Acceptance Scenarios**:

1. **Given** an RTOS domain with two cores and two tasks pinned to different cores, **When** analysis runs, **Then** preemption is computed per core and Gantt shows two rows.
2. **Given** stack budgets per task, **When** analysis runs, **Then** stack occupancy per interval is reported per core.

---

### User Story 4 - Linux-derived stochastic input (Priority: P3)

As a SoC architect, I want to declare Linux-derived events as stochastic or aperiodic input so that downstream RTOS tasks can be sized against a defined arrival distribution.

**Why this priority**: Makes Linux interactions analyzable rather than opaque; depends on the domain entity and aperiodic model from Phase 2.

**Independent Test**: Define a Linux event source with a mean inter-arrival time and verify the consuming RTOS task is analyzed using the aperiodic model.

**Acceptance Scenarios**:

1. **Given** a Linux domain event with declared distribution, **When** a RTOS task consumes it, **Then** the RTOS task analysis uses the aperiodic input model.

---

### Edge Cases

- What happens when a channel crosses two domains with incompatible memory regions?
- How does the system behave when a task is pinned to a core that does not exist in the chosen domain profile?
- How are Phase 1/2/3 single-domain ProjectFiles migrated without data loss?
- What happens when the same task ID exists in two domains?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow defining one or more execution domains per ProjectFile, each with a kind (`baremetal` | `rtos` | `linux` | `fpga`), a name, and a core count.
- **FR-002**: System MUST allow assigning each TaskModel to exactly one domain and (for multicore domains) optionally to a specific core.
- **FR-003**: System MUST allow defining inter-domain communication channels with producer task ref, consumer task ref, transport kind (`shared_memory` | `mailbox` | `queue`), and latency budget (ms).
- **FR-004**: System MUST validate that channel endpoints reference existing tasks and report Problems for dangling references.
- **FR-005**: System MUST run analysis per domain independently and combine per-domain Problems into the global Problems list.
- **FR-006**: System MUST render Gantt rows per core for multicore domains.
- **FR-007**: System MUST report stack occupancy per interval per core when stack budgets are defined.
- **FR-008**: System MUST treat Linux-domain events with declared distributions as aperiodic inputs to downstream tasks.
- **FR-009**: System MUST migrate a Phase 1/2/3 ProjectFile (no `domains` field) by placing all existing tasks into a single default `rtos` domain with one core, preserving the original analysis result.
- **FR-010**: ProjectFile schema MUST bump to `version: "0.3"` for the Phase 4 additions; older versions MUST remain readable via migration.

### Key Entities

- **Domain**: An execution context with kind, name, core count, and assigned tasks. Owns its own analysis result subset.
- **Channel**: Producer task ref, consumer task ref, transport kind, latency budget (ms). Crosses domain boundaries.
- **CoreAssignment**: TaskModel ↔ core index mapping inside a multicore domain.
- **StochasticEventSource**: Linux-domain event with arrival distribution (e.g., mean inter-arrival, std dev) feeding downstream tasks.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can define a 2-domain, 2-core SoC project (e.g., dual-core RTOS + Linux) in under 5 minutes starting from a fixture.
- **SC-002**: Channel validation catches 100% of dangling task references in the test suite.
- **SC-003**: Phase 1/2/3 fixture ProjectFiles load without data loss and produce analysis results identical to Phase 3 within ±1% RTA tolerance.
- **SC-004**: Multicore analysis processes a 10-task / 2-core / 2-domain project within the existing performance budget (≤200 ms re-analysis on reference hardware).
- **SC-005**: At least one representative SoC fixture (e.g., dual-core Cortex-R5 RTOS + Cortex-A53 Linux) ships in `examples/`.

## Assumptions

- The existing analysis engine (Phase 1 RMA + Phase 2 iterative RTA) is per-domain and does not need cross-domain RTA initially.
- FPGA domain is reserved in the kind enum but its analysis semantics are out of scope (Phase 4.x).
- Linux scheduler simulation is out of scope; Linux is only a source of stochastic events.
- DoktorMagus integration remains Phase 5 scope.

## Out of Scope

- Full board support package (BSP) generation per SoC vendor.
- Linux CFS / EEVDF scheduler simulation.
- FPGA timing analysis (HLS / placement).
- DoktorMagus pipeline binding (Phase 5).

## Dependencies

- Phase 1 TaskModel (specs/001-rtos-task-design-kernel)
- Phase 2 aperiodic / sporadic model (specs/002-phase-2-aperiodic-codegen)
- Phase 3 observation model (specs/003-observation-trace-import)
- ProjectFile schema versioning policy (docs/phase-roadmap.md フェーズ間互換性)
