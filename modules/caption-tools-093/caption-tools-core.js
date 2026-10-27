/**
 * GHÉP ẢNH 093 — Caption Tools Core Module
 * Version: 0.2.0 (test branch)
 *
 * Reusable caption normalization and bulk-apply operations.
 * UI adapters must call these helpers and persist through each app's existing
 * state/save pipeline. No network calls and no AI service.
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

  /**
   * Core-level operation: apply one normalized caption to only the selected
   * items. getId lets 093/PTI adapters use their own stable item identifier.
   */
  function applyCaptionToItems(items, selectedIds, caption, options = {}) {
    const normalized = normalizeCaption(caption, options);
    const list = Array.from(items || []);
    const ids = selectedIds instanceof Set ? selectedIds : new Set(selectedIds || []);
    if (!normalized) {
      return { ok: false, applied: 0, total: ids.size, caption: normalized,
        reason: "empty-caption", failures: [] };
    }
    const getId = typeof options.getId === "function"
      ? options.getId
      : item => item && (item.id ?? item.key);
    const matches = [];
    const failures = [];
    list.forEach((item, index) => {
      try {
        if (ids.has(getId(item))) matches.push({ item, index });
      } catch (error) {
        failures.push({ index, reason: String(error && error.message || error) });
      }
    });

    // Fail closed: never mutate a subset if any requested ID is stale or invalid.
    if (failures.length || matches.length !== ids.size) {
      return { ok: false, applied: 0, total: ids.size, caption: normalized,
        reason: failures.length ? "id-resolution-failed" : "selection-mismatch",
        failures };
    }

    matches.forEach(({ item }) => { item.caption = normalized; });
    return { ok: true, applied: matches.length, total: ids.size,
      caption: normalized, failures };
  }

  /**
   * DOM adapter helper for consumers that explicitly need to update existing
   * caption editors. State-driven apps should prefer applyCaptionToItems.
   */
  function applyCaptionToElements(elements, caption, options = {}) {
    const normalized = normalizeCaption(caption, options);
    const targets = Array.from(elements || []);
    if (!normalized) {
      return { ok: false, applied: 0, total: targets.length, caption: normalized,
        reason: "empty-caption" };
    }
    let applied = 0;
    const failures = [];
    targets.forEach((target, index) => {
      try {
        const editor = target.matches && target.matches("textarea, input")
          ? target
          : target.querySelector && target.querySelector("textarea[data-caption], textarea.caption, textarea");
        if (!editor) {
          failures.push({ index, reason: "caption-editor-not-found" });
          return;
        }
        editor.value = normalized;
        editor.dispatchEvent(new Event("input", { bubbles: true }));
        editor.dispatchEvent(new Event("change", { bubbles: true }));
        applied += 1;
      } catch (error) {
        failures.push({ index, reason: String(error && error.message || error) });
      }
    });
    return { ok: applied > 0 && failures.length === 0, applied,
      total: targets.length, caption: normalized, failures };
  }

  // Presentation helper shared by host apps. Center is the safe default.
  function normalizeCaptionAlignment(value) {
    const alignment = String(value || "center").trim().toLowerCase();
    return alignment === "left" || alignment === "right" || alignment === "center"
      ? alignment
      : "center";
  }

  function toggleSelection(selection, item) {
    const next = new Set(selection || []);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  }

  const api = { normalizeCaption, normalizeCaptionAlignment, applyCaptionToItems, applyCaptionToElements, toggleSelection };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.CaptionTools093 = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
