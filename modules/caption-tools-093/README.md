# Caption Tools 093 — Test module

## Purpose
Reusable Core-oriented caption behavior for GHÉP ẢNH 093 and future PTI integration. PTI must reuse this module/API instead of maintaining a fork.

## Current implementation
- `modules/caption-tools-093/caption-tools-core.js`: conservative Vietnamese capitalization/spacing normalization, bulk-caption helper, and selection helper.
- `index.html` on this test branch: selection toolbar, Ctrl/Cmd-click selection, dedicated drag-to-select mode, custom right-click menu, normalized-caption confirmation, and application to the selected items' existing `item.caption` field.
- Bulk application calls the existing `render()` and `scheduleAutoDraftSave(true)` paths. No network calls or external AI service are used.

## Interaction design
1. Ctrl-click (or Cmd-click on Mac) toggles an individual thumbnail.
2. Click **Khoanh chọn ảnh** to enter a dedicated drag-selection mode. This explicit mode is intentional: it prevents the existing thumbnail drag/reorder interaction from being hijacked.
3. Right-click a selected thumbnail and choose **Chú thích gộp ảnh…**; the same action is available from the toolbar.
4. Enter one caption. The normalized result is shown for confirmation before application to the selected image set.
5. Only selected items in the current working group are changed. The existing autosave path is triggered afterward.

## Current safety boundaries / known limitations
- AutoCorrect performs conservative capitalization and whitespace normalization only. It handles sentence starts after `.`, `!`, `?`, or ellipsis, including common closing quotes/brackets before whitespace. It does not claim to correct arbitrary Vietnamese spelling or semantic mistakes.
- Bulk updates fail closed if selected IDs are stale, ambiguous/duplicated, or cannot be resolved; no partial caption update is applied.
- Drag selection and right-click menu are integrated in the test branch but have not yet passed browser-level regression tests.
- The current editor uses `prompt/confirm` for the first test UI; this can be replaced with a polished dialog after behavior is validated.
- Confirm that the actual deployed app path serves `./modules/caption-tools-093/caption-tools-core.js` from the same repository root.
- Do not merge into `main` until the browser-level acceptance suite passes.

## Acceptance checks
- Capitalize the first letter and the first lowercase letter after `.`, `!`, `?`, or ellipsis when followed by whitespace.
- Preserve empty captions; normalize repeated spaces and tabs.
- Ctrl/Cmd-click adds/removes exactly one thumbnail from selection.
- Drag-selection selects only cards intersecting the rectangle and does not reorder them.
- Right-clicking a selected card retains the selection; right-clicking an unselected card selects only that card before opening the menu.
- Applying a caption updates selected items only, leaves unselected captions unchanged, triggers autosave, and appears in preview/PDF.
- Reload restores captions; individual editing, image removal/replacement, drag reorder and draft restoration continue to work.

## Branch and integration policy
Test branch: `test-caption-bulk-autocorrect-20261027`.
After browser testing succeeds, merge the module into the 093 Core integration point. Then integrate the same module/API into PTI while retaining PTI's separate skin and administration/user-list behavior.
