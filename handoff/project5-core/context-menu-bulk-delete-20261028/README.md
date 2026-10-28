# Project 5 Core Handoff — Context Menu + Bulk Image Delete
**Package:** `context-menu-bulk-delete-20261028`  
**Source project:** GHÉP ẢNH 093, repository `ngocttgdbt-093/pti093`  
**Accepted source commit:** `9c7c39d26c87bd99a74f1fde013fc0fa0e2a8c94`  
**Source path:** `index.html` on `main`  
**Handoff branch:** `handoff-project5-context-menu-delete-20261028`

## Purpose
Transfer the accepted image-selection context menu, bulk delete action, and polished delete-confirmation dialog into Project 5's shared Core. This is an integration package, not a claim that the unknown Project 5 repository has already been changed.

## User-facing behavior
1. User selects one or more image cards using the existing multi-selection interaction.
2. Right-clicking an image card opens a compact context menu at the pointer, clamped to the viewport.
3. If the clicked card is not selected, the existing selection behavior selects that card as the sole target; if it is already selected, preserve the whole selected set.
4. The menu contains exactly two actions, in this order:
   - **Chú thích** — closes the menu and invokes the existing bulk-caption workflow; do not duplicate/reimplement caption normalization.
   - **Xoá** — closes the menu and opens a custom confirmation dialog.
5. Confirmation states the number of images and provides **Xoá N ảnh** and **Huỷ** actions. Cancel, Escape, or clicking the backdrop cancels without deleting.
6. Confirming deletes only the selected live image items, then clears selection, rerenders, schedules the existing auto-draft save, and reports the number removed.

## Visual requirements
- Match the Core's current theme tokens and typography; compact white surface, subtle border/shadow, rounded corners.
- Menu is deliberately small (minimum width 132px), with restrained spacing.
- Use a muted green/neutral style for **Chú thích** and red text/soft red hover for **Xoá**.
- Confirmation dialog has a subtle blurred/dimmed backdrop, clear title/count, neutral **Huỷ** and red destructive **Xoá** button.
- Avoid browser-native `confirm()` and oversized/thick menu treatments.

## Source implementation landmarks
In source `index.html`:
- Markup: `#captionContextMenu`, `#captionContextBulk`, `#captionContextDelete`.
- Styling: `.caption-context-menu`, `.caption-context-delete`, `.caption-delete-backdrop`, `.caption-delete-dialog` and child classes.
- Selection state and right-click handling are in the existing caption-selection controller near `keyFor(card)`, `cards()`, `openMenu()`, and the grid `contextmenu` listener.
- Caption action reuses `applyBulkCaption()`.
- Delete confirmation is `confirmBulkDelete()`; it resolves selected DOM card keys against live cards, filters `state.current.items` by `pti093EnsureDragId(item)`, then calls `clearSelection()`, `render()`, `scheduleAutoDraftSave(true)`, and `msg()`.

## Core integration rules
- Port into the existing Core selection/controller and theme; do not copy the whole source page.
- Reuse Core's stable image identity helper and selected-image state. Never delete by visible index because image order can change.
- Reuse Core's existing bulk-caption action, render pipeline, draft-save mechanism, and message/toast system.
- Scope DOM IDs/classes to avoid collision if the module can mount more than once; bind event listeners once and clean up on unmount if Core uses component lifecycles.
- Keep Drive upload/storage logic out of this package. Do not change upload concurrency, Drive APIs, or record persistence.
- Do not modify the protected rollback marker `final-v1-20261027` or replace Core's shared logic with an old full-page snapshot.

## Acceptance checklist
- [ ] Right-click a selected image with 2+ selected opens the menu and retains all selected targets.
- [ ] Right-click an unselected image follows the established behavior and does not accidentally delete unrelated images.
- [ ] Menu contains only Chú thích and Xoá; compact layout fits near all viewport edges.
- [ ] Chú thích invokes the existing bulk-caption dialog and applies to all selected images.
- [ ] Xoá opens a custom dialog showing the correct count.
- [ ] Huỷ, Escape, and backdrop click do not mutate images or trigger a delete save.
- [ ] Confirm removes exactly the selected image IDs, even if the DOM/order has changed.
- [ ] After deletion, thumbnails/count/selection update and auto-draft save runs once.
- [ ] Keyboard focus remains usable; buttons have clear focus-visible styling and dialog semantics.
- [ ] Regression: single-image delete, reordering, captions, reload/draft restoration, and normal save flows still work.
- [ ] Run Project 5 tests/CI and browser checks; record actual results before accepting Core integration.

## Verification status
- Source changes are committed to GHÉP ẢNH 093 `main` at the accepted commit above.
- The user explicitly confirmed the feature worked in the live UI on 2026-10-28.
- The source file was fetched again after the commit; the compact two-action menu, custom confirmation handler, existing bulk-caption call, and auto-draft save call were present.
- **Not yet verified:** Project 5 Core integration, Project 5 CI, and browser regression testing after porting.
