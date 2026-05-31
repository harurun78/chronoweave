---
description: "Task list for Phase 4 Heterogeneous SoC Design"
---

# Tasks: Phase 4 Heterogeneous SoC Design

**Input**: Design documents from `/specs/004-heterogeneous-soc-design/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/project-file.schema.json, quickstart.md (all present).

**Tests**: Test tasks are included — the spec mandates schema/migration regression (SC-003), channel validation (SC-002), perf (SC-004) and quickstart smoke (SC-001).

**Organization**: Tasks are grouped by the milestone phasing defined in [plan.md](plan.md) (`P1.a → P1.b → P2 → P3 → Release Gate`). Each milestone maps to one User Story from [spec.md](spec.md) plus the Release Gate.

## Format: `[ID] [P?] [Story] Title — FR/SC — files — acceptance`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks).
- **[Story]**: `US1` (Domains), `US2` (Channels), `US3` (Multicore), `US4` (Stochastic Linux), or none for shared/release.
- Every task lists the FR/SC it satisfies, the affected files (predicted paths), and an acceptance check (command or test).
- File paths follow the structure in [plan.md](plan.md#project-structure).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the feature branch is buildable and locate the touch points before any source edits begin.

- [ ] T001 Confirm working tree clean on `004-heterogeneous-soc-design` and baseline gate green
  - **FR/SC**: pre-req for SC-003 / SC-004
  - **Files**: none (repo state only)
  - **Acceptance**: `git status` clean; `npm ci && npm run lint && npm run type-check && npm run test:run` all exit 0.

- [ ] T002 [P] Inventory predicted touch points listed in plan.md and confirm they exist (or are absent and need creation)
  - **FR/SC**: pre-req for all FRs
  - **Files (read-only)**: [src/model/project.ts](src/model/project.ts), [src/schema/projectFile.ts](src/schema/projectFile.ts), [src/analysis/kernel.ts](src/analysis/kernel.ts), [src/ui/](src/ui/), [src/samples/](src/samples/), [test/schema/](test/schema/), [test/analysis/](test/analysis/), [test/fixtures/project-files/](test/fixtures/project-files/)
  - **Acceptance**: produce a short note (in PR description) listing which planned files exist vs. need creation. No source edits.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, types, and migration that every later milestone depends on. ⚠️ All subsequent phases are blocked until Phase 2 is complete.

- [ ] T003 Add v0.3 TypeScript domain types (`Domain`, `Channel`, `StochasticEventSource`, `CoreAssignment`) and extend `TaskModel` / `AperiodicTaskModel` / `SporadicServerConfig` with `domain_id` and `core_index`
  - **FR/SC**: FR-001, FR-002, FR-010
  - **Files**: [src/model/project.ts](src/model/project.ts)
  - **Acceptance**: `npm run type-check` passes; new types are exported and reference each other per [data-model.md](specs/004-heterogeneous-soc-design/data-model.md).

- [ ] T004 Add Zod v0.3 schemas (Domain / Channel / StochasticEventSource) and extend TaskFile / AperiodicTaskFile / SporadicServerConfig Zod schemas with `domain_id` + `core_index`; add `version: "0.3"` discriminator
  - **FR/SC**: FR-001, FR-002, FR-003, FR-008, FR-010
  - **Files**: [src/schema/projectFile.ts](src/schema/projectFile.ts)
  - **Acceptance**: schema parses a v0.3 fixture and rejects unknown fields under `.strict()`; new unit tests in `test/schema/projectFile.v03.test.ts` pass.

- [ ] T005 Implement v0.1/v0.2 → v0.3 ProjectFile migrator (inject single default `rtos` domain with `core_count: 1`, stamp `domain_id = "default"` on every task / aperiodic task / sporadic server)
  - **FR/SC**: FR-009, FR-010, SC-003
  - **Files**: [src/schema/projectFile.ts](src/schema/projectFile.ts)
  - **Acceptance**: `migrate(v01)` and `migrate(v02)` emit version `"0.3"` with a single `"default"` domain; round-trips preserve original task fields.

- [ ] T006 [P] Sync `contracts/project-file.schema.json` with the v0.3 Zod schema and add a `schema-parity` test that asserts Zod ↔ JSON Schema agreement on a v0.3 fixture
  - **FR/SC**: FR-010
  - **Files**: [specs/004-heterogeneous-soc-design/contracts/project-file.schema.json](specs/004-heterogeneous-soc-design/contracts/project-file.schema.json), `test/schema/projectFile.contractParity.test.ts`
  - **Acceptance**: parity test passes; JSON Schema validates the same v0.3 fixture that Zod accepts and rejects what Zod rejects.

- [ ] T007 [P] Add migration regression fixtures (one v0.1, one v0.2) and a test asserting analysis output for the migrated fixture matches Phase 3 within ±1% RTA tolerance
  - **FR/SC**: FR-009, SC-003
  - **Files**: `test/fixtures/project-files/legacy-v01.yaml`, `test/fixtures/project-files/legacy-v02.yaml`, `test/schema/legacyMigration.test.ts`
  - **Acceptance**: `npm run test:run -- legacyMigration` green; max RTA delta ≤1%.

- [ ] T008 Refactor `analyzeProject` into a per-domain fan-out + merge orchestrator (Problems merged with `domain_id` tag)
  - **FR/SC**: FR-005, FR-009
  - **Files**: [src/analysis/kernel.ts](src/analysis/kernel.ts)
  - **Acceptance**: kernel unit tests show two-domain input yields independent per-domain results and a merged Problems list; legacy single-domain projects continue to analyze identically (regression).

**Checkpoint**: Foundation ready — User Story milestones can now begin.

---

## Phase 3: Milestone P1.a — User Story 1: Multiple Execution Domains (Priority: P1) 🎯 MVP

**Goal**: A ProjectFile can declare ≥1 `Domain`, each task is bound to a domain, and analysis runs per domain. Legacy projects load transparently.

**Independent Test**: Create a v0.3 project with one RTOS domain and one baremetal domain, assign one task to each, run analysis, and verify each domain's results are isolated.

- [ ] T009 [P] [US1] Add `DomainTabs` UI component (list domains, switch active domain, create/delete domain) wired to Jotai state
  - **FR/SC**: FR-001
  - **Files**: `src/ui/DomainTabs.tsx`, `src/state/` (new atom for active domain)
  - **Acceptance**: RTL test `test/ui/DomainTabs.test.tsx` covers create/select/delete and asserts ProjectFile state update.

- [ ] T010 [US1] Extend task editor / form to require `domain_id` (and `core_index` when domain `core_count > 1`)
  - **FR/SC**: FR-002
  - **Files**: `src/ui/` (existing task panels)
  - **Acceptance**: RTL test asserts the form blocks save when `domain_id` is missing and surfaces a Problem when `core_index ≥ core_count`.

- [ ] T011 [P] [US1] Per-domain kernel orchestration tests (two domains, two tasks, independent analysis results + merged Problems)
  - **FR/SC**: FR-005
  - **Files**: `test/analysis/kernel.multiDomain.test.ts`
  - **Acceptance**: test green; asserts no cross-domain contamination of `responseTimes` or `priorities`.

- [ ] T012 [US1] Quickstart smoke E2E: load legacy fixture → confirm single `default` domain appears and analysis matches baseline
  - **FR/SC**: FR-009, SC-003
  - **Files**: `test/e2e/legacyMigration.spec.ts`
  - **Acceptance**: `npm run test:e2e -- legacyMigration` green.

**Checkpoint**: US1 fully functional and independently testable. MVP candidate.

---

## Phase 4: Milestone P1.b — User Story 2: Inter-Domain Channels (Priority: P1)

**Goal**: Define `Channel` entities with validated endpoints; dangling refs raise Problems and block export.

**Independent Test**: Create a channel between two tasks in different domains, then break one endpoint and confirm a Problem appears and export is blocked.

- [ ] T013 [P] [US2] Implement channel validator (endpoint existence, cross-domain check, latency budget > 0) emitting stable Problem IDs
  - **FR/SC**: FR-003, FR-004, SC-002
  - **Files**: `src/analysis/channels.ts`
  - **Acceptance**: unit tests in `test/analysis/channels.test.ts` cover valid channel, dangling producer, dangling consumer, and same-domain warning.

- [ ] T014 [US2] Wire `analyzeProject` to invoke the channel validator and merge channel Problems into the global list
  - **FR/SC**: FR-004, FR-005
  - **Files**: [src/analysis/kernel.ts](src/analysis/kernel.ts)
  - **Acceptance**: integration test asserts channel Problems appear in `AnalysisSnapshot.problems`; export gate test asserts dangling-ref project cannot export.

- [ ] T015 [P] [US2] Add `ChannelPanel` UI (list / create / delete channel; select producer & consumer task, transport, latency budget)
  - **FR/SC**: FR-003
  - **Files**: `src/ui/ChannelPanel.tsx`
  - **Acceptance**: RTL test `test/ui/ChannelPanel.test.tsx` covers create / delete / surface validation error.

- [ ] T016 [P] [US2] Channel persistence round-trip test (YAML ↔ in-memory ↔ YAML preserves all channel fields)
  - **FR/SC**: FR-003, FR-010
  - **Files**: `test/schema/channelRoundTrip.test.ts`, `test/fixtures/project-files/two-domain-channel.yaml`
  - **Acceptance**: round-trip equality holds byte-for-byte on the canonical YAML.

**Checkpoint**: US2 fully functional. Channels validate and persist.

---

## Phase 5: Milestone P2 — User Story 3: Multicore Preemption & Stack Occupancy (Priority: P2)

**Goal**: Tasks pinned to specific cores within an RTOS domain produce independent per-core schedules, per-core Gantt rows, and per-core stack occupancy. SC-004 perf budget enforced.

**Independent Test**: Two tasks pinned to two cores in one RTOS domain render two parallel Gantt rows and report independent preemption + stack occupancy.

- [ ] T017 [P] [US3] Implement per-core scheduling kernel (group tasks by `core_index`, run RMA/RTA per core, expose `coreAssignments[domain_id][core_index]`)
  - **FR/SC**: FR-006
  - **Files**: `src/analysis/multicore.ts`
  - **Acceptance**: unit tests in `test/analysis/multicore.test.ts` cover two-core preemption isolation and core-pinning validation.

- [ ] T018 [US3] Compute per-core stack occupancy per interval and expose it in `AnalysisSnapshot`
  - **FR/SC**: FR-007
  - **Files**: `src/analysis/multicore.ts` (or new `src/analysis/stack.ts` if cleaner)
  - **Acceptance**: unit test asserts stack occupancy matches a hand-computed two-task / two-core scenario.

- [ ] T019 [US3] Extend Gantt panel to render one row per core for multicore domains; extend memory/stack panel to show per-core occupancy
  - **FR/SC**: FR-006, FR-007
  - **Files**: existing `src/ui/` Gantt + memory panels
  - **Acceptance**: RTL test asserts two `<row>` elements rendered for a two-core domain and stack panel shows per-core series.

- [ ] T020 [P] [US3] Perf assertion test for SC-004: 10-task / 2-core / 2-domain re-analysis ≤200 ms via `usePerfMeasure`
  - **FR/SC**: SC-004
  - **Files**: `test/analysis/multicore.perf.test.ts`, `test/fixtures/project-files/perf-10task-2core-2domain.yaml`
  - **Acceptance**: median of N runs ≤200 ms on CI hardware; test fails if exceeded.

**Checkpoint**: US3 fully functional. Multicore Gantt + stack live and within perf budget.

---

## Phase 6: Milestone P3 — User Story 4: Linux Stochastic Input (Priority: P3)

**Goal**: A `StochasticEventSource` on a Linux domain feeds the Phase 2 aperiodic model for a consumer RTOS task; removal removes the synthetic aperiodic load.

**Independent Test**: Declare a Linux event with mean inter-arrival, attach to an RTOS consumer, and verify the consumer is analyzed with the aperiodic model; delete the event and the synthetic load disappears.

- [ ] T021 [P] [US4] Implement stochastic-event adapter that materializes a `StochasticEventSource` as an aperiodic input (uses `mean_interarrival_ms` as conservative `min_interarrival_ms` per research D4)
  - **FR/SC**: FR-008
  - **Files**: `src/analysis/stochastic.ts`
  - **Acceptance**: unit tests in `test/analysis/stochastic.test.ts` cover add/remove of the event and provenance-tagged Problem entries.

- [ ] T022 [US4] Wire stochastic adapter into `analyzeProject` (Linux events resolved before per-domain analysis so consumer's domain sees the synthetic aperiodic load)
  - **FR/SC**: FR-008, FR-005
  - **Files**: [src/analysis/kernel.ts](src/analysis/kernel.ts)
  - **Acceptance**: integration test asserts consumer task's response time reflects the synthetic load only while the event exists.

- [ ] T023 [P] [US4] Minimal UI affordance to create/list/delete `StochasticEventSource` entries on a Linux domain
  - **FR/SC**: FR-008
  - **Files**: `src/ui/` (new panel or extension of DomainTabs)
  - **Acceptance**: RTL test covers create/delete + validation (`domain_id.kind === "linux"`, `consumer_task_id` lives in non-linux domain).

**Checkpoint**: US4 fully functional. Linux stochastic input feeds aperiodic analysis.

---

## Phase 7: Milestone Release Gate — SC-005 Fixture & Full Local Gate

**Purpose**: Ship the representative SoC fixture and verify all gates green before merge.

- [ ] T024 [P] Add `examples/dual-core-rtos-linux.yaml` — Cortex-R5 dual-core RTOS domain + Cortex-A53 Linux domain, ≥1 channel, ≥1 stochastic event
  - **FR/SC**: SC-005, FR-001, FR-002, FR-003, FR-008
  - **Files**: `examples/dual-core-rtos-linux.yaml`
  - **Acceptance**: schema validation passes; `analyzeProject` produces non-empty per-domain results and no `error`-level Problems.

- [ ] T025 [P] Add quickstart E2E covering SC-001: starting from the new fixture, a user produces the dual-domain / dual-core project in the UI in <5 min (script-measured)
  - **FR/SC**: SC-001, SC-005
  - **Files**: `test/e2e/dualCoreRtosLinux.spec.ts`
  - **Acceptance**: E2E green; recorded elapsed steps ≤ 5 min worth of scripted actions.

- [ ] T026 Update [docs/phase-roadmap.md](docs/phase-roadmap.md) and [docs/quickstart.md](docs/quickstart.md) to reference the v0.3 schema bump and the new fixture
  - **FR/SC**: FR-010, SC-005
  - **Files**: [docs/phase-roadmap.md](docs/phase-roadmap.md), [docs/quickstart.md](docs/quickstart.md)
  - **Acceptance**: docs build clean; cross-links resolve.

- [ ] T027 Run `verify: full local gate` (lint → type-check → test:run → test:e2e → format:check → build → audit) and capture results in PR description
  - **FR/SC**: SC-003, SC-004, SC-005 (all gates)
  - **Files**: none (CI/local verification)
  - **Acceptance**: every step exits 0; coverage thresholds preserved (lines/functions/statements ≥70, branches ≥60).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: no dependencies.
- **Phase 2 (Foundational, T003–T008)**: depends on Phase 1. Blocks every later phase.
- **Phase 3 (US1, P1.a)**: depends on Phase 2.
- **Phase 4 (US2, P1.b)**: depends on Phase 3 (channels reference tasks bound to domains).
- **Phase 5 (US3, P2)**: depends on Phase 3 (per-core pinning needs domains + `core_index`).
- **Phase 6 (US4, P3)**: depends on Phase 3 + Phase 2 aperiodic kernel (already in repo).
- **Phase 7 (Release Gate)**: depends on Phases 3–6.

### Task-Level Dependencies (highlights)

- T004, T005 depend on T003.
- T006, T007 depend on T004, T005.
- T008 depends on T003, T004.
- T011 depends on T008. T012 depends on T005 + T008.
- T014 depends on T013 + T008. T016 depends on T013 + T005.
- T018 depends on T017. T019 depends on T017 + T018. T020 depends on T017 + T018.
- T022 depends on T021 + T008. T023 depends on T021.
- T025 depends on T024. T027 is the final gate.

### Parallel Opportunities

- Phase 2: T006 ∥ T007 (after T004/T005 land).
- Phase 3: T009 ∥ T011 (different files); T010 sequential (form depends on T003/T004).
- Phase 4: T013 ∥ T015 ∥ T016 (validator, UI, round-trip fixture are independent files).
- Phase 5: T017 ∥ T020 fixture preparation; T018 follows T017.
- Phase 6: T021 ∥ T023.
- Phase 7: T024 ∥ T025 ∥ T026 (different files); T027 last.

---

## Parallel Example: Phase 2 Foundational

```bash
# After T003 lands, run T004 and T005 sequentially (same file),
# then fan out T006 and T007 in parallel:
Task: "Sync contracts/project-file.schema.json with v0.3 Zod schema"          # T006 [P]
Task: "Add v0.1/v0.2 migration regression fixtures + ±1% RTA test"            # T007 [P]
```

## Parallel Example: Phase 4 Channels

```bash
Task: "Implement channel validator in src/analysis/channels.ts"               # T013 [P]
Task: "Add ChannelPanel UI in src/ui/ChannelPanel.tsx"                        # T015 [P]
Task: "Add channel round-trip test + fixture"                                 # T016 [P]
```

---

## Implementation Strategy

### MVP (P1.a only)

1. Phase 1 → Phase 2 → Phase 3 (US1). At this point legacy projects still work and multi-domain modeling is usable. Ship as MVP.

### Incremental Delivery

1. MVP (US1) → demo.
2. Add US2 (Channels) → demo.
3. Add US3 (Multicore) → demo with per-core Gantt.
4. Add US4 (Stochastic Linux) → demo with Linux-fed aperiodic load.
5. Release Gate (SC-005 fixture + full local gate) → merge.

---

## Traceability Matrix

| Task        | FR(s)                              | SC(s)            |
| ----------- | ---------------------------------- | ---------------- |
| T003        | FR-001, FR-002, FR-010             | —                |
| T004        | FR-001, FR-002, FR-003, FR-008, FR-010 | —            |
| T005        | FR-009, FR-010                     | SC-003           |
| T006        | FR-010                             | —                |
| T007        | FR-009                             | SC-003           |
| T008        | FR-005, FR-009                     | —                |
| T009        | FR-001                             | —                |
| T010        | FR-002                             | —                |
| T011        | FR-005                             | —                |
| T012        | FR-009                             | SC-003           |
| T013        | FR-003, FR-004                     | SC-002           |
| T014        | FR-004, FR-005                     | SC-002           |
| T015        | FR-003                             | —                |
| T016        | FR-003, FR-010                     | —                |
| T017        | FR-006                             | —                |
| T018        | FR-007                             | —                |
| T019        | FR-006, FR-007                     | —                |
| T020        | —                                  | SC-004           |
| T021        | FR-008                             | —                |
| T022        | FR-008, FR-005                     | —                |
| T023        | FR-008                             | —                |
| T024        | FR-001, FR-002, FR-003, FR-008     | SC-005           |
| T025        | —                                  | SC-001, SC-005   |
| T026        | FR-010                             | SC-005           |
| T027        | —                                  | SC-003, SC-004, SC-005 |

---

## Notes

- [P] tasks touch different files and have no incomplete dependencies.
- Every task lists at least one FR or SC for traceability.
- This file is the only artifact produced by this command — no `src/` or `test/` files were modified.
- GitHub Issue creation is deferred to the next workflow step.
