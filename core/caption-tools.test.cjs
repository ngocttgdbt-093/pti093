const assert = require("node:assert/strict");
const tools = require("./caption-tools.js");

assert.equal(tools.normalizeCaption("  tổn   thất xe. hư hỏng  "), "Tổn thất xe. Hư hỏng");
assert.equal(tools.normalizeCaption(""), "");
assert.equal(tools.normalizeCaption("xe va chạm! kính vỡ"), "Xe va chạm! Kính vỡ");

const items = [{ id: "a", caption: "cũ A" }, { id: "b", caption: "cũ B" }, { id: "c", caption: "giữ nguyên" }];
const ok = tools.applyCaptionToItems(items, new Set(["a", "b"]), "  hiện   trường xe  ");
assert.equal(ok.ok, true);
assert.equal(ok.applied, 2);
assert.equal(items[0].caption, "Hiện trường xe");
assert.equal(items[1].caption, "Hiện trường xe");
assert.equal(items[2].caption, "giữ nguyên");

const before = items.map(x => x.caption);
const stale = tools.applyCaptionToItems(items, new Set(["a", "missing"]), "không cập nhật");
assert.equal(stale.ok, false);
assert.deepEqual(items.map(x => x.caption), before);

const duplicate = [{ id: "x", caption: "one" }, { id: "x", caption: "two" }];
const mismatch = tools.applyCaptionToItems(duplicate, new Set(["x"]), "thử");
assert.equal(mismatch.ok, false);
assert.deepEqual(duplicate.map(x => x.caption), ["one", "two"]);

const toggled = tools.toggleSelection(new Set(["a"]), "b");
assert.deepEqual([...toggled].sort(), ["a", "b"]);
assert.deepEqual([...tools.toggleSelection(toggled, "a")], ["b"]);

console.log("PASS: caption-tools core unit tests");
