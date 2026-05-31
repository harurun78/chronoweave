# Research: Phase 3 Observation Trace Import

## Decisions

### Initial trace format

Decision: Phase 3 starts with a generic CSV trace format using columns `task`, `start_ms`, and `end_ms`.

Rationale: CSV keeps the first observation workflow testable without committing to a vendor-specific Tracealyzer or SystemView parser. Vendor adapters can normalize into the same internal event model later.

Alternatives considered:

- Implement Tracealyzer/SystemView binary parsers now: rejected because vendor-specific complete support is out of scope for Phase 3 initial slice.
- Use only manual observed task entry: rejected because the roadmap explicitly calls for trace import.

### Observed task estimation

Decision: Estimate period from sorted start-to-start deltas per task and execution time from `end_ms - start_ms`; report average, min, max, and sample count.

Rationale: This gives meaningful design comparison while staying deterministic and explainable.

Alternatives considered:

- Median-only estimates: rejected for first slice because average/min/max are easier to inspect and test.
- Full statistical distributions: deferred to later observation maturity.

### Comparison semantics

Decision: Compare observed tasks against design tasks by exact name first, then expose missing/extra tasks and threshold-based period/WCET drift.

Rationale: Phase 1/2 TaskModel already has stable display names. Exact matching is predictable and avoids surprising fuzzy matches.

Alternatives considered:

- Fuzzy matching: deferred until trace sources show naming variations that justify it.
- Match by ID: rejected because traces usually contain RTOS task names, not ProjectFile IDs.

### UI integration

Decision: Add a small CSV trace import action and comparison panel to the existing app, preserving ProjectFile import/export behavior.

Rationale: Observation should be visible in the same design loop but remains transient UI state, not ProjectFile persistence in this slice.

## Open Questions

- Which vendor trace export should be normalized first after generic CSV.
- Whether observed tasks should eventually be persisted in ProjectFile or kept as external evidence.
