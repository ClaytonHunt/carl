/**
 * SessionState Basic Usage Example
 *
 * Demonstrates the basic workflow of session state management.
 *
 * Run: node plugins/carl/lib/workflow/examples/basic-usage.js
 */

const SessionState = require('../session-state');
const fs = require('fs').promises;
const path = require('path');

async function main() {
  console.log('=== SessionState Basic Usage Example ===\n');

  // 1. Create and initialize session
  console.log('1. Creating new session...');
  const session = new SessionState();
  await session.initialize();
  console.log(`   ✓ Session created: ${session.sessionId}`);
  console.log(`   ✓ Session dir: ${session.sessionDir}\n`);

  // 2. Update workflow metadata
  console.log('2. Setting workflow metadata...');
  await session.setWorkflow({
    name: 'example-workflow',
    step: 'initialization',
    status: 'in-progress'
  });
  console.log('   ✓ Workflow metadata set\n');

  // 3. Update state as work progresses
  console.log('3. Updating state...');
  await session.setState({
    input: 'Example user request',
    inputType: 'description'
  });
  console.log('   ✓ State updated (input, inputType)\n');

  // 4. Log events
  console.log('4. Logging events...');
  await session.logEvent('workflow_started', { user: 'example' });
  await session.logEvent('context_loaded', { hasData: true });
  console.log('   ✓ Events logged\n');

  // 5. Update state with more data
  console.log('5. Adding more state data...');
  await session.setState({
    breakdown: [
      { type: 'E', data: { title: 'Example Epic' } },
      { type: 'F', data: { title: 'Example Feature' } }
    ]
  });
  console.log('   ✓ Breakdown added to state\n');

  // 6. Log progress
  await session.logEvent('breakdown_created', { itemCount: 2 });

  // 7. Read and display final state
  console.log('6. Reading final state...');
  const finalState = await session.getState();
  console.log('   State:');
  console.log(`     - sessionId: ${finalState.sessionId}`);
  console.log(`     - workflow: ${JSON.stringify(finalState.workflow)}`);
  console.log(`     - data.input: ${finalState.data.input}`);
  console.log(`     - data.breakdown: ${finalState.data.breakdown.length} items\n`);

  // 8. Read event log
  console.log('7. Reading event log...');
  const events = await session.getEvents();
  console.log(`   ✓ ${events.length} events logged:`);
  events.forEach((event, i) => {
    console.log(`     ${i + 1}. ${event.type} (${event.timestamp})`);
  });
  console.log();

  // 9. Create artifacts directory and save a file
  console.log('8. Saving artifact...');
  const artifactsDir = await session.ensureArtifactsDir();
  const artifactPath = path.join(artifactsDir, 'breakdown.json');
  await fs.writeFile(
    artifactPath,
    JSON.stringify(finalState.data.breakdown, null, 2)
  );
  console.log(`   ✓ Artifact saved: ${artifactPath}\n`);

  // 10. Demonstrate session resume
  console.log('9. Demonstrating session resume...');
  const resumed = await SessionState.resume(session.sessionId);
  const resumedState = await resumed.getState();
  console.log(`   ✓ Session resumed: ${resumed.sessionId}`);
  console.log(`   ✓ State preserved: ${resumedState.data.input}\n`);

  // 11. Inspect files
  console.log('10. Session files created:');
  console.log(`    - ${session.stateFile}`);
  console.log(`    - ${session.eventsFile}`);
  console.log(`    - ${artifactPath}\n`);

  console.log('=== Example Complete ===');
  console.log(`\nSession directory preserved for inspection: ${session.sessionDir}`);
  console.log('Clean up with: await session.cleanup()');
  console.log('Or run: node plugins/carl/lib/workflow/cleanup-sessions.js\n');

  // Note: Not cleaning up so you can inspect the files
  // await session.cleanup();
}

// Run example
main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
