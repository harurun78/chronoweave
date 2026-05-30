#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
source "$SCRIPT_DIR/common.sh"

json=false
require_tasks=false
include_tasks=false
paths_only=false

usage() {
  cat <<'EOF'
Usage: check-prerequisites.sh [OPTIONS]

OPTIONS:
  --json             Output in JSON format
  --require-tasks    Require tasks.md to exist
  --include-tasks    Include tasks.md in AVAILABLE_DOCS
  --paths-only       Only output path variables
  --help, -h         Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json) json=true ;;
    --require-tasks) require_tasks=true ;;
    --include-tasks) include_tasks=true ;;
    --paths-only) paths_only=true ;;
    --help|-h) usage; exit 0 ;;
    *) printf 'Unknown option: %s\n' "$1" >&2; usage >&2; exit 1 ;;
  esac
  shift
done

get_feature_paths_env

if ! test_feature_branch "$CURRENT_BRANCH" "$HAS_GIT"; then
  exit 1
fi

if [[ "$paths_only" == "true" ]]; then
  if [[ "$json" == "true" ]]; then
    python3 - <<PY
import json
print(json.dumps({
    'REPO_ROOT': '$REPO_ROOT',
    'BRANCH': '$CURRENT_BRANCH',
    'FEATURE_DIR': '$FEATURE_DIR',
    'FEATURE_SPEC': '$FEATURE_SPEC',
    'IMPL_PLAN': '$IMPL_PLAN',
    'TASKS': '$TASKS',
}, separators=(',', ':')))
PY
  else
    printf 'REPO_ROOT: %s\n' "$REPO_ROOT"
    printf 'BRANCH: %s\n' "$CURRENT_BRANCH"
    printf 'FEATURE_DIR: %s\n' "$FEATURE_DIR"
    printf 'FEATURE_SPEC: %s\n' "$FEATURE_SPEC"
    printf 'IMPL_PLAN: %s\n' "$IMPL_PLAN"
    printf 'TASKS: %s\n' "$TASKS"
  fi
  exit 0
fi

if [[ ! -d "$FEATURE_DIR" ]]; then
  printf 'ERROR: Feature directory not found: %s\n' "$FEATURE_DIR"
  printf 'Run /speckit.specify first to create the feature structure.\n'
  exit 1
fi

if [[ ! -f "$IMPL_PLAN" ]]; then
  printf 'ERROR: plan.md not found in %s\n' "$FEATURE_DIR"
  printf 'Run /speckit.plan first to create the implementation plan.\n'
  exit 1
fi

if [[ "$require_tasks" == "true" && ! -f "$TASKS" ]]; then
  printf 'ERROR: tasks.md not found in %s\n' "$FEATURE_DIR"
  printf 'Run /speckit.tasks first to create the task list.\n'
  exit 1
fi

docs=()
[[ -f "$RESEARCH" ]] && docs+=("research.md")
[[ -f "$DATA_MODEL" ]] && docs+=("data-model.md")
if [[ -d "$CONTRACTS_DIR" ]] && find "$CONTRACTS_DIR" -mindepth 1 -maxdepth 1 -type f | grep -q .; then
  docs+=("contracts/")
fi
[[ -f "$QUICKSTART" ]] && docs+=("quickstart.md")
[[ "$include_tasks" == "true" && -f "$TASKS" ]] && docs+=("tasks.md")

if [[ "$json" == "true" ]]; then
  DOCS_JSON="$(printf '%s\n' "${docs[@]}" | python3 -c 'import json,sys; print(json.dumps([line.rstrip("\n") for line in sys.stdin if line.rstrip("\n")]))')"
  python3 - <<PY
import json
print(json.dumps({'FEATURE_DIR': '$FEATURE_DIR', 'AVAILABLE_DOCS': $DOCS_JSON}, separators=(',', ':')))
PY
else
  printf 'FEATURE_DIR:%s\n' "$FEATURE_DIR"
  printf 'AVAILABLE_DOCS:\n'
  test_file_exists "$RESEARCH" 'research.md' >/dev/null || true
  test_file_exists "$DATA_MODEL" 'data-model.md' >/dev/null || true
  test_dir_has_files "$CONTRACTS_DIR" 'contracts/' >/dev/null || true
  test_file_exists "$QUICKSTART" 'quickstart.md' >/dev/null || true
  if [[ "$include_tasks" == "true" ]]; then
    test_file_exists "$TASKS" 'tasks.md' >/dev/null || true
  fi
fi