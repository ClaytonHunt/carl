# CARL Plugin

**Version:** 0.1.0
**Coding Assistant for Rapid Launch**

CARL is an AI-powered coding assistant plugin for Claude Code, designed to help developers quickly launch and manage coding projects with ease.

---

## Installation

CARL is installed automatically when added to your Claude Code plugin marketplace. Once installed, it will be available in all your projects.

---

## Configuration

CARL uses a settings-based configuration system. Settings are stored in your project's `.claude/.carl/` directory and are automatically created with defaults on first use.

### Settings File Location

```
${CLAUDE_PROJECT_DIR}/.claude/.carl/carl.settings.json
```

On first session start, CARL will automatically:
- Create the `.claude/.carl/` directory
- Copy this README for easy reference
- Copy the settings schema for IDE support
- Create default settings file

### Settings Structure

```json
{
  "$schema": "../schema/settings-schema.json",
  "plugin": "carl",
  "version": "1.0.0",
  "settings": {
    "feature_flags": {},
    "configuration": {
      "tts_provider": "none"
    },
    "agent_settings": {},
    "command_settings": {},
    "hook_settings": {},
    "skill_settings": {},
    "mcp_settings": {}
  }
}
```

---

## Available Settings

### Text-to-Speech (TTS) Provider

**Setting:** `configuration.tts_provider`
**Type:** String
**Default:** `"none"`
**Options:**
- `"none"` - TTS disabled (default)
- `"say"` - Cross-platform native TTS (recommended)
- `"node-gtts"` - Google TTS (free, requires internet)
- `"coqui-tts"` - Neural TTS (offline, requires Python)
- `"elevenlabs"` - ElevenLabs API (requires API key)

**Description:**
Configures which Text-to-Speech library CARL should use. The appropriate npm package will be automatically installed when you change this setting.

**Example:**

```json
{
  "settings": {
    "configuration": {
      "tts_provider": "say"
    }
  }
}
```

**Provider Details:**

#### `say` (Recommended)
- **Pros:** Cross-platform, offline, no setup, free
- **Cons:** Voice quality depends on OS defaults
- **Platforms:** Windows (SAPI), macOS (say), Linux (espeak)
- **Setup:** None required - works out of the box

#### `node-gtts`
- **Pros:** Good quality, free, easy to use
- **Cons:** Requires internet connection, rate limited
- **Platforms:** All (Node.js)
- **Setup:** None required

#### `coqui-tts`
- **Pros:** High-quality neural voices, offline
- **Cons:** Large download, requires Python, complex setup
- **Platforms:** All (requires Python 3.7+)
- **Setup:** Requires Python and additional dependencies (see Coqui TTS documentation)

#### `elevenlabs`
- **Pros:** Professional-grade voices, very high quality
- **Cons:** Requires API key, costs money (free tier available)
- **Platforms:** All (API-based)
- **Setup:** Requires `ELEVENLABS_API_KEY` environment variable

---

## Automatic Dependency Management

CARL automatically manages npm dependencies based on your settings:

1. **On Session Start:** CARL checks your `tts_provider` setting
2. **Package Management:** The appropriate TTS package is added to `package.json`
3. **Installation:** Missing packages are automatically installed
4. **Caching:** Dependencies are checked once per 24 hours to avoid repeated installs

### Manual Dependency Installation

If you need to manually trigger dependency installation:

```bash
cd ~/.claude/plugins/carl  # or wherever CARL is installed
npm install
```

---

## Environment Variables

CARL settings are automatically exported as environment variables when a session starts. This makes them available to all plugin components (agents, commands, skills, hooks, and MCP servers).

### Naming Convention

```
CARL_[SECTION]_[KEY]
```

### Examples

| Setting | Environment Variable |
|---------|---------------------|
| `configuration.tts_provider` | `CARL_TTS_PROVIDER` |
| `feature_flags.enable_debug` | `CARL_FEATURE_FLAGS_ENABLE_DEBUG` |

### Using Environment Variables

In bash commands or hooks:
```bash
echo "TTS Provider: $CARL_TTS_PROVIDER"
```

In Node.js scripts:
```javascript
const ttsProvider = process.env.CARL_TTS_PROVIDER;
```

---

## Advanced Configuration

### Environment Variable Substitution

Settings support environment variable substitution using the `${ENV:VAR_NAME}` syntax:

```json
{
  "settings": {
    "configuration": {
      "api_key": "${ENV:MY_API_KEY}",
      "custom_path": "${ENV:HOME}/my-custom-path"
    }
  }
}
```

**Important:** Environment variables must be set before starting Claude Code.

### Custom Setting Categories

You can add custom categories beyond the standard ones:

```json
{
  "settings": {
    "my_custom_category": {
      "custom_setting": "value",
      "another_setting": 123
    }
  }
}
```

---

## Validation and Error Handling

CARL validates your settings on every session start using JSON Schema. If validation fails, you'll receive a clear error message explaining what needs to be fixed.

### Common Validation Errors

#### Invalid JSON Syntax
```
ERROR: Invalid JSON in settings file
```
**Fix:** Check for missing commas, brackets, or quotes

#### Invalid Setting Value
```
ERROR: Settings validation failed
```
**Fix:** Ensure all values match their expected types and enums

