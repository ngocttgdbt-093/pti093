# Core Refactor Audit — v1-20261022

## Purpose and safety boundaries

This file records the initial source audit for the shared Core refactor of GHÉP ẢNH 093 and GHÉP ẢNH PTI. It is an implementation log, not a claim that the refactor or browser acceptance tests are complete.

- Keep both `main` branches and current production deployments unchanged during refactor.
- Treat the currently working 093 Core, 093 Drive case-saving, and PTI administrator/user-directory function as stable behavior to preserve.
- User-confirmed regression baseline (2026-10-22): the user tested 093 draft recovery after reload/F5 10 times today and all 10 succeeded. Treat that as trusted behavioral evidence; the refactor must preserve it, not re-litigate whether the current behavior works.
- PTI must not save image cases to Drive. The user confirms the case-save button has already been removed from the visible PTI UI; source code may still contain dormant handlers or upload functions, so audit the complete call paths rather than assuming the button is present. Remove/disable only PTI case-save entry points on this test branch. Preserve the separate administrator/login/permissions/user-directory Drive integration.
- Do not copy code blindly between apps. First map dependencies and test each extracted module.
- A syntax check is not a functional regression test and must never be reported as acceptance.

## Version naming

- Major milestone: `vN-YYYYMMDD`, where `N` increases only for a meaningful large milestone.
- Small changes on the same date: append `.1`, `.2`, `.3` in commit order.
- Use the actual implementation date in the suffix. Keep application build footers separate from this refactor/test-project version.
- Initial branch baseline: `v1-20261022`.
- Test-workflow enablement: `v1-20261022.1`.
- Workflow regex correction: `v1-20261022.2`.

## Test branches

- 093: `refactor/core-modules-test-20261022`
  - At creation it matched `main` exactly (compare status: `identical`, 0 commits ahead/behind).
  - Workflow updates are on this test branch only.
- PTI: `refactor/core-modules-test-20261022`
  - Created from PTI `main`.
  - Workflow updates are on this test branch only.
- No production branch has been changed by these steps. No test deployment URL has been published.

## Initial source observations

### GHÉP ẢNH 093

- Main source is a single large `index.html` containing UI and inline JavaScript.
- Source footer currently identifies build `v59-20261020.1`.
- Local autosave uses IndexedDB database `pti093_local_drafts_v1`, draft ID `AUTO-DRAFT`, and session key `pti093_work_session_id`.
- Draft logic includes `scheduleAutoDraftSave`, `saveAutoDraft`, `restoreAutoDraft`, `clearAutoDraft`, and `finalizeCompletedSession`.
- End-of-page handlers call restore on startup and save on `pagehide` / `visibilitychange`.
- The stable Drive case-saving implementation is present in 093 and is out of scope for redesign.

### GHÉP ẢNH PTI

- Main source is a large `index.html` plus a separate `admin-gdv/admin-gdv.js`.
- Source footer currently identifies build `v50-20261022`.
- Local autosave uses IndexedDB database `pti_local_drafts_v1`, draft ID `AUTO-DRAFT`, and session key `pti_work_session_id`.
- PTI has extra active-session heartbeat and stale-session cleanup logic in addition to restore/save handlers. Preserve its intent unless tests demonstrate a defect.
- The separate admin script documents a dedicated PTI admin API and is a boundary to preserve.
- Important mismatch found in PTI `main/index.html`: it still contains case-saving UI and logic for Google Drive (including `driveCreate`, `driveSaveProject`, `PTI093_API`, and an upload concurrency setting). This conflicts with the agreed PTI scope. Do not remove it from `main`; audit call dependencies and remove/isolate it on the test branch so the PTI app does not save image cases to Drive, while retaining the admin/user-directory API.

## Initial syntax baseline

A source-level JavaScript parse was performed against the fetched current `main` files using the JavaScript runtime:

- 093: 5 inline scripts parsed successfully.
- PTI: 1 inline script parsed successfully.
- PTI `admin-gdv/admin-gdv.js`: parsed successfully.

This is syntax-only evidence. It does not establish runtime correctness, F5/reload restoration, PDF output quality, upload performance, or admin functionality.

## CI workflow changes

