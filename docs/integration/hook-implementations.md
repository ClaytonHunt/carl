# Key Hook Implementations

## Context Injection Hook
- **Purpose**: Inject active work context for CARL commands only
- **Issue Resolved**: Date hallucination - Claude Code gets explicit current date to prevent confusion
- **Token Efficiency**: Stays under 100 tokens for performance
- **Key Implementation**:
  ```bash
  # Read active work (minimal parsing)
  active_work=$(grep -oP '(?<=id: ).*' "${CLAUDE_PROJECT_DIR}/.carl/project/active.work.carl" | head -1)
  active_completion=$(grep -oP '(?<=completion: )\d+' "${CLAUDE_PROJECT_DIR}/.carl/project/active.work.carl" | head -1)
  
  # Get current date info for Claude Code (prevents hallucination)
  current_date=$(date +%Y-%m-%d)
  current_week=$(date +%Y-%V)
  yesterday=$(date -d "yesterday" +%Y-%m-%d)
  
  # Inject minimal context (stays under 100 tokens)
  cat <<EOF
  <carl-context>
  Active Work: ${active_work} (${active_completion}% complete)
  Current Date: ${current_date}
  Yesterday: ${yesterday}
  Current Week: ${current_week}
  Session File: session-${current_date}-$(git config user.name).carl
  </carl-context>
  EOF
  ```
- **Context Strategy**: Strategic context (vision.carl, roadmap.carl) loaded by commands, not hooks
- **Targeted Context**: Specific scope files loaded by commands based on arguments

## Technical Debt Extraction Hook
- **Purpose**: Automatically track TODO/FIXME/HACK comments during edits
- **Issue Resolved**: Manual tech debt tracking - captures debt markers automatically
- **Key Implementation**:
  ```bash
  # Extract from Write/Edit/MultiEdit tools only
  if [[ "$TOOL_NAME" =~ ^(Write|Edit|MultiEdit)$ ]]; then
    file_path="${TOOL_INPUT_file_path}"
    grep -n "TODO\\|FIXME\\|HACK" "$file_path" | while read -r line; do
      echo "$(date +%Y-%m-%d)|$file_path|$line" >> ".carl/project/tech-debt.carl"
    done
  fi
  ```

## Cross-Platform Notification Hook
- **Purpose**: Audio alerts when Claude Code needs attention
- **Issue Resolved**: Platform compatibility - works on macOS, Linux, Windows
- **Key Implementation**:
  ```bash
  #!/bin/bash
  project_name=$(basename "${CLAUDE_PROJECT_DIR}")
  message="${project_name} needs your attention"
  
  case "$(uname -s)" in
    Darwin*) say -v "Samantha" "${message}" & ;;
    Linux*) 
      if command -v spd-say >/dev/null; then
        spd-say "${message}" &
      elif command -v espeak >/dev/null; then
        espeak "${message}" &
      fi ;;
    MINGW*|CYGWIN*|MSYS*)
      powershell.exe -Command "Add-Type -AssemblyName System.Speech; \
      \$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; \
      \$speak.Speak('${message}')" & ;;
  esac
  ```

## Session Management Hook (SessionStart)
- **Purpose**: Daily session initialization and progressive compaction
- **Issue Resolved**: Session file explosion and manual cleanup burden
- **Key Implementation**:
  ```bash
  user=$(git config user.name)
  current_date=$(date +%Y-%m-%d)
  session_file=".carl/sessions/session-${current_date}-${user}.carl"
  
  # Create daily session if not exists
  if [[ ! -f "$session_file" ]]; then
    cat > "$session_file" <<EOF
  developer: "${user}"
  date: "${current_date}"  
  session_summary:
    start_time: "$(date +%H:%M:%S)Z"
  work_periods: []
  EOF
  fi
  
  # Progressive compaction (daily → weekly → monthly → quarterly → yearly)
  find .carl/sessions -name "session-*-${user}.carl" -mtime +7 | while read daily; do
    week=$(date -d "@$(stat -c %Y "$daily")" +%Y-%V)
    mkdir -p .carl/sessions/archive
    cat "$daily" >> ".carl/sessions/archive/week-${week}-${user}.carl"
    rm "$daily"
  done
  ```

