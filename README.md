# CARL - Context-Aware Requirements Language

<div align="center">
  <h1>🎯 CARL</h1>
  <h3>Context-Aware Requirements Language</h3>
  <p><em>AI-Optimized Planning System for Claude Code</em></p>
  
  <img src="https://img.shields.io/badge/Claude%20Code-Ready-blue?style=for-the-badge" alt="Claude Code Ready">
  <img src="https://img.shields.io/badge/Cross--Platform-✓-green?style=for-the-badge" alt="Cross Platform">
  <img src="https://img.shields.io/badge/Carl%20Wheezer-Approved-purple?style=for-the-badge" alt="Carl Wheezer Approved">
</div>

## 🤖 What is CARL?

CARL (Context-Aware Requirements Language) is a revolutionary AI-optimized planning system designed specifically for Claude Code. Named after Carl Wheezer from Jimmy Neutron, CARL asks the right questions and provides perfect context to AI assistants, making development faster, smarter, and more enjoyable.

### 🎭 Meet Carl Wheezer - Your Development Mascot

Just like Carl Wheezer asks clarifying questions in the show, CARL ensures your AI assistant always has the perfect context for every development task. Complete with Carl's encouraging voice feedback system!

## ✨ Key Features

### 🧠 **Perfect AI Context**
- **Automatic Context Injection**: AI always knows your project state
- **Structured Requirements**: Machine-readable project documentation
- **Session Continuity**: Never lose context between development sessions

### 🎯 **Intelligent Planning**
- **Adaptive Scope Detection**: Automatically determines epic/feature/story level
- **Parallel Specialist Analysis**: 8 CARL-optimized AI agents analyze concurrently
- **Progressive Planning**: Right level of detail for each situation

### 🔄 **Seamless Integration**
- **Claude Code Hooks**: Automatic operation, no manual intervention
- **Cross-Platform**: Works on macOS, Linux, and Windows
- **Language Agnostic**: Supports any programming language or framework

### 🎵 **Carl Wheezer Audio System**
- **Character Voice Feedback**: Encouraging audio during development
- **TTS Fallback**: Works without audio files using character-like TTS
- **Configurable**: Quiet mode, quiet hours, volume control

## 🚀 Quick Start

### Installation

1. **Clone CARL repository:**
   ```bash
   git clone https://github.com/claytonhunt/carl.git
   cd carl
   ```

2. **Install in your project:**
   ```bash
   # Install in current directory
   ./install.sh
   
   # Install in specific project
   ./install.sh /path/to/your/project
   
   # Install globally for all projects
   ./install.sh --global
   ```

3. **Start using CARL:**
   ```bash
   cd your-project
   claude  # Start Claude Code
   /analyze  # Your first CARL command!
   ```

### First Steps

1. **Analyze Your Codebase:**
   ```
   /analyze
   ```
   CARL scans your project and generates comprehensive context files.

2. **Create Your First Plan:**
   ```
   /plan "Add user authentication system"
   ```
   CARL automatically determines scope and creates detailed planning documentation.

3. **Check Project Status:**
   ```
   /status
   ```
   Get AI-powered insights into project health and next steps.

## 📋 Core Commands

### `/analyze` - Codebase Analysis
Scans existing code and generates CARL files for perfect AI context.

**Use Cases:**
- Initial CARL adoption for existing projects
- Team synchronization after git pulls
- Periodic project health checks

**What it creates:**
- `.intent` files - Requirements and specifications
- `.state` files - Implementation progress tracking  
- `.context` files - System relationships and dependencies
- `index.carl` - Master AI reference file

### `/plan` - Intelligent Planning
Context-aware planning that adapts to your needs.

**Auto-detects scope:**
- **Epic Level** (3-6 months): Comprehensive architecture analysis
- **Feature Level** (2-4 weeks): Detailed user stories and technical specs
- **Story Level** (2-5 days): Task breakdown and implementation planning
- **Technical Initiative**: Refactoring and improvement focused

**Examples:**
```
/plan "Build customer analytics dashboard"    # Epic-level planning
/plan "Add password reset functionality"     # Feature-level planning  
/plan "Fix login validation bug"             # Story-level planning
```

### `/status` - Project Health
AI-powered progress monitoring with actionable insights.

**Provides:**
- Implementation progress across features
- Quality metrics and test coverage
- Technical debt identification
- Next priority recommendations

### `/task` - Context-Aware Execution
Execute development tasks with full CARL context integration.

**Features:**
- TDD-mandatory workflow (Red-Green-Refactor)
- Quality gates and validation
- Automatic progress tracking
- Specialist AI guidance

### `/settings` - Configuration Management
Configure CARL behavior and preferences.

**Audio Settings:**
```
/settings --audio-test          # Test audio system
/settings --quiet-mode on       # Enable quiet mode
/settings --quiet-hours 22:00-08:00  # Set quiet hours
```

**Analysis Settings:**
```
/settings --parallel-analysis off    # Disable parallel specialists
/settings --auto-context-injection on  # Enable automatic context
```

## 🏗️ CARL Architecture

### Dual-Layer Design

