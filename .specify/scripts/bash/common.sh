#!/usr/bin/env bash

set -euo pipefail

find_specify_root() {
  local current="${1:-$PWD}"
  current="$(cd "$current" 2>/dev/null && pwd -P)" || return 1

  while [[ "$current" != "/" ]]; do
    if [[ -d "$current/.specify" ]]; then
      printf '%s\n' "$current"
      return 0
    fi
    current="$(dirname "$current")"
  done
  return 1
}

get_repo_root() {
  local root
  if root="$(find_specify_root "$PWD" 2>/dev/null)"; then
    printf '%s\n' "$root"
    return 0
  fi

  if command -v git >/dev/null 2>&1 && root="$(git rev-parse --show-toplevel 2>/dev/null)"; then
    printf '%s\n' "$root"
    return 0
  fi

  cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd -P
}

has_git() {
  local repo_root="$1"
  command -v git >/dev/null 2>&1 && [[ -e "$repo_root/.git" ]] && git -C "$repo_root" rev-parse --is-inside-work-tree >/dev/null 2>&1
}

get_spec_kit_effective_branch_name() {
  local branch="$1"
  if [[ "$branch" =~ ^([^/]+)/([^/]+)$ ]]; then
    printf '%s\n' "${BASH_REMATCH[2]}"
  else
    printf '%s\n' "$branch"
  fi
}

