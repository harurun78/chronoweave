#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
source "$SCRIPT_DIR/common.sh"

json=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --json) json=true ;;
    --help|-h)
      printf 'Usage: setup-plan.sh [--json] [--help]\n'
      exit 0
      ;;
    *) printf 'Unknown option: %s\n' "$1" >&2; exit 1 ;;
  esac
  shift
done

get_feature_paths_env

if ! feature_json_matches_feature_dir "$REPO_ROOT" "$FEATURE_DIR"; then
  test_feature_branch "$CURRENT_BRANCH" "$HAS_GIT"
fi

mkdir -p "$FEATURE_DIR"

if template="$(resolve_template 'plan-template' "$REPO_ROOT" 2>/dev/null)"; then
  cp "$template" "$IMPL_PLAN"
  printf 'Copied plan template to %s\n' "$IMPL_PLAN" >&2
else
  printf 'Warning: Plan template not found\n' >&2
  : > "$IMPL_PLAN"
fi

if [[ "$json" == "true" ]]; then
  python3 - <<PY
import json
print(json.dumps({
    'FEATURE_SPEC': '$FEATURE_SPEC',
    'IMPL_PLAN': '$IMPL_PLAN',
    'SPECS_DIR': '$FEATURE_DIR',
    'BRANCH': '$CURRENT_BRANCH',
    'HAS_GIT': $([[ "$HAS_GIT" == "true" ]] && echo True || echo False),
}, separators=(',', ':')))
PY
else
  printf 'FEATURE_SPEC: %s\n' "$FEATURE_SPEC"
  printf 'IMPL_PLAN: %s\n' "$IMPL_PLAN"
  printf 'SPECS_DIR: %s\n' "$FEATURE_DIR"
  printf 'BRANCH: %s\n' "$CURRENT_BRANCH"
  printf 'HAS_GIT: %s\n' "$HAS_GIT"
fi