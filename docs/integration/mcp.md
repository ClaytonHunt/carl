# MCP (Model Context Protocol) Integration

## Overview
CARL v2 supports MCP integration to enhance capabilities through external tools and data sources. MCPs enable structured access to external systems without complex shell scripting.

## Core CARL MCPs
**System-level enhancements for all CARL projects:**
- **Git MCP**: Enhanced git operations for `/carl:analyze --sync` and change detection
- **Time Tracking MCP**: Professional time tracking integration for session management
- **Metrics Database MCP**: Persistent storage for cross-project analytics and velocity data

## Project-Specific MCPs
**Detected and configured based on project technology stack:**
- **Database MCPs**: PostgreSQL, MySQL, MongoDB for database-driven applications
- **Cloud Provider MCPs**: AWS, Azure, GCP for deployment and infrastructure tasks
- **API Testing MCPs**: Postman, REST client tools for API development
- **Domain-Specific MCPs**: Jupyter for ML projects, Docker for containerized apps

## MCP Configuration Workflow
1. **Detection**: `/carl:analyze` invokes `carl-mcp-configurator` to identify MCP opportunities
2. **Research**: Agent researches available MCPs matching project needs
3. **Configuration**: Generates `.mcp.json` with security-first approach
4. **Integration**: Updates `process.carl` with MCP-enhanced workflows
5. **Agent Enhancement**: Recommends MCP tools for existing agents

## Security Considerations
- **Credential Management**: Use environment variables, never hardcode credentials
- **Minimal Permissions**: Configure MCPs with least-privilege access
- **Validation**: Test MCP configurations in isolated environments first
- **Documentation**: Document all configured MCPs in project README

## Example MCP Configuration
```json
{
  "mcps": {
    "git-mcp": {
      "command": "git-mcp-server",
      "args": ["--repo", "."]
    },
    "github": {
      "command": "github-mcp-server",
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "command": "postgres-mcp-server",
      "args": ["--connection-string", "${DATABASE_URL}"]
    }
  }
}
```