# Quickstart: Phase 4 Heterogeneous SoC — Dual-Core RTOS + Linux (SC-005)

This walk-through builds the SC-005 reference SoC fixture (Cortex-R5 dual-core RTOS + Cortex-A53 Linux) end-to-end in **under 5 minutes** (SC-001).

## 0. Prerequisites

- Node.js 20, `npm ci` already run.
- Branch: `004-heterogeneous-soc-design`.
- Fixture will live at `examples/dual-core-rtos-linux.yaml` (created during implementation; this quickstart shows its target shape).

## 1. Start the app

```bash
npm run dev
```

Open the printed local URL.

## 2. Load the fixture (or paste the YAML below)

Use **Import ProjectFile** and select `examples/dual-core-rtos-linux.yaml`, or paste:

```yaml
version: "0.3"
global:
  tick_ms: 1
  stack_presets: { low: 1024, mid: 4096, high: 16384 }

domains:
  - { id: rtos_r5,  name: "Cortex-R5 RTOS", kind: rtos,  core_count: 2 }
  - { id: linux_a53, name: "Cortex-A53 Linux", kind: linux, core_count: 1 }

tasks:
  - { id: motor_ctrl, name: MotorCtrl,   domain_id: rtos_r5, core_index: 0,
      period_ms: 1,  wcet_ms: 0.3, stack: mid }
  - { id: sensor_fuse, name: SensorFuse, domain_id: rtos_r5, core_index: 1,
      period_ms: 5,  wcet_ms: 1.2, stack: mid }
  - { id: cmd_handler, name: CmdHandler, domain_id: rtos_r5, core_index: 0,
      period_ms: 20, wcet_ms: 0.8, stack: low }

stochastic_events:
  - { id: linux_cmd, name: "Linux command", domain_id: linux_a53,
      mean_interarrival_ms: 50, std_dev_ms: 10,
      consumer_task_id: cmd_handler }

channels:
  - { id: cmd_ch, producer_task_id: linux_cmd, consumer_task_id: cmd_handler,
      transport: mailbox, latency_budget_ms: 5 }
```

## 3. Verify the SoC view

- The **Domain tabs** show `Cortex-R5 RTOS` (2 cores) and `Cortex-A53 Linux` (1 core).
- The **Gantt** for `rtos_r5` shows **two rows** — core 0 runs `MotorCtrl` + `CmdHandler`, core 1 runs `SensorFuse` (FR-006).
- The **Stack** panel reports per-core occupancy per interval (FR-007).
- The **Channel** panel lists `cmd_ch` with its mailbox transport and 5 ms budget.
- **Problems** contains an `info` entry: `cmd_handler: aperiodic load synthesized from Linux event 'linux_cmd' (mean_interarrival used as min_interarrival)` (FR-008, research D4).

## 4. Exercise migration (FR-009)

Import any v0.1 or v0.2 fixture (e.g., `src/samples/motorControl.ts`). It should appear under a single auto-created `default` (rtos, 1 core) domain, with analysis results matching the previous Phase 3 run within ±1% (SC-003).

## 5. Run the validation gate

```bash
npm run lint && npm run type-check && npm run test:run && npm run test:e2e && npm run format:check && npm run build && npm audit
```

All gates should pass. Coverage thresholds (lines/functions/statements ≥70, branches ≥60 over `src/analysis/**`, `src/trace/**`, `src/schema/**`) must remain green.
