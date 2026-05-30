# Data Model: RTOS Task Design Kernel

## TimeValue

### スコープ

Represents time values in ProjectFile and internal calculations.

### Fields

| field | type | required | notes |
|---|---|---:|---|
| `*_ms` | number | yes | ProjectFile and UI use milliseconds. |
| internal microseconds | integer | yes | Analysis converts ms to microseconds internally. |

### 受け入れ条件

- [ ] `wcet_ms: 0.05` roundtrips without being rounded to tick.
- [ ] `period_ms` and `deadline_ms` can be checked against `tick_ms` grid.

## ProjectFile

### スコープ

Persistent file format for Chronoweave Phase 1.

### Fields

| field | type | required | notes |
|---|---|---:|---|
| `version` | string | yes | Phase 1 uses `0.1`. |
| `global` | GlobalSettings | yes | Tick, stack presets, RAM capacity. |
| `tasks` | TaskFile[] | yes | One or more periodic tasks. |

### 受け入れ条件

- [ ] YAML is canonical.
- [ ] JSON is isomorphic.
- [ ] Transient UI state is excluded.

## GlobalSettings

### スコープ

Project-wide settings.

### Fields

| field | type | required | notes |
|---|---|---:|---|
| `tick_ms` | number | yes | Default 1. |
| `stack_presets.low` | number | yes | Default 512 bytes. |
| `stack_presets.mid` | number | yes | Default 2048 bytes. |
| `stack_presets.high` | number | yes | Default 4096 bytes. |
| `ram_capacity` | number | no | Optional bytes. |

### 受け入れ条件

- [ ] Missing `ram_capacity` does not block memory profile generation.
- [ ] Stack preset values are positive integers.

## TaskFile

### スコープ

Serialized periodic RTOS task.

### Fields

| field | type | required | notes |
|---|---|---:|---|
| `id` | string | yes | Stable within ProjectFile. |
| `name` | string | yes | Display name. |
| `period_ms` | number | yes | Positive period. |
| `wcet_ms` | number | yes | Positive WCET. |
| `deadline_ms` | number | no | Defaults to `period_ms`. |
| `priority_mode` | `auto` or `manual` | no | Defaults to `auto`. |
| `manual_priority` | number | no | Required when mode is `manual`. |
| `stack` | `low` or `mid` or `high` | yes | Stack preset name. |
| `description` | string | no | Notes. |

### 受け入れ条件

- [ ] Duplicate names are allowed if IDs are distinct.
- [ ] `wcet_ms > period_ms` remains importable but produces analysis Error.
- [ ] `deadline_ms` default is applied during normalization.

## ProjectState

### スコープ

Editable in-memory state.

### Fields

| field | type | required | notes |
|---|---|---:|---|
| `version` | string | yes | Mirrors ProjectFile. |
| `global` | GlobalSettings | yes | Editable settings. |
| `tasks` | TaskModel[] | yes | Editable tasks. |
| `selectedTaskId` | string | no | Transient UI state, not exported. |

### 受け入れ条件

- [ ] ProjectState can be converted to ProjectFile without selected task.
- [ ] Undo/Redo snapshots only persistent state.

## AnalysisSnapshot

### スコープ

Derived analysis result rendered by UI panels.

### Fields

| field | type | required | notes |
|---|---|---:|---|
| `lcm_ticks` | number | yes | LCM in ticks. |
| `lcm_ms` | number | yes | LCM in ms. |
| `tasks` | TaskAnalysis[] | yes | Per-task analysis. |
| `aperiodic_capacity_percent` | number | yes | Gauge value. |
| `memory_profile` | MemoryProfile | yes | Series and peak. |
| `problems` | Problem[] | yes | Error/Warning/Info. |

### 受け入れ条件

- [ ] AnalysisSnapshot is derived from ProjectState by pure functions.
- [ ] Export/import roundtrip produces equivalent AnalysisSnapshot.

## TaskAnalysis

### スコープ

Per-task derived analysis.

### Fields

| field | type | required | notes |
|---|---|---:|---|
| `task_id` | string | yes | Links to TaskModel. |
| `effective_deadline_ms` | number | yes | Defaulted deadline. |
| `effective_priority` | number | yes | RMA or manual priority. |
| `buffer_ms` | number | yes | `period - wcet`. |
| `buffer_consumed_ms` | number | yes | Higher-priority interference approximation. |
| `buffer_remaining_ms` | number | yes | Remaining budget. |
| `approximate_response_time_ms` | number | yes | `wcet + buffer_consumed`. |
| `schedulable` | boolean | yes | Phase 1 approximation. |

### 受け入れ条件

- [ ] Every task gets TaskAnalysis even if it has Problems.
- [ ] Lower `effective_priority` numbers represent higher priority in Phase 1.

## MemoryProfile

### スコープ

Memory usage wave derived from stack presets.

### Fields

| field | type | required | notes |
|---|---|---:|---|
| `series` | number[] | yes | Bytes per sampled tick. |
| `peak_bytes` | number | yes | Maximum stack usage. |
| `capacity_bytes` | number | no | Optional RAM capacity. |

### 受け入れ条件

- [ ] Peak is available whether or not capacity is set.

## Problem

### スコープ

Problems panel entry.

### Fields

| field | type | required | notes |
|---|---|---:|---|
| `id` | string | yes | Stable within snapshot. |
| `level` | `error` / `warning` / `info` | yes | Display severity. |
| `message` | string | yes | User-facing message. |
| `task_id` | string | no | Optional task link. |
| `source` | `schema` / `analysis` / `performance` / `import` | yes | Origin. |

### 受け入れ条件

- [ ] Approximate RTA Info is always present.
- [ ] Task-linked Problem can focus the task in UI.