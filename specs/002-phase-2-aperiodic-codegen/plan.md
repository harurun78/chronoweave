# Implementation Plan: Phase 2 Aperiodic and Codegen Extension

**Branch**: `002-phase-2-aperiodic-codegen` | **Date**: 2026-05-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-phase-2-aperiodic-codegen/spec.md`

## Summary

Extend Chronoweave beyond periodic-only Phase 1 by adding ProjectFile `0.2`, aperiodic task records, Sporadic Server configuration, iterative fixed-priority RTA, and a pure FreeRTOS code generation module. Phase 1 `0.1` files remain valid and importable without migration.

## Technical Context

**Language/Version**: TypeScript on Node.js 20.

**Primary Dependencies**: Existing React, Vite, Jotai, Zod, yaml, Vitest, React Testing Library, Playwright stack.

**Storage**: Local YAML/JSON import/export remains the persistence mechanism.

**Testing**: Unit tests for schema/normalization/analysis/codegen, integration tests for UI and state preservation, E2E smoke to ensure Phase 1 scenario remains intact.

**Target Platform**: Desktop browsers; static app with pure analysis and codegen modules.

**Project Type**: Static frontend app plus reusable schema/analysis/codegen libraries.

**Performance Goals**: Preserve Phase 1 import/export and redraw budgets for existing fixture scale. Iterative RTA is bounded by an iteration limit and reports Problems on non-convergence.

**Constraints**: No backend, no trace import, no multicore/heterogeneous scheduling, no vendor-specific FreeRTOS BSP generation.

**Scale/Scope**: Single-core fixed-priority RTOS tasks with optional bounded aperiodic execution through Sporadic Server.

## Constitution Check

| Principle                                         | Check                                                                         | Status |
| ------------------------------------------------- | ----------------------------------------------------------------------------- | ------ |
| Interactive Design Loop First                     | Phase 2 derived results must still flow from ProjectState to AnalysisSnapshot | PASS   |
| ProjectFile As Stable Intermediate Representation | `0.1` remains valid; `0.2` is additive                                        | PASS   |
| Analysis Honesty                                  | Approximate RTA remains visible and iterative RTA is distinguished            | PASS   |
| Responsive UI Is A Requirement                    | Iterative RTA has bounded iteration and can surface Problems                  | PASS   |
| Modular Boundaries For Future Phases              | FreeRTOS generation is a pure module/plugin                                   | PASS   |

## Project Structure

### Documentation

```text
specs/002-phase-2-aperiodic-codegen/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
└── contracts/
    └── project-file-v0.2.schema.json
```

### Source Code

```text
src/
├── analysis/
├── app/
├── codegen/
├── io/
├── model/
├── samples/
├── schema/
└── state/

test/
├── analysis/
├── codegen/
├── fixtures/
├── io/
├── schema/
└── ui/
```

**Structure Decision**: Keep Phase 2 schema and analysis extensions inside existing reusable modules. Add `src/codegen/freertos` as a pure generation boundary with no React dependency.

## Phase Plan

## ProjectFile v0.2 Foundation

### Scope

Extend types, schema validation, normalization, import/export, and fixtures to support optional Phase 2 fields while preserving `0.1` compatibility.

### Acceptance Criteria

- [ ] ProjectFile `0.1` fixtures still validate.
- [ ] ProjectFile `0.2` fixture with aperiodic tasks and Sporadic Server validates.
- [ ] Duplicate IDs across periodic and aperiodic records are rejected.
- [ ] Export excludes transient UI state and preserves Phase 2 fields.

### Verification

- Schema and IO unit tests.

## Iterative RTA and Sporadic Server Analysis

### Scope

Add fixed-priority iterative RTA and server capacity analysis to the pure analysis kernel.

### Acceptance Criteria

- [ ] Iterative RTA is computed for periodic tasks.
- [ ] Enabled Sporadic Server contributes fixed-priority interference.
- [ ] Deadline miss, non-convergence, no-server, and budget-exceeded Problems are produced.
- [ ] Phase 1 approximate RTA fields remain available.

### Verification

- Analysis unit tests for representative fixtures and edge cases.

## FreeRTOS Codegen Plugin

### Scope

Generate deterministic FreeRTOS preview source/header files from normalized ProjectState.

### Acceptance Criteria

- [ ] Generated files include task declarations, periods, stack sizes, priorities, and stubs.
- [ ] Enabled Sporadic Server creates a server task and aperiodic dispatch hook.
- [ ] Symbol names are sanitized deterministically.

### Verification

- Codegen unit tests.

## UI and Workflow Integration

### Scope

Expose Phase 2 fields in the app workflow without breaking Phase 1 panels.

### Acceptance Criteria

- [ ] Phase 2 fixture can be imported through the existing workflow.
- [ ] Analysis panels show iterative RTA and server Problems.
- [ ] Codegen preview can be produced from current ProjectState.

### Verification

- Component integration tests and E2E smoke.

## Release Gate

### Scope

Complete full verification and issue/spec bookkeeping.

### Acceptance Criteria

- [ ] `npm run lint` passes.
- [ ] `npm run type-check` passes.
- [ ] `npm run test:run` passes.
- [ ] `npm run test:e2e` passes.
- [ ] `npm run format:check` passes.
- [ ] `npm run build` passes.
- [ ] `npm audit` reports no critical blocker.

## Complexity Tracking

No constitution violation is expected for the first Phase 2 implementation slice.