#### Missing Required Fields
```
ERROR: Missing required field: plugin
```
**Fix:** Ensure `plugin`, `version`, and `settings` fields are present

---

## Updating Settings

1. **Edit the settings file:**
   ```bash
   # Open in your editor
   code .claude/.carl/carl.settings.json
   ```

2. **Make your changes:**
   ```json
   {
     "settings": {
       "configuration": {
         "tts_provider": "say"
       }
     }
   }
   ```

3. **Restart Claude Code** (or start a new session)

4. **CARL will:**
   - Validate your changes
   - Update dependencies as needed
   - Export new environment variables

---

## Resetting to Defaults

If you want to reset CARL to default settings:

1. Delete your settings file:
   ```bash
   rm .claude/.carl/carl.settings.json
   ```

2. Restart Claude Code

3. CARL will automatically recreate the file with defaults

---

## Troubleshooting

### Settings Not Loading

**Check:**
- Settings file exists at `.claude/.carl/carl.settings.json`
- File has valid JSON syntax (use a JSON validator)
- Claude Code was restarted after making changes

### Dependencies Not Installing

**Check:**
- npm is installed and available in PATH
- You have internet connection (for downloading packages)
- Check `.deps-installed` file hasn't locked an old state (delete to force reinstall)

### Environment Variables Not Available

**Check:**
- Settings were validated successfully on session start
- Variable name matches expected format: `CARL_[SECTION]_[KEY]`
- Setting is actually defined in the settings file

### TTS Provider Not Working

**Check:**
- `tts_provider` setting is valid (one of: none, say, node-gtts, coqui-tts, elevenlabs)
- Dependencies were installed (check `node_modules` directory)
- For `elevenlabs`: `ELEVENLABS_API_KEY` environment variable is set
- For `coqui-tts`: Python and dependencies are installed

---

## File Locations

### Plugin Installation
```
~/.claude/plugins/carl/              # Plugin files
├── lib/                             # Utility scripts
│   ├── install-deps.cjs             # Dependency installer
│   ├── manage-tts-deps.cjs          # TTS dependency manager
│   ├── load-settings.cjs            # Settings loader
│   ├── get-setting.cjs              # Settings getter
│   └── validate-schema.cjs          # Schema validator
├── defaults/                        # Default settings
│   └── settings.json
├── schema/                          # JSON schemas
│   └── settings-schema.json
├── hooks/                           # Event hooks
│   └── hooks.json
├── commands/                        # Slash commands
├── package.json                     # npm package file
└── README.md                        # This file
```

### Project Settings
```
${CLAUDE_PROJECT_DIR}/.claude/.carl/
├── README.md                        # This documentation (auto-copied)
├── carl.settings-schema.json        # JSON schema for IDE support (auto-copied)
└── carl.settings.json               # Your project-specific settings (auto-created)
```

---

## Per-Project Settings

CARL settings are **project-specific**. Each project has its own `.claude/.carl/carl.settings.json` file, allowing you to:

- Use different TTS providers per project
- Enable/disable features per project
- Commit settings to version control (recommended)
- Share settings with team members

### Sharing Settings with Your Team

1. Configure CARL settings for your project
2. Commit `.claude/.carl/carl.settings.json` to git
3. Team members will automatically get your settings when they clone/pull

**Note:** Don't commit secrets! Use environment variable substitution instead:
```json
{
  "settings": {
    "configuration": {
      "api_key": "${ENV:MY_SECRET_KEY}"
    }
  }
}
```

---

## Cascade Integration

CARL integrates with the Cascade VSCode Extension for work item management. This integration allows CARL to create and manage Projects, Epics, Features, Stories, Phases, and Tasks in a structured hierarchy.

### Features

- **Create Work Items**: Generate new work items with proper hierarchy
- **Update Task Status**: Mark tasks as planned, in-progress, or completed
- **Automatic Propagation**: Cascade automatically updates parent progress
- **Visual Tracking**: See your work items in VSCode TreeView

### Cascade Manager Agent

CARL includes a specialized agent for Cascade operations. Simply ask CARL to create or manage work items:

```
Create a new story for user authentication with 4 tasks
```

The agent will handle all the details automatically.

### Utilities

CARL provides Node.js utilities in `lib/cascade-utils.cjs`:

```javascript
const cascade = require('./lib/cascade-utils.cjs');

// Get next available ID
const taskId = cascade.getNextId('T');

// Update task status
cascade.updateTaskStatus('T0001', 'S0001', 'completed', 100);
```

### Documentation

- `docs/cascade-integration.md` - Complete integration guide
- `agents/cascade-manager.md` - Cascade Manager agent documentation
---

## Commands

CARL currently includes the following commands:

- `/hello` - Test command to verify CARL is working

More commands will be added in future versions.

---

## Version History

### 0.1.0 (Current)
- Initial release
- Settings system with schema validation
- Automatic dependency management
- TTS provider configuration
- Support for say, node-gtts, coqui-tts, and elevenlabs

---

## Support and Documentation

For more detailed documentation about the settings system, see:
- `docs/plugin-settings.md` - Complete settings system documentation

For questions, issues, or feature requests:
- GitHub: https://github.com/your-org/carl
- Documentation: https://github.com/your-org/carl

---

## License

MIT License - See LICENSE file for details

---

## Contributing

Contributions are welcome! Please see the main repository for contribution guidelines.
