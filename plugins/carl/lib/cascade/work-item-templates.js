/**
 * Work Item Templates
 *
 * Templates for generating Cascade work item markdown files.
 * Each template follows the structured format for its work item type.
 *
 * Directory Structure:
 * - Project (P): File in root (.cascade/P####.md)
 * - Epic (E): Directory + file (.cascade/E####-{slug}/E####.md)
 * - Feature (F): Directory + file (inside Epic directory)
 * - Story (S): Directory + file (inside Feature directory)
 * - Bug (B): Directory + file (inside Feature directory)
 * - Phase (PH): Directory + file (inside Story/Bug directory)
 * - Task (T): File only (inside Story/Bug/Phase directory)
 *
 * Each directory level (except Task) also gets a state.json file.
 */

/**
 * Generate work item frontmatter
 * @param {Object} data - Work item data
 * @returns {string} - YAML frontmatter
 */
function generateFrontmatter(data) {
  const {
    id,
    type,
    title,
    status = 'planned',
    priority = 'medium',
    complexity = 'medium',
    parent = null,
    created = new Date().toISOString().split('T')[0],
    updated = new Date().toISOString().split('T')[0]
  } = data;

  return `---
id: ${id}
type: ${type}
title: ${title}
status: ${status}
priority: ${priority}
complexity: ${complexity}
${parent ? `parent: ${parent}` : ''}
created: ${created}
updated: ${updated}
---`;
}

/**
 * Project template
 * TODO: Enhance with project-specific fields
 */
function generateProjectTemplate(data) {
  const frontmatter = generateFrontmatter({ ...data, type: 'Project' });

  return `${frontmatter}

# ${data.title}

## Description
TODO: Add detailed project description

## Objectives
- [ ] Objective 1
- [ ] Objective 2
- [ ] Objective 3

## Scope
TODO: Define project scope

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Epics
TODO: List of epics will be added as they are created

## Timeline
- **Start Date**: TBD
- **Target Completion**: TBD

## Stakeholders
TODO: List key stakeholders

## Notes
TODO: Additional project context
`;
}

/**
 * Epic template
 * TODO: Enhance with epic-specific fields
 */
function generateEpicTemplate(data) {
  const frontmatter = generateFrontmatter({ ...data, type: 'Epic' });

  return `${frontmatter}

# ${data.title}

## Description
TODO: Add detailed epic description

## Business Value
TODO: Explain the business value and impact

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Dependencies
- Depends on: None
- Blocks: None

## Features
TODO: List of features will be added as they are created

## Execution Strategy
- **Parallel execution possible**: TBD
- **Prerequisites**: None
- **Estimated effort**: TBD

## Technical Considerations
TODO: Key technical notes or constraints

## Notes
TODO: Additional context
`;
}

/**
 * Feature template
 * TODO: Enhance with feature-specific fields
 */
function generateFeatureTemplate(data) {
  const frontmatter = generateFrontmatter({ ...data, type: 'Feature' });

  return `${frontmatter}

# ${data.title}

## Description
TODO: Add detailed feature description

## User Value
TODO: Explain value to end users

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Dependencies
- Depends on: None
- Blocks: None

## Stories
TODO: List of stories will be added as they are created

## Execution Strategy
- **Parallel execution possible**: TBD
- **Prerequisites**: None
- **Estimated effort**: TBD

## Technical Approach
TODO: High-level technical approach

## Notes
TODO: Additional context
`;
}

/**
 * Story template
 * TODO: Enhance with story-specific fields
 */
function generateStoryTemplate(data) {
  const frontmatter = generateFrontmatter({ ...data, type: 'Story' });

  return `${frontmatter}

# ${data.title}

## User Story
**As a** [user type]
**I want** [capability]
**So that** [benefit]

## Description
TODO: Add detailed story description

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Dependencies
- Depends on: None
- Blocks: None

## Tasks
TODO: List of tasks will be added as they are created

## Execution Strategy
- **Parallel execution possible**: TBD
- **Prerequisites**: None
- **Estimated effort**: TBD

## Implementation Notes
TODO: Technical implementation details

## Testing Notes
TODO: How to test this story

## Notes
TODO: Additional context
`;
}

/**
 * Bug template
 * TODO: Enhance with bug-specific fields
 */
function generateBugTemplate(data) {
  const frontmatter = generateFrontmatter({ ...data, type: 'Bug' });

  return `${frontmatter}

# ${data.title}

## Description
TODO: Describe the bug

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
TODO: What should happen

## Actual Behavior
TODO: What actually happens

## Impact
TODO: Severity and user impact

## Root Cause
TODO: Identified root cause (if known)

## Fix Strategy
TODO: Approach to fix

## Acceptance Criteria
- [ ] Bug is fixed
- [ ] No regression in related functionality
- [ ] Tests added to prevent recurrence

## Dependencies
- Depends on: None
- Blocks: None

## Tasks
TODO: List of tasks will be added as they are created

## Notes
TODO: Additional context, screenshots, logs, etc.
`;
}

/**
 * Phase template
 * TODO: Enhance with phase-specific fields
 */
function generatePhaseTemplate(data) {
  const frontmatter = generateFrontmatter({ ...data, type: 'Phase' });

  return `${frontmatter}

# ${data.title}

## Description
TODO: Describe this phase of work

## Objectives
- [ ] Objective 1
- [ ] Objective 2

## Tasks
TODO: List of tasks will be added as they are created

## Execution Strategy
- **Parallel execution possible**: TBD
- **Prerequisites**: None
- **Estimated effort**: TBD

## Notes
TODO: Additional context
`;
}

/**
 * Task template
 * TODO: Enhance with task-specific fields
 */
function generateTaskTemplate(data) {
  const frontmatter = generateFrontmatter({ ...data, type: 'Task' });

  return `${frontmatter}

# ${data.title}

## Description
TODO: Describe the specific task

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Dependencies
- Depends on: None
- Blocks: None

## Implementation Details
TODO: Specific implementation steps or technical details

## Estimated Effort
TODO: Time estimate

## Notes
TODO: Additional context
`;
}

/**
 * Template generator factory
 * @param {string} type - Work item type
 * @param {Object} data - Work item data
 * @returns {string} - Generated markdown content
 */
function generateTemplate(type, data) {
  const generators = {
    Project: generateProjectTemplate,
    Epic: generateEpicTemplate,
    Feature: generateFeatureTemplate,
    Story: generateStoryTemplate,
    Bug: generateBugTemplate,
    Phase: generatePhaseTemplate,
    Task: generateTaskTemplate
  };

  const generator = generators[type];
  if (!generator) {
    throw new Error(`Unknown work item type: ${type}`);
  }

  return generator(data);
}

/**
 * Generate initial state.json content for a work item
 * @param {string} id - Work item ID
 * @param {string} status - Initial status (default: 'planned')
 * @returns {Object} - State object ready for JSON.stringify
 */
function generateInitialState(id, status = 'planned') {
  return {
    id: id,
    status: status,
    progress: {
      total_items: 0,
      completed: 0,
      in_progress: 0,
      planned: 0,
      percentage: 0
    },
    children: {},
    updated: new Date().toISOString()
  };
}

module.exports = {
  generateTemplate,
  generateFrontmatter,
  generateInitialState,
  generateProjectTemplate,
  generateEpicTemplate,
  generateFeatureTemplate,
  generateStoryTemplate,
  generateBugTemplate,
  generatePhaseTemplate,
  generateTaskTemplate
};
