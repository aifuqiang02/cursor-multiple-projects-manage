#!/bin/bash

# Configuration
BLACKLIST_PATTERNS=("npm run" "npx tsx")

# Log function
log() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" >> "./cursor-hooks.log"
}

# Check if command is in blacklist
is_blacklisted_command() {
    local command="$1"

    # Normalize command (remove extra spaces)
    local normalized_cmd=$(echo "$command" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')

    # Check against configured blacklist patterns
    for pattern in "${BLACKLIST_PATTERNS[@]}"; do
        if [[ "$normalized_cmd" =~ ^$pattern[[:space:]] ]]; then
            log "Command matches blacklist pattern: $pattern"
            return 0  # true - command is blacklisted
        fi
    done

    return 1  # false - command is allowed
}

# Read JSON input from stdin
json_input=$(cat)

# Log to file (not stdout!)
log "BeforeShellExecution Hook executed: $json_input"

# Extract command from JSON input with better error handling
if command=$(echo "$json_input" | grep -o '"command":"[^"]*"' | sed 's/"command":"//' | sed 's/"$//' 2>/dev/null); then
    log "Checking command: $command"
else
    log "Failed to parse command from JSON input"
    # Return allow response for malformed JSON
    response='{
        "continue": true,
        "permission": "allow"
    }'
    echo "$response"
    exit 0
fi

# Check if command is blacklisted
if is_blacklisted_command "$command"; then
    log "Command blocked: $command"

    # Return deny response
    response='{
        "continue": true,
        "permission": "deny",
        "userMessage": "⛔ Command blocked by security hook",
        "agentMessage": "BLOCKED: Blacklisted command detected: '"$command"'"
    }'
    echo "$response"
    exit 0
else
    log "Command allowed: $command"

    # Return allow response
    response='{
        "continue": true,
        "permission": "allow"
    }'
    echo "$response"
    exit 0
fi
