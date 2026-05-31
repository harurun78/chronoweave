# Generic Trace CSV Contract

Phase 3 starts with a generic CSV trace contract rather than a JSON Schema because the imported artifact is delimited text.

## Required Headers

```csv
task,start_ms,end_ms
```

## Row Contract

| column     | type   | required | validation                                                    |
| ---------- | ------ | -------: | ------------------------------------------------------------- |
| `task`     | string |      yes | Non-empty task name.                                          |
| `start_ms` | number |      yes | Finite timestamp in milliseconds.                             |
| `end_ms`   | number |      yes | Finite timestamp in milliseconds and greater than `start_ms`. |

## Parser Behavior

- Header order is flexible, but names must match exactly.
- Blank lines are ignored.
- Invalid rows fail the import and preserve the current design state.
- Additional columns are ignored in the generic adapter.
