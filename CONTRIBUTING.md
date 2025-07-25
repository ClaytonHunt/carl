# Contributing to CARL

🎯 **Welcome to the CARL community!** We're excited you want to contribute to the Context-Aware Requirements Language project.

## 🤖 About CARL

CARL is an AI-optimized planning system for Claude Code, featuring our beloved mascot Carl Wheezer from Jimmy Neutron. We believe in making development fun, efficient, and accessible to everyone.

## 🌟 Ways to Contribute

### 🎵 Audio Contributions
**Help build the Carl Wheezer audio library!**

We're looking for:
- Carl Wheezer voice clips from Jimmy Neutron episodes
- AI-generated Carl-like voice recordings
- Character-appropriate phrases and reactions
- Audio editing and enhancement

**Audio Categories Needed:**
- `start/` - Session beginning encouragement
- `work/` - Task initiation motivation  
- `progress/` - Milestone achievements
- `success/` - Test passing, build success celebrations
- `end/` - Session completion farewells

**Submission Guidelines:**
1. Audio files should be `.wav` or `.mp3` format
2. Duration: 1-5 seconds for sound effects, 2-10 seconds for phrases
3. Clear audio quality, minimal background noise
4. Character-appropriate content (encouraging, enthusiastic, helpful)
5. Include source information if from episodes

### 📝 Template Contributions
**Share CARL templates for different project types!**

We need templates for:
- **Frontend Frameworks**: React, Vue, Angular, Svelte
- **Backend Systems**: Node.js, Python, Java, .NET, Go, Rust
- **Mobile Development**: React Native, Flutter, iOS, Android
- **DevOps & Infrastructure**: Docker, Kubernetes, CI/CD
- **Database Systems**: SQL, NoSQL, migrations
- **Testing Frameworks**: Unit, integration, e2e testing

**Template Structure:**
```
.carl/templates/project-type/
├── intent.template      # Requirements template
├── state.template       # Progress tracking template  
├── context.template     # Dependencies template
└── README.md           # Usage instructions
```

### 🔧 Code Contributions

#### Areas We Need Help With:
- **Cross-platform compatibility** improvements
- **Performance optimizations** for large codebases
- **IDE integrations** (VS Code, JetBrains, Vim)
- **External tool APIs** (Jira, Azure DevOps, GitHub)
- **Specialist agent enhancements**
- **Bug fixes and error handling**

#### Development Setup:
1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/carl.git`
3. Create feature branch: `git checkout -b feature/your-feature-name`
4. Install CARL in test project: `./install.sh /path/to/test-project`
5. Make changes and test thoroughly
6. Commit with descriptive messages
7. Push to your fork and create Pull Request

### 📚 Documentation Contributions

We welcome improvements to:
- **Installation guides** for different platforms
- **Usage tutorials** and examples
- **Troubleshooting guides**
- **API documentation** for CARL files
- **Integration guides** with other tools
- **Translation** to other languages

### 🐛 Bug Reports

**Before submitting a bug report:**
1. Check existing issues to avoid duplicates
2. Test with latest version of CARL
3. Gather system information and logs

**Bug Report Template:**
```markdown
## Bug Description
Clear description of the issue

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior  
What actually happened

## Environment
- OS: [macOS/Linux/Windows]
- CARL Version: [version]
- Claude Code Version: [version]
- Project Type: [Node.js/Python/etc.]

## Additional Context
Logs, screenshots, or other relevant information
```

### 💡 Feature Requests

We love new ideas! Please check:
1. Existing feature requests and discussions
2. CARL roadmap in README.md
3. Whether it aligns with CARL's AI-optimization goals

**Feature Request Template:**
```markdown
## Feature Description
Clear description of the proposed feature

## Use Case
Who would benefit and how?

## Proposed Implementation
High-level approach (if you have ideas)

## Alternatives Considered
Other approaches you've thought about

## Additional Context
Mockups, examples, or references
```

## 🔄 Pull Request Process

### Before Submitting:
1. **Test thoroughly** in multiple scenarios
2. **Follow code style** (use existing patterns)
3. **Update documentation** if needed
4. **Add tests** for new functionality
5. **Check cross-platform compatibility**

### Pull Request Guidelines:
1. **Descriptive title** summarizing the change
2. **Clear description** of what and why
3. **Link related issues** using `Fixes #123` or `Relates to #456`
4. **Screenshots/demos** for UI changes
5. **Test instructions** for reviewers

