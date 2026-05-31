# chronoweave

Chronoweave is an RTOS Task Design Kernel: a static React + TypeScript app for
editing periodic and aperiodic task sets, deriving response-time / buffer /
memory snapshots, generating a FreeRTOS scaffold, and comparing the design
model against imported execution traces.

## Implementation status

| Phase   | Status     | Highlights                                                                          |
| ------- | ---------- | ----------------------------------------------------------------------------------- |
| Phase 1 | Done       | ProjectFile v0.1, approximate RTA, Gantt/Problems/Property panels, YAML/JSON        |
| Phase 2 | Done       | ProjectFile v0.2, aperiodic tasks, Sporadic Server, iterative RTA, FreeRTOS preview |
| Phase 3 | Done (CSV) | Generic CSV trace import, observed-vs-design comparison, Observation panel          |
| Phase 4 | Planned    | Vendor-specific trace adapters, observation persistence                             |

See [docs/phase-roadmap.md](docs/phase-roadmap.md) and the Spec Kit features
under [specs/](specs/) for the detailed scope.

## Components

- frontend: React + Vite + TypeScript (`src/`)
- tests: Vitest / React Testing Library / Playwright (`test/`)

## Quick start

Requires Node.js 20 and npm.

```bash
npm install
npm run dev
```

## Local gate

```bash
npm run lint
npm run format:check
npm run type-check
npm run test:run
npm run test:e2e
npm run build
npm audit --omit=dev --audit-level=moderate
```

The same gate is available as a single VS Code task: `verify: full local gate`
in [.vscode/tasks.json](.vscode/tasks.json).

## Trace CSV import (Phase 3)

The Observation panel accepts a generic CSV with `task,start_ms,end_ms`
columns. A working fixture lives at
[test/fixtures/traces/motor-observation.csv](test/fixtures/traces/motor-observation.csv).

## Documentation

- [Specification index](docs/)
- [Specification discussion log](docs/specification-discussion-log.md)
- [Spec Kit features](specs/)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## License

[MIT](LICENSE)
