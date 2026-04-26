#!/usr/bin/env bash
# Central Hook Dispatcher - Routes hook events to registered laws

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"
source "$SCRIPT_DIR/hook-registry.sh"
source "$SCRIPT_DIR/verifier.sh"
source "$SCRIPT_DIR/check-runner.sh"
source "$SCRIPT_DIR/law-mutate.sh"
source "$SCRIPT_DIR/fix-trigger.sh"

if [ -f "$SCRIPT_DIR/tightener.sh" ]; then
    source "$SCRIPT_DIR/tightener.sh"
fi

get_hook_context() {
    local hook_type="$1"

    case "$hook_type" in
        pre-commit)
            echo "git diff --cached --name-only"
            ;;
        pre-push)
            if git rev-parse @{u} >/dev/null 2>&1; then
                echo "git diff --name-only HEAD @{u}"
            else
                echo "git diff --name-only HEAD^..HEAD"
            fi
            ;;
        commit-msg)
            echo ".git/COMMIT_EDITMSG"
            ;;
        pre-tool)
            echo "tool_context"
            ;;
        *)
            echo ""
            ;;
    esac
}

# Record failures per check from JSONL output, falling back to law-level
_record_check_failures() {
    local law_name="$1"
    local stdout="$2"

    local has_check_results=false
    if [[ -n "$stdout" ]]; then
        while IFS= read -r line; do
            local check_id status
            check_id=$(echo "$line" | jq -r '.check_id // empty' 2>/dev/null)
            status=$(echo "$line" | jq -r '.status // empty' 2>/dev/null)
            if [[ -n "$check_id" ]]; then
                has_check_results=true
                if [[ "$status" == "FAIL" ]]; then
                    record_failure "$law_name" "$check_id"
                fi
            fi
        done <<< "$stdout"
    fi

    if ! $has_check_results; then
        record_failure "$law_name"
    fi
}

# Run verify script with resource limits to prevent abuse
# Usage: _run_verify_with_limits <script> <args...>
# Returns: exit code from verify script, or 124 on timeout, 125 on other timeout errors
_run_verify_with_limits() {
    local verify_script="$1"
    shift
    local verify_args=("$@")

    # Configurable limits (can be overridden via env vars)
    local timeout_secs="${CHP_VERIFY_TIMEOUT:-30}"
    local max_mem="${CHP_VERIFY_MAX_MEM:-524288}"  # 512MB in KB
    local max_cpu="${CHP_VERIFY_MAX_CPU:-60}"       # 60 seconds
    local max_procs="${CHP_VERIFY_MAX_PROCS:-100}"   # max processes

    # macOS doesn't ship GNU `timeout` — fall back to `gtimeout` (coreutils)
    # or run without a wall-clock timeout when neither is present. ulimit -t
    # below still bounds CPU time as a backstop.
    local timeout_cmd=""
    if command -v timeout >/dev/null 2>&1; then
        timeout_cmd="timeout"
    elif command -v gtimeout >/dev/null 2>&1; then
        timeout_cmd="gtimeout"
    fi

    # Note: CHP_VERIFY_MAX_PROCS / max_procs is intentionally not applied via
    # ulimit -u. On macOS RLIMIT_NPROC counts all of the user's processes,
    # not just the subshell — setting it low makes the next fork fail. The
    # variable is kept defined above so the env contract stays stable.
    (
        ulimit -v "$max_mem" 2>/dev/null  # Virtual memory
        ulimit -t "$max_cpu" 2>/dev/null   # CPU time

        if [ -n "$timeout_cmd" ]; then
            "$timeout_cmd" "$timeout_secs" "$verify_script" "${verify_args[@]}"
        else
            "$verify_script" "${verify_args[@]}"
        fi
    )
    return $?
}

