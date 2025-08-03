# /carl:plan - Intelligent Planning

**Purpose**: Context-aware planning that adapts to scope and complexity

## Modes

- `/carl:plan [requirement description]`: Create single work item at determined scope level
- `/carl:plan --from [existing requirement]`: Break down existing work item to next level (Epic → Features, Feature → Stories)

## Auto-Scope Detection Algorithm

```
1. Requirements Gathering → Complete understanding of request
2. Effort Estimation → AI estimates completion time/complexity
3. Scope Classification:
   - Epic Level: 3-6 months (architecture changes, major initiatives)
   - Feature Level: 2-4 weeks (user-facing capabilities) 
   - Story Level: 2-5 days (implementation tasks)
   - Technical Level: Variable timing (infrastructure/process work)
4. Validation → Confirm scope with user before file creation
```

## Planning Decision Flow

```
Planning Request → Context Loading → Requirements Gathering → Effort Estimation
       ↓
Agent Gap Detection → Create Missing Specialists → Specialist Consultation
       ↓  
Scope Classification → User Validation → CARL Generation → Breakdown (if needed)
```

## Detailed Algorithm

1. **Requirements Gathering**: Interactive questioning until complete understanding achieved
2. **Effort Estimation**: AI analyzes complexity, dependencies, technical challenges to estimate completion time
3. **Scope Classification**: Map estimate to scope level (3-6mo=Epic, 2-4wk=Feature, 2-5d=Story, Variable=Technical)
4. **User Validation**: Confirm scope level and approach before creating CARL files
5. **Agent Management**: Deploy specialists for domain expertise during requirements/estimation phases
6. **CARL Generation**: Create files with proper hierarchical relationships and dependencies

## Scope Breakdown Examples

- **Epic Breakdown**: `/carl:plan --from user-authentication.epic.carl` → `registration.feature.carl`, `login.feature.carl`, `password-reset.feature.carl`
- **Feature Breakdown**: `/carl:plan --from user-registration.feature.carl` → `email-validation.story.carl`, `password-strength.story.carl`, `user-profile-creation.story.carl`

## Next Step Recommendations

- **Further Breakdown Needed**: "Break down `user-authentication.epic.carl` using `/carl:plan --from user-authentication.epic.carl`"
- **Ready for Implementation**: "Start work on `email-validation.story.carl` using `/carl:task email-validation.story.carl`"
- **Dependencies First**: "Complete `database-schema.tech.carl` before starting user registration features"

## Agent Management

- **Gap Detection**: Automatically identifies missing domain expertise during planning
- **Dynamic Creation**: Uses `carl-agent-builder` to create specialized agents for research or analysis
- **Lifecycle Management**: Creates temporary agents for research, deletes unneeded definitions after planning decisions
- **Permanent vs Temporary**: Core project stack agents remain, evaluation-only agents are removed