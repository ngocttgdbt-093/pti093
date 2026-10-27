"use strict";
const assert = require("node:assert/strict");
const { normalizeCaption, toggleSelection } = require("./caption-tools-core.js");

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

const first = {};
const second = {};
let selected = toggleSelection(new Set(), first);
assert.equal(selected.size, 1);
assert.equal(selected.has(first), true);
selected = toggleSelection(selected, second);
assert.equal(selected.size, 2);
selected = toggleSelection(selected, first);
assert.equal(selected.size, 1);
assert.equal(selected.has(first), false);
assert.equal(selected.has(second), true);

console.log("PASS: 5 AutoCorrect cases; Ctrl-selection add/remove cases.");
