const StateSync = require('./plugins/carl/lib/cascade/state-sync.js');
const CascadeManager = require('./plugins/carl/lib/cascade/cascade-manager.js');
const path = require('path');
const fs = require('fs').promises;

const TEST_DIR = path.join(__dirname, 'test-debug-cascade');

async function test() {
  const manager = new CascadeManager(TEST_DIR);
  const stateSync = new StateSync(manager);

  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch {}

  await manager.initialize();

  const project = await manager.createWorkItem('P', { title: 'Project' });
  const epic = await manager.createWorkItem('E', { title: 'Epic', parent: project.id });
  const feature = await manager.createWorkItem('F', { title: 'Feature', parent: epic.id });

  console.log('Initial states:');
  console.log('Project:', (await stateSync.readCascadeState(project.id)).status);
  console.log('Epic:', (await stateSync.readCascadeState(epic.id)).status);
  console.log('Feature:', (await stateSync.readCascadeState(feature.id)).status);

  await manager.updateStatus(feature.id, 'in-progress');

  console.log('\nAfter updating feature to in-progress:');
  console.log('Feature:', (await stateSync.readCascadeState(feature.id)).status);

  await stateSync.propagateToParent(feature.id);

  console.log('\nAfter propagation:');
  console.log('Feature:', (await stateSync.readCascadeState(feature.id)).status);
  console.log('Epic:', (await stateSync.readCascadeState(epic.id)).status);
  console.log('Project:', (await stateSync.readCascadeState(project.id)).status);

  // Check children as seen by project
  const epicChildren = await manager.getChildren(epic.id);
  console.log('\nEpic children:', epicChildren.map(c => ({ id: c.id, status: c.status })));
  
  const projectChildren = await manager.getChildren(project.id);
  console.log('Project children:', projectChildren.map(c => ({ id: c.id, status: c.status })));

  await fs.rm(TEST_DIR, { recursive: true, force: true });
}

test().catch(console.error);
