# Implementation Plan: Phase 4 Heterogeneous SoC Design

**Branch**: `004-heterogeneous-soc-design` | **Date**: 2026-05-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-heterogeneous-soc-design/spec.md`

## Summary

Extend Chronoweave from a single-core RTOS design tool to a heterogeneous SoC modeling tool. Introduce execution `Domain` entities (baremetal / rtos / linux / fpga-reserved), inter-domain `Channel`s, per-core task pinning with per-core Gantt and stack occupancy, and Linux-derived `StochasticEventSource`s that feed the Phase 2 aperiodic model. ProjectFile bumps from `0.2` to `0.3` with transparent migration of legacy single-domain files (FR-009/FR-010). Analysis runs per domain reusing the existing Phase 1 RMA + Phase 2 iterative RTA kernels, composed by a thin multi-domain orchestrator.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 (strict mode).

**Primary Dependencies**: React 18, Vite 6, Jotai (state), Zod 3 (`.strict().superRefine()` schemas), `yaml` (parse/stringify). No new runtime dependency expected.

**Storage**: Browser-local ProjectFile (YAML canonical / JSON isomorphic). Schema version `0.3` adds `domains[]`, `channels[]`, optional `stochastic_events[]`, and per-task `domain_id` / `core_index`.

**Testing**: Vitest 3 (unit + integration), Playwright 1.49 (E2E, serial). Coverage gates (lines/functions/statements ≥70, branches ≥60) over `src/analysis/**`, `src/trace/**`, `src/schema/**`.

**Target Platform**: Desktop browser static SPA (Vite build).

**Project Type**: Static frontend app with pure analysis / schema / codegen modules.

**Performance Goals**: SC-004 — multi-domain re-analysis for a 10-task / 2-core / 2-domain project ≤200 ms on reference hardware. Per-domain kernels remain pure; orchestration is `O(domains)` over existing per-domain cost.

**Constraints**:
- Backward-compatible load of v0.1 / v0.2 ProjectFiles (FR-009).
- No cross-domain RTA in this slice (Assumptions §1); per-domain analysis only.
- No Linux scheduler simulation; Linux feeds events only (FR-008, Out of Scope §2).
- FPGA `kind` reserved in the enum but no analysis path (Assumptions §2).

**Scale/Scope**: Up to ~50 tasks / 4 domains / 4 cores per domain for fixtures and tests.

## Constitution Check

| Principle | Check | Status |
| --- | --- | --- |
| I. Interactive Design Loop First | Adding/removing domains, channels, and core assignments re-derives `AnalysisSnapshot` from the same `ProjectState`; no stale derived data. | PASS |
| II. ProjectFile As Stable Intermediate Representation | New fields are first-class schema additions (v0.3); transient UI selections (active domain tab) stay out of ProjectFile. | PASS |
| III. Analysis Honesty | Per-domain results continue to disclose approximate-RTA caveat; cross-domain latency is reported as channel budget vs. observed/estimated, not as proof. | PASS |
| IV. Responsive UI Is A Requirement | SC-004 budget (≤200 ms) is the explicit gate; orchestrator adds bounded constant overhead per domain. | PASS |
| V. Modular Boundaries For Future Phases | Domain model, channel validation, per-core scheduling, and stochastic event ingestion are added as separate modules under `src/model`, `src/analysis`, and `src/schema`; UI consumes them via the existing Jotai derived atoms. | PASS |

No constitution violations anticipated; Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/004-heterogeneous-soc-design/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── project-file.schema.json   # v0.3 JSON Schema
└── tasks.md             # Created by /speckit.tasks (NOT in this command)
```

### Source Code (repository root) — planned touch points (NOT modified in this command)

```text
src/
├── model/
│   └── project.ts                  # add Domain, Channel, CoreAssignment, StochasticEventSource types; extend TaskModel
├── schema/
│   └── projectFile.ts              # add v0.3 schemas + migrate(0.1|0.2 -> 0.3)
├── analysis/
│   ├── kernel.ts                   # per-domain orchestrator
│   ├── multicore.ts                # NEW: per-core scheduling + stack occupancy
│   ├── channels.ts                 # NEW: channel reference & latency-budget validation
│   └── stochastic.ts               # NEW: Linux event source → aperiodic adapter
├── ui/
│   ├── DomainTabs.tsx              # NEW
│   ├── ChannelPanel.tsx            # NEW
│   └── (existing Gantt/Stack panels gain per-core rows)
└── samples/
    └── socDualCoreLinux.ts         # NEW fixture for SC-005

test/
├── schema/                         # v0.3 schema + migration tests
├── analysis/                       # per-domain orchestration, multicore, channel, stochastic
├── ui/                             # domain tabs / channel panel RTL tests
├── e2e/                            # SC-001 / SC-005 quickstart smoke
└── fixtures/projects/              # v0.1, v0.2 → v0.3 migration fixtures
```

**Structure Decision**: Keep new analysis concerns (multicore, channels, stochastic) as separate pure modules behind the existing `analyzeProject` entry, and add domain/channel UI as new panels without rewriting existing single-core panels (which keep working under the migrated default domain).

## Phase Plan

The plan groups User Stories by priority. Each milestone is independently testable per the spec's "Independent Test" clauses.

### Milestone P1.a — Domains (User Story 1, FR-001, FR-002, FR-005, FR-009, FR-010)

**Scope**

- Add `Domain` entity + `version: "0.3"` to ProjectFile schema (Zod + JSON Schema in `contracts/`).
- Extend `TaskModel` with `domain_id` (required) and optional `core_index`.
- Migration: v0.1 / v0.2 ProjectFile → v0.3 by injecting a single `rtos` domain (one core) and stamping `domain_id` on every task.
- Refactor `analyzeProject` to fan out per domain and merge Problems.

**Acceptance Criteria**

- [ ] Loading a Phase 1/2/3 fixture produces a single default `rtos` domain with one core (FR-009).
- [ ] A v0.3 file with two domains analyzes each domain independently and merges Problems (FR-005).
- [ ] Analysis results for migrated legacy fixtures match Phase 3 within ±1% RTA (SC-003).

**Verification**: schema unit tests (v0.1/v0.2 → v0.3 migration), kernel orchestrator unit tests, regression of existing fixtures.

### Milestone P1.b — Channels (User Story 2, FR-003, FR-004)

**Scope**

- Add `Channel` entity (producer task ref, consumer task ref, transport kind, latency budget).
- Channel validator: dangling references → Problems with stable IDs.
- Minimal `ChannelPanel` to view/create/delete channels.

**Acceptance Criteria**

- [ ] Channel with valid endpoints renders and persists in ProjectFile (FR-003).
- [ ] Channel with non-existent endpoint emits a Problem and blocks export gate (FR-004, SC-002).

**Verification**: schema tests, channel validator unit tests, RTL test for `ChannelPanel`.

### Milestone P2 — Multicore preemption & stack occupancy (User Story 3, FR-006, FR-007)

**Scope**

- Per-core scheduling within an RTOS domain (`core_index` pinning).
- Per-core Gantt rows in the Gantt panel.
- Stack occupancy per interval per core in the memory panel.

**Acceptance Criteria**

- [ ] Two tasks pinned to two cores render two parallel Gantt rows with independent preemption (FR-006).
- [ ] Stack occupancy is reported per core per interval (FR-007).
- [ ] 10-task / 2-core / 2-domain re-analysis ≤200 ms (SC-004, measured via `usePerfMeasure`).

**Verification**: multicore kernel unit tests, Gantt RTL test, perf assertion test.

### Milestone P3 — Linux stochastic input (User Story 4, FR-008)

**Scope**

- `StochasticEventSource` entity on Linux-kind domains (mean inter-arrival, optional std dev).
- Adapter that materializes a stochastic source as an aperiodic input to the consuming RTOS task, reusing the Phase 2 Sporadic Server / aperiodic RTA model.
- Surface adapter results in Problems with provenance ("from Linux event X").

**Acceptance Criteria**

- [ ] A Linux event with declared mean inter-arrival feeds the consuming RTOS task through the existing aperiodic model (FR-008).
- [ ] Removing the event removes the synthetic aperiodic load.

**Verification**: stochastic adapter unit tests, integration test wiring an event source into the analyzer.

### Milestone Release Gate — SC-005 fixture & full local gate

**Scope**

- Add `examples/dual-core-rtos-linux.yaml` (Cortex-R5 RTOS dual-core + Cortex-A53 Linux) per SC-005.
- Run `verify: full local gate` (lint, type-check, test:run, test:e2e, format:check, build, audit).

**Acceptance Criteria**

- [ ] SC-001: a user can produce the dual-domain / dual-core project from the fixture in under 5 minutes (quickstart smoke).
- [ ] All gates green; coverage thresholds preserved.

## Complexity Tracking

No constitution violation is expected. This table intentionally left empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| — | — | — |
