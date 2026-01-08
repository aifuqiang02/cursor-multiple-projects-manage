#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# ///

import json
import sys
import re

DANGEROUS_COMMANDS = [
    r'rm\s+-rf\s+/',
    r'rm\s+-rf\s+\*',
    r'dd\s+if=.*of=/dev/',
    r'mkfs\.',
    r'fdisk\s+/dev/',
    r'parted\s+/dev/',
    r'format\s+[c-z]:',
    r'del\s+/[sqf]\s+\*',
    r'shutdown\s+',
    r'reboot\s+',
    r'init\s+[06]',
    r':(){ :|:& };:',
    r'chmod\s+777\s+/',
    r'chown\s+.*:.*\s+/',
    r'mv\s+/etc/',
    r'cp\s+.*\s+/etc/',
    r'\bkubectl\s+(?!get\b|describe\b|logs\b|explain\b|version\b|api-resources\b|api-versions\b|config\s+view\b|top\b|auth\s+can-i\b)',
    r'\bgit\s+(?!status\b|log\b|diff\b|show\b|blame\b|branch\b|remote\b|config\b|ls-files\b|ls-remote\b|reflog\b|shortlog\b|tag\b|for-each-ref\b|rev-parse\b|rev-list\b|describe\b|ls-tree\b|cat-file\b|check-ignore\b|help\b|version\b)',
    r'\bargocd\s+(?!app\s+get\b|app\s+list\b|get\b|list\b|logs\b|version\b|help\b|context\b|login\b|logout\b)',
]

def is_dangerous_command(command):
    """Check if command matches any dangerous patterns."""
    for pattern in DANGEROUS_COMMANDS:
        if re.search(pattern, command, re.IGNORECASE):
            return True
    return False

def is_dangerous_rm_command(command):
    """
    Comprehensive detection of dangerous rm commands.
    Matches various forms of rm -rf and similar destructive patterns.
    """
    # Normalize command by removing extra spaces and converting to lowercase
    normalized = ' '.join(command.lower().split())

    # Pattern 1: Standard rm -rf variations
    patterns = [
        r'\brm\s+.*-[a-z]*r[a-z]*f',  # rm -rf, rm -fr, rm -Rf, etc.
        r'\brm\s+.*-[a-z]*f[a-z]*r',  # rm -fr variations
        r'\brm\s+--recursive\s+--force',  # rm --recursive --force
        r'\brm\s+--force\s+--recursive',  # rm --force --recursive
        r'\brm\s+-r\s+.*-f',  # rm -r ... -f
        r'\brm\s+-f\s+.*-r',  # rm -f ... -r
    ]

    # Check for dangerous patterns
    for pattern in patterns:
        if re.search(pattern, normalized):
            return True

    # Pattern 2: Check for rm with recursive flag targeting dangerous paths
    dangerous_paths = [
        r'/',           # Root directory
        r'/\*',         # Root with wildcard
        r'~',           # Home directory
        r'~/',          # Home directory path
        r'\$HOME',      # Home environment variable
        r'\.\.',        # Parent directory references
        r'\*',          # Wildcards in general rm -rf context
        r'\.',          # Current directory
        r'\.\s*$',      # Current directory at end of command
    ]

    if re.search(r'\brm\s+.*-[a-z]*r', normalized):  # If rm has recursive flag
        for path in dangerous_paths:
            if re.search(path, normalized):
                return True

    return False

def main():
    try:
        # Read JSON input from stdin
        input_data = json.load(sys.stdin)

        # Extract command from Cursor's beforeShellExecution hook format
        command = input_data.get('command', '')

        # Check for dangerous commands
        if is_dangerous_command(command):
            response = {
                "continue": True,
                "permission": "deny",
                "userMessage": "⛔ Dangerous command blocked by security hook",
                "agentMessage": f"BLOCKED: Dangerous command detected: {command}"
            }
            print(json.dumps(response))
            sys.exit(0)

        # Additional check for rm -rf commands with comprehensive pattern matching
        if is_dangerous_rm_command(command):
            response = {
                "continue": True,
                "permission": "deny",
                "userMessage": "⛔ Dangerous rm command blocked by security hook",
                "agentMessage": "BLOCKED: Dangerous rm command detected and prevented"
            }
            print(json.dumps(response))
            sys.exit(0)

        # Allow command
        response = {
            "continue": True,
            "permission": "allow"
        }
        print(json.dumps(response))
        sys.exit(0)

    except json.JSONDecodeError:
        # Gracefully handle JSON decode errors - allow by default
        print(json.dumps({"continue": True, "permission": "allow"}))
        sys.exit(0)
    except Exception:
        # Handle any other errors gracefully - allow by default
        print(json.dumps({"continue": True, "permission": "allow"}))
        sys.exit(0)

if __name__ == '__main__':
    main()