## PostToolUse Hook Chain (Multiple focused scripts executed in sequence)

### 1. Schema Validation Hook (`schema-validate.sh`)
- **Purpose**: Validate CARL files against schema definitions
- **Issue Resolved**: Ensures all CARL files maintain schema compliance
- **Key Implementation**:
  ```bash
  # Validate and process CARL files when modified
  if [[ "$TOOL_INPUT_file_path" =~ \.carl$ ]]; then
    carl_file="$TOOL_INPUT_file_path"
    
    # Schema validation first
    validation_error=""
    
    # Check required fields based on file type
    if [[ "$carl_file" =~ \.(epic|feature|story|tech)\.carl$ ]]; then
      # Validate required fields exist
      if ! grep -q "^id:" "$carl_file"; then
        validation_error="Missing required field: id"
      elif ! grep -q "^name:" "$carl_file"; then
        validation_error="Missing required field: name"
      elif ! grep -q "^completion_percentage:" "$carl_file"; then
        validation_error="Missing required field: completion_percentage"
      elif ! grep -q "^current_phase:" "$carl_file"; then
        validation_error="Missing required field: current_phase"
      elif ! grep -q "^acceptance_criteria:" "$carl_file"; then
        validation_error="Missing required field: acceptance_criteria"
      else
        # Validate field values
        completion=$(grep -oP '(?<=completion_percentage: )\d+' "$carl_file")
        if ! [[ "$completion" =~ ^[0-9]+$ ]] || [ "$completion" -gt 100 ]; then
          validation_error="Invalid completion_percentage: must be 0-100"
        fi
        
        phase=$(grep -oP '(?<=current_phase: ).*' "$carl_file")
        if ! [[ "$phase" =~ ^(planning|development|testing|integration|complete)$ ]]; then
          validation_error="Invalid current_phase: must be planning|development|testing|integration|complete"
        fi
      fi
    fi
    
    # If validation fails, send back to Claude Code for fixing
    if [[ -n "$validation_error" ]]; then
      echo "⚠️ CARL file validation failed: $validation_error"
      echo "📋 Schema validation error in $carl_file"
      echo "🔧 Please fix the file according to the CARL schema requirements:"
      echo ""
      echo "Required fields for $(basename "$carl_file" | cut -d'.' -f2) files:"
      echo "- id: snake_case_id"
      echo "- name: \"Human readable name\""
      echo "- completion_percentage: 0-100"
      echo "- current_phase: enum[planning|development|testing|integration|complete]"
      echo "- acceptance_criteria: [\"criteria1\", \"criteria2\", ...]"
      echo ""
      echo "Validation error: $validation_error"
      exit 1  # This will cause Claude Code to see the error and fix the file
    fi
    
    # If validation passes, proceed with completion processing
    completion=$(grep -oP '(?<=completion_percentage: )\d+' "$carl_file")
    
    # If 100% complete and TDD project, run tests
    if [[ "$completion" == "100" ]]; then
      process_file=".carl/project/process.carl"
      methodology=$(grep "methodology:" "$process_file" | cut -d'"' -f2)
      
      if [[ "$methodology" == "TDD" ]]; then
        test_cmd=$(grep "test_command:" "$process_file" | cut -d'"' -f2)
        if ! eval "$test_cmd" >/dev/null 2>&1; then
          echo "❌ Tests failing - cannot mark work as complete"
          sed -i 's/completion_percentage: 100/completion_percentage: 95/' "$carl_file"
        else
          echo "✅ Schema validation passed, tests passing - moving to completed/"
          # Move to completed/ subdirectory
          completed_dir="$(dirname "$carl_file")/completed"
          mkdir -p "$completed_dir"
          mv "$carl_file" "$completed_dir/"
        fi
      else
        echo "✅ Schema validation passed - work item complete"
        # Move to completed/ subdirectory (non-TDD project)
        completed_dir="$(dirname "$carl_file")/completed"
        mkdir -p "$completed_dir"
        mv "$carl_file" "$completed_dir/"
      fi
    validation_error="Invalid current_phase: must be planning|development|testing|integration|complete"
  fi
fi

# If validation fails, exit with error (stops hook chain)
if [[ -n "$validation_error" ]]; then
  echo "⚠️ CARL file validation failed: $validation_error"
  echo "📋 Schema file: .carl/schemas/${carl_file_type}.schema.yaml"
  exit 1
fi
```

