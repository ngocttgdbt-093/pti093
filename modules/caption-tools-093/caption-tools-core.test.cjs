"use strict";
const assert = require("node:assert/strict");
const { normalizeCaption, toggleSelection, applyCaptionToItems } = require("./caption-tools-core.js");

const cases = [
  ["xe bị móp. kiểm tra phần đầu xe.", "Xe bị móp. Kiểm tra phần đầu xe."],
  ["hư hỏng ở cửa trước! kiểm tra thêm.", "Hư hỏng ở cửa trước! Kiểm tra thêm."],
  ["  va chạm   bên trái  ", "Va chạm bên trái"],
  ["", ""],
  ["123 - hư hỏng.", "123 - hư hỏng."]
];
for (const [input, expected] of cases) {
  assert.equal(normalizeCaption(input), expected, "normalizeCaption: " + JSON.stringify(input));
}

const first = { id: "a", caption: "Cũ A" };
const second = { id: "b", caption: "Cũ B" };
const third = { id: "c", caption: "Giữ nguyên C" };
const applied = applyCaptionToItems([first, second, third], new Set(["a", "b"]),
  "xe bị móp. kiểm tra phần đầu xe.", { getId: item => item.id });
assert.equal(applied.ok, true);
assert.equal(applied.applied, 2);
assert.equal(first.caption, "Xe bị móp. Kiểm tra phần đầu xe.");
assert.equal(second.caption, "Xe bị móp. Kiểm tra phần đầu xe.");
assert.equal(third.caption, "Giữ nguyên C", "unselected item must remain unchanged");

const empty = applyCaptionToItems([first], new Set(["a"]), "   ", { getId: item => item.id });
assert.equal(empty.ok, false);
assert.equal(first.caption, "Xe bị móp. Kiểm tra phần đầu xe.", "empty caption must not overwrite existing data");

const one = {}, two = {};
let selected = toggleSelection(new Set(), one);
assert.equal(selected.size, 1);
assert.equal(selected.has(one), true);
selected = toggleSelection(selected, two);
assert.equal(selected.size, 2);
selected = toggleSelection(selected, one);
assert.equal(selected.size, 1);
assert.equal(selected.has(one), false);
assert.equal(selected.has(two), true);


const beforeA = { id: "a", caption: "Original A" };
const beforeB = { id: "b", caption: "Original B" };
const staleSelection = applyCaptionToItems([beforeA, beforeB], new Set(["a", "missing"]),
  "ghi chú chung", { getId: item => item.id });
assert.equal(staleSelection.ok, false, "stale selected IDs must fail safely");
assert.equal(staleSelection.applied, 0);
assert.equal(beforeA.caption, "Original A", "bulk update must be atomic on selection mismatch");
assert.equal(beforeB.caption, "Original B", "unselected item remains unchanged on mismatch");

console.log("PASS: normalization, selected-only updates, empty-input safety, atomic stale-selection safety, and selection toggle.");
