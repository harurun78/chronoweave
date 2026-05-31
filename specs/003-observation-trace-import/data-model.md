# Data Model: Phase 3 Observation Trace Import

## TraceEvent

Normalized execution interval from a trace source.

| field       | type   | required | notes                                                      |
| ----------- | ------ | -------: | ---------------------------------------------------------- |
| `task_name` | string |      yes | RTOS task name from trace.                                 |
| `start_ms`  | number |      yes | Start timestamp in milliseconds.                           |
| `end_ms`    | number |      yes | End timestamp in milliseconds; must be greater than start. |

## ObservedTask

Estimated task behavior derived from TraceEvents.

| field                   | type   | required | notes                                                              |
| ----------------------- | ------ | -------: | ------------------------------------------------------------------ |
| `name`                  | string |      yes | Observed task name.                                                |
| `sample_count`          | number |      yes | Number of execution intervals.                                     |
| `period_estimate_ms`    | number |       no | Average start-to-start delta; omitted with fewer than two samples. |
| `execution_time_avg_ms` | number |      yes | Average execution duration.                                        |
| `execution_time_min_ms` | number |      yes | Minimum execution duration.                                        |
| `execution_time_max_ms` | number |      yes | Maximum execution duration.                                        |

## TraceImportResult

Result of parsing a trace input.

| field            | type           |                          required | notes                      |
| ---------------- | -------------- | --------------------------------: | -------------------------- |
| `ok`             | boolean        |                               yes | Whether parsing succeeded. |
| `events`         | TraceEvent[]   |                       yes when ok | Normalized trace events.   |
| `observed_tasks` | ObservedTask[] |                       yes when ok | Derived task estimates.    |
| `problems`       | Problem[]      | yes when failed or warnings exist | Import/analysis Problems.  |

## TaskObservationComparison

Comparison between design TaskModel and observed trace estimates.

| field                       | type                                                      | required | notes                            |
| --------------------------- | --------------------------------------------------------- | -------: | -------------------------------- |
| `task_name`                 | string                                                    |      yes | Design or observed task name.    |
| `status`                    | `matched` or `missing-observation` or `extra-observation` |      yes | Match state.                     |
| `design_period_ms`          | number                                                    |       no | Period from ProjectState.        |
| `observed_period_ms`        | number                                                    |       no | Estimated period from trace.     |
| `design_wcet_ms`            | number                                                    |       no | WCET from ProjectState.          |
| `observed_max_execution_ms` | number                                                    |       no | Max observed execution duration. |
| `problems`                  | Problem[]                                                 |      yes | Drift/missing/extra Problems.    |

## Validation Rules

- CSV must include `task`, `start_ms`, and `end_ms` headers.
- Each row must have a non-empty task name and numeric timestamps.
- `end_ms` must be greater than `start_ms`.
- Period drift warning threshold defaults to 10%.
- Observed max execution greater than design WCET is an error.
- Designed task missing from observation is a warning.
- Extra observed task not present in design is a warning.