### 2. Progress Tracking Hook (`progress-track.sh`)
- **Purpose**: Update completion status in session files
- **Issue Resolved**: Automatic progress tracking and session logging
- **Key Implementation**:
```bash
# Update session file with progress when CARL files modified
if [[ "$TOOL_INPUT_file_path" =~ \.carl$ ]]; then
  session_file=".carl/sessions/session-$(date +%Y-%m-%d)-$(git config user.name).carl"
  completion=$(grep -oP '(?<=completion_percentage: )\d+' "$TOOL_INPUT_file_path")
  
  # Log progress update to session
  echo "$(date +%H:%M:%S) - Progress update: $(basename "$TOOL_INPUT_file_path") → ${completion}%" >> "$session_file"
fi
```

### 3. Quality Gate Hook (`quality-gate.sh`)
- **Purpose**: Enforce TDD gates when completion reaches 100%
- **Issue Resolved**: Prevents marking work complete when tests fail
- **Key Implementation**:
```bash
# Only run for 100% complete CARL files in TDD projects
if [[ "$TOOL_INPUT_file_path" =~ \.carl$ ]]; then
  completion=$(grep -oP '(?<=completion_percentage: )\d+' "$TOOL_INPUT_file_path")
  
  if [[ "$completion" == "100" ]]; then
    methodology=$(grep "methodology:" ".carl/project/process.carl" | cut -d'"' -f2)
    
    if [[ "$methodology" == "TDD" ]]; then
      test_cmd=$(grep "test_command:" ".carl/project/process.carl" | cut -d'"' -f2)
      if ! eval "$test_cmd" >/dev/null 2>&1; then
        echo "❌ Tests failing - cannot mark work as complete"
        sed -i 's/completion_percentage: 100/completion_percentage: 95/' "$TOOL_INPUT_file_path"
        exit 1
      fi
    fi
  fi
fi
```

### 4. Completion Handler Hook (`completion-handler.sh`)
- **Purpose**: Move completed work items to completed/ subdirectory
- **Issue Resolved**: Automatic file organization when work items finish
- **Key Implementation**:
```bash
# Move 100% complete CARL files to completed/ subdirectory
if [[ "$TOOL_INPUT_file_path" =~ \.carl$ ]]; then
  completion=$(grep -oP '(?<=completion_percentage: )\d+' "$TOOL_INPUT_file_path")
  
  if [[ "$completion" == "100" ]]; then
    completed_dir="$(dirname "$TOOL_INPUT_file_path")/completed"
    mkdir -p "$completed_dir"
    mv "$TOOL_INPUT_file_path" "$completed_dir/"
    echo "✅ Work item moved to completed: $(basename "$TOOL_INPUT_file_path")"
  fi
fi
```

### 5. Tech Debt Extraction Hook (`tech-debt-extract.sh`)
- **Purpose**: Extract TODO/FIXME/HACK comments from edited files
- **Issue Resolved**: Automatic technical debt tracking
- **Key Implementation**:
```bash
# Extract technical debt markers from any edited file
if [[ "$TOOL_NAME" =~ ^(Write|Edit|MultiEdit)$ ]]; then
  file_path="${TOOL_INPUT_file_path}"
  grep -n "TODO\\|FIXME\\|HACK" "$file_path" | while read -r line; do
    echo "$(date +%Y-%m-%d)|$file_path|$line" >> ".carl/project/tech-debt.carl"
  done
fi
```