- 093 test branch workflow was updated to run on pushes/PRs targeting `main` or `refactor/core-modules-test-20261022`, with manual dispatch.
- PTI test branch received a syntax workflow covering inline app JavaScript and the admin script, with the same branch triggers.
- The workflow file changes have commits, but no completed GitHub Actions run has yet been verified in this log.

## Next implementation sequence

1. Map and compare full draft lifecycle in both sources, including IndexedDB transactions, image blobs, session identity, restore ordering, cleanup, and rapid-reload behavior.
2. Add a reproducible functional test harness for save → reload → restore, same-tab and new-tab lifecycle, multiple image blobs, captions/order/rotation, and cleanup. Keep syntax checks separate.
3. Correct the PTI case-Drive scope on the test branch only after all UI/event/API dependencies are mapped; retain the PTI admin integration.
4. Extract shared Core in small, independently testable modules, keeping app-specific adapters/configuration separate.
5. Add regression tests for image operations, GĐV search, PDF standard/high-quality/splitting under 10 MB, and the stable 093 Drive saver.
6. Deploy isolated test builds only after CI passes; compare behavior with current live apps and record evidence before acceptance/release.

## Current status

- [x] Versioning convention established.
- [x] Test branches established.
- [x] Syntax-only baseline checked.
- [x] CI workflow files updated on test branches.
- [ ] CI run result verified.
- [ ] Full draft lifecycle audit completed.
- [ ] Functional regression harness completed.
- [ ] Shared Core extracted.
- [ ] PTI case-Drive functionality isolated/removed on test branch.
- [ ] Test deployments and acceptance completed.


## User-confirmed baseline and PTI Drive boundary — v1-20261022.3

- 093 local draft recovery is a known-good behavior based on the user's 10/10 reload/F5 tests on 2026-10-22. Any refactor needs a before/after regression plan that checks restoration of image files, captions, order, selected GĐV, and relevant form fields; do not alter draft lifecycle just for stylistic consistency.
- PTI's visible case-Drive-save button has already been removed according to the user. The source still contains case-save-related code; this audit does not infer that the UI button remains visible. Verify whether those functions are reachable from any current UI/event handler/global export and ensure PTI cannot initiate case uploads, while keeping admin login and user-directory operations intact.
- The next implementation stage is dependency mapping and test harness preparation. No Core extraction, production deployment, or functional acceptance is claimed by this audit update.

## Shared Core extraction milestone — v2-20261022

- Extracted the identical pure GĐV search helpers into `core/gdv-search.js` in both test branches: `normalizeRecordSearch`, `gdvInitials`, and `gdvSearchMatches`. Both app entry points now load this shared module before the existing inline application script and bind the same helper names to `window.PTISharedCore`.
- Added `tests/gdv-search.test.js` to both repositories with assertions for Vietnamese diacritic normalization, Đ/d normalization, initials, partial-name matching, empty queries, and non-matches. GitHub Actions is configured to run the test on the test branch.
- Source parsing after extraction: 093 inline scripts 5/5 parsed successfully; PTI inline script 1/1 parsed successfully; shared module loaded and manual behavior checks passed for accented name, initials, partial name, and empty query.
- This is the first narrow shared-module extraction only. It does not yet standardize draft recovery or image/PDF flows. Preserve the 093 draft lifecycle unchanged in the next phase and add browser-level regression tests before changing it.

## Skin and Drive-saver extraction — v3/v4-20261022

- Extracted the first base stylesheet to `css/skin-classic.css` and the optional modern UI stylesheet to `css/skin-modern.css`. The modern stylesheet link retains ID `uiRefreshV42`, so the existing skin toggle can continue setting its `disabled` property. Other 13 style blocks remain in place for now to preserve cascade order during this first pass.
- Extracted the 093 case-save/upload functions into `fusion/drive.js`: project save, image key and upload-state persistence helpers, item preparation, upload confirmation, payload sending, failure rendering, create-record orchestration, and the existing batch uploader. The uploader's local concurrency constant remains 5; it was not reconfigured. App/UI dependencies are passed explicitly through the fusion installer.
- Moved the save/create event binding until after the fusion installer returns, preventing access to uninitialized module aliases. Removed the duplicate create-handler assignment.
- Added `tests/drive-fusion.test.js` and workflow steps for syntax and module contract checks. In this environment, 5/5 remaining inline script blocks parsed, the extracted module parsed, all 12 expected functions were exported, and the upload-key persistence checks passed with a browser-storage mock.
- Scope note: this extraction covers the save/upload path. Drive search/open-record functions remain in the main app script and must be assessed separately before declaring the entire Drive fusion isolated. The local-draft lifecycle remains unchanged. CSS/JS source checks are not browser acceptance; no deployment was performed.