get_current_branch() {
  local repo_root="$1"
  if [[ -n "${SPECIFY_FEATURE:-}" ]]; then
    printf '%s\n' "$SPECIFY_FEATURE"
    return 0
  fi

  if has_git "$repo_root"; then
    git -C "$repo_root" rev-parse --abbrev-ref HEAD 2>/dev/null && return 0
  fi

  local specs_dir="$repo_root/specs"
  local latest_feature=""
  local highest=0
  local latest_timestamp=""
  local name prefix num

  if [[ -d "$specs_dir" ]]; then
    while IFS= read -r name; do
      name="$(basename "$name")"
      if [[ "$name" =~ ^([0-9]{8}-[0-9]{6})- ]]; then
        prefix="${BASH_REMATCH[1]}"
        if [[ "$prefix" > "$latest_timestamp" ]]; then
          latest_timestamp="$prefix"
          latest_feature="$name"
        fi
      elif [[ "$name" =~ ^([0-9]{3,})- ]]; then
        num="${BASH_REMATCH[1]}"
        if ((10#$num > highest)); then
          highest=$((10#$num))
          if [[ -z "$latest_timestamp" ]]; then
            latest_feature="$name"
          fi
        fi
      fi
    done < <(find "$specs_dir" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort)
  fi

  printf '%s\n' "${latest_feature:-main}"
}

test_feature_branch() {
  local branch="$1"
  local git_available="${2:-true}"
  if [[ "$git_available" != "true" ]]; then
    printf '[specify] Warning: Git repository not detected; skipped branch validation\n' >&2
    return 0
  fi

  local raw="$branch"
  branch="$(get_spec_kit_effective_branch_name "$raw")"

  local malformed=false
  if [[ "$branch" =~ ^[0-9]{7}-[0-9]{6}- ]] || [[ "$branch" =~ ^([0-9]{7}|[0-9]{8})-[0-9]{6}$ ]]; then
    malformed=true
  fi

  if ! { [[ "$branch" =~ ^[0-9]{3,}- ]] && [[ "$malformed" == "false" ]]; } && ! [[ "$branch" =~ ^[0-9]{8}-[0-9]{6}- ]]; then
    printf 'ERROR: Not on a feature branch. Current branch: %s\n' "$raw" >&2
    printf 'Feature branches should be named like: 001-feature-name, 1234-feature-name, or 20260319-143022-feature-name\n' >&2
    return 1
  fi
}

feature_json_matches_feature_dir() {
  local repo_root="$1"
  local active_feature_dir="$2"
  local feature_json="$repo_root/.specify/feature.json"
  [[ -f "$feature_json" ]] || return 1

  local pinned
  pinned="$(python3 - "$feature_json" <<'PY'
import json
import pathlib
import sys
try:
    data = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))
    print(data.get('feature_directory') or '')
except Exception:
    sys.exit(1)
PY
)" || return 1
  [[ -n "$pinned" ]] || return 1
  [[ "$pinned" = /* ]] || pinned="$repo_root/$pinned"
  [[ -d "$pinned" ]] || return 1

  [[ "$(cd "$pinned" && pwd -P)" == "$(cd "$active_feature_dir" && pwd -P)" ]]
}

find_feature_dir_by_prefix() {
  local repo_root="$1"
  local branch="$2"
  local specs_dir="$repo_root/specs"
  local branch_name prefix
  branch_name="$(get_spec_kit_effective_branch_name "$branch")"

  if [[ "$branch_name" =~ ^([0-9]{8}-[0-9]{6})- ]]; then
    prefix="${BASH_REMATCH[1]}"
  elif [[ "$branch_name" =~ ^([0-9]{3,})- ]]; then
    prefix="${BASH_REMATCH[1]}"
  else
    printf '%s\n' "$specs_dir/$branch_name"
    return 0
  fi

  local matches=()
  if [[ -d "$specs_dir" ]]; then
    while IFS= read -r match; do
      matches+=("$match")
    done < <(find "$specs_dir" -mindepth 1 -maxdepth 1 -type d -name "$prefix-*" 2>/dev/null | sort)
  fi

  case "${#matches[@]}" in
    0) printf '%s\n' "$specs_dir/$branch_name" ;;
    1) printf '%s\n' "${matches[0]}" ;;
    *)
      printf "ERROR: Multiple spec directories found with prefix '%s'\n" "$prefix" >&2
      return 1
      ;;
  esac
}

get_feature_paths_env() {
  local repo_root current_branch git_available feature_dir feature_json pinned
  repo_root="$(get_repo_root)"
  current_branch="$(get_current_branch "$repo_root")"
  if has_git "$repo_root"; then git_available=true; else git_available=false; fi

  feature_json="$repo_root/.specify/feature.json"
  if [[ -n "${SPECIFY_FEATURE_DIRECTORY:-}" ]]; then
    feature_dir="$SPECIFY_FEATURE_DIRECTORY"
    [[ "$feature_dir" = /* ]] || feature_dir="$repo_root/$feature_dir"
  elif [[ -f "$feature_json" ]]; then
    pinned="$(python3 - "$feature_json" <<'PY'
import json
import pathlib
import sys
data = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))
print(data.get('feature_directory') or '')
PY
)"
    if [[ -n "$pinned" ]]; then
      feature_dir="$pinned"
      [[ "$feature_dir" = /* ]] || feature_dir="$repo_root/$feature_dir"
    else
      feature_dir="$(find_feature_dir_by_prefix "$repo_root" "$current_branch")"
    fi
  else
    feature_dir="$(find_feature_dir_by_prefix "$repo_root" "$current_branch")"
  fi

  REPO_ROOT="$repo_root"
  CURRENT_BRANCH="$current_branch"
  HAS_GIT="$git_available"
  FEATURE_DIR="$feature_dir"
  FEATURE_SPEC="$feature_dir/spec.md"
  IMPL_PLAN="$feature_dir/plan.md"
  TASKS="$feature_dir/tasks.md"
  RESEARCH="$feature_dir/research.md"
  DATA_MODEL="$feature_dir/data-model.md"
  QUICKSTART="$feature_dir/quickstart.md"
  CONTRACTS_DIR="$feature_dir/contracts"
}

test_file_exists() {
  local path="$1"
  local description="$2"
  if [[ -f "$path" ]]; then
    printf '  OK %s\n' "$description"
    return 0
  fi
  printf '  MISSING %s\n' "$description"
  return 1
}

test_dir_has_files() {
  local path="$1"
  local description="$2"
  if [[ -d "$path" ]] && find "$path" -mindepth 1 -maxdepth 1 -type f | grep -q .; then
    printf '  OK %s\n' "$description"
    return 0
  fi
  printf '  MISSING %s\n' "$description"
  return 1
}

resolve_template() {
  local template_name="$1"
  local repo_root="$2"
  local candidate

  for candidate in \
    "$repo_root/.specify/templates/overrides/$template_name.md" \
    "$repo_root/.specify/templates/$template_name.md"; do
    if [[ -f "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}