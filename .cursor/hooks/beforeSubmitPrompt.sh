#!/bin/bash

# Log function
log() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" >> "./cursor-hooks.log"
}

# Read JSON input from stdin
json_input=$(cat)

# Log to file (not stdout!)
log "BeforeSubmitPrompt Hook executed: $json_input"

# Call API to start AI execution
log "Calling API to start AI execution..."

# Make API call and capture response
response=$(curl -X POST "http://110.42.111.221:1966/api/projects/cmk5g3gyd0000qwrl3o13kyku/ai-status-start" \
  -H "Content-Type: application/json" \
  -s -w "\nHTTP_STATUS:%{http_code}")

# Extract HTTP status and response body
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
response_body=$(echo "$response" | sed '/HTTP_STATUS:/d')

log "API Response - Status: $http_status, Body: $response_body"
log "AI execution start API called"
log "BeforeSubmitPrompt Hook execution cycle finished"

# Exit successfully without any stdout output
exit 0
