# Core Philosophy

CARL bridges the gap between human cognitive simplicity and AI context precision through a **dual-layer architecture**:

- **Human Layer**: Simple, memorable commands (`/carl:plan`, `/carl:task`, `/carl:analyze`, `/carl:status`)
- **AI Layer**: Rich, structured CARL files (`[name].epic.carl`, `[name].feature.carl`, `[name].story.carl`, `[name].tech.carl`) providing comprehensive context

## Fundamental Principles

### 1. **Context-First Development**
- Every development activity must have proper CARL context
- AI assistants receive comprehensive, structured context automatically
- No work begins without understanding requirements and current state

### 2. **Hierarchical Organization**
- **Epics** (3-6 months): Strategic initiatives with comprehensive architecture
- **Features** (2-4 weeks): User-facing capabilities with detailed specs
- **Stories** (2-5 days): Implementation tasks with acceptance criteria
- **Technical** (varies): Infrastructure, refactoring, process improvements

### 3. **Single-File System**
Every work item has one comprehensive file:
- **`[name].epic.carl`**, **`[name].feature.carl`**, **`[name].story.carl`**, or **`[name].tech.carl`** - Complete work item definition including:
  - Requirements and user stories (what needs to be built)
  - Progress and implementation status (what's been built)
  - Context and relationships (how it relates to other components)

### 4. **Requirements-Driven Workflow**
- **No implementation without scope files** (epic/feature/story/tech.carl)
- **No deployment without progress validation**
- **No integration without relationship mapping**

### 5. **Session Continuity**
- Daily session files per developer for manageable tracking
- Perfect handoff capabilities between developers and across days
- AI context preserved across interruptions
- Automatic cleanup with configurable retention periods
- Built-in support for daily standups, quarterly reviews, and yearly retrospectives