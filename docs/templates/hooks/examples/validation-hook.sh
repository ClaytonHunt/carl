#!/bin/bash
# Complete Validation Hook Script
#
# This script provides comprehensive validation for file operations,
# including security checks, policy enforcement, and quality standards.
#
# Usage: Called automatically via PreToolUse hooks
# Exit Codes:
#   0 - Validation passed
#   2 - Validation failed, block operation
#   1 - Warning, allow operation to continue

set -euo pipefail

# === Configuration ===

# Sensitive file patterns to block
SENSITIVE_PATTERNS=(
  ".env"
  ".env.local"
  ".env.production"
  ".env.staging"
  ".git/config"
  ".git/hooks"
  "id_rsa"
  "id_ed25519"
  "id_ecdsa"
  ".pem"
  ".key"
  ".p12"
  ".pfx"
  "credentials.json"
  "secrets.yaml"
  "secrets.json"
  ".password"
  "private.key"
  "service-account"
  ".kube/config"
  ".aws/credentials"
  ".ssh/config"
)

# Dangerous bash command patterns to block
DANGEROUS_COMMANDS=(
  "rm -rf /"
  "rm -rf /*"
  "dd if=/dev/zero"
  "mkfs"
  ":(){ :|:& };:"  # Fork bomb
  "chmod -R 777"
  "> /dev/sda"
  "mv /* /dev/null"
  "wget * | sh"
  "curl * | bash"
)

# Privilege escalation commands to block
PRIVILEGE_ESCALATION=(
  "sudo rm"
  "sudo dd"
  "sudo chmod"
  "sudo chown"
  "su -c"
  "pkexec"
)

# === Read and Parse Input ===

INPUT=$(cat)

# Extract common fields
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')
HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // "unknown"')

# === Validation Functions ===

# Validate file write operations
validate_file_write() {
  local file_path=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
  local content=$(echo "$INPUT" | jq -r '.tool_input.content // empty')

  # Skip if no file path
  [[ -z "$file_path" ]] && return 0

  # 1. Check for path traversal
  if [[ "$file_path" == *".."* ]]; then
    echo "BLOCKED: Path traversal attempt detected" >&2
    echo "File path contains '..' which could escape project directory" >&2
    echo "Path: $file_path" >&2
    return 2
  fi

  # 2. Check for sensitive files
  for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    if [[ "$file_path" == *"$pattern"* ]]; then
      echo "BLOCKED: Attempting to modify sensitive file" >&2
      echo "Pattern: $pattern" >&2
      echo "Path: $file_path" >&2
      echo "This file type is protected by security policy." >&2
      return 2
    fi
  done

  # 3. Validate file is within project
  if [[ -n "${CLAUDE_PROJECT_DIR:-}" ]]; then
    local project_dir=$(realpath "$CLAUDE_PROJECT_DIR" 2>/dev/null || echo "$CLAUDE_PROJECT_DIR")
    local file_dir=$(dirname "$file_path")
    local real_file_dir=$(realpath "$file_dir" 2>/dev/null || echo "$file_dir")

    if [[ "$real_file_dir" != "$project_dir"* ]]; then
      echo "WARNING: File is outside project directory" >&2
      echo "Project: $project_dir" >&2
      echo "File: $real_file_dir" >&2
      return 1  # Warning, not blocking
    fi
  fi

  # 4. Check for overly large files
  if [[ -n "$content" ]]; then
    local content_size=${#content}
    local max_size=$((5 * 1024 * 1024))  # 5MB

    if [[ $content_size -gt $max_size ]]; then
      echo "WARNING: File content is very large (${content_size} bytes)" >&2
      echo "Consider breaking into smaller files or using external storage" >&2
      return 1
    fi
  fi

  # 5. Check for binary content
  if [[ -n "$content" ]] && echo "$content" | grep -q -P '[^\x00-\x7F]'; then
    echo "WARNING: File content appears to contain binary data" >&2
    return 1
  fi

  # 6. Validate file extension for known types
  local ext="${file_path##*.}"
  case "$ext" in
    js|jsx|ts|tsx|py|rb|go|rs|java|c|cpp|h|hpp|sh|bash)
      # Code files - could add linting checks here
      ;;
    json|yaml|yml|toml|xml)
      # Validate JSON/YAML structure if content provided
      if [[ -n "$content" ]] && [[ "$ext" == "json" ]]; then
        if ! echo "$content" | jq empty 2>/dev/null; then
          echo "WARNING: JSON file content is not valid JSON" >&2
          return 1
        fi
      fi
      ;;
    md|txt|rst)
      # Documentation - no special validation
      ;;
    exe|dll|so|dylib|bin)
      echo "BLOCKED: Binary executable files are not allowed" >&2
      echo "Path: $file_path" >&2
      return 2
      ;;
  esac

  # 7. Check for secrets in content
  if [[ -n "$content" ]]; then
    # Check for common secret patterns
    if echo "$content" | grep -qiE '(password|secret|api_key|apikey|access_key|private_key)\s*[:=]\s*["\x27][^"\x27]{8,}'; then
      echo "WARNING: Content may contain embedded secrets" >&2
      echo "Detected pattern matching password/key assignment" >&2
      echo "Please review before committing" >&2
      return 1
    fi

    # Check for AWS keys
    if echo "$content" | grep -qE 'AKIA[0-9A-Z]{16}'; then
      echo "BLOCKED: AWS access key detected in content" >&2
      echo "Remove credentials before proceeding" >&2
      return 2
    fi

    # Check for private keys
    if echo "$content" | grep -q "BEGIN.*PRIVATE KEY"; then
      echo "BLOCKED: Private key detected in content" >&2
      echo "Remove private key before proceeding" >&2
      return 2
    fi
  fi

  return 0
}

