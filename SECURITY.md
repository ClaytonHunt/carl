# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Considerations

CARL (Context-Aware Requirements Language) is designed to be a secure development tool, but like any software that processes code and integrates with development workflows, it's important to understand the security implications.

### What CARL Does

CARL:
- ✅ Analyzes your local codebase to generate planning documentation
- ✅ Creates structured files (.intent, .state, .context) in your project directory
- ✅ Integrates with Claude Code through hooks for context injection
- ✅ Provides audio feedback through local TTS systems
- ✅ Runs shell scripts for automation and helper functions

### What CARL Does NOT Do

CARL does not:
- ❌ Send your code to external servers (beyond Claude Code's normal operation)
- ❌ Store your code outside your local filesystem
- ❌ Require network access for core functionality
- ❌ Execute arbitrary code from remote sources
- ❌ Modify your source code files (only creates CARL documentation files)

## Security Best Practices

### When Using CARL

1. **Review Scripts Before Execution**
   - CARL includes shell scripts for automation
   - Review any custom scripts before making them executable
   - Understand what each hook and helper script does

2. **File System Permissions**
   - CARL creates files in `.carl/` and `.claude/` directories
   - Ensure appropriate file permissions for your environment
   - Consider excluding sensitive CARL session data from version control

3. **Audio System Security**
   - Audio system uses local TTS and audio playback
   - No external audio services are contacted
   - Audio files are played from local `.carl/audio/` directory only

4. **Claude Code Security**
   - CARL inherits Claude Code's security model
   - Context injection follows Claude Code's existing patterns
   - Review Claude Code's security documentation

### In Team Environments

1. **Shared CARL Files**
   - Review CARL files before committing to version control
   - Ensure no sensitive information is included in CARL documentation
   - Consider team policies for what CARL data to share

2. **Hook Configuration**
   - Review `.claude/settings.json` for hook configurations
   - Ensure all team members understand what hooks are enabled
   - Test hooks in non-production environments first

3. **Installation Security**
   ```bash
   # Verify installation script before running
   cat install.sh | less
   
   # Run with specific user permissions
   ./install.sh --force  # Only if you understand the implications
   ```

## Reporting Security Vulnerabilities

We take security seriously. If you discover a security vulnerability in CARL, please help us protect users by following responsible disclosure practices.

### How to Report

**DO NOT create public GitHub issues for security vulnerabilities.**

Instead:

1. **GitHub Security**: Use GitHub's private security reporting feature
2. **Subject**: "CARL Security Vulnerability Report"
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if you have one)

### What to Expect

1. **Initial Response**: Within 48 hours
2. **Investigation**: We'll investigate and assess the report
3. **Fix Development**: Develop and test a fix
4. **Coordinated Disclosure**: Work with you on timing and disclosure
5. **Credit**: You'll be credited in release notes (if desired)

### Security Response Timeline

- **Critical**: Fix within 24-48 hours
- **High**: Fix within 1 week
- **Medium**: Fix within 2 weeks
- **Low**: Fix in next regular release

## Known Security Considerations

### Shell Script Execution

CARL uses shell scripts for:
- Installation and setup
- Claude Code hook integration
- Audio system functionality
- Helper automation

**Mitigation:**
- All scripts are included in the repository for review
- Scripts use `set -e` for proper error handling
- No dynamic script generation from user input
- No execution of external scripts or downloads

### File System Access

CARL creates and modifies files in:
- `.carl/` directory (CARL-specific files)
- `.claude/` directory (Claude Code integration)
- Project root (rare, only for configuration)

**Mitigation:**
- CARL never modifies your source code files
- All file operations are in well-defined directories
- File permissions are set appropriately
- No automatic file deletion of user code

### Context Injection

CARL injects project context into Claude Code prompts through hooks.

**Considerations:**
- Context data comes from your local project files
- No external data sources are used
- Context is processed by Claude Code's existing security measures
- Context injection can be disabled via settings

### Audio System

The audio system uses local resources:
- Pre-recorded audio files in `.carl/audio/`
- Local TTS systems (macOS `say`, Linux `espeak`, Windows SAPI)
- No network audio streaming or external services

## Security Hardening

### For Security-Conscious Environments

1. **Disable Audio System**
   ```bash
   /settings --audio-enabled false
   ```

2. **Review All Scripts**
   ```bash
   find .carl -name "*.sh" -exec cat {} \;
   find .claude -name "*.sh" -exec cat {} \;
   ```

3. **Limit Hook Functionality**
   ```json
   {
     "hooks": {
       "session-start": {"command": "echo 'CARL disabled'"}
     }
   }
   ```

4. **Gitignore Sensitive Data**
   ```gitignore
   .carl/sessions/
   .carl/config/user-preferences.json
   ```

### Corporate/Enterprise Use

For corporate environments, consider:

1. **Code Review Process**
   - Review CARL installation before deployment
   - Audit all shell scripts and configurations
   - Test in isolated environment first

2. **Network Policies**
   - CARL works offline (except for Claude Code itself)
   - No additional network access required
   - Audio system is entirely local

3. **Data Classification**
   - CARL files contain project structure information
   - Consider data classification policies for CARL documentation
   - Review what information should be version controlled

## Compliance Considerations

### GDPR/Privacy

CARL:
- Does not collect personal data
- Does not transmit data to external services
- Processes only local project information
- Creates local documentation files

### SOX/Financial Compliance

For regulated environments:
- Review audit trail capabilities
- Consider access controls for CARL files
- Evaluate change tracking requirements

### Security Certifications

CARL has not undergone formal security certification. For environments requiring certified tools, please:
- Conduct internal security assessment
- Consider penetration testing
- Evaluate against your security policies

## Contact

For security questions or concerns:
- **GitHub Issues**: Create a private security report via GitHub
- **Discussions**: Use GitHub Discussions for general security questions

For general questions:
- **GitHub Discussions**: https://github.com/claytonhunt/carl/discussions
- **GitHub Issues**: https://github.com/claytonhunt/carl/issues

---

**Remember: Security is a shared responsibility. Please review and understand any development tool before using it in your environment.**