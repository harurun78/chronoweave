# Quickstart: Phase 2 Aperiodic and Codegen Extension

## Developer Flow

1. Install dependencies:

```bash
npm ci
```

2. Run the validation gate:

```bash
npm run lint && npm run type-check && npm run test:run && npm run test:e2e && npm run build
```

3. Exercise the Phase 2 scenario:

- Import a Phase 1 `0.1` ProjectFile and confirm it still loads.
- Add or import a ProjectFile `0.2` with `aperiodic_tasks` and `sporadic_server`.
- Compare approximate RTA and iterative RTA in the analysis output.
- Generate FreeRTOS preview files from the same ProjectState.

## Example ProjectFile v0.2

```yaml
version: '0.2'
global:
  tick_ms: 1
  stack_presets:
    low: 512
    mid: 2048
    high: 4096
  ram_capacity: 65536
tasks:
  - id: isr-timer
    name: ISR_Timer
    period_ms: 1
    wcet_ms: 0.05
    stack: low
  - id: motorctrl-x
    name: MotorCtrl_X
    period_ms: 10
    wcet_ms: 3
    stack: mid
aperiodic_tasks:
  - id: diagnostics-request
    name: DiagnosticsRequest
    wcet_ms: 1.5
    deadline_ms: 50
    stack: low
sporadic_server:
  enabled: true
  budget_ms: 2
  period_ms: 20
  priority_mode: manual
  manual_priority: 3
  stack: mid
codegen:
  plugin: freertos
  namespace: MotorDemo
```
