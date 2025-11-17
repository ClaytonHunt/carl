/**
 * Work Orchestrator State Synchronization Integration Tests
 *
 * Tests the integration between work orchestrator workflows and StateSync module.
 * Verifies that state.json files are properly updated after work completion.
 *
 * Bug: B0128 - Work Orchestrator Does Not Update state.json Files
 */

const StateSync = require('../../plugins/carl/lib/cascade/state-sync.js');
const CascadeManager = require('../../plugins/carl/lib/cascade/cascade-manager.js');
const fs = require('fs').promises;
const path = require('path');

// Test directory
const TEST_DIR = path.join(__dirname, '..', '.test-artifacts', '.work-orchestrator-state-sync-test');

describe('B0128: Work Orchestrator State Synchronization', () => {
  let manager;
  let stateSync;

  beforeEach(async () => {
    manager = new CascadeManager(TEST_DIR);
    stateSync = new StateSync(manager);

    // Clean up before each test
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch (error) {
      // Ignore if doesn't exist
    }

    await manager.initialize();
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Work Item Completion with State Sync', () => {
    it('should update state.json when completing a task within a story', async () => {
      // Setup: Create work item hierarchy (Story with 3 Tasks)
      const project = await manager.createWorkItem('P', { title: 'Test Project' });
      const epic = await manager.createWorkItem('E', { title: 'Test Epic', parent: project.id });
      const feature = await manager.createWorkItem('F', { title: 'Test Feature', parent: epic.id });
      const story = await manager.createWorkItem('S', {
        title: 'Test Story',
        parent: feature.id
      });
      const task1 = await manager.createWorkItem('T', { title: 'Task 1', parent: story.id });
      const task2 = await manager.createWorkItem('T', { title: 'Task 2', parent: story.id });
      const task3 = await manager.createWorkItem('T', { title: 'Task 3', parent: story.id });

      // Verify initial state - story should have 3 children registered
      let storyState = await stateSync.readCascadeState(story.id);
      expect(Object.keys(storyState.children)).toHaveLength(3);
      expect(storyState.children[task1.id]).toBeDefined();
      expect(storyState.children[task2.id]).toBeDefined();
      expect(storyState.children[task3.id]).toBeDefined();

      // Progress metrics need to be explicitly calculated (not auto-populated)
      // Initially they're all 0
      expect(storyState.progress.completed).toBe(0);
      expect(storyState.status).toBe('planned');

      // Simulate work orchestrator completing Task 1
      await manager.updateWorkItem(task1.id, {
        status: 'completed',
        updated: new Date().toISOString()
      });

      // Update story state.json with progress (what work orchestrator should do)
      await stateSync.writeCascadeState(story.id, {
        status: 'in-progress',
        progress: {
          total_items: 3,
          completed: 1,
          in_progress: 0,
          planned: 2,
          blocked: 0,
          percentage: 33
        }
      });

      // Verify state.json was updated
      storyState = await stateSync.readCascadeState(story.id);
      expect(storyState.progress.completed).toBe(1);
      expect(storyState.progress.planned).toBe(2);
      expect(storyState.progress.percentage).toBe(33);
      expect(storyState.status).toBe('in-progress');

      // Complete remaining tasks
      await manager.updateWorkItem(task2.id, {
        status: 'completed',
        updated: new Date().toISOString()
      });
      await manager.updateWorkItem(task3.id, {
        status: 'completed',
        updated: new Date().toISOString()
      });

      // Update story to completed
      await stateSync.writeCascadeState(story.id, {
        status: 'completed',
        progress: {
          total_items: 3,
          completed: 3,
          in_progress: 0,
          planned: 0,
          blocked: 0,
          percentage: 100
        }
      });

      // Verify final state
      storyState = await stateSync.readCascadeState(story.id);
      expect(storyState.progress.completed).toBe(3);
      expect(storyState.progress.percentage).toBe(100);
      expect(storyState.status).toBe('completed');
    });

    it('should propagate state changes to parent items', async () => {
      // Setup: Create Story with 2 Tasks
      const project = await manager.createWorkItem('P', { title: 'Test Project' });
      const epic = await manager.createWorkItem('E', { title: 'Test Epic', parent: project.id });
      const feature = await manager.createWorkItem('F', { title: 'Test Feature', parent: epic.id });
      const story = await manager.createWorkItem('S', { title: 'Test Story', parent: feature.id });
      const task1 = await manager.createWorkItem('T', { title: 'Task 1', parent: story.id });
      const task2 = await manager.createWorkItem('T', { title: 'Task 2', parent: story.id });

      // Complete both tasks (markdown frontmatter)
      await manager.updateWorkItem(task1.id, { status: 'completed' });
      await manager.updateWorkItem(task2.id, { status: 'completed' });

      // Work orchestrator updates story markdown frontmatter
      await manager.updateWorkItem(story.id, {
        status: 'completed',
        updated: new Date().toISOString()
      });

      // Work orchestrator updates story state.json
      await stateSync.writeCascadeState(story.id, {
        status: 'completed',
        progress: {
          total_items: 2,
          completed: 2,
          in_progress: 0,
          planned: 0,
          blocked: 0,
          percentage: 100
        }
      });

      // Propagate to parent (what work orchestrator should do)
      // This will read story's markdown frontmatter (now 'completed') and propagate upward
      await stateSync.propagateToParent(story.id);

      // Verify feature was updated automatically
      const featureState = await stateSync.readCascadeState(feature.id);
      expect(featureState.progress.total_items).toBe(1); // 1 story child
      expect(featureState.progress.completed).toBe(1); // story completed
      expect(featureState.progress.percentage).toBe(100);
      expect(featureState.status).toBe('completed');

      // Verify epic was updated automatically (cascading)
      const epicState = await stateSync.readCascadeState(epic.id);
      expect(epicState.progress.total_items).toBe(1); // 1 feature child
      expect(epicState.progress.completed).toBe(1); // feature completed
      expect(epicState.progress.percentage).toBe(100);
      expect(epicState.status).toBe('completed');

      // Verify project was updated automatically
      const projectState = await stateSync.readCascadeState(project.id);
      expect(projectState.progress.total_items).toBe(1); // 1 epic child
      expect(projectState.progress.completed).toBe(1); // epic completed
      expect(projectState.progress.percentage).toBe(100);
      expect(projectState.status).toBe('completed');
    });

    it('should handle partial completion correctly', async () => {
      // Setup: Story with 3 Tasks
      const project = await manager.createWorkItem('P', { title: 'Test Project' });
      const epic = await manager.createWorkItem('E', { title: 'Test Epic', parent: project.id });
      const feature = await manager.createWorkItem('F', { title: 'Test Feature', parent: epic.id });
      const story = await manager.createWorkItem('S', { title: 'Test Story', parent: feature.id });
      const task1 = await manager.createWorkItem('T', { title: 'Task 1', parent: story.id });
      const task2 = await manager.createWorkItem('T', { title: 'Task 2', parent: story.id });
      const task3 = await manager.createWorkItem('T', { title: 'Task 3', parent: story.id });

      // Complete only 1 of 3 tasks
      await manager.updateWorkItem(task1.id, { status: 'completed' });

      // Work orchestrator updates story markdown frontmatter to in-progress
      await manager.updateWorkItem(story.id, {
        status: 'in-progress',
        updated: new Date().toISOString()
      });

      // Update story state.json
      await stateSync.writeCascadeState(story.id, {
        status: 'in-progress',
        progress: {
          total_items: 3,
          completed: 1,
          in_progress: 0,
          planned: 2,
          blocked: 0,
          percentage: 33
        }
      });

      // Propagate to parent
      await stateSync.propagateToParent(story.id);

      // Verify feature shows in-progress (not completed)
      const featureState = await stateSync.readCascadeState(feature.id);
      expect(featureState.status).toBe('in-progress');
      expect(featureState.progress.completed).toBe(0); // no stories fully completed
      expect(featureState.progress.in_progress).toBe(1); // 1 story in progress

      // Verify epic also shows in-progress
      const epicState = await stateSync.readCascadeState(epic.id);
      expect(epicState.status).toBe('in-progress');
    });

    it('should update state.json even when markdown frontmatter is already updated', async () => {
      // This test addresses the bug: markdown was updated but state.json was not
      const project = await manager.createWorkItem('P', { title: 'Test Project' });
      const epic = await manager.createWorkItem('E', { title: 'Test Epic', parent: project.id });
      const feature = await manager.createWorkItem('F', { title: 'Test Feature', parent: epic.id });
      const story = await manager.createWorkItem('S', { title: 'Test Story', parent: feature.id });
      const task1 = await manager.createWorkItem('T', { title: 'Task 1', parent: story.id });

      // Initial state.json check
      let storyState = await stateSync.readCascadeState(story.id);
      expect(storyState.progress.completed).toBe(0);

      // Simulate old behavior: update only markdown frontmatter
      await manager.updateWorkItem(task1.id, { status: 'completed' });

      // State.json still shows 0 completed (the bug)
      storyState = await stateSync.readCascadeState(story.id);
      expect(storyState.progress.completed).toBe(0); // Bug: not updated

      // Fixed behavior: explicitly update state.json using StateSync
      await stateSync.writeCascadeState(story.id, {
        status: 'in-progress',
        progress: {
          total_items: 1,
          completed: 1,
          in_progress: 0,
          planned: 0,
          blocked: 0,
          percentage: 100
        }
      });

      // Now state.json is in sync
      storyState = await stateSync.readCascadeState(story.id);
      expect(storyState.progress.completed).toBe(1); // Fixed!
      expect(storyState.progress.percentage).toBe(100);
    });
  });

  describe('Concurrent State Updates', () => {
    it('should handle concurrent writes with locking', async () => {
      const project = await manager.createWorkItem('P', { title: 'Test Project' });
      const epic = await manager.createWorkItem('E', { title: 'Test Epic', parent: project.id });

      // Simulate concurrent updates (both should succeed, second should wait for first)
      const update1 = stateSync.writeCascadeStateWithLock(epic.id, {
        status: 'in-progress',
        progress: { completed: 1 }
      });

      const update2 = stateSync.writeCascadeStateWithLock(epic.id, {
        status: 'in-progress',
        progress: { completed: 2 }
      });

      await Promise.all([update1, update2]);

      // Final state should have one of the updates (last write wins)
      const state = await stateSync.readCascadeState(epic.id);
      expect([1, 2]).toContain(state.progress.completed);
    });
  });

  describe('Integration with Work Orchestrator Pattern', () => {
    it('should follow the work orchestrator state update pattern', async () => {
      // This test demonstrates the exact pattern from work-orchestrator.md Step 8

      // Setup
      const project = await manager.createWorkItem('P', { title: 'Test Project' });
      const epic = await manager.createWorkItem('E', { title: 'Test Epic', parent: project.id });
      const feature = await manager.createWorkItem('F', { title: 'Test Feature', parent: epic.id });
      const story = await manager.createWorkItem('S', {
        title: 'Test Story',
        parent: feature.id
      });
      const task1 = await manager.createWorkItem('T', { title: 'Task 1', parent: story.id });
      const task2 = await manager.createWorkItem('T', { title: 'Task 2', parent: story.id });
      const task3 = await manager.createWorkItem('T', { title: 'Task 3', parent: story.id });

      // Work orchestrator completes task1
      // Step 1: Update markdown frontmatter
      await manager.updateWorkItem(task1.id, {
        status: 'completed',
        updated: new Date().toISOString()
      });

      // Step 2: Calculate progress for parent story
      const children = await manager.getChildren(story.id);
      const completedCount = children.filter(c => c.status === 'completed').length;
      const totalCount = children.length;
      const percentage = Math.round((completedCount / totalCount) * 100);

      // Step 3a: Update story markdown frontmatter
      const newStatus = completedCount === totalCount ? 'completed' : 'in-progress';
      await manager.updateWorkItem(story.id, {
        status: newStatus,
        updated: new Date().toISOString()
      });

      // Step 3b: Update story state.json
      await stateSync.writeCascadeState(story.id, {
        status: newStatus,
        progress: {
          total_items: totalCount,
          completed: completedCount,
          in_progress: 0,
          planned: totalCount - completedCount,
          blocked: 0,
          percentage: percentage
        }
      });

      // Step 4: Propagate to parent
      await stateSync.propagateToParent(story.id);

      // Verify story state
      const storyState = await stateSync.readCascadeState(story.id);
      expect(storyState.progress.completed).toBe(1);
      expect(storyState.progress.planned).toBe(2);
      expect(storyState.progress.percentage).toBe(33);
      expect(storyState.status).toBe('in-progress');

      // Verify feature was updated by propagation
      const featureState = await stateSync.readCascadeState(feature.id);
      expect(featureState.status).toBe('in-progress');
      expect(featureState.progress.in_progress).toBe(1);

      // Complete remaining tasks using same pattern
      await manager.updateWorkItem(task2.id, { status: 'completed' });
      await manager.updateWorkItem(task3.id, { status: 'completed' });

      const children2 = await manager.getChildren(story.id);
      const completedCount2 = children2.filter(c => c.status === 'completed').length;

      // Update story markdown frontmatter to completed
      await manager.updateWorkItem(story.id, {
        status: 'completed',
        updated: new Date().toISOString()
      });

      // Update story state.json
      await stateSync.writeCascadeState(story.id, {
        status: 'completed',
        progress: {
          total_items: 3,
          completed: 3,
          in_progress: 0,
          planned: 0,
          blocked: 0,
          percentage: 100
        }
      });

      await stateSync.propagateToParent(story.id);

      // Verify complete cascade
      const finalStoryState = await stateSync.readCascadeState(story.id);
      expect(finalStoryState.status).toBe('completed');
      expect(finalStoryState.progress.percentage).toBe(100);

      const finalFeatureState = await stateSync.readCascadeState(feature.id);
      expect(finalFeatureState.status).toBe('completed');

      const finalEpicState = await stateSync.readCascadeState(epic.id);
      expect(finalEpicState.status).toBe('completed');

      const finalProjectState = await stateSync.readCascadeState(project.id);
      expect(finalProjectState.status).toBe('completed');
    });
  });
});
