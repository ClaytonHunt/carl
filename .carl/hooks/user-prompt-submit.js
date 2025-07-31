#!/usr/bin/env node

/**
 * CARL User Prompt Submit Hook - Node.js Implementation
 * Automatically injects relevant CARL context into every user prompt for perfect AI understanding
 */

const fs = require('fs-extra');
const path = require('path');
const utils = require('./lib/utils');
const carlHelpers = require('./lib/carl-helpers');
const carlSession = require('./lib/carl-session');

/**
 * Read JSON input from stdin
 * @returns {Promise<Object>} Parsed JSON input
 */
async function readJsonInput() {
  return new Promise((resolve, reject) => {
    let input = '';
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', chunk => {
      input += chunk;
    });
    
    process.stdin.on('end', () => {
      try {
        const data = JSON.parse(input);
        resolve(data);
      } catch (error) {
        reject(new Error(`Failed to parse JSON input: ${error.message}`));
      }
    });
    
    process.stdin.on('error', reject);
  });
}

/**
 * Check if prompt needs CARL context injection
 * @param {string} prompt - User prompt
 * @returns {boolean} Whether context injection is needed
 */
function needsCarlContext(prompt) {
  // Always inject basic CARL context for commands and implementation tasks
  if (/\/carl:|\/task|\/plan|\/status|\/analyze|implement|build|create|fix|refactor|optimize|test/i.test(prompt)) {
    return true;
  }
  
  // Inject context for feature/technical discussions
  if (/feature|user story|requirement|bug|issue|component|service|api|database/i.test(prompt)) {
    return true;
  }
  
  return false;
}

/**
 * Get user's first name from git config
 * @returns {Promise<string>} User's first name
 */
async function getUserFirstName() {
  try {
    const fullName = await utils.getGitUserName();
    return fullName.split(' ')[0] || 'Developer';
  } catch {
    return process.env.USER || 'Developer';
  }
}

/**
 * Build personality prompt if enabled
 * @param {string} userName - User's first name
 * @returns {Promise<string>} Personality prompt or empty string
 */
async function buildPersonalityPrompt(userName) {
  try {
    const carlRoot = utils.getCarlRoot();
    const carlPersona = await carlHelpers.getSetting('carl_persona', 'true');
    const personalityTheme = await carlHelpers.getSetting('personality_theme', 'jimmy_neutron');
    
    if (carlPersona !== 'true' || personalityTheme === 'false') {
      return '';
    }
    
    const personalityConfigFile = path.join(carlRoot, '.carl/personalities.config.carl');
    const personalityExists = await utils.pathExists(personalityConfigFile);
    
    if (!personalityExists) {
      return '';
    }
    
    const personalityStyle = await carlHelpers.getSetting('personality_response_style', 'auto');
    
    return `

<carl-personality-mode>
You are using the CARL personality system! Please:

1. Read the personality configuration from: ${personalityConfigFile}
2. Response style mode: ${personalityStyle}
   - **single**: Use only ONE character for the entire response
   - **multi**: Multiple characters can participate in conversations/discussions
   - **auto**: Use single for simple tasks, multi for complex discussions

3. Character selection based on prompt context:
   - Technical/analysis tasks → Characters with 'technical_knowledge: expert' or analytical traits
   - Creative/building tasks → Characters with inventive, confident, or leadership traits
   - Error/problem solving → Characters with supportive, caring, or educational traits  
   - Success/completion → Characters with enthusiastic, energetic, or celebratory traits
   - General interactions → Any character that fits, or default to first available

4. **Response Format**: Use this exact format with code styling:
   - Format character names as: \`Character_Name\`: response_text (capitalize properly)
   - The backticks will make character names stand out clearly
   - For multi-character: separate each character's response with an empty line
   - Example: \`Carl\`: Oh boy, this looks great!
   - Example multi: \`Jimmy\`: Brain blast!\\n\\n\`Carl\`: Oh geez, Jimmy!

5. For multi-character responses, have them interact naturally:
   - Characters can disagree, build on each other's ideas, or provide different perspectives
   - Use their personality conflicts/synergies (analytical vs creative, cautious vs bold)
   - Each character speaks in their own distinct voice

6. Use each character's complete personality profile:
   - Core traits and communication style
   - Speech patterns and catchphrases  
   - Technical knowledge level and explanation preferences
   - Emotional tendencies for the current context

7. Address the user as '${userName}' (first name only) and stay in character(s) throughout

The personality system is dynamic - work with whatever characters are defined in the config file, regardless of theme.
</carl-personality-mode>`;
  } catch {
    return '';
  }
}

async function main() {
  try {
    // Read JSON input from stdin
    const jsonInput = await readJsonInput();
    const prompt = jsonInput.prompt || '';
    
    const carlRoot = utils.getCarlRoot();
    
    // Check if CARL context injection is enabled
    const contextInjectionEnabled = await carlHelpers.getSetting('context_injection', 'true');
    if (contextInjectionEnabled === 'false') {
      console.log(prompt);
      return;
    }
    
    // Check if CARL is initialized
    const projectDir = path.join(carlRoot, '.carl/project');
    const projectExists = await utils.pathExists(projectDir);
    if (!projectExists) {
      console.log(prompt);
      return;
    }
    
    // Determine if prompt needs CARL context
    let carlContext = '';
    let strategicContext = '';
    
    if (needsCarlContext(prompt)) {
      // Get active CARL context
      carlContext = await carlHelpers.getActiveContext();
      
      // Add strategic context for planning and analysis
      strategicContext = await carlHelpers.getStrategicContext(prompt);
      
      // Add alignment validation context for feature-related commands
      if (/feature|plan|task|implement|create.*feature/i.test(prompt)) {
        const alignmentContext = await carlHelpers.getAlignmentValidationContext(prompt);
        if (alignmentContext) {
          strategicContext = strategicContext + '\n\n' + alignmentContext;
        }
      }
    }
    
    // Initialize session tracking if not already active
    try {
      await carlSession.getCurrentSessionFile();
    } catch {
      // Session initialization will be handled if needed
    }
    
    // Get user's first name for personality system
    const userName = await getUserFirstName();
    
    // Build personality prompt if enabled
    const personalityPrompt = await buildPersonalityPrompt(userName);
    
    // Build the final prompt
    let finalPrompt = prompt + personalityPrompt;
    
    // Inject CARL context if relevant
    if (carlContext || strategicContext) {
      const contextOutput = `${finalPrompt}

<carl-context>
The following CARL (Context-Aware Requirements Language) context is automatically provided to help you understand the current project state, requirements, and implementation details:

${carlContext}

${strategicContext}
</carl-context>`;
      
      console.log(contextOutput);
    } else {
      console.log(finalPrompt);
    }
    
  } catch (error) {
    // On any error, just output the original prompt to avoid breaking the flow
    console.error(`Error in user-prompt-submit hook: ${error.message}`, { toFile: true });
    
    // Try to read input directly if JSON parsing failed
    try {
      const jsonInput = await readJsonInput();
      console.log(jsonInput.prompt || '');
    } catch {
      // Last resort - just echo empty to avoid hanging
      console.log('');
    }
  }
}

// Run main function if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error in user-prompt-submit:', error);
    process.exit(0); // Don't fail hard on hook errors
  });
}

module.exports = { main };