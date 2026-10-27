"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "../../index.html"), "utf8");
const core = fs.readFileSync(path.join(__dirname, "caption-tools-core.js"), "utf8");

// These are integration-contract checks, not a substitute for browser interaction tests.
const checks = [
  ["loads the reusable Core module", /modules\/caption-tools-093\/caption-tools-core\.js/.test(html)],
  ["supports Ctrl/Cmd-click selection", /e\.ctrlKey\s*\|\|\s*e\.metaKey/.test(html)],
  ["provides drag-selection mode", /Khoanh chọn ảnh/.test(html)],
  ["blocks native reorder during selection", /grid\.addEventListener\('dragstart',e=>\{if\(selectMode\)\{e\.preventDefault\(\);e\.stopPropagation\(\)\}\},true\)/.test(html)],
  ["opens a context menu for bulk caption", /addEventListener\('contextmenu'/.test(html) && /captionContextBulk/.test(html)],
  ["uses the Core bulk-apply API", /CaptionTools093\.applyCaptionToItems/.test(html)],
  ["runs the existing autosave path after bulk apply", /scheduleAutoDraftSave\(true\)/.test(html)],
  ["Core fails closed on stale/ambiguous selections", /matches\.length !== ids\.size/.test(core) && /selection-mismatch/.test(core)]
];

for (const [name, pass] of checks) {
  assert.equal(pass, true, "UI integration contract: " + name);
  console.log("PASS: " + name);
}
console.log("PASS: " + checks.length + " caption UI integration-contract checks.");
