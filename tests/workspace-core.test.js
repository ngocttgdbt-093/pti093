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

const editingSnapshot = {
  groups: [
    { title: 'B', items: [{ id: 2 }] },
    { title: 'A', items: [{ id: 3 }] }
  ],
  current: { title: 'A', items: [{ id: 1 }] },
  editing: 0
};
const editingSnapshotResult = core.snapshotGroupsForProject(editingSnapshot);
assert.deepEqual(editingSnapshotResult.map(g => g.title), ['A', 'B', 'A'],
  'editing a group must preserve its original index even if another group at the end has the same title');
assert.deepEqual(editingSnapshotResult.map(g => g.items.map(item => item.id)), [[1], [2], [3]]);
assert.deepEqual(editingSnapshot.groups.map(g => g.title), ['B', 'A'],
  'editing snapshot must not mutate source group ordering');

assert.deepEqual(core.snapshotGroupsForProject({ groups: [], current: { title: 'Empty', items: [] } }), []);
const emptyCommit = { groups: [], current: { title: 'Empty', items: [] }, editing: -1 };
assert.equal(core.commitCurrent(emptyCommit), null, 'empty current group should not commit');
const mergeCommit = { groups: [{ title: 'Giấy tờ', items: [{ id: 1 }] }], current: { title: 'Giấy tờ', items: [{ id: 2 }] }, editing: -1 };
assert.deepEqual(core.commitCurrent(mergeCommit).items.map(x => x.id), [2]);
assert.deepEqual(mergeCommit.groups[0].items.map(x => x.id), [1, 2], 'same-title current group should merge into the last group');
const appendCommit = { groups: [{ title: 'Hiện trường', items: [{ id: 1 }] }], current: { title: 'Giấy tờ', items: [{ id: 2 }] }, editing: -1 };
core.commitCurrent(appendCommit);
assert.deepEqual(appendCommit.groups.map(g => g.title), ['Hiện trường', 'Giấy tờ'], 'different title should append a new group');
const editCommit = { groups: [{ title: 'A', items: [{ id: 1 }] }, { title: 'B', items: [{ id: 2 }] }], current: { title: 'Sửa lại', items: [{ id: 3 }] }, editing: 1 };
core.commitCurrent(editCommit);
assert.deepEqual(editCommit.groups.map(g => g.title), ['A', 'Sửa lại', 'B'], 'editing should reinsert at the original index');
assert.equal(editCommit.editing, -1, 'editing marker should reset after commit');
const editState = {
  groups: [{ title: 'Đăng kiểm', items: [{ id: 8 }] }],
  current: { title: 'Đang làm', items: [{ id: 9 }] },
  filenameCaption: true, editing: -1, pages: [{ id: 'old-preview' }]
};
assert.equal(core.beginEditGroup(editState, 0), true);
assert.equal(editState.current.title, 'Đăng kiểm');
assert.deepEqual(editState.current.items.map(x => x.id), [8]);
assert.equal(editState.groups.length, 0);
assert.equal(editState.editing, 0);
assert.equal(editState.filenameCaption, false);
assert.deepEqual(editState.pages, []);
assert.equal(core.beginEditGroup(editState, 99), false, 'missing group index should be rejected safely');
const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');
const appCore = fs.readFileSync('core/app-core.js', 'utf8');
const groupWorkflow = fs.readFileSync('core/group-workflow.js', 'utf8');
assert.ok(html.includes('src="./core/workspace.js"'), 'index.html should load workspace Core');
assert.ok(appCore.includes('workspaceCore.snapshotGroupsForProject(state)'), 'App Core should bind the shared snapshot adapter');
assert.ok(html.includes('src="./core/group-workflow.js"'), 'index.html should load Group Workflow Core');
assert.ok(groupWorkflow.includes('workspaceCore.commitCurrent(state)'), 'Group Workflow Core should delegate group commit behavior to Workspace Core');
assert.ok(groupWorkflow.includes('workspaceCore.beginEditGroup(state,index)'), 'Group Workflow Core should delegate edit-group state transition to Workspace Core');
console.log('Shared workspace Core tests passed (snapshot and group-commit contracts).');