# Args: $1=hook_type, $@=hook_args
# Returns: 0=all passed, 1=blocking failure, 2=dispatcher error
dispatch_hook() {
    local hook_type="$1"
    shift
    local hook_args=("$@")

    if [ -z "$hook_type" ]; then
        log_error "Hook type is required"
        return 2
    fi

    log_debug "Dispatching hook: $hook_type"

    if ! is_hook_enabled "$hook_type"; then
        log_debug "Hook '$hook_type' is disabled, skipping"
        return 0
    fi

    # Discover laws: prefer registry, fall back to scanning law.json files
    local law_names=()

    local laws
    laws=$(get_hook_laws "$hook_type")
    if [ -n "$laws" ] && [ "$laws" != "[]" ]; then
        while IFS= read -r line; do
            law_names+=("$line")
        done < <(jq -r '.[]' <<<"$laws" | tr -d '\r')
    fi

    # If registry was empty/stale, discover from law.json files directly
    if [ ${#law_names[@]} -eq 0 ]; then
        for law_dir in "$LAWS_DIR"/*; do
            [ ! -d "$law_dir" ] && continue
            local discovered_name
            discovered_name=$(basename "$law_dir")
            # Validate law name before adding
            if ! validate_law_name "$discovered_name" 2>/dev/null; then
                log_warn "Skipping law with invalid name: $discovered_name"
                continue
            fi
            local law_json="$law_dir/law.json"
            [ ! -f "$law_json" ] && continue
            if jq -r '.hooks[]?' "$law_json" 2>/dev/null | tr -d '\r' | grep -qx "$hook_type"; then
                law_names+=("$discovered_name")
            fi
        done
    fi

    if [ ${#law_names[@]} -eq 0 ]; then
        log_debug "No laws found for hook '$hook_type'"
        return 0
    fi

    log_debug "Found ${#law_names[@]} law(s) registered for hook '$hook_type'"

    local passed=0
    local failed=0
    local -a passing_contexts=()

    for law_name in "${law_names[@]}"; do
        # Validate law name before using in paths
        if ! validate_law_name "$law_name"; then
            log_error "Skipping invalid law name: $law_name"
            continue
        fi

        local law_dir="$LAWS_DIR/$law_name"
        local law_json="$law_dir/law.json"
        local verify_script="$law_dir/verify.sh"

        log_debug "Processing law: $law_name"

        if [ ! -d "$law_dir" ]; then
            log_warn "Law directory not found: $law_dir"
            continue
        fi

        if [ ! -f "$law_json" ]; then
            log_warn "law.json not found for law: $law_name"
            continue
        fi

        local enabled
        enabled=$(jq -r 'if has("enabled") then .enabled else "true" end' "$law_json" 2>/dev/null)

        if [[ "$enabled" != "true" ]]; then
            log_debug "Law '$law_name' is disabled, skipping"
            continue
        fi

        # Validate law file consistency
        if ! validate_consistency "$law_name" 2>/dev/null; then
            log_warn "Law '$law_name' has inconsistent files — guidance may be stale"
        fi

        if ! check_law_scope "$law_json" "$hook_type"; then
            log_debug "Law '$law_name' has no affected files in scope, skipping"
            continue
        fi

        if [ ! -f "$verify_script" ]; then
            log_warn "verify.sh not found for law: $law_name"
            continue
        fi

        if [ ! -x "$verify_script" ]; then
            log_warn "verify.sh not executable for law: $law_name, attempting to execute anyway"
        fi

        log_debug "Running verify script for law: $law_name"
        local verify_exit=0
        local verify_stdout=""
        if [ -n "$CHP_TOOL_INPUT" ]; then
            verify_stdout=$(echo "$CHP_TOOL_INPUT" | _run_verify_with_limits "$verify_script" "$hook_type" "${hook_args[@]}" 2>&1)
            verify_exit=$?
        else
            verify_stdout=$(_run_verify_with_limits "$verify_script" "$hook_type" "${hook_args[@]}" 2>&1)
            verify_exit=$?
        fi

        # Handle timeout exit codes (124 = timeout, 125 = timeout error)
        if [ $verify_exit -eq 124 ]; then
            log_error "Law '$law_name' timed out after ${CHP_VERIFY_TIMEOUT:-30}s"
            verify_stdout="Verification timed out - possible infinite loop or excessive resource usage"
            verify_exit=1
        elif [ $verify_exit -eq 125 ]; then
            log_error "Law '$law_name' failed due to timeout command error"
            verify_exit=1
        fi
        # Output verify script stdout for visibility (non-pre-tool hooks)
        if [[ "$hook_type" != "pre-tool" && "$hook_type" != "pre-write" ]] && [ -n "$verify_stdout" ]; then
            echo "$verify_stdout" >&2
        fi
        if [ $verify_exit -eq 0 ]; then
            log_debug "Law '$law_name' passed"
            ((passed++))
            # Accumulate additionalContext from passing laws
            if [ -n "$verify_stdout" ] && [[ "$hook_type" == "pre-tool" ]]; then
                passing_contexts+=("$verify_stdout")
            fi
        else
            log_error "Law '$law_name' failed with exit code $verify_exit"
            ((failed++))

            # For pre-tool hooks, output only the block JSON and stop
            if [[ "$hook_type" == "pre-tool" || "$hook_type" == "pre-write" ]]; then
                echo "$verify_stdout"
                if command -v record_failure >/dev/null 2>&1; then
                    _record_check_failures "$law_name" "$verify_stdout" >&2
                fi
                return 1
            fi

            # Record failures for non-pre-tool hooks
            if command -v _record_check_failures >/dev/null 2>&1; then
                _record_check_failures "$law_name" "$verify_stdout"
            elif command -v record_failure >/dev/null 2>&1; then
                record_failure "$law_name"
            fi

            # Attempt auto-fix if configured
            if [[ -f "$SCRIPT_DIR/fix-trigger.sh" ]]; then
                source "$SCRIPT_DIR/fix-trigger.sh"
                if trigger_fix "$law_name" "$hook_type" "${hook_args[@]}"; then
                    # Fix was offered or attempted
                    log_debug "Fix flow completed for law: $law_name"
                fi
            fi
        fi
    done

    # For pre-tool hooks with no failures, output accumulated context
    if [[ "$hook_type" == "pre-tool" ]] && [ ${#passing_contexts[@]} -gt 0 ]; then
        printf '%s\n' "${passing_contexts[@]}"
    fi

    log_info "Hook '$hook_type' complete: passed: $passed, failed: $failed" >&2

    # Pre-tool and pre-write hooks always block on failure
    local should_block=false
    if [[ "$hook_type" == "pre-tool" || "$hook_type" == "pre-write" ]]; then
        should_block=true
    elif is_hook_blocking "$hook_type"; then
        should_block=true
    fi

    if $should_block && [ $failed -gt 0 ]; then
        log_error "Blocking hook '$hook_type' had $failed failure(s)"
        return 1
    fi

    return 0
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    if [ $# -lt 1 ]; then
        log_error "Usage: $0 <hook_type> [hook_args...]"
        exit 2
    fi

    dispatch_hook "$@"
    exit $?
fi
