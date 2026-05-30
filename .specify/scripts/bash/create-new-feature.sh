#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
source "$SCRIPT_DIR/common.sh"

json=false
allow_existing_branch=false
dry_run=false
short_name=""
number=0
timestamp=false
description_parts=()

usage() {
  cat <<'EOF'
Usage: create-new-feature.sh [OPTIONS] <feature description>

OPTIONS:
  --json                    Output in JSON format
  --dry-run                 Compute branch name and paths without creating anything
  --allow-existing-branch   Switch to existing branch instead of failing
  --short-name <name>       Provide a custom short name
  --number <n>              Specify branch number manually
  --timestamp               Use YYYYMMDD-HHMMSS prefix
  --help, -h                Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json) json=true ;;
    --dry-run) dry_run=true ;;
    --allow-existing-branch) allow_existing_branch=true ;;
    --short-name) short_name="${2:-}"; shift ;;
    --number) number="${2:-0}"; shift ;;
    --timestamp) timestamp=true ;;
    --help|-h) usage; exit 0 ;;
    *) description_parts+=("$1") ;;
  esac
  shift
done

feature_desc="${description_parts[*]:-}"
feature_desc="$(printf '%s' "$feature_desc" | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')"
if [[ -z "$feature_desc" ]]; then
  usage >&2
  exit 1
fi

clean_branch_name() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-+/-/g'
}

highest_number_from_specs() {
  local specs_dir="$1"
  local highest=0 name num
  [[ -d "$specs_dir" ]] || { printf '0\n'; return 0; }
  while IFS= read -r name; do
    name="$(basename "$name")"
    if [[ "$name" =~ ^([0-9]{3,})- ]] && ! [[ "$name" =~ ^[0-9]{8}-[0-9]{6}- ]]; then
      num="${BASH_REMATCH[1]}"
      ((10#$num > highest)) && highest=$((10#$num))
    fi
  done < <(find "$specs_dir" -mindepth 1 -maxdepth 1 -type d 2>/dev/null)
  printf '%s\n' "$highest"
}

highest_number_from_branches() {
  local highest=0 name num
  command -v git >/dev/null 2>&1 || { printf '0\n'; return 0; }
  while IFS= read -r name; do
    name="$(printf '%s' "$name" | sed -E 's/^\*?[[:space:]]+//; s#^remotes/[^/]+/##')"
    if [[ "$name" =~ ^([0-9]{3,})- ]] && ! [[ "$name" =~ ^[0-9]{8}-[0-9]{6}- ]]; then
      num="${BASH_REMATCH[1]}"
      ((10#$num > highest)) && highest=$((10#$num))
    fi
  done < <(git branch -a 2>/dev/null || true)
  printf '%s\n' "$highest"
}

branch_suffix_from_description() {
  local desc="$1"
  local cleaned words word kept=()
  cleaned="$(printf '%s' "$desc" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9 ]+/ /g')"
  read -r -a words <<< "$cleaned"
  for word in "${words[@]}"; do
    case "$word" in
      i|a|an|the|to|for|of|in|on|at|by|with|from|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|should|could|can|may|might|must|shall|this|that|these|those|my|your|our|their|want|need|add|get|set) continue ;;
    esac
    [[ ${#word} -ge 3 ]] && kept+=("$word")
    [[ ${#kept[@]} -ge 3 ]] && break
  done
  if [[ ${#kept[@]} -gt 0 ]]; then
    local IFS='-'
    printf '%s\n' "${kept[*]}"
  else
    clean_branch_name "$desc" | cut -d- -f1-3
  fi
}

repo_root="$(get_repo_root)"
specs_dir="$repo_root/specs"
if has_git "$repo_root"; then has_git_value=true; else has_git_value=false; fi

if [[ -n "$short_name" ]]; then
  branch_suffix="$(clean_branch_name "$short_name")"
else
  branch_suffix="$(branch_suffix_from_description "$feature_desc")"
fi

if [[ "$timestamp" == "true" ]]; then
  feature_num="$(date '+%Y%m%d-%H%M%S')"
else
  if [[ "$number" -eq 0 ]]; then
    highest_specs="$(highest_number_from_specs "$specs_dir")"
    highest_branches=0
    if [[ "$has_git_value" == "true" ]]; then
      highest_branches="$(highest_number_from_branches)"
    fi
    if ((highest_branches > highest_specs)); then
      number=$((highest_branches + 1))
    else
      number=$((highest_specs + 1))
    fi
  fi
  feature_num="$(printf '%03d' "$number")"
fi

branch_name="$feature_num-$branch_suffix"
if (( ${#branch_name} > 244 )); then
  max_suffix_length=$((244 - ${#feature_num} - 1))
  branch_suffix="${branch_suffix:0:$max_suffix_length}"
  branch_suffix="${branch_suffix%-}"
  branch_name="$feature_num-$branch_suffix"
fi

feature_dir="$specs_dir/$branch_name"
spec_file="$feature_dir/spec.md"

if [[ "$dry_run" != "true" ]]; then
  mkdir -p "$specs_dir"
  if [[ "$has_git_value" == "true" ]]; then
    if ! git -C "$repo_root" checkout -q -b "$branch_name" 2>/tmp/specify-branch-error; then
      if git -C "$repo_root" show-ref --verify --quiet "refs/heads/$branch_name"; then
        if [[ "$allow_existing_branch" == "true" ]]; then
          git -C "$repo_root" checkout -q "$branch_name"
        else
          printf "Error: Branch '%s' already exists.\n" "$branch_name" >&2
          exit 1
        fi
      else
        cat /tmp/specify-branch-error >&2
        exit 1
      fi
    fi
  else
    printf '[specify] Warning: Git repository not detected; skipped branch creation for %s\n' "$branch_name" >&2
  fi

  mkdir -p "$feature_dir"
  if [[ ! -f "$spec_file" ]]; then
    if template="$(resolve_template 'spec-template' "$repo_root" 2>/dev/null)"; then
      cp "$template" "$spec_file"
    else
      : > "$spec_file"
    fi
  fi
  export SPECIFY_FEATURE="$branch_name"
fi

if [[ "$json" == "true" ]]; then
  python3 - <<PY
import json
data = {'BRANCH_NAME': '$branch_name', 'SPEC_FILE': '$spec_file', 'FEATURE_NUM': '$feature_num', 'HAS_GIT': $([[ "$has_git_value" == "true" ]] && echo True || echo False)}
if '$dry_run' == 'true':
    data['DRY_RUN'] = True
print(json.dumps(data, separators=(',', ':')))
PY
else
  printf 'BRANCH_NAME: %s\n' "$branch_name"
  printf 'SPEC_FILE: %s\n' "$spec_file"
  printf 'FEATURE_NUM: %s\n' "$feature_num"
  printf 'HAS_GIT: %s\n' "$has_git_value"
  if [[ "$dry_run" != "true" ]]; then
    printf 'SPECIFY_FEATURE environment variable set to: %s\n' "$branch_name"
  fi
fi