# Chronoweave Constitution

## Core Principles

### I. Interactive Design Loop First

Chronoweave must prioritize the edit -> analyze -> redraw loop. Phase 1 work is successful only when changing task parameters updates the Gantt view, buffer gauges, memory profile, and Problems from the same ProjectState without stale derived data.

### II. ProjectFile As Stable Intermediate Representation

The YAML/JSON ProjectFile is the Phase 1 persistence contract and the future input to code generation plugins. YAML is the canonical human-editable format; JSON is an isomorphic machine-facing representation. UI-only transient state must not leak into ProjectFile.

### III. Analysis Honesty

Phase 1 uses RMA plus an approximate RTA/buffer model. The UI must always disclose that approximate response time can be optimistic. The implementation must not present Phase 1 calculations as a substitute for full schedulability proof.

### IV. Responsive UI Is A Requirement

Drawing responsiveness is not polish. Phase 1 must include performance budgets for WCET drag, derived-state recomputation, import, and export. If budgets are not met, the result must record measurements and an optimization plan.

### V. Modular Boundaries For Future Phases

Task model, ProjectFile schema, analysis kernel, UI panels, import/export, and future generator plugins must remain separable. Phase 1 must not couple UI rendering to code generation or future trace import concerns.

## Project Constraints

- Initial implementation target: React + TypeScript + Vite static web app.
- State model: Jotai ProjectState plus derived AnalysisSnapshot.
- Rendering: React + SVG self-drawn Gantt; no project-management Gantt library in Phase 1.
- Scope: single-core RTOS periodic tasks, RMA, approximate RTA, buffer gauges, memory profile, Problems, YAML/JSON import/export.
- Out of Phase 1: non-periodic task input, Sporadic Server, iterative RTA, RTOS code generation, trace import, multi-core, heterogeneous SoC modeling.
- Current repository stores specifications only. Implementation code must live in an exported or separate implementation repository.

## Development Workflow

- Start with ProjectFile schema and fixtures before UI assembly.
- Keep analysis kernel pure and unit-testable.
- Use the Motor Control 1-axis sample and 2-axis extension as representative E2E fixtures.
- Measure production-build UI responsiveness for Phase 1 release gates.
- Preserve spec-id boundaries from `speckit-handoff.md` when creating tasks or issues.

## Governance

This constitution governs speckit specs for Chronoweave. Changes that expand Phase 1 beyond RTOS Task Design Kernel, remove approximate-RTA disclosure, change the canonical ProjectFile format, or introduce code generation into Phase 1 require an explicit specification update and rationale.

**Version**: 0.1.0 | **Ratified**: 2026-05-30 | **Last Amended**: 2026-05-30