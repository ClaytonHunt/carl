# CARL Hooks System

Node.js implementation of the CARL hooks system for Claude Code integration.

## Structure

```
.carl/hooks/
├── lib/                    # Core Node.js modules
│   ├── utils.js           # Core utilities and platform functions
│   ├── carl-helpers.js    # CARL context and settings management
│   ├── carl-session.js    # Session tracking and management
│   └── carl-audio.js      # Cross-platform audio system
├── __tests__/             # Comprehensive unit tests (92 tests)
├── *.sh                   # Legacy bash hook scripts
├── package.json           # Node.js project configuration
└── README.md             # This file
```

## Node.js Modules

### `lib/utils.js`
Core utilities used across all modules:
- File operations (safe read/write)
- Platform detection and compatibility
- Command execution helpers
- Path and timestamp utilities

### `lib/carl-helpers.js`
CARL-specific context and configuration functions:
- Active work context extraction
- Settings management with JSON config
- Strategic and alignment validation context
- Activity and milestone logging

### `lib/carl-session.js`
Session management and tracking:
- Session lifecycle (start/end)
- Activity tracking and metrics
- Git integration for progress tracking
- Session archival and cleanup

### `lib/carl-audio.js`
Cross-platform audio feedback system:
- Audio file playback (macOS/Linux/Windows)
- Text-to-speech integration
- Quiet hours and volume management
- Audio category support (start, progress, success, etc.)

## Migration Status

✅ **Core Helper Modules Complete**
- All bash functionality ported to Node.js
- Comprehensive unit test coverage (86.71% statement coverage)
- Cross-platform compatibility maintained
- Exact function parity with bash scripts

🔄 **Next Steps**
- Implement actual Claude Code hook scripts:
  - `session-start.js`
  - `user-prompt-submit.js` 
  - `tool-call.js`
  - `session-end.js`

## Testing

```bash
cd .carl/hooks
npm test                    # Run all tests
npm run test:coverage       # Generate coverage report
npm run test:watch          # Watch mode for development
```

## Design Principles

1. **Exact Compatibility**: Maintains 100% compatibility with existing bash functionality
2. **Better Error Handling**: Improved error handling and graceful fallbacks
3. **Cross-Platform**: Native support for macOS, Linux, and Windows
4. **Maintainable**: Clean, tested code with proper separation of concerns
5. **Performance**: Efficient file operations and minimal dependencies

## Dependencies

- **fs-extra**: Enhanced file system operations
- **yaml**: YAML parsing for CARL files
- **jest**: Testing framework (dev dependency)

The Node.js implementation provides the same functionality as the bash scripts while offering better maintainability, error handling, and cross-platform support.