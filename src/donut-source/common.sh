#!/usr/bin/env bash
# Shared utilities for CHP law enforcement

declare -ga _CHP_TMPFILES=()

trap '_chp_cleanup' EXIT

_chp_cleanup() {
    rm -f "${_CHP_TMPFILES[@]}" 2>/dev/null
}

# Usage: mktemp_chp [template]
mktemp_chp() {
    local template="${1:-chp_tmp_XXXXXX}"
    local tmpfile=$(mktemp -t "$template")
    _CHP_TMPFILES+=("$tmpfile")
    echo "$tmpfile"
}

CHP_BASE="${CHP_BASE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

# When invoked inside a workspace that has its own docs/chp/laws/ (e.g. laws
# installed from the marketplace via `chp install`), prefer those over the
# toolkit's own laws. Falls through to the toolkit when there's no workspace
# laws dir, or when the user is sitting inside the toolkit checkout itself.
_chp_resolve_laws_dir() {
    local repo_root
    repo_root=$(git -C "$PWD" rev-parse --show-toplevel 2>/dev/null) || true
    if [ -n "$repo_root" ] && [ "$repo_root" != "$CHP_BASE" ] && [ -d "$repo_root/docs/chp/laws" ]; then
        echo "$repo_root/docs/chp/laws"
        return
    fi
    echo "$CHP_BASE/docs/chp/laws"
}
LAWS_DIR="${LAWS_DIR:-$(_chp_resolve_laws_dir)}"
GUIDANCE_DIR="${GUIDANCE_DIR:-$(dirname "$LAWS_DIR")}"

# Git hooks that require scope (have file context)
if [[ -z "${_CHP_GIT_HOOKS+x}" ]]; then
    readonly _CHP_GIT_HOOKS=("pre-commit" "pre-push" "post-commit" "commit-msg" "pre-rebase" "post-checkout" "post-merge" "post-rewrite" "applypatch-msg" "pre-applypatch" "post-applypatch" "update" "pre-auto-gc" "post-update")
fi

# Highlight tag style: bold white text on colored background
# Colors disabled when stdout is not a terminal (piped/Claude Code)
if [ -t 1 ] 2>/dev/null; then
    BG_RED='\033[41m\033[1m'
    BG_GREEN='\033[42m\033[1m'
    BG_ORANGE='\033[48;5;202m\033[1m'
    BG_YELLOW='\033[43m\033[1m'
    NC='\033[0m'
else
    BG_RED=''
    BG_GREEN=''
    BG_ORANGE=''
    BG_YELLOW=''
    NC=''
fi

log_info() {
    echo -e " ${BG_GREEN} INFO ${NC}  $1"
}

log_error() {
    echo -e " ${BG_RED} ERROR ${NC}  $1" >&2
}

log_warn() {
    echo -e " ${BG_ORANGE} WARN ${NC}  $1"
}

log_debug() {
    if [ "${CHP_DEBUG:-false}" = "true" ]; then
        echo -e " ${BG_YELLOW} DEBUG ${NC}  $1" >&2
    fi
}

