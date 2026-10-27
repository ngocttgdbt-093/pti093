/**
 * GHÉP ẢNH 093 — Caption Tools Core Module
 * Version: 0.1.0 (test branch)
 *
 * Conservative Vietnamese caption normalization and bulk-apply helpers.
 * UI selection/menu wiring remains adapter-driven until existing drag/reorder,
 * caption state, draft restore and PDF handlers have been audited.
 * No network calls and no AI service.
 */
(function (global) {
  "use strict";

  const SENTENCE_START = /(^|[.!?…]\s+)([\p{Ll}])/gu;

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
   * Apply a normalized caption to each selected image's existing editor.
   * The caller must persist through the app's established state/save pipeline.
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

  function toggleSelection(selection, item) {
    const next = new Set(selection || []);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  }

  const api = { normalizeCaption, applyCaptionToElements, toggleSelection };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.CaptionTools093 = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
