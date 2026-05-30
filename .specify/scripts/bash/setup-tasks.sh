#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
source "$SCRIPT_DIR/common.sh"

json=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --json) json=true ;;
    --help|-h) printf 'Usage: setup-tasks.sh [--json] [--help]\n'; exit 0 ;;
    *) printf 'Unknown option: %s\n' "$1" >&2; exit 1 ;;
  esac
  shift
done

get_feature_paths_env

if ! feature_json_matches_feature_dir "$REPO_ROOT" "$FEATURE_DIR"; then
  test_feature_branch "$CURRENT_BRANCH" "$HAS_GIT"
fi

if [[ ! -f "$IMPL_PLAN" ]]; then
  printf 'ERROR: plan.md not found in %s\n' "$FEATURE_DIR" >&2
  printf 'Run /speckit.plan first to create the implementation plan.\n' >&2
  exit 1
fi

if [[ ! -f "$FEATURE_SPEC" ]]; then
  printf 'ERROR: spec.md not found in %s\n' "$FEATURE_DIR" >&2
  printf 'Run /speckit.specify first to create the feature structure.\n' >&2
  exit 1
fi

docs=()
[[ -f "$RESEARCH" ]] && docs+=("research.md")
[[ -f "$DATA_MODEL" ]] && docs+=("data-model.md")
if [[ -d "$CONTRACTS_DIR" ]] && find "$CONTRACTS_DIR" -mindepth 1 -maxdepth 1 -type f | grep -q .; then
  docs+=("contracts/")
fi
[[ -f "$QUICKSTART" ]] && docs+=("quickstart.md")

if ! tasks_template="$(resolve_template 'tasks-template' "$REPO_ROOT" 2>/dev/null)"; then
  printf 'ERROR: Tasks template not found for repository root: %s\n' "$REPO_ROOT" >&2
  printf 'Template resolution order: overrides -> core.\n' >&2
  exit 1
fi

if [[ "$json" == "true" ]]; then
  DOCS_JSON="$(printf '%s\n' "${docs[@]}" | python3 -c 'import json,sys; print(json.dumps([line.rstrip("\n") for line in sys.stdin if line.rstrip("\n")]))')"
  python3 - <<PY
import json
print(json.dumps({'FEATURE_DIR': '$FEATURE_DIR', 'AVAILABLE_DOCS': $DOCS_JSON, 'TASKS_TEMPLATE': '$tasks_template'}, separators=(',', ':')))
PY
else
  printf 'FEATURE_DIR: %s\n' "$FEATURE_DIR"
  printf 'TASKS_TEMPLATE: %s\n' "$tasks_template"
  printf 'AVAILABLE_DOCS:\n'
  test_file_exists "$RESEARCH" 'research.md' >/dev/null || true
  test_file_exists "$DATA_MODEL" 'data-model.md' >/dev/null || true
  test_dir_has_files "$CONTRACTS_DIR" 'contracts/' >/dev/null || true
  test_file_exists "$QUICKSTART" 'quickstart.md' >/dev/null || true
fi