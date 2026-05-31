# Contributing to Chronoweave

Chronoweave is developed with a Spec Kit driven workflow. Please read
[.github/instructions/dev-cycle.instructions.md](.github/instructions/dev-cycle.instructions.md)
and [.github/ai/rules/GIT_WORKFLOW.md](.github/ai/rules/GIT_WORKFLOW.md) before
opening a pull request.

## Local setup

```bash
npm ci
npm run dev
```

## Required local gate

Run the full local gate before pushing:

```bash
npm run lint
npm run format:check
npm run type-check
npm run test:run
npm run test:e2e
npm run build
npm audit --omit=dev --audit-level=moderate
```

The same steps are available as a single VS Code task: `verify: full local
gate` in [.vscode/tasks.json](.vscode/tasks.json).

## Branching and commits

- Branch from the latest `main` (or active feature branch) and use
  `<type>/<issue>-<kebab-description>` as the branch name.
- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit
  messages, e.g. `feat(trace): ...`, `fix(ui): ...`, `docs(spec): ...`.
- Keep one branch per purpose. Do not bundle unrelated changes.

## Pull requests

- Open a draft PR early when the change is large.
- Link the related GitHub Issue in the PR description.
- Self-review before requesting review: remove debug logs, stray TODOs, and
  unrelated diffs.
- Mark the related spec checklist (`specs/*/tasks.md`) when the PR completes
  an item.

## Spec Kit workflow

For a new feature slice run:

```bash
.specify/scripts/bash/create-new-feature.sh --json --number <n> \
  --short-name <slug> "<one line description>"
.specify/scripts/bash/setup-plan.sh --json
```

Then iterate on `spec.md`, `plan.md`, `tasks.md` before writing code.