```
Human Layer: Simple commands (/plan, /task, /status, /analyze, /settings)
     ↓
AI Layer: Structured CARL files (.intent, .state, .context, index.carl)
```

**Benefits:**
- **Simple for humans**: Easy-to-remember commands
- **Rich for AI**: Comprehensive, structured context
- **Best of both worlds**: Cognitive simplicity + AI precision

### Three-File System

1. **Intent Files (`.intent`)**
   - What needs to be built
   - Requirements, constraints, success criteria
   - User stories and acceptance criteria

2. **State Files (`.state`)**
   - What's been built
   - Implementation progress, quality metrics
   - Technical debt and performance data

3. **Context Files (`.context`)**
   - How code relates
   - Dependencies, integration points
   - API contracts and data relationships

### Claude Code Integration

**Automatic Hooks:**
- **Session Start**: Load CARL context, play welcome audio
- **User Prompt Submit**: Inject relevant context into AI requests
- **Tool Call**: Track progress, update CARL files
- **Session End**: Save state, generate summaries

## 🎵 Carl Wheezer Audio System

### Features
- **Cross-Platform Support**: macOS, Linux, Windows
- **Character Voice**: TTS with Carl-like voice settings
- **Audio Categories**: Start, Work, Progress, Success, End
- **Smart Configuration**: Quiet mode, quiet hours, volume control

### Audio Setup

1. **Test System:**
   ```bash
   source .carl/scripts/carl-audio.sh
   carl_test_audio
   ```

2. **Add Custom Audio Files:**
   ```
   .carl/audio/
   ├── start/     # Session beginning sounds
   ├── work/      # Task initiation sounds  
   ├── progress/  # Milestone achievement sounds
   ├── success/   # Test passing, build success sounds
   └── end/       # Session completion sounds
   ```

3. **Configure Settings:**
   ```
   /settings --audio-enabled true
   /settings --quiet-hours 22:00-08:00
   /settings --volume 75
   ```

## 🤝 Team Collaboration

### Mixed Team Support
CARL works seamlessly even when not everyone on the team uses it:

- **Automatic Sync**: `/analyze` updates CARL files after git pulls
- **Non-CARL Compatibility**: Standard git workflow remains unchanged
- **Progressive Adoption**: Team members can adopt CARL at their own pace

### Handoff Capabilities
- **Perfect Context Transfer**: Complete session state preservation
- **Work Continuity**: Resume interrupted tasks with full context
- **Progress Tracking**: Shared understanding of implementation status

## 🔧 CARL-Optimized Specialist Agents

CARL includes 8 specialized AI agents for comprehensive analysis:

### Core Specialists
- **`carl-architecture-analyst`** - System structure analysis for intent mapping
- **`carl-backend-analyst`** - API and server-side analysis for context files
- **`carl-frontend-analyst`** - UI/UX analysis for intent generation
- **`carl-requirements-analyst`** - Extract requirements from code patterns

### Quality & Security Specialists  
- **`carl-debt-analyst`** - Technical debt identification for state tracking
- **`carl-quality-analyst`** - Testing and quality assurance analysis
- **`carl-security-analyst`** - Security patterns and compliance analysis
- **`carl-performance-analyst`** - Performance optimization opportunities

### Parallel Execution
All specialists run **concurrently** for maximum efficiency, providing comprehensive project analysis in seconds rather than sequential minutes.

## 📁 Project Structure

```
your-project/
├── .claude/
│   ├── commands/           # 5 core CARL commands
│   ├── hooks/             # Claude Code integration hooks
│   ├── agents/            # CARL-optimized specialist agents
│   └── settings.json      # Hook configuration
├── .carl/
│   ├── audio/             # Carl Wheezer audio system
│   ├── scripts/           # Helper automation scripts
│   ├── config/            # CARL configuration
│   ├── templates/         # CARL file templates
│   ├── sessions/          # Session tracking data
│   └── index.carl         # Master AI reference file
└── [your project files]
```

## ⚙️ Configuration

### CARL Settings File
`.carl/config/carl-settings.json`

```json
{
  "carl_version": "1.2.0",
  "audio_settings": {
    "audio_enabled": true,
    "quiet_mode": false,
    "quiet_hours_enabled": false,
    "quiet_hours_start": "22:00",
    "quiet_hours_end": "08:00"
  },
  "development_settings": {
    "auto_context_injection": true,
    "session_tracking": true,
    "progress_monitoring": true,
    "specialist_agents_enabled": true
  },
  "analysis_settings": {
    "parallel_analysis": true,
    "comprehensive_scanning": true,
    "auto_update_on_git_pull": true
  }
}
```

### Claude Code Hooks
`.claude/settings.json`

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/session-start.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/session-end.sh"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/user-prompt-submit.sh"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/tool-call.sh pre"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/tool-call.sh post"
          }
        ]
      }
    ]
  }
}
```

## 📊 Example CARL Files

### Intent File Example
```yaml
# user-authentication.intent
id: user-auth-system
type: feature_development
complexity: medium
priority: P1

intent:
  what: "Secure user authentication system with JWT tokens"
  why: "Enable personalized user experiences and data security"
  who: ["end_users", "api_consumers", "admin_users"]

