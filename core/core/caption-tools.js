/**
 * Project 5 Core — Caption Tools
 * Derived from modules/caption-tools-093/caption-tools-core.js
 * UI adapters must persist through the app's existing save pipeline.
 * No network calls. Does not touch Drive, draft, reorder, rotate, or PDF code.
 */
(function (global) {
  "use strict";

  const SENTENCE_START = /(^|[.!?…]["'”’»)\]]*\s+)([\p{Ll}])/gu;

  function normalizeCaption(input, options = {}) {
    if (input == null) return "";
    const capitalizeAfterPunctuation = options.capitalizeAfterPunctuation !== false;
    let value = String(input)
      .replace(/[\t\u00a0]+/g, " ")
      .replace(/ {2,}/g, " ")
      .trim();
    if (!value) return "";
    value = value.replace(/^(\s*[^\p{L}\p{N}]*)([\p{Ll}])/u, (_, prefix, letter) =>
      prefix + letter.toLocaleUpperCase("vi-VN"));
    if (capitalizeAfterPunctuation) {
      value = value.replace(SENTENCE_START, (_, boundary, letter) =>
        boundary + letter.toLocaleUpperCase("vi-VN"));
    }
    return value;
  }

  function applyCaptionToItems(items, selectedIds, caption, options = {}) {
    const normalized = normalizeCaption(caption, options);
    const list = Array.from(items || []);
    const ids = selectedIds instanceof Set ? selectedIds : new Set(selectedIds || []);
    if (!normalized) return { ok: false, applied: 0, total: ids.size, caption: normalized,
      reason: "empty-caption", failures: [] };
    const getId = typeof options.getId === "function"
      ? options.getId : item => item && (item.id ?? item.key);
    const matches = [];
    const failures = [];
    list.forEach((item, index) => {
      try {
        if (ids.has(getId(item))) matches.push({ item, index });
      } catch (error) {
        failures.push({ index, reason: String(error && error.message || error) });
      }
    });
    if (failures.length || matches.length !== ids.size) {
      return { ok: false, applied: 0, total: ids.size, caption: normalized,
        reason: failures.length ? "id-resolution-failed" : "selection-mismatch", failures };
    }
    matches.forEach(({ item }) => { item.caption = normalized; });
    return { ok: true, applied: matches.length, total: ids.size, caption: normalized, failures };
  }

  function toggleSelection(selection, item) {
    const next = new Set(selection || []);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  }

  const api = { normalizeCaption, applyCaptionToItems, toggleSelection };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.PTI093CaptionTools = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