# Validate bash commands
validate_bash_command() {
  local command=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

  # Skip if no command
  [[ -z "$command" ]] && return 0

  # 1. Check for dangerous commands
  for pattern in "${DANGEROUS_COMMANDS[@]}"; do
    if [[ "$command" == *"$pattern"* ]]; then
      echo "BLOCKED: Dangerous command pattern detected" >&2
      echo "Pattern: $pattern" >&2
      echo "This command could cause data loss or system damage" >&2
      return 2
    fi
  done

  # 2. Check for privilege escalation
  for pattern in "${PRIVILEGE_ESCALATION[@]}"; do
    if [[ "$command" == *"$pattern"* ]]; then
      echo "BLOCKED: Privilege escalation attempt detected" >&2
      echo "Pattern: $pattern" >&2
      echo "Commands requiring elevated privileges are not allowed" >&2
      return 2
    fi
  done

  # 3. Check for command chaining with dangerous commands
  if [[ "$command" =~ (rm|dd|mkfs).*(\||;|&&).*$ ]]; then
    echo "WARNING: Command chaining with potentially dangerous operations" >&2
    return 1
  fi

  # 4. Check for unquoted variables (potential injection)
  if [[ "$command" =~ \$[A-Za-z_][A-Za-z0-9_]*[^\"\ ] ]]; then
    echo "WARNING: Unquoted variable expansion detected" >&2
    echo "This could lead to command injection vulnerabilities" >&2
    return 1
  fi

  # 5. Check for eval usage
  if [[ "$command" == *"eval"* ]]; then
    echo "WARNING: Use of 'eval' detected" >&2
    echo "eval can execute arbitrary code and should be avoided" >&2
    return 1
  fi

  return 0
}

# Validate web requests
validate_web_request() {
  local url=$(echo "$INPUT" | jq -r '.tool_input.url // empty')

  # Skip if no URL
  [[ -z "$url" ]] && return 0

  # 1. Block internal network access
  if [[ "$url" =~ (localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.) ]]; then
    echo "WARNING: Attempting to access internal network" >&2
    echo "URL: $url" >&2
    return 1
  fi

  # 2. Block file:// protocol
  if [[ "$url" == file://* ]]; then
    echo "BLOCKED: file:// protocol is not allowed" >&2
    echo "URL: $url" >&2
    return 2
  fi

  # 3. Require HTTPS for external APIs (warn only)
  if [[ "$url" == http://* ]] && [[ ! "$url" =~ localhost ]]; then
    echo "WARNING: Using unencrypted HTTP connection" >&2
    echo "Consider using HTTPS for security" >&2
    echo "URL: $url" >&2
    return 1
  fi

  return 0
}

# Validate notebook operations
validate_notebook() {
  local notebook_path=$(echo "$INPUT" | jq -r '.tool_input.notebook_path // empty')
  local new_source=$(echo "$INPUT" | jq -r '.tool_input.new_source // empty')

  # Skip if no notebook
  [[ -z "$notebook_path" ]] && return 0

  # 1. Validate notebook is .ipynb
  if [[ "$notebook_path" != *.ipynb ]]; then
    echo "WARNING: NotebookEdit called on non-.ipynb file" >&2
    echo "Path: $notebook_path" >&2
    return 1
  fi

  # 2. Check for dangerous code in cells
  if [[ -n "$new_source" ]]; then
    # Check for system commands
    if echo "$new_source" | grep -q "!rm -rf"; then
      echo "BLOCKED: Dangerous system command in notebook cell" >&2
      return 2
    fi

    # Check for secrets
    if echo "$new_source" | grep -qiE '(password|secret|api_key)\s*='; then
      echo "WARNING: Potential secret in notebook cell" >&2
      return 1
    fi
  fi

  return 0
}

# === Main Validation Logic ===

case "$TOOL_NAME" in
  Write|Edit)
    validate_file_write
    exit $?
    ;;

  Bash)
    validate_bash_command
    exit $?
    ;;

  WebFetch|WebSearch)
    validate_web_request
    exit $?
    ;;

  NotebookEdit)
    validate_notebook
    exit $?
    ;;

  *)
    # Unknown tool - allow by default
    echo "Validation passed for tool: $TOOL_NAME"
    exit 0
    ;;
esac

# === Optional: Advanced JSON Output ===

# Uncomment to use structured JSON output for fine-grained control
# cat <<EOF
# {
#   "continue": true,
#   "systemMessage": "Validation completed successfully",
#   "hookSpecificOutput": {
#     "hookEventName": "PreToolUse",
#     "permissionDecision": "allow",
#     "permissionDecisionReason": "All validation checks passed"
#   }
# }
# EOF

exit 0
