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
log "Hook executed: $json_input"
log "Hook completed successfully"

# Call API to stop AI execution
log "Calling API to stop AI execution..."

# Make API call and capture response
response=$(curl -X POST "http://localhost:3000/api/projects/cmk5g3gyd0000qwrl3o13kyku/ai-status-stop" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}' \
  -s -w "\nHTTP_STATUS:%{http_code}")

# Extract HTTP status and response body
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
response_body=$(echo "$response" | sed '/HTTP_STATUS:/d')

log "API Response - Status: $http_status, Body: $response_body"
log "AI execution stop API called"
log "Hook execution cycle finished"

# Exit successfully without any stdout output
exit 0