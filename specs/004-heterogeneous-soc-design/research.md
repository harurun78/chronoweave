# Research: Phase 4 Heterogeneous SoC Design

## Decisions

### D1. Zod schema migration strategy v0.2 → v0.3

**Decision**: Implement a single forward migrator `migrateToV03(raw: unknown): ProjectFileV03` that runs **before** Zod validation. The migrator inspects the `version` field and, for `0.1` or `0.2`, injects:

- `version: "0.3"`
- `domains: [{ id: "default", kind: "rtos", name: "Default", core_count: 1 }]`
- `domain_id: "default"` on every task (and on every `aperiodic_task`)
- `channels: []`
- `stochastic_events: []` (omitted in serialization when empty)

Then the v0.3 Zod schema validates the migrated object. The v0.2 schema is **retired** from the active validation path; the migrator preserves its semantic guarantees because the legacy fields are passed through unchanged.

**Rationale**: Existing schema uses `.strict()`, so adding fields would otherwise reject legacy files. Migrating *before* validation keeps the runtime schema definition single (`projectFileSchemaV03`), avoids a discriminated union over versions, and makes round-tripping deterministic. A pre-validation migrator is easier to unit-test than a post-validation transform because it operates on `unknown`.

**Alternatives considered**:

- Zod `z.discriminatedUnion("version", [...])`: rejected — every consumer would have to switch on version, leaking transitional schema into analysis code.
- Lazy in-place mutation inside `superRefine`: rejected — mixes validation and migration responsibilities; harder to test.
- Reject v0.1/v0.2 and force the user to re-export: rejected by FR-009.

**Risk**: Migrator must preserve task ordering and IDs exactly so RTA results stay within ±1% (SC-003). Mitigated by a fixture-driven regression test asserting analysis snapshot equality for every committed Phase 1/2/3 fixture.

### D2. Per-domain analysis kernel refactor

**Decision**: Introduce an orchestrator `analyzeProject(project) -> AnalysisSnapshot` that:

1. Groups tasks by `domain_id`.
2. For each domain, invokes the existing pure per-core / per-domain analyzer (Phase 1 RMA + Phase 2 iterative RTA), receiving a `DomainAnalysis`.
3. Validates `channels` separately (pure reference check + latency-budget evaluation against producer/consumer response times).
4. Merges all `Problem[]` into a single list with `domain_id` provenance.

The existing analyzer becomes `analyzeDomain(domain, tasks, aperiodics, server)`. Public API of `analyzeProject` is preserved in shape; the orchestrator is the *only* new layer.

**Rationale**: Keeps each per-domain analysis pure and unit-testable (Principle V). Avoids cross-domain RTA, which is explicitly out of scope (spec Assumptions §1). Channel evaluation is a separate pure function so it can be tested without booting the kernel.

**Alternatives considered**:

- One monolithic global analyzer aware of all domains: rejected — breaks modular boundaries and bloats branches.
- Per-domain web worker: deferred — current scale (≤50 tasks) does not justify worker overhead and would complicate Vitest setup.

**Risk**: Re-running per-domain analysis in a tight loop must stay within SC-004 (≤200 ms for 10 tasks / 2 cores / 2 domains). Mitigated by reusing the existing analyzer (already meets Phase 2 budgets) and a `usePerfMeasure`-backed assertion test.

### D3. Multicore preemption modeling

**Decision**: Model each multicore RTOS domain as **N independent fixed-priority single-core schedules**, one per `core_index`. Task pinning is required (`core_index` either explicit or assigned round-robin at migration / authoring time, defaulting to `0`). No work-stealing, no global EDF, no migration. Per-core stack occupancy is computed from each core's own preemption stack at each scheduling event.

**Rationale**: This matches typical RTOS partitioned-multicore configurations (e.g., FreeRTOS SMP with `vTaskCoreAffinitySet`) and lets us reuse the single-core analyzer verbatim per core. Global multicore RTA (e.g., MPCP, MrsP) is out of scope for Phase 4 initial slice. It is the smallest model that satisfies FR-006 and FR-007.

**Alternatives considered**:

- Global scheduling with migration: rejected — analytically heavy, no fixture justifies it yet.
- Hybrid (some tasks unpinned, allocated by best-fit at analysis time): deferred — adds a bin-packing concern outside Phase 4 acceptance.

**Risk**: Users may expect a "no `core_index`" task to be schedulable on any core. Mitigated by validating that every task in a multicore domain has a `core_index`, surfacing a Problem otherwise, and documenting the pinned-only semantics in `quickstart.md`.

### D4. Linux stochastic event integration with the existing aperiodic model

**Decision**: A `StochasticEventSource` on a `linux` domain is **adapted** into a synthetic `AperiodicTaskFile`-shaped record before per-domain analysis of the *consuming* RTOS domain. The adapter maps:

- `mean_interarrival_ms` → `min_interarrival_ms` for the existing Sporadic Server / aperiodic admission check (using mean as a conservative proxy in v1; flagged as such in Problems).
- Optional `std_dev_ms` → currently informational only (surfaced in UI, not consumed by analysis in v1).
- `wcet_ms` on the *handler side* comes from the consuming RTOS task (already declared).

The adapter is a pure function `stochasticToAperiodic(events, tasks) -> AperiodicTaskFile[]` invoked by the orchestrator (D2) before calling `analyzeDomain` on the consuming RTOS domain.

**Rationale**: Reuses the Phase 2 aperiodic / Sporadic Server path entirely. The "mean as min" choice is conservative *enough* to be useful (it overstates load), with explicit honesty signalling (Principle III) via a Problem of severity `info` annotating the synthetic load.

**Alternatives considered**:

- Full stochastic response-time analysis (e.g., Diaz et al.): rejected — heavy math, no fixture demand.
- Bypass aperiodic model and create periodic tasks at the mean rate: rejected — loses the "aperiodic" semantics and double-counts when a real Sporadic Server is configured.

**Risk**: Using mean as `min_interarrival` is pessimistic when the distribution is heavy-tailed and optimistic when it is heavy-headed; users could be misled. Mitigated by (a) the explicit `info` Problem disclosing the approximation, and (b) a research note in this file pinning the v2 plan (percentile-based or tail-aware mapping) for a later spec.

## Open Questions

- Should `channels` participate in end-to-end latency analysis (producer RTA + transport latency + consumer RTA) in Phase 4, or only validate references? Current plan: reference-only in v0.3, latency rollup as a follow-up spec slice if SC-005 fixture demands it.
- Default core assignment policy when a v0.2 task has no `core_index`: pin to core `0` (chosen) vs. round-robin across cores (rejected for determinism).
- Whether `fpga` kind should produce a Problem when present (since no analyzer exists) or be silently ignored. Current plan: emit `info` Problem "FPGA domain has no analysis kernel in Phase 4".
