# /carl:plan - Intelligent Planning

**Purpose**: Context-aware planning that adapts to scope and complexity

## Implementation Architecture

**Claude Code Slash Command**: `.claude/commands/plan.md`
- Handles interactive requirements gathering through natural conversation
- Conducts scope analysis and user validation
- Invokes `carl-requirements-analyst` agent with complete context
- Creates CARL files based on agent analysis

**Agent Integration**: Single-turn `carl-requirements-analyst` invocation
- Receives complete requirements context from command
- Performs scope classification and validation
- Generates schema-compliant CARL files
- Returns structured results for command processing

## Modes

- `/carl:plan [requirement description]`: Create single work item at determined scope level
- `/carl:plan --from [existing requirement]`: Break down existing work item to next level (Epic → Features, Feature → Stories)

## Auto-Scope Detection Algorithm

```
1. Interactive Requirements Gathering → Claude Code conducts natural conversation
2. Context Assembly → All requirements, constraints, and details collected
3. Agent Analysis → carl-requirements-analyst performs scope classification:
   - Epic Level: 3-6 months (architecture changes, major initiatives)
   - Feature Level: 2-4 weeks (user-facing capabilities) 
   - Story Level: 2-5 days (implementation tasks)
   - Technical Level: Variable timing (infrastructure/process work)
4. User Validation → Confirm scope and approach before file creation
5. CARL Generation → Agent creates schema-compliant files with relationships
```

## Planning Decision Flow

```
User Request → /carl:plan Command → Interactive Requirements Gathering
       ↓
Complete Context Assembly → carl-requirements-analyst Agent (Single Turn)
       ↓  
Scope Analysis & Validation → CARL File Generation → File Creation & Organization
```

## Detailed Implementation

### Phase 1: Interactive Requirements Gathering (Claude Code)
- **Natural Conversation**: Claude Code conducts requirements gathering directly
- **Progressive Context Building**: Each user response builds complete picture
- **Gap Identification**: Claude Code identifies missing information and asks follow-ups
- **Domain Expertise**: Create specialist agents for complex domains when needed

### Phase 2: Single-Turn Agent Analysis (carl-requirements-analyst)
- **Complete Context Processing**: Agent receives full requirements context
- **Scope Classification**: Maps complexity to appropriate scope level
- **Schema Validation**: Ensures all required fields and relationships
- **CARL Generation**: Creates properly structured files with dependencies

### Phase 3: File Creation & Organization (Claude Code)
- **Directory Management**: Creates proper `.carl/project/` structure
- **File Placement**: Organizes files in correct scope directories
- **Relationship Setup**: Establishes parent-child and dependency links
- **Next Steps**: Provides actionable recommendations for user

## Scope Breakdown Examples

- **Epic Breakdown**: `/carl:plan --from user-authentication.epic.carl` → `registration.feature.carl`, `login.feature.carl`, `password-reset.feature.carl`
- **Feature Breakdown**: `/carl:plan --from user-registration.feature.carl` → `email-validation.story.carl`, `password-strength.story.carl`, `user-profile-creation.story.carl`

## Next Step Recommendations

- **Further Breakdown Needed**: "Break down `user-authentication.epic.carl` using `/carl:plan --from user-authentication.epic.carl`"
- **Ready for Implementation**: "Start work on `email-validation.story.carl` using `/carl:task email-validation.story.carl`"
- **Dependencies First**: "Complete `database-schema.tech.carl` before starting user registration features"

## Claude Code Integration

### Slash Command Implementation
**File**: `.claude/commands/plan.md`
```markdown
# Plan Work Item

You are implementing the `/carl:plan` command for intelligent CARL work item planning.

## Process:
1. Conduct interactive requirements gathering through natural conversation
2. Build complete context including constraints, dependencies, acceptance criteria
3. When requirements are complete, invoke the carl-requirements-analyst agent
4. Create CARL files based on agent analysis and organize in proper directories
5. Provide next steps and breakdown recommendations

## Arguments:
- No args: Plan new work item from user description
- `--from [file]`: Break down existing work item to next scope level

Use the carl-requirements-analyst agent for final scope analysis and CARL generation.
```

### Agent Integration
- **Single-Turn Analysis**: Agent receives complete requirements context
- **Token Efficiency**: No repeated agent calls with context rebuilding
- **Natural Flow**: Claude Code handles conversation, agent handles analysis
- **Specialist Creation**: Use `carl-agent-builder` for domain expertise when needed
- **Stateless Design**: Each planning session is independent and complete