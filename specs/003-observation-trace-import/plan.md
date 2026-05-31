# Implementation Plan: Phase 3 Observation Trace Import

**Branch**: `003-observation-trace-import` | **Date**: 2026-05-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-observation-trace-import/spec.md`

## Summary

Add the first observation integration loop to Chronoweave: import a generic CSV execution trace, normalize events, estimate observed task timing, compare observations against the current design model, and surface differences in Problems plus a compact Observation panel.

## Technical Context

**Language/Version**: TypeScript on Node.js 20.

**Primary Dependencies**: Existing React, Vite, Jotai, Zod, yaml, Vitest, React Testing Library, Playwright stack. No new parser dependency is required for the first CSV adapter.

**Storage**: Trace observations are transient UI state in this slice and are not serialized into ProjectFile.

**Testing**: Unit tests for CSV parsing and comparison; UI integration and E2E smoke for trace import and Problems display.

**Target Platform**: Desktop browser static app.

**Project Type**: Static frontend app plus reusable trace parser/comparison modules.

**Performance Goals**: Generic CSV fixtures under 100KB should parse and compare within the existing local debug workflow. No worker required for initial trace scale.

**Constraints**: No vendor-specific complete parser, no binary trace parsing, no ProjectFile persistence of observations in the first slice.

**Scale/Scope**: Single-core task execution intervals with task names and timestamps.

## Constitution Check

| Principle                                         | Check                                                                          | Status |
| ------------------------------------------------- | ------------------------------------------------------------------------------ | ------ |
| Interactive Design Loop First                     | Observation comparison updates Problems and UI panel from current ProjectState | PASS   |
| ProjectFile As Stable Intermediate Representation | Observation data remains transient and does not mutate ProjectFile             | PASS   |
| Analysis Honesty                                  | Observed-vs-design drift is surfaced as Problems with clear severity           | PASS   |
| Responsive UI Is A Requirement                    | CSV parser is deterministic and bounded for fixture scale                      | PASS   |
| Modular Boundaries For Future Phases              | Trace parsing/comparison are pure modules independent from React               | PASS   |

## Project Structure

```text
specs/003-observation-trace-import/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
└── contracts/
    └── generic-trace-csv.schema.md

src/
├── trace/
│   ├── csvTrace.ts
│   └── compare.ts
└── app/

test/
├── fixtures/traces/
├── trace/
├── ui/
└── e2e/
```

**Structure Decision**: Keep trace import and comparison pure and UI-independent. The app owns transient imported observation state.

## Phase Plan

## Trace Parser Foundation

### Scope

Implement generic CSV parsing into normalized TraceEvent and ObservedTask estimates.

### Acceptance Criteria

- [ ] CSV with `task`, `start_ms`, `end_ms` headers parses.
- [ ] Header order can vary.
- [ ] Blank lines are ignored.
- [ ] Invalid rows produce import Problems.
- [ ] Observed period and execution estimates are deterministic.

### Verification

- Trace parser unit tests with valid and invalid fixtures.

## Design Comparison

### Scope

Compare ObservedTask estimates with current design tasks.

### Acceptance Criteria

- [ ] Matched task rows include design and observed period/WCET values.
- [ ] WCET overrun, period drift, missing observation, and extra observation Problems are produced.
- [ ] Problem IDs are stable.

### Verification

- Comparison unit tests.

## UI Integration

### Scope

Add trace CSV import action, transient observation state, Observation panel, and Problems merge.

### Acceptance Criteria

- [ ] Importing a valid trace shows comparison rows.
- [ ] Invalid import preserves current ProjectState and shows import Problems.
- [ ] ProjectFile export excludes observation state.

### Verification

- React Testing Library tests and Playwright smoke.

## Release Gate

### Scope

Validate Phase 1/2 regressions and Phase 3 behavior.

### Acceptance Criteria

- [ ] `npm run lint` passes.
- [ ] `npm run type-check` passes.
- [ ] `npm run test:run` passes.
- [ ] `npm run test:e2e` passes.
- [ ] `npm run format:check` passes.
- [ ] `npm run build` passes.
- [ ] `npm audit` reports no blocker.

## Complexity Tracking

No constitution violation is expected for this initial Phase 3 slice.
