# Research: RTOS Task Design Kernel

## Decisions

## React + TypeScript + Vite

### Decision

Use React + TypeScript + Vite for Phase 1.

### Rationale

Chronoweave is an interactive web tool with SVG editing, derived state, and static deployment needs. React + TypeScript + Vite gives fast iteration and a broad testing ecosystem.

### Alternatives Considered

- Svelte: viable, but current stack decisions favor React ecosystem and Jotai.
- Canvas-first app: rejected for Phase 1 because individual SVG elements simplify hit testing and resize handles.
- Desktop app: rejected because static web deployment is a project goal.

### 受け入れ条件

- [ ] Plan and tasks assume Vite + React + TypeScript.
- [ ] Static deployment does not require a backend.

## Jotai Derived State

### Decision

Use Jotai atoms for ProjectState and derived AnalysisSnapshot.

### Rationale

Chronoweave needs a small but highly reactive graph: tasks/settings -> analysis -> panels. Jotai derived atoms align with this without introducing a large store framework.

### Alternatives Considered

- Redux Toolkit: rejected for Phase 1 due to boilerplate.
- Zustand: viable, but derived dependency graph is less explicit.
- React local state only: rejected because cross-panel synchronization is central.

### 受け入れ条件

- [ ] ProjectState is the single editable state source.
- [ ] AnalysisSnapshot is derived and not manually duplicated across panels.

## React + SVG Self-Drawn Gantt

### Decision

Draw the Gantt with React + SVG, not a project-management Gantt library.

### Rationale

Chronoweave has periodic tasks over an LCM window, WCET bar length editing, and analysis-linked gauges. Project-management Gantt libraries assume calendar start/end, dependencies, and progress, which are a poor model fit.

### Alternatives Considered

- Frappe Gantt / dhtmlx-gantt / gantt-task-react: rejected due to data-model mismatch.
- Canvas: deferred until SVG performance fails for Phase 1 scale.

### 受け入れ条件

- [ ] Task bars are SVG elements with individual interaction handlers.
- [ ] WCET right-edge drag is implemented on SVG handles.

## YAML Canonical ProjectFile

### Decision

Treat YAML as canonical human-editable ProjectFile and JSON as isomorphic machine-facing representation.

### Rationale

Users can commit YAML to Git and review changes. JSON remains useful for tests, contracts, and future integrations.

### Alternatives Considered

- JSON only: rejected because hand editing and review are less friendly.
- Custom DSL: rejected as unnecessary for Phase 1.

### 受け入れ条件

- [ ] YAML and JSON share the same logical schema.
- [ ] Export/import roundtrip normalizes both formats.

## Approximate RTA In Phase 1

### Decision

Use RMA plus a simple approximate RTA/buffer model in Phase 1 and defer iterative RTA to Phase 2.

### Rationale

Phase 1 validates the UI design loop and data pipeline. The approximation is sufficient for low-utilization representative fixtures if the UI clearly discloses optimistic bias.

### Alternatives Considered

- Iterative RTA in Phase 1: rejected to keep the first implementation focused on UI responsiveness and schema stability.
- No RTA/buffer model: rejected because buffer gauges are the product differentiator.

### 受け入れ条件

- [ ] Approximate RTA Info is always visible.
- [ ] Tests include a high-utilization optimistic-bias fixture.

## Performance Measurement Before Optimization

### Decision

Do not require Web Worker or Wasm initially. Measure production-build responsiveness first.

### Rationale

Phase 1 scope is <=10 tasks and <=10,000 ticks. TypeScript should be sufficient; premature worker/Wasm complexity would slow iteration.

### Alternatives Considered

- Worker-first analysis: deferred until measurements require it.
- Wasm analysis core: deferred until Phase 2+ or larger task sets.

### 受け入れ条件

- [ ] Performance tasks measure drag, recompute, import, and export.
- [ ] Worker/Wasm is introduced only with measurement evidence.