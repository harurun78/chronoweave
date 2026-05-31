# Data Model: Phase 2 Aperiodic and Codegen Extension

## ProjectFile

Phase 2 accepts ProjectFile `0.1` and `0.2`. Version `0.2` adds optional aperiodic and generation fields.

| field             | type                 | required | notes                                                                           |
| ----------------- | -------------------- | -------: | ------------------------------------------------------------------------------- |
| `version`         | `0.1` or `0.2`       |      yes | `0.1` remains valid. New exports may use `0.2` when Phase 2 fields are present. |
| `global`          | GlobalSettings       |      yes | Same as Phase 1.                                                                |
| `tasks`           | TaskFile[]           |      yes | Periodic fixed-priority tasks.                                                  |
| `aperiodic_tasks` | AperiodicTaskFile[]  |       no | Defaults to empty.                                                              |
| `sporadic_server` | SporadicServerConfig |       no | Required to execute aperiodic load in analysis/codegen.                         |
| `codegen`         | CodegenSettings      |       no | Optional plugin selection and naming settings.                                  |

## AperiodicTaskFile

Non-periodic work item served by Sporadic Server.

| field         | type                     | required | notes                      |
| ------------- | ------------------------ | -------: | -------------------------- |
| `id`          | string                   |      yes | Stable within ProjectFile. |
| `name`        | string                   |      yes | Display/codegen name.      |
| `wcet_ms`     | number                   |      yes | Positive execution demand. |
| `deadline_ms` | number                   |       no | Optional response target.  |
| `stack`       | `low` or `mid` or `high` |      yes | Stack preset name.         |
| `description` | string                   |       no | Notes.                     |

## SporadicServerConfig

Bounded execution server for aperiodic work.

| field             | type                     | required | notes                                      |
| ----------------- | ------------------------ | -------: | ------------------------------------------ |
| `enabled`         | boolean                  |      yes | Disabled server does not affect RTA.       |
| `budget_ms`       | number                   |      yes | Execution budget per replenishment period. |
| `period_ms`       | number                   |      yes | Replenishment period.                      |
| `deadline_ms`     | number                   |       no | Defaults to `period_ms`.                   |
| `priority_mode`   | `auto` or `manual`       |       no | Defaults to `auto`.                        |
| `manual_priority` | number                   |       no | Required when mode is `manual`.            |
| `stack`           | `low` or `mid` or `high` |      yes | Server task stack preset.                  |

## CodegenSettings

Optional generation configuration.

| field       | type       | required | notes                                                        |
| ----------- | ---------- | -------: | ------------------------------------------------------------ |
| `plugin`    | `freertos` |      yes | Initial Phase 2 plugin.                                      |
| `namespace` | string     |       no | Prefix used in generated symbols. Defaults to `Chronoweave`. |

## TaskAnalysis Extension

| field                        | type    |                required | notes                                            |
| ---------------------------- | ------- | ----------------------: | ------------------------------------------------ |
| `iterative_response_time_ms` | number  | yes in Phase 2 analysis | Fixed-priority iterative RTA result.             |
| `iterative_schedulable`      | boolean | yes in Phase 2 analysis | Whether iterative RTA converged within deadline. |
| `rta_iterations`             | number  | yes in Phase 2 analysis | Iteration count until convergence or cutoff.     |

## SporadicServerAnalysis

| field                          | type    | required | notes                                       |
| ------------------------------ | ------- | -------: | ------------------------------------------- |
| `enabled`                      | boolean |      yes | Mirrors config.                             |
| `budget_ms`                    | number  |      yes | Server execution budget.                    |
| `period_ms`                    | number  |      yes | Server period.                              |
| `effective_priority`           | number  |      yes | Priority used in interference calculations. |
| `capacity_utilization_percent` | number  |      yes | Aperiodic WCET demand / budget.             |
| `schedulable`                  | boolean |      yes | Budget and iterative RTA check.             |

## Validation Rules

- `aperiodic_tasks` defaults to empty when omitted.
- Duplicate IDs are invalid across periodic tasks, aperiodic tasks, and `sporadic_server` synthetic ID.
- `sporadic_server.manual_priority` is required when its priority mode is `manual`.
- Aperiodic tasks without an enabled Sporadic Server produce a warning, not an import error.
- Phase 1 `0.1` files normalize to empty aperiodic tasks and no server.
