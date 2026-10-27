# Project 5 Core Handoff — Image Selection & Caption Tools

Source release: `ngocttgdbt-093/pti093` — `Final-v1-20261027.1`
PTI target: `ngocttgdbt-093/pti`

**Scope excludes Google Drive image upload/storage.** Do not copy or modify the 093 Drive upload/storage module. Existing app-specific Drive administration/user-catalogue functions are outside this handoff and must remain untouched.

## Included upgrades
- Image-only multi-file picker label “Chọn ảnh”.
- Desktop Ctrl/Cmd-click toggle selection.
- Desktop Shift-click inclusive range selection in current rendered image order.
- Desktop rectangle drag-select.
- Mobile tap-to-toggle selection; clicking blank space clears selection.
- Selection count and visible selected state.
- Bulk caption dialog with Apply/Cancel and Enter/Escape behavior.
- Conservative caption normalization (whitespace cleanup and sentence-start capitalization; not a full Vietnamese spellchecker).
- Autosave through the host app's existing local-draft mechanism.
- Caption text alignment centered in editor and preview/PDF canvas; generated DOCX caption paragraphs are centered already.
- Footer version label aligned with the 093 release naming: `Final-v1-20261027.1`.

## Core integration contract
1. Reuse `modules/caption-tools-093/caption-tools-core.js` for normalization and bulk-apply operations.
2. Adapt UI selectors and save hooks to each host app; do not copy app-specific state or storage logic blindly.
3. Treat caption alignment as a presentation property with allowed values `left`, `center`, `right`, default `center`; apply consistently to editor, preview/PDF, and generated documents.
4. Keep transient selected IDs out of persisted case data.
5. Preserve image reorder, PDF export, local draft recovery, and application-specific administration.
6. No Drive image upload/storage code is part of this package.

## Verification checklist
- [ ] Shift-click selects the inclusive range in both directions.
- [ ] Ctrl/Cmd-click toggles single images without losing other selections.
- [ ] Rectangle drag-select works and does not interfere with reorder.
- [ ] Mobile tap selection and blank-area clear work.
- [ ] Bulk caption apply/cancel/Enter/Escape works.
- [ ] Draft recovery survives reload.
- [ ] Center alignment is consistent in editor, preview/PDF, and generated documents.
- [ ] Existing reorder, PDF export, local draft, and administration still work.
- [ ] No Drive image upload/storage module was added.

## Status and limitation
The PTI implementation was committed to its `main` branch. This document is the Core handoff package, not proof that the separate Project 5 Core repository has been modified. The Project 5 Core repository was not identifiable among repositories currently accessible through the connected GitHub account. Browser-level regression testing and live behavior remain unverified.
