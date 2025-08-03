# Context Injection Strategy

## Token Budget Management
- **Hook Injection**: 100 tokens maximum (active work + date info only)
- **Command Context**: 500-1000 tokens (strategic files when needed)
- **Agent Context**: 2000+ tokens (deep analysis with full file access)

## Context Loading Hierarchy

### 1. Minimal Hook Context (Always - 100 tokens)
- Active work ID and completion percentage
- Current date, yesterday, current week (prevents hallucination)
- Session file reference
- Injected for all `/carl:*` commands via UserPromptSubmit hook

### 2. Strategic Context (Commands - 300-500 tokens)
- `vision.carl`, `roadmap.carl`, `process.carl` loaded by `/carl:plan` and `/carl:analyze`
- NOT injected by hooks (too large for every request)
- Commands read directly when planning or analysis needed

### 3. Targeted Context (Commands - 200-500 tokens)
- Specific scope files loaded based on command arguments
- `/carl:task user-auth.feature.carl` → loads that specific file + dependencies
- Parent/child relationships loaded intelligently

### 4. Deep Context (Agents - 1000+ tokens)
- Full CARL file analysis when agents are invoked
- Cross-reference validation and relationship mapping
- Complete project context for specialized analysis

## Context Selection Algorithm
```bash
# Priority order for context selection when token budget limited:
1. Active work item (always included)
2. Date/session info (prevents hallucination) 
3. Directly referenced files (command arguments)
4. Parent work items (hierarchical context)
5. Related dependencies (if tokens remain)
6. Strategic context (vision/roadmap if relevant)
```