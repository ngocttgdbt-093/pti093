# Project 5 — Core Preview handoff (2026-10-30)

## Acceptance scope

This is a test-only composition of the existing GHÉP ẢNH 093 Core. It is not a rewrite and is not merged into the production branch.

- Core behavior stays in the existing extracted modules.
- The acceptance UI defaults to the **new/Modern skin**. The normal 093 app keeps its existing Classic default and user preference behavior.
- The Drive record/upload adapter is deliberately not loaded in `?corePreview=1`; Drive buttons and status controls are hidden. Drive remains a separate module for a later integration stage.
- The PTI GĐV administration module remains separate and is not loaded by Core Preview. Its frontend has a dedicated PTI API contract and must never call the 093 records API.
- Individual image captions and saved-group captions use the shared caption normalization function; correction is silent, trailing whitespace is preserved while typing and trimmed on blur.
- Local draft/workspace behavior remains in the existing Core owners.

## Changes validated in this preview

1. Added an isolated preview switch and conditional Drive loader so the Drive adapter is not requested or installed in Core Preview.
2. Made the preview choose Modern UI even if browser local storage is blocked; this behavior is isolated to Core Preview.
3. Hid Drive action controls as well as the Drive container in Core Preview.
4. Made the Modern saved-image gallery refresh after save/edit/finish group mutations.
5. Applied silent caption autocorrection to saved-group caption fields in the Modern gallery.
6. Removed duplicate branch predicates from the validation workflow.

## Verification evidence

- GitHub Actions **Validate GHÉP ẢNH 093 Core**: passed on commit `7ab3c45245cba4ce05e3ee611b61341a3ceda883`. The existing Core regression suite ran 10 consecutive rounds.
- Chromium Core Preview acceptance flow: passed 5 consecutive runs. It verifies Modern UI initialization, six default layout cells, image intake, saved-group caption normalization, Preview/PDF download, hidden Drive actions, and no request for `fusion/drive.js`.
- GitHub Actions **Validate Project 5 Core Preview**: passed on the same commit; syntax, module-boundary tests, UI-mode tests and immutable CDN asset checks passed.
- The workflow and PR remain on a draft/test branch; production was not changed.

## Link for user acceptance

`https://cdn.jsdelivr.net/gh/ngocttgdbt-093/pti093@7ab3c45245cba4ce05e3ee611b61341a3ceda883/index.html?corePreview=1`

## Explicitly not yet integrated

- Drive storage module from GHÉP ẢNH 093.
- PTI GĐV administration module from the PTI app.

These must be integrated as separate modules after Core acceptance. The PTI GĐV admin frontend uses a dedicated PTI backend; live authenticated CRUD, persistence/reload, session expiry and authorization checks remain a separate release gate. The current Core Preview tests do not claim to verify the live Drive service or the live PTI admin backend.
