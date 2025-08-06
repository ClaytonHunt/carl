# Work Item Resolution Process

Flexible work item specification handling for task execution.

## Argument Processing Checklist

- [ ] **Parse Arguments**
  - [ ] Check for `--yolo` flag and extract if present
  - [ ] Extract work item path/name from remaining arguments
  - [ ] Handle missing arguments with clear usage guidance

- [ ] **File Resolution Strategy**
  - [ ] **Exact Path**: Use provided path if valid CARL file exists
  - [ ] **Name Search**: Search all scope directories for matching name
  - [ ] **Scope Detection**: Try extensions (.story.carl, .feature.carl, .tech.carl, .epic.carl)
  - [ ] **Fuzzy Matching**: Find closest match if exact name not found
  - [ ] **Error Handling**: Clear error if no matches found

## Resolution Examples

```bash
# Direct file path
/carl:task .carl/project/stories/user-login.story.carl

# Work item name (search for matching file)
/carl:task user-login.story
/carl:task user-login

# Auto-detect scope from name
/carl:task implement-authentication  # Find matching CARL file

# Yolo mode execution
/carl:task user-auth.epic.carl --yolo
/carl:task payment.feature.carl --yolo
```

## Search Algorithm

1. **Direct Path Check**: If argument contains `.carl`, verify file exists
2. **Name-Based Search**: Search in priority order:
   - `.carl/project/stories/[name].story.carl`
   - `.carl/project/features/[name].feature.carl`
   - `.carl/project/technical/[name].tech.carl`
   - `.carl/project/epics/[name].epic.carl`
3. **Fuzzy Matching**: Use `find` and `grep` for partial matches
4. **Error Reporting**: Provide suggestions if no exact match found