## Dependency-wiring correction — v4-20261022.2

- The unified Drive Fusion module now receives the original app-scoped helper functions explicitly: `getAllGroups`, `selectedGdv`, `scheduleAutoDraftSave`, `finalizeCompletedSession`, and `sha256HexBlob`, in addition to state/UI/API adapters. This preserves the original lexical dependencies after extraction.
- The existing `DRIVE_CONCURRENCY=5` remains scoped inside the original uploader function; it was not replaced with a new global setting. The create/save handlers are bound only after the fusion installer has initialized its returned functions.
- Follow-up source checks passed: 5/5 remaining inline scripts parse; the Drive module parses; the expected functions export; storage-key helpers pass mocked-storage checks; the two external CSS files are linked; and the original draft functions `scheduleAutoDraftSave`, `saveAutoDraft`, `clearAutoDraft`, `restoreAutoDraft`, and `finalizeCompletedSession` are byte-for-byte unchanged from main.
- Remaining boundary work before Core can be called complete: Drive search/open-record functions are still in `index.html`; assess whether to isolate them as the read/search portion of the Drive fusion. Browser-level tests and completed GitHub Actions runs remain unverified.

## Drive Fusion boundary completion — v4-20261022.3

- The active script path is `fusion/drive.js` (the file actually loaded by `index.html`). This is the canonical Drive-specific fusion for the 093 test branch.
- The fusion now owns the Drive record open/search UI orchestration and helper functions, case create/save/upload flow, upload-state persistence, image optimization, and SHA-256 helper. The shared Core remains outside this file; the installer receives app-specific state/UI/data adapters explicitly.
- `index.html` no longer contains the moved Drive record functions, image optimizer, or SHA-256 helper bodies. The module's dependency list and the installer arguments were checked for a complete match.
- Drive concurrency remains the original internal `DRIVE_CONCURRENCY=5`; the uploader's batch loop and per-file confirmation behavior were not intentionally changed. The moved helper bodies differ from the source primarily by indentation from nesting in the installer; the logic was not rewritten.
- The five draft-lifecycle functions (`scheduleAutoDraftSave`, `saveAutoDraft`, `restoreAutoDraft`, `clearAutoDraft`, `finalizeCompletedSession`) compare byte-for-byte with the current `main` source. The user's 10/10 successful manual recovery tests remain the behavioral baseline; no draft-lifecycle refactor was performed.
- Checks rerun after this step: 5/5 remaining inline script blocks parse; `fusion/drive.js` parses; expected fusion exports exist; mock-storage checks for uploaded/pending keys pass; Classic/Modern CSS links and script load order are present. These are source/contract checks, not browser acceptance.
- GitHub Actions runs and browser-level regression remain unverified. No production branch or live deployment was changed. The earlier note above saying search/open functions remained in `index.html` is superseded by this section.

## Full static skin extraction — v4-20261022.4

- Extracted all remaining 13 static style blocks into `css/skin-overrides-03.css` through `css/skin-overrides-15.css`. Together with `skin-classic.css` and `skin-modern.css`, all 15 original style blocks are now external CSS files and the HTML has no remaining `<style>` blocks.
- CSS contents were copied from the source style blocks. The links are ordered in the same sequence as the original style blocks so cascade precedence among Classic, Modern, and all override layers is preserved. The `uiRefreshV42` stylesheet ID remains unchanged for the existing UI toggle.
- The five late style blocks originally appeared after the document head; their stylesheet links are now loaded in the head in the same cascade order as the source blocks. This makes the skin assets explicit and avoids relying on style tags embedded in the body.
- Updated the Drive Fusion test to verify that all 15 CSS assets exist, are non-empty, and are linked from `index.html`.
- Source validation still does not substitute for browser visual regression; the Classic default, Modern toggle, mobile layout, preview modal, tooltip stacking, and PC dashboard should be visually checked on an isolated test build before merge.
