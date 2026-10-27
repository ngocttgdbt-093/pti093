# Caption Tools 093 — Test module

## Purpose
This is a Core-oriented, reusable module for GHÉP ẢNH 093 and later PTI integration.
PTI should consume the same module/API rather than fork or reimplement its behavior.

## Current API
- `normalizeCaption(text, options)`: conservative Vietnamese capitalization and whitespace normalization.
- `toggleSelection(set, item)`: pure Ctrl-click selection toggle helper.
- `applyCaptionToElements(elements, text, options)`: applies one normalized caption to each target's existing textarea and dispatches input/change events.

## Safety boundary
This commit deliberately does not attach global mouse/pointer/context-menu handlers and does not modify the app HTML. The current app already has thumbnail drag/reorder behavior and textarea listeners; wiring selection events before auditing those exact handlers risks breaking existing workflows. Next integration step is to trace the actual image model/update callback, draft persistence, reorder handlers, and PDF caption renderer, then provide an adapter that calls the existing update/persist path.

## Intended UX
1. Ctrl+click toggles individual thumbnails in the selected set.
2. Left-button drag on a designated selection surface draws a selection rectangle, without starting image reorder.
3. Right-click on a selected thumbnail opens a custom context menu with “Chú thích gộp ảnh…”.
4. The editor previews normalized text before applying to N selected images.
5. Apply updates each image through the app's existing state pipeline; undo/cancel is preferred before commit.
6. AutoCorrect remains conservative by default: capitalization and spacing are automatic; spelling substitutions require an explicit reviewed Vietnamese/domain dictionary.

## Acceptance checks
- `xe bị móp. kiểm tra phần đầu xe.` -> `Xe bị móp. Kiểm tra phần đầu xe.`
- `hư hỏng ở cửa trước! kiểm tra thêm.` -> `Hư hỏng ở cửa trước! Kiểm tra thêm.`
- Empty input remains empty; whitespace is normalized.
- Selection toggling adds/removes exactly one item.
- Applying to N selected cards updates only those cards; unselected cards are unchanged.
- Reload restores all captions; PDF preview/export displays the same text.
- Existing drag reorder, individual caption editing, image removal/replacement, and draft restoration remain unchanged.

## Branch and integration policy
Test branch: `test-caption-bulk-autocorrect-20261027`
Do not merge to `main` until browser-level regression tests pass. After acceptance, merge the module into the 093 Core integration point, then have PTI import the same module/API while retaining its own skin and administration/user-list behavior.
