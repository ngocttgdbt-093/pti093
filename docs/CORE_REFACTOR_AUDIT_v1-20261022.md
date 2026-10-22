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
- Scope note (updated v4-20261022.4): Drive save/upload and record search/open paths are now inside `fusion/drive.js`; the app HTML retains the Drive UI markup and event binding points. The local-draft lifecycle remains in Core and unchanged. CSS/JS source checks are not browser acceptance; no deployment was performed.

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

## Complete Drive Fusion boundary — v4-20261022.4

- Consolidated the Drive-specific API endpoint, image optimization, SHA-256 upload key, create/save/upload, upload-state tracking, record search/open, and Drive progress helpers inside `fusion/drive.js`. The main app now supplies app/UI adapters and retains the HTML controls; event bindings are installed after the module returns its API.
- Source comparison confirms the extracted Drive function bodies match the original `main` implementations after normalizing indentation. The uploader's concurrency remains the original local `DRIVE_CONCURRENCY=5`; no concurrency redesign was made.
- Removed the obsolete Drive function declarations from `index.html`. The shared local-draft functions remain in `index.html` and are unchanged compared with `main`.
- Remaining work: optimize and consolidate the non-Drive app functions into Core modules, then run browser-level regressions and verify completed GitHub Actions runs. No production deploy or merge has occurred.

## Shared Core ZIP/XML utilities — formal milestone v2-20261022.1

- Extracted ten pure/helper functions used by DOCX ZIP creation/import into `core/zip-utils.js`: XML escaping, Base64 byte conversion, CRC32, little-endian integer encoders, byte-array concatenation, ZIP store writer/reader, data-URL conversion, and ZIP text lookup.
- `index.html` now loads `core/gdv-search.js`, then `core/zip-utils.js`, then app-specific `fusion/drive.js`, before the app's inline controller. The original function names are bound from `window.PTISharedCore` for compatibility with existing DOCX code.
- All ten extracted helper bodies compare exactly with their source versions on `main`; no algorithm rewrite was made.
- Added `tests/zip-utils.test.js` for XML escaping, CRC32 known vector, little-endian helpers, byte concatenation, Base64/data-URL conversion, and a ZIP write/read round-trip. The workflow now runs this test.
- Source checks: 5/5 remaining inline script blocks parse, no remaining `<style>` blocks exist, all 15 CSS assets are linked in order, and the ZIP helper test's behavior checks pass in a local JS harness. GitHub Actions has passed for the earlier PR head; this new Core utility commit still needs its own CI result.
- Formal milestone ID for this Core extraction batch is `v2-20261022.1`. This is a refactor-work milestone, not an app footer/build version. The local-draft lifecycle remains untouched.

## Shared Core draft-recovery extraction — v4-20261022.4

- Split the local-draft implementation into two layers: `core/local-draft-store.js` owns IndexedDB open/transaction/list primitives; `core/draft-recovery.js` owns autosave scheduling, autosave, restore, cleanup, and completed-session finalization.
- The eight moved function bodies were compared against `main` after normalizing indentation; all eight are exact matches across the two modules. Session ID key/value rules, database name `pti093_local_drafts_v1`, and draft ID `AUTO-DRAFT` remain unchanged.
- The app loads `core/local-draft-store.js` before `core/draft-recovery.js`, then `fusion/drive.js`. The DraftRecovery installer receives the store API explicitly; Drive Fusion receives the same `getLocalDrafts`, autosave, and finalize APIs. The pagehide/visibilitychange paths still use the same save function.
- Source checks after extraction: all 5 remaining inline script blocks parse; `core/draft-recovery.js`, `core/gdv-search.js`, and `fusion/drive.js` parse; 14/14 targeted source/module-contract checks passed in the available runtime. These checks do not execute a real browser IndexedDB restore, nor do they substitute for the GitHub Actions run or manual F5/reload acceptance.
- Core modules now include GĐV search, ZIP/XML utilities, and draft recovery. Drive record search/open and case upload/save remain isolated in `fusion/drive.js`; skin CSS remains outside `index.html`. Next: validate manual local-save and PDF export UI orchestration, then browser-test the Classic default and full recovery flow on an isolated test build. Production `main` remains untouched.

## Version-ID correction — v1-20261022.3

The earlier draft-extraction commit messages used an inconsistent `v4-20261022.4` label. Per the project's agreed versioning rule, the correct refactor milestone for this same-day batch is `v1-20261022.3`; commit history is immutable, so this note corrects the project record. This is not an app footer/build version.

The workflow also had a duplicated draft-recovery test invocation; it has been removed in this batch. A green CI result has not yet been verified. The current checks remain source/module contract checks, not a real browser IndexedDB F5/reload acceptance test.


## PDF Builder Core extraction — v6-20261022

- Extracted the PDF page sizing/quality helpers, canvas factory, PDF byte builder, resampling, size measurement, adaptive compression, and byte-splitting helpers into `core/pdf-builder.js`.
- Kept the existing `PDF_SAFE_LIMIT=9.5 MiB` value and the original helper bodies unchanged; moved initialization early enough that the shared aliases exist before the initial render path runs.
- Added `tests/pdf-builder.test.js` and GitHub Actions syntax/unit steps. In the available runtime, the module parsed, all 9 moved helper bodies matched the original `main` source after indentation normalization, and mocked-canvas checks passed for page dimensions, quality, PDF header/footer, adaptive build, and splitting.
- The PDF export UI orchestration, page rendering, warning UI, and file-download behavior remain in the app script for now. The static/mock checks are not a browser test and do not prove real canvas quality or device-specific downloads. No deployment or merge was performed.

## PDF Builder Core integration and shared snapshot boundary — v6-20261022.1

- Wired `core/pdf-builder.js` into the app after confirming its six extracted helper bodies (`pdfBytesFromCanvases`, `resamplePdfCanvases`, `pdfPackSize`, `makePdfAt`, `buildAdaptivePdf`, `splitPdfBytes`) match `main` after indentation normalization. The module keeps the existing 9.5 MiB safe limit and PDF compression/splitting behavior; UI warning and download orchestration remain in the app.
- Added `tests/pdf-builder.test.js` and CI syntax/test steps for page dimensions, JPEG quality choices, PDF header/trailer, adaptive build, and split output.
- Boundary review caught a coupling issue: `snapshotGroupsForProject` is also needed by manual local-save flow, so it must not live exclusively inside Drive Fusion. Restored it as an app/Core workspace helper and inject it into `fusion/drive.js`; added a regression assertion for that boundary.
- Current source checks: all 5 inline app scripts parse; the shared modules (GĐV search, ZIP/XML, PDF builder, local draft store, draft recovery, Drive Fusion) parse; no inline `<style>` blocks remain; all 15 CSS assets are linked; the eight draft/store lifecycle bodies and six PDF helper bodies match the source `main` versions after normalization.
- The latest GitHub Actions run for this exact head is still in progress at the time of this note; do not mark CI green until its completed result is checked. No production `main` changes or deployments have been made. Browser visual regression and a real IndexedDB F5/reload test remain acceptance gates.