# Validate a law name to prevent path traversal and injection
# Usage: validate_law_name <law_name>
# Returns: 0 if valid, 1 if invalid
# Output: error message to stderr if invalid
validate_law_name() {
    local law_name="$1"

    # Must not be empty
    if [[ -z "$law_name" ]]; then
        echo "Law name cannot be empty" >&2
        return 1
    fi

    # Must not contain path traversal
    if [[ "$law_name" =~ \.\. ]]; then
        echo "Law name cannot contain '..' (path traversal): '$law_name'" >&2
        return 1
    fi

    # Must not be an absolute path
    if [[ "$law_name" =~ ^/ ]]; then
        echo "Law name cannot be an absolute path: '$law_name'" >&2
        return 1
    fi

    # Must not contain path separators
    if [[ "$law_name" =~ [/\\] ]]; then
        echo "Law name cannot contain path separators: '$law_name'" >&2
        return 1
    fi

    # Must not contain shell metacharacters
    if [[ "$law_name" =~ [\;\&\|\$\`\'\"] ]]; then
        echo "Law name cannot contain shell metacharacters: '$law_name'" >&2
        return 1
    fi

    # Must not contain spaces or tabs
    if [[ "$law_name" =~ [\ \	] ]]; then
        echo "Law name cannot contain whitespace: '$law_name'" >&2
        return 1
    fi

    # Must not start with a dash (could be interpreted as option)
    if [[ "$law_name" =~ ^- ]]; then
        echo "Law name cannot start with a dash: '$law_name'" >&2
        return 1
    fi

    # Must be reasonable length (max 64 chars)
    if [[ ${#law_name} -gt 64 ]]; then
        echo "Law name too long (max 64 chars): '$law_name'" >&2
        return 1
    fi

    # Should only contain safe characters (alphanumeric, hyphen, underscore, dot)
    if [[ ! "$law_name" =~ ^[a-zA-Z0-9._-]+$ ]]; then
        echo "Law name must contain only alphanumeric, hyphen, underscore, or dot: '$law_name'" >&2
        return 1
    fi

    return 0
}

law_exists() {
    local law_name="$1"
    [ -d "$LAWS_DIR/$law_name" ]
}

get_law_meta() {
    local law_name="$1"
    local field="$2"
    local law_json="$LAWS_DIR/$law_name/law.json"

    [[ ! -f "$law_json" ]] && return 1
    jq -r "if has(\"$field\") then .$field else \"\" end" "$law_json" 2>/dev/null || return 1
}

# Outputs: "law_dir law_json guidance_md"
get_law_paths() {
    local law_name="$1"
    local law_dir="$LAWS_DIR/$law_name"
    echo "$law_dir" "$law_dir/law.json" "$law_dir/GUIDANCE.md"
}

list_laws() {
    for law_dir in "$LAWS_DIR"/*; do
        if [ -d "$law_dir" ]; then
            local name=$(basename "$law_dir")
            local severity=$(get_law_meta "$name" "severity")
            local failures=$(get_law_meta "$name" "failures")
            echo "$name | severity: $severity | failures: $failures"
        fi
    done
}

# Valid values for law fields
_CHP_VALID_SEVERITIES="error warn info"
_CHP_VALID_HOOKS="pre-commit pre-push post-commit commit-msg pre-tool post-tool pre-write post-response fix"
_CHP_VALID_CHECK_TYPES="pattern agent structural metric"
_CHP_VALID_CHECK_SEVERITIES="block warn log"
_CHP_VALID_AUTOFIX="never ask auto"

# Check if a hook type is a git hook (has file context)
# Usage: is_git_hook <hook_name>
# Returns: 0 if git hook, 1 otherwise
is_git_hook() {
    local hook_name="$1"
    for git_hook in "${_CHP_GIT_HOOKS[@]}"; do
        [[ "$hook_name" == "$git_hook" ]] && return 0
    done
    return 1
}

# Validate a law.json file against the CHP schema
# Usage: validate_law_json <law_json_path>
# Returns: 0 if valid, 1 if issues found
# Output: one issue per line to stderr
validate_law_json() {
    local law_json="$1"
    local -a issues=()

    # Must exist and be valid JSON
    if [[ ! -f "$law_json" ]]; then
        echo "law.json not found" >&2
        return 1
    fi

    if ! jq empty "$law_json" 2>/dev/null; then
        echo "invalid JSON" >&2
        return 1
    fi

    # Required fields
    local field
    for field in name severity hooks enabled; do
        local has
        has=$(jq -r "has(\"$field\")" "$law_json" 2>/dev/null)
        if [[ "$has" != "true" ]]; then
            issues+=("missing required field: $field")
        fi
    done

    # name: must be a non-empty string matching ^[a-z][a-z0-9-]{2,31}$
    local name_val
    name_val=$(jq -r '.name // empty' "$law_json" 2>/dev/null)
    if [[ -z "$name_val" ]]; then
        : # already caught by required check
    elif [[ ! "$name_val" =~ ^[a-z][a-z0-9-]{2,31}$ ]]; then
        issues+=("name must be 3-32 chars, lowercase letters/numbers/hyphens, start with letter: '$name_val'")
    fi

    # severity: must be one of the valid values
    local sev_val
    sev_val=$(jq -r '.severity // empty' "$law_json" 2>/dev/null)
    if [[ -n "$sev_val" ]]; then
        local sev_ok=false
        local v
        for v in $_CHP_VALID_SEVERITIES; do
            [[ "$sev_val" == "$v" ]] && sev_ok=true
        done
        if ! $sev_ok; then
            issues+=("severity must be one of: $_CHP_VALID_SEVERITIES (got: '$sev_val')")
        fi
    fi

    # hooks: must be a non-empty array of valid hook names
    local hooks_type
    hooks_type=$(jq -r '.hooks | type' "$law_json" 2>/dev/null)
    if [[ "$hooks_type" == "array" ]]; then
        local hook_count
        hook_count=$(jq '.hooks | length' "$law_json" 2>/dev/null)
        if [[ "$hook_count" -eq 0 ]]; then
            issues+=("hooks array must not be empty")
        fi
        local i
        for ((i=0; i<hook_count; i++)); do
            local hook_val
            hook_val=$(jq -r ".hooks[$i]" "$law_json" 2>/dev/null)
            local hook_ok=false
            for v in $_CHP_VALID_HOOKS; do
                [[ "$hook_val" == "$v" ]] && hook_ok=true
            done
            if ! $hook_ok && [[ -n "$hook_val" ]]; then
                issues+=("invalid hook: '$hook_val'")
            fi
        done
    elif [[ "$hooks_type" != "null" && -n "$hooks_type" ]]; then
        issues+=("hooks must be an array (got: $hooks_type)")
    fi

    # enabled: must be boolean
    local enabled_type
    enabled_type=$(jq -r '.enabled | type' "$law_json" 2>/dev/null)
    if [[ -n "$enabled_type" && "$enabled_type" != "boolean" && "$enabled_type" != "null" ]]; then
        issues+=("enabled must be a boolean (got: $enabled_type)")
    fi

    # include/exclude: required for git-hook laws
    local hooks_array
    hooks_array=$(jq -r '.hooks[] // empty' "$law_json" 2>/dev/null)

    local has_git_hook=false
    while IFS= read -r hook; do
        [[ -n "$hook" ]] && is_git_hook "$hook" && has_git_hook=true
    done <<< "$hooks_array"

    if $has_git_hook; then
        # Git-hook laws require include field
        local include_val
        include_val=$(jq -r '.include // empty' "$law_json" 2>/dev/null)
        local include_type
        include_type=$(jq -r '.include | type' "$law_json" 2>/dev/null)

        if [[ "$include_type" != "array" ]]; then
            issues+=("include must be an array (got: $include_type) - required for git-hook laws")
        elif [[ -z "$include_val" || "$include_val" == "null" ]]; then
            issues+=("include array is empty - git-hook laws must specify what files they apply to")
        else
            local include_count
            include_count=$(jq '.include | length' "$law_json" 2>/dev/null)
            if [[ "$include_count" -eq 0 ]]; then
                issues+=("include array is empty - git-hook laws must specify at least one pattern")
            fi
        fi
    fi

    # Validate exclude if present (optional field)
    local exclude_type
    exclude_type=$(jq -r '.exclude | type' "$law_json" 2>/dev/null)
    if [[ -n "$exclude_type" && "$exclude_type" != "array" && "$exclude_type" != "null" ]]; then
        issues+=("exclude must be an array (got: $exclude_type)")
    fi

    # checks: if present, must be an array with valid structure
    local checks_type
    checks_type=$(jq -r '.checks | type' "$law_json" 2>/dev/null)
    if [[ "$checks_type" == "array" ]]; then
        local check_count
        check_count=$(jq '.checks | length' "$law_json" 2>/dev/null)
        local i
        for ((i=0; i<check_count; i++)); do
            local prefix="checks[$i]"

            # Required check fields
            for field in id type config severity message; do
                local has
                has=$(jq -r ".checks[$i] | has(\"$field\")" "$law_json" 2>/dev/null)
                if [[ "$has" != "true" ]]; then
                    issues+=("$prefix: missing required field: $field")
                fi
            done

            # Check type must be valid
            local ctype
            ctype=$(jq -r ".checks[$i].type // empty" "$law_json" 2>/dev/null)
            if [[ -n "$ctype" ]]; then
                local ctype_ok=false
                for v in $_CHP_VALID_CHECK_TYPES; do
                    [[ "$ctype" == "$v" ]] && ctype_ok=true
                done
                if ! $ctype_ok; then
                    issues+=("$prefix: invalid type: '$ctype'")
                fi
            fi

            # Check severity must be valid
            local csev
            csev=$(jq -r ".checks[$i].severity // empty" "$law_json" 2>/dev/null)
            if [[ -n "$csev" ]]; then
                local csev_ok=false
                for v in $_CHP_VALID_CHECK_SEVERITIES; do
                    [[ "$csev" == "$v" ]] && csev_ok=true
                done
                if ! $csev_ok; then
                    issues+=("$prefix: invalid severity: '$csev'")
                fi
            fi

            # config must be an object
            local config_type
            config_type=$(jq -r ".checks[$i].config | type" "$law_json" 2>/dev/null)
            if [[ -n "$config_type" && "$config_type" != "object" && "$config_type" != "null" ]]; then
                issues+=("$prefix: config must be an object (got: $config_type)")
            fi

            # message must be a non-trivial string
            local msg
            msg=$(jq -r ".checks[$i].message // empty" "$law_json" 2>/dev/null)
            if [[ -n "$msg" && ${#msg} -lt 5 ]]; then
                issues+=("$prefix: message too short (minimum 5 chars)")
            fi
        done
    elif [[ -n "$checks_type" && "$checks_type" != "null" ]]; then
        issues+=("checks must be an array (got: $checks_type)")
    fi

    # Validate autoFix if present
    if ! validate_autofix_field "$law_json"; then
        return 1
    fi

    # Output issues
    if [[ ${#issues[@]} -gt 0 ]]; then
        printf '%s\n' "${issues[@]}" >&2
        return 1
    fi
    return 0
}

# Validate the autoFix field if present
# Usage: validate_autofix_field <law_json_path>
# Returns: 0 if valid, 1 if invalid
validate_autofix_field() {
    local law_json="$1"
    local autofix_val
    autofix_val=$(jq -r '.autoFix // "never"' "$law_json" 2>/dev/null)

    if [[ -n "$autofix_val" && "$autofix_val" != "null" ]]; then
        local autofix_ok=false
        for v in $_CHP_VALID_AUTOFIX; do
            [[ "$autofix_val" == "$v" ]] && autofix_ok=true
        done
        if ! $autofix_ok; then
            echo "autoFix must be one of: $_CHP_VALID_AUTOFIX (got: '$autofix_val')" >&2
            return 1
        fi
    fi
    return 0
}