### Review Process:
1. Automated checks must pass
2. Code review by maintainers
3. Testing in different environments
4. Documentation review
5. Merge after approval

## 📋 Code Style Guidelines

### Shell Scripts
```bash
#!/bin/bash
# Use bash shebang
# Comments explaining complex logic
# Error handling with set -e
# Consistent variable naming

function_name() {
    local var_name="$1"
    echo "Result: $var_name"
}
```

### Markdown
- Use proper heading hierarchy
- Include code syntax highlighting
- Add emoji for visual appeal (but not excessively)
- Link to relevant sections and external resources

### CARL Files
- Use consistent YAML formatting
- Include descriptive comments
- Follow template structure
- Validate syntax before submitting

## 🚀 Specialist Agent Development

### Creating New Specialists
CARL specialist agents follow specific patterns:

```markdown
# Agent Header
You are a [DOMAIN]-specialist for CARL (Context-Aware Requirements Language).
Your role is to analyze [SPECIFIC_AREA] and generate CARL-compliant documentation.

## Analysis Focus
- [Specific concern 1]
- [Specific concern 2]
- [Specific concern 3]

## Output Format
Generate structured CARL files following these templates:
- Intent files: Requirements and specifications
- State files: Implementation progress
- Context files: Dependencies and relationships
```

### Agent Testing
1. Test with various project types
2. Verify CARL file generation
3. Check parallel execution compatibility
4. Validate analysis accuracy

## 🎯 Community Guidelines

### Be Respectful
- Welcome newcomers and different skill levels
- Provide constructive feedback
- Help others learn and grow
- Celebrate contributions of all sizes

### Stay On Topic
- Keep discussions relevant to CARL
- Use appropriate channels for different topics
- Search before asking questions
- Share knowledge and resources

### Quality Focus
- Prioritize user experience
- Maintain high code quality
- Consider performance impact
- Test thoroughly before submitting

## 🏆 Recognition

### Contributors Wall
All contributors are recognized in:
- Contributors section of README.md
- Release notes for their contributions
- Community highlights in discussions

### Special Recognition
- **Audio Contributors**: Featured in audio credits
- **Template Contributors**: Named in template documentation
- **Code Contributors**: Git history and release notes
- **Documentation Contributors**: Author attribution in docs

## 🔗 Communication Channels

### GitHub
- **Issues**: [Bug reports and feature requests](https://github.com/claytonhunt/carl/issues)
- **Discussions**: [Questions, ideas, and community chat](https://github.com/claytonhunt/carl/discussions)
- **Pull Requests**: Code contributions and reviews

### Community Guidelines
- Be patient with response times
- Use clear, descriptive titles
- Provide context and examples
- Follow up appropriately

## ❓ Getting Help

### For Contributors:
1. **Read this guide** thoroughly
2. **Check existing issues** and discussions
3. **Ask in discussions** for general questions
4. **Create issues** for specific problems

### For CARL Usage:
1. **Check README.md** for basic usage
2. **Review troubleshooting** section
3. **Search existing issues**
4. **Create new issue** with detailed information

## 📅 Development Cycle

### Release Schedule
- **Minor releases**: Monthly (features, improvements)
- **Patch releases**: As needed (bug fixes)
- **Major releases**: Quarterly (significant features)

### Contribution Timeline
- **Bug fixes**: Usually reviewed within 1-2 days
- **Features**: May take 1-2 weeks for review and discussion
- **Major changes**: Require community discussion and planning

## 🙏 Thank You!

Every contribution makes CARL better for the entire development community. Whether you're fixing a typo, adding an audio clip, or implementing a major feature, your effort is valued and appreciated.

**"Croissants! I mean... thanks for contributing to CARL!"** - Carl Wheezer (probably)

---

## 📞 Questions?

- **General Questions**: [GitHub Discussions](https://github.com/claytonhunt/carl/discussions)
- **Bug Reports**: [GitHub Issues](https://github.com/claytonhunt/carl/issues)
- **Security Issues**: Use GitHub's private security reporting (see SECURITY.md)

Happy contributing! 🎯