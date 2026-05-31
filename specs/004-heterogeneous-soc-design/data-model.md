# Data Model: Phase 4 Heterogeneous SoC Design

ProjectFile bumps to `version: "0.3"`. v0.1 and v0.2 files are migrated transparently (see research.md D1). Fields added in v0.3 are marked **NEW**; modified fields are marked **MOD**.

## ProjectFile (v0.3)

| field               | type                     | required | notes                                                                                  |
| ------------------- | ------------------------ | -------: | -------------------------------------------------------------------------------------- |
| `version`           | `"0.1" \| "0.2" \| "0.3"`|      yes | Read accepts all three; **writes always emit `"0.3"`**.                                |
| `global`            | GlobalSettings           |      yes | Unchanged from v0.2.                                                                   |
| `domains`           | Domain[]                 |  **yes** | **NEW**. ≥1 entry. Default `[{ id: "default", kind: "rtos", core_count: 1, ... }]`.    |
| `tasks`             | TaskFile[]               |      yes | **MOD** — see TaskFile.                                                                |
| `aperiodic_tasks`   | AperiodicTaskFile[]      |       no | **MOD** — adds `domain_id`.                                                            |
| `sporadic_server`   | SporadicServerConfig     |       no | **MOD** — adds `domain_id` (defaults to `"default"`).                                  |
| `channels`          | Channel[]                |       no | **NEW**. Defaults to `[]`.                                                             |
| `stochastic_events` | StochasticEventSource[]  |       no | **NEW**. Defaults to `[]`.                                                             |
| `codegen`           | CodegenSettings          |       no | Unchanged from v0.2.                                                                   |

## Domain (NEW)

Execution context. Owns its own analysis result subset.

| field        | type                                              | required | notes                                                          |
| ------------ | ------------------------------------------------- | -------: | -------------------------------------------------------------- |
| `id`         | string `^[a-zA-Z0-9_-]+$`                         |      yes | Unique within ProjectFile.                                     |
| `name`       | string (min 1)                                    |      yes | Display name.                                                  |
| `kind`       | `"baremetal" \| "rtos" \| "linux" \| "fpga"`      |      yes | `"fpga"` is reserved; no analysis kernel yet (Problem `info`). |
| `core_count` | integer ≥1                                        |      yes | Number of logical cores. `linux` and `baremetal` allow 1+.     |
| `description`| string                                            |       no | Free-form.                                                     |

## TaskFile (MOD)

| field             | type                                | required | notes                                                                                       |
| ----------------- | ----------------------------------- | -------: | ------------------------------------------------------------------------------------------- |
| `id`              | string                              |      yes | Unchanged. Unique within ProjectFile (not per domain).                                      |
| `name`            | string                              |      yes |                                                                                             |
| `period_ms`       | number > 0                          |      yes |                                                                                             |
| `wcet_ms`         | number > 0                          |      yes |                                                                                             |
| `deadline_ms`     | number > 0                          |       no |                                                                                             |
| `priority_mode`   | `"auto" \| "manual"`                |       no |                                                                                             |
| `manual_priority` | integer                             |  cond.   | Required when `priority_mode === "manual"`.                                                 |
| `stack`           | `"low" \| "mid" \| "high"`          |      yes |                                                                                             |
| `domain_id`       | string                              |  **yes** | **NEW**. Must reference an existing `domains[].id`.                                         |
| `core_index`      | integer ≥0                          |       no | **NEW**. Required when the referenced domain has `core_count > 1` (else default `0`).       |
| `description`     | string                              |       no |                                                                                             |

## AperiodicTaskFile (MOD)

Adds `domain_id` (required, referencing an existing domain). All other fields unchanged from v0.2.

## SporadicServerConfig (MOD)

Adds `domain_id` (required, referencing an existing domain; only one server per domain). Server's `core_index` is optional and defaults to `0`.

## Channel (NEW)

Inter-domain communication. Crosses domain boundaries.

| field                | type                                                   | required | notes                                                                       |
| -------------------- | ------------------------------------------------------ | -------: | --------------------------------------------------------------------------- |
| `id`                 | string `^[a-zA-Z0-9_-]+$`                              |      yes | Unique within ProjectFile.                                                  |
| `producer_task_id`   | string                                                 |      yes | Must reference an existing task or stochastic event source.                 |
| `consumer_task_id`   | string                                                 |      yes | Must reference an existing task. Must live in a different domain than producer (else Problem `warn`). |
| `transport`          | `"shared_memory" \| "mailbox" \| "queue"`              |      yes |                                                                             |
| `latency_budget_ms`  | number > 0                                             |      yes | Used by the future end-to-end latency rollup; in v0.3 only validated.       |
| `description`        | string                                                 |       no |                                                                             |

## CoreAssignment (derived, not a top-level field)

Logical mapping `TaskModel ↔ (domain_id, core_index)`. Materialized by the analyzer; persisted indirectly through `TaskFile.domain_id` + `TaskFile.core_index`. Exposed in `AnalysisSnapshot` as `coreAssignments[domain_id][core_index] -> TaskModel[]` for the multicore Gantt panel.

## StochasticEventSource (NEW)

Linux-derived event feeding an RTOS task through the aperiodic model.

| field                    | type                       | required | notes                                                                                  |
| ------------------------ | -------------------------- | -------: | -------------------------------------------------------------------------------------- |
| `id`                     | string `^[a-zA-Z0-9_-]+$`  |      yes | Unique within ProjectFile.                                                             |
| `name`                   | string                     |      yes | Display name.                                                                          |
| `domain_id`              | string                     |      yes | Must reference a domain whose `kind === "linux"`.                                      |
| `mean_interarrival_ms`   | number > 0                 |      yes | Used as conservative `min_interarrival_ms` for the aperiodic adapter (research D4).    |
| `std_dev_ms`             | number ≥ 0                 |       no | Informational only in v0.3.                                                            |
| `consumer_task_id`       | string                     |      yes | Must reference an existing task whose domain has `kind !== "linux"`.                   |
| `description`            | string                     |       no |                                                                                        |

## Validation Rules (v0.3)

- At least one `Domain` exists; `domains[].id` is unique.
- Every `TaskFile.domain_id`, `AperiodicTaskFile.domain_id`, and `SporadicServerConfig.domain_id` references an existing domain.
- For every task in a domain with `core_count > 1`, `core_index` is present and `0 ≤ core_index < core_count`.
- `Channel` producer / consumer task references exist (FR-004). Dangling refs → Problem `error`.
- `StochasticEventSource.domain_id` references a `linux` domain; `consumer_task_id` references a task in a non-linux domain.
- At most one `SporadicServerConfig` per domain.
- Task `id`s are unique across the entire ProjectFile (not per domain) so legacy IDs round-trip.
- `version === "0.1" | "0.2"` is normalized to `"0.3"` by the pre-validation migrator (research D1).

## Analysis Outputs (extension)

`AnalysisSnapshot` gains:

- `domains: Record<DomainId, DomainAnalysis>` — per-domain RMA/RTA + per-core schedule + per-core stack occupancy.
- `channels: ChannelAnalysis[]` — endpoint validity, optional latency-budget evaluation against producer/consumer response times.
- `stochasticEvents: StochasticEventAnalysis[]` — adapter provenance entries (which event produced which synthetic aperiodic load).
- `problems: Problem[]` — merged across all domains, channels, and stochastic adapters, each tagged with `domain_id` when applicable.
