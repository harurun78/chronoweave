# Research: Phase 2 Aperiodic and Codegen Extension

## Decisions

### ProjectFile compatibility

Decision: Phase 2 introduces ProjectFile `0.2`, while the validator continues to accept Phase 1 `0.1` files unchanged.

Rationale: Phase 1 ProjectFile is the stable intermediate representation. Phase 2 must not invalidate existing fixtures or exported user files.

Alternatives considered:

- Mutate `0.1` schema in place: rejected because it hides contract changes.
- Require migration before import: rejected for Phase 2 because optional extensions can be represented backward-compatibly.

### Aperiodic modeling

Decision: Add top-level `aperiodic_tasks` records with WCET, optional deadline, stack, and description. Aperiodic tasks are served through an optional `sporadic_server` configuration.

Rationale: Periodic task scheduling remains clear, while non-periodic demand is explicitly bounded by a server budget.

Alternatives considered:

- Fold aperiodic tasks into `tasks`: rejected because it makes `period_ms` ambiguous.
- Add trace-derived arrivals now: rejected because trace import is Phase 3 scope.

### Sporadic Server semantics

Decision: Model Sporadic Server as a schedulable periodic server with `budget_ms`, `period_ms`, optional deadline, priority mode, and stack preset. Server budget is also used as a capacity check for configured aperiodic work.

Rationale: This gives users a concrete budget zone without implementing full replenishment event simulation.

Alternatives considered:

- Full replenishment queue simulation: rejected for initial Phase 2 because iterative RTA and codegen are higher-value first slices.

### Iterative RTA

Decision: Add fixed-priority iterative RTA alongside Phase 1 approximate RTA. Higher-priority periodic tasks and enabled Sporadic Server contribute interference via `ceil(R / T) * C` until convergence, deadline miss, or iteration limit.

Rationale: This provides a conservative comparison against the Phase 1 optimistic approximation while keeping the kernel pure and deterministic.

Alternatives considered:

- Replace Phase 1 RTA: rejected because the UI should show the upgrade path and preserve existing behavior.

### Code generation boundary

Decision: Implement FreeRTOS generation as a pure module that accepts normalized ProjectState and returns generated text files. UI integration can consume this module later without entangling codegen with React state.

Rationale: Phase 2 roadmap requires module/plugin separation. A pure generation boundary is easy to test and extend.

Alternatives considered:

- Generate files directly from UI: rejected because it couples browser concerns to generation logic.

## Open Questions

- Whether the FreeRTOS plugin should generate CMake/project scaffolding or only task source/header files in the first UI release.
- Whether `aperiodic_tasks` should later include arrival distributions or event source metadata.
