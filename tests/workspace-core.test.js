const assert = require('node:assert/strict');
global.window = global;
require('../core/workspace.js');
const core = global.PTIWorkspaceCore;
assert.ok(core, 'Shared workspace Core module should load');
const state = {
  groups: [
    { title: 'Thiệt hại', items: [{ id: 1 }] },
    { title: 'Rỗng', items: [] },
    { title: 'Giấy tờ', items: [{ id: 3 }] }
  ],
  current: { title: 'Giấy tờ', items: [{ id: 4 }] }
};
assert.equal(core.getAllGroups(state).length, 2);
const snapshot = core.snapshotGroupsForProject(state);
assert.deepEqual(snapshot.map(g => g.title), ['Thiệt hại', 'Giấy tờ']);
assert.deepEqual(snapshot[0].items.map(x => x.id), [1]);
assert.deepEqual(snapshot[1].items.map(x => x.id), [3, 4]);
assert.equal(state.groups[0].items.length, 1, 'Snapshot must not mutate working group arrays');
assert.equal(state.current.items.length, 1, 'Snapshot must not mutate current items');
assert.deepEqual(core.snapshotGroupsForProject({ groups: [], current: { title: 'Empty', items: [] } }), []);
const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');
assert.ok(html.includes('src="./core/workspace.js"'), 'index.html should load workspace Core');
assert.ok(html.includes('workspaceCore.snapshotGroupsForProject(state)'), 'App should bind the shared snapshot adapter');
console.log('Shared workspace Core tests passed (8 assertions).');
