#!/usr/bin/env bash
# Check runner — orchestrates atomic checks from law.json
# Reads the checks array and dispatches each to core/checkers/<type>.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

CHECKERS_DIR="$SCRIPT_DIR/checkers"

# Usage: run_checks <law_name> <hook_type> [hook_args...]
# Returns: 0 if no block-level failures, 1 if any block check fails
# Output: per-check results as JSONL
run_checks() {
    local law_name="$1"
    local hook_type="$2"
    shift 2

    local law_json="$LAWS_DIR/$law_name/law.json"

    if [[ ! -f "$law_json" ]]; then
        log_error "law.json not found for law: $law_name"
        return 2
    fi

    local checks_json
    checks_json=$(jq -c '.checks // []' "$law_json" 2>/dev/null)

    if [[ "$checks_json" == "[]" || -z "$checks_json" ]]; then
        log_debug "No checks defined for law: $law_name"
        return 0
    fi

    local check_count
    check_count=$(echo "$checks_json" | jq 'length')
    local block_failures=0
    local warn_failures=0
    local passes=0
    local -a results=()

    for ((i=0; i<check_count; i++)); do
        local check_id check_type check_config check_severity check_message
        check_id=$(echo "$checks_json" | jq -r ".[$i].id // \"check-$i\"")
        check_type=$(echo "$checks_json" | jq -r ".[$i].type // empty")
        check_config=$(echo "$checks_json" | jq -c ".[$i].config // {}")
        check_severity=$(echo "$checks_json" | jq -r ".[$i].severity // \"warn\"")
        check_message=$(echo "$checks_json" | jq -r ".[$i].message // \"\"")

        # Find the checker script
        local checker_script="$CHECKERS_DIR/${check_type}.sh"

        if [[ ! -f "$checker_script" ]]; then
            log_warn "Checker not found: $check_type (check: $check_id)"
            results+=("{\"check_id\":\"$check_id\",\"type\":\"$check_type\",\"status\":\"SKIP\",\"reason\":\"checker-not-found\"}")
            continue
        fi

        # Source and run the checker
        source "$checker_script"
        local check_result
        check_result=$(check_"$check_type" "$hook_type" "$check_config" "$@" 2>/dev/null)
        local check_exit=$?

        local status
        if [[ "$check_result" == PASS* ]]; then
            status="PASS"
            ((passes++))
        elif [[ "$check_result" == FAIL* ]]; then
            status="FAIL"
            if [[ "$check_severity" == "block" ]]; then
                ((block_failures++))
            else
                ((warn_failures++))
            fi
        else
            status="SKIP"
        fi

        local fail_detail=""
        if [[ "$status" == "FAIL" ]]; then
            fail_detail="${check_result#FAIL:}"
        fi

        results+=("{\"check_id\":\"$check_id\",\"type\":\"$check_type\",\"severity\":\"$check_severity\",\"status\":\"$status\",\"detail\":\"${fail_detail}\",\"message\":\"$check_message\"}")

        log_debug "Check $check_id ($check_type): $status (severity: $check_severity)"
    done

    # Output all results
    for result in "${results[@]}"; do
        echo "$result"
    done

    log_debug "Checks complete for $law_name: passes=$passes, blocks=$block_failures, warns=$warn_failures" >&2

    if [[ $block_failures -gt 0 ]]; then
        return 1
    fi
    return 0
}

# Usage: get_overall_severity <law_name>
# Returns the highest severity across all checks
get_overall_severity() {
    local law_name="$1"
    local law_json="$LAWS_DIR/$law_name/law.json"

    if [[ ! -f "$law_json" ]]; then
        echo "warn"
        return
    fi

    local checks_json
    checks_json=$(jq -c '.checks // []' "$law_json" 2>/dev/null)

    if [[ "$checks_json" == "[]" || -z "$checks_json" ]]; then
        jq -r '.severity // "warn"' "$law_json"
        return
    fi

    # If any check is block, overall is block
    local has_block
    has_block=$(echo "$checks_json" | jq '[.[] | select(.severity == "block")] | length')
    if [[ "$has_block" -gt 0 ]]; then
        echo "block"
        return
    fi

    local has_warn
    has_warn=$(echo "$checks_json" | jq '[.[] | select(.severity == "warn")] | length')
    if [[ "$has_warn" -gt 0 ]]; then
        echo "warn"
        return
    fi

    echo "log"
}