user_stories:
  core_stories:
    - story: "As a user, I want to register with email/password so I can access personalized features"
      acceptance_criteria:
        - "User can register with valid email and strong password"
        - "System sends email verification"
        - "Invalid inputs show clear error messages"
      effort_estimate: "3 days"
      priority: "P1"
```

### State File Example  
```yaml
# user-authentication.state
feature_id: user-auth-system
phase: development
completion_percentage: 65

implementation:
  completed:
    - component: "User Registration API"
      file: "src/controllers/auth.js"
      tests: "unit, integration"
      coverage: 89
      
  in_progress:
    - component: "JWT Token Service"
      file: "src/services/jwt.js" 
      progress: 40
      estimated_completion: "2024-01-20"
```

### Context File Example
```yaml
# user-authentication.context
feature_id: user-auth-system
context_type: service

relationships:
  parent_components:
    - component: "User Management System"
      relationship: "implements"
      coupling_strength: "medium"
      
dependencies:
  external_dependencies:
    - name: "jsonwebtoken"
      type: "library"
      version: "^9.0.0"
      purpose: "JWT token generation and validation"
```

## 🚀 Advanced Usage

### Custom Specialist Agents
Create project-specific specialists:

```markdown
# .claude/agents/custom-domain-analyst.md
You are a domain-specific analyst for [YOUR_DOMAIN].
Your role is to analyze code and requirements through the lens of [DOMAIN_EXPERTISE].

When analyzing code, focus on:
- Domain-specific patterns and anti-patterns
- Industry best practices for [YOUR_DOMAIN]
- Compliance requirements for [YOUR_DOMAIN]
- Performance considerations specific to [YOUR_DOMAIN]
```

### Integration with External Tools

```bash
# Example: Integrate with Jira
/plan "Implement JIRA-123: Customer dashboard" --external-ref JIRA-123

# Example: Integrate with Azure DevOps  
/task "Complete work item 456" --ado-item 456
```

### Automated Workflows

```bash
# Git hook integration
echo "/analyze --sync" > .git/hooks/post-merge
chmod +x .git/hooks/post-merge

# CI/CD integration
- name: Update CARL Context
  run: |
    source .carl/scripts/carl-helpers.sh
    carl_update_ci_context
```

## 🔍 Troubleshooting

### Common Issues

**CARL files not updating:**
```bash
# Check hook configuration
cat .claude/settings.json

# Test hooks manually
.claude/hooks/session-start.sh
```

**Audio not working:**
```bash
# Test audio system
source .carl/scripts/carl-audio.sh
carl_test_audio

# Check audio commands availability
carl_test_category start
```

**Context not injecting:**
```bash
# Verify CARL index file
cat .carl/index.carl

# Test context loading
source .carl/scripts/carl-helpers.sh
carl_get_active_context
```

### Debug Mode
Enable detailed logging:

```bash
export CARL_DEBUG=true
claude  # Start Claude Code with debug output
```

## 🤝 Contributing

### Community Audio Packs
Contribute Carl Wheezer voice clips:

1. Record or generate Carl-like audio clips
2. Save as `.wav` or `.mp3` files
3. Submit via pull request to `audio-packs/` directory

### Template Contributions
Share CARL templates for specific project types:

1. Create templates in `.carl/templates/`
2. Document usage in template header
3. Submit pull request with examples

### Bug Reports and Feature Requests
- **GitHub Issues**: [Report bugs and request features](https://github.com/claytonhunt/carl/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/claytonhunt/carl/discussions)

## 📈 Roadmap

### Version 1.1 (Q2 2025)
- [ ] IDE Integration (VS Code, JetBrains)
- [ ] Template Marketplace
- [ ] Advanced Analytics Dashboard
- [ ] Machine Learning Context Prediction

### Version 1.2 (Q3 2025)
- [ ] Enterprise Features (SSO, Audit Trails)
- [ ] External Tool APIs (Jira, Azure DevOps, Slack)
- [ ] Multi-language Documentation Generation
- [ ] Performance Optimization Engine

### Version 2.0 (Q4 2025)
- [ ] Plugin System for Custom Specialists
- [ ] Collaborative Planning Interface
- [ ] Predictive Development Insights
- [ ] Industry-Specific Template Packs

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Jimmy Neutron**: For inspiring Carl Wheezer, the perfect development mascot
- **Anthropic**: For creating Claude Code, the foundation CARL builds upon
- **Open Source Community**: For tools and libraries that make CARL possible

---

<div align="center">
  <h3>🎯 Ready to revolutionize your development workflow?</h3>
  <p><strong>Install CARL today and let Carl Wheezer guide your AI-assisted development!</strong></p>
  
  <p>
    <a href="#-quick-start">Get Started</a> •
    <a href="https://github.com/claytonhunt/carl/issues">Report Bug</a> •
    <a href="https://github.com/claytonhunt/carl/discussions">Request Feature</a>
  </p>
  
  <p><em>"Llamas! I mean... let's build something awesome!" - Carl Wheezer (probably)</em></p>
</div>