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

## Workspace Core extraction — v6-20261022.2

- Moved `getAllGroups` and `snapshotGroupsForProject` into `core/workspace.js`. Both the manual local-save path and Drive Fusion now consume the same shared workspace snapshot implementation; Drive Fusion no longer owns this helper.
- Added `tests/workspace-core.test.js` for filtering empty groups, merging the current section with the last same-title group, and ensuring snapshots do not mutate the live workspace. The workflow now syntax-checks and runs this test.
- This closes a dependency boundary found during the audit: local save must not rely on a helper hidden inside the Drive-specific fusion. The Drive Fusion receives the shared snapshot function explicitly.
- The latest verified static/runtime smoke checks before this workspace extraction passed 15/15. Re-run the checks and verify the CI result for the new workspace module before treating this batch as complete. Browser acceptance and production deployment remain out of scope.

## Core module smoke-test update — v1-20261022.4

- Confirmed the HTML loads modules in dependency order: `gdv-search.js`, `zip-utils.js`, `pdf-builder.js`, `local-draft-store.js`, `draft-recovery.js`, then `fusion/drive.js`, before the app's inline initialization.
- Executed 13 direct runtime smoke checks against the fetched branch sources in the available JavaScript runtime: Vietnamese GĐV normalization/partial/initial matching; ZIP/XML helper behavior including CRC32 and ZIP round-trip; draft lifecycle API/session-key wiring; Drive Fusion save/upload/search API and per-image upload-key persistence; Classic skin link and module load order. All 13 passed.
- Independently syntax-parsed the 5 inline JavaScript blocks and the Core/Fusion modules and test scripts; all parsed successfully.
- The repository's Node test suite now includes a PDF Builder test covering page dimensions, PDF structure, adaptive build and split naming. This report does not claim that GitHub Actions has passed: the workflow run has not been independently verified through the available status endpoint.
- Not yet verified: real-browser IndexedDB writes and restore after F5/reload; actual image selection, preview, PDF export/download and split behavior in Edge/Chrome; regression against the user's 10/10 known-good 093 recovery baseline. Keep this branch isolated until those acceptance checks pass.
- Production `main` remains untouched. The correct same-day work milestone for this update is `v1-20261022.4`; it is not an application footer/build version.

## Manual local-save Core and CI validation — v7-20261022

- Extracted `saveLocalDraft` and `saveDraftWithoutPhotos` into `core/local-save.js`. Both function bodies match `main` exactly after indentation normalization; the module receives the workspace snapshot, IndexedDB store APIs, status/progress UI adapters, and draft cleanup API explicitly.
- The local-save module contains no calls to `PTI093_API`, `pti093UploadAll`, or `saveProjectToDrive`; case Drive saving remains in `fusion/drive.js`. The superseded duplicate local-case module was removed from the working branch.
- GitHub Actions validation for the latest branch head `5dfa8b4884ef0c7b9a8758135c4a808eb451f746` completed successfully (run 323, workflow “Validate PTI093 JavaScript”). The syntax-check job and its checks/tests for inline scripts, draft recovery/store, local save, workspace helpers, ZIP/XML, PDF builder, GĐV search, and Drive Fusion all report success.
- This is source/Node CI validation, not browser acceptance. Still required before merging/deploying: real-browser F5/reload restore with images and captions, Classic/Modern visual regression, and PDF export/splitting behavior in the isolated test build. Production `main` remains untouched.

## CI verification and local-open coverage — v1-20261022.6

- GitHub Actions run **#329** (`39818110951`) completed successfully on the test branch after correcting the Drive Fusion test to reflect the actual dependency-injection contract. All steps in that run passed, including local-save, workspace, Drive Fusion, ZIP/XML and PDF Builder tests.
- An earlier run failed because an outdated assertion expected `finishOpenLoad` to be exported by Drive Fusion. Source inspection confirmed it is an app-owned callback passed into Fusion; the test now checks the actual injection contract instead. This was a test-contract mismatch, not evidence that the app callback was missing.
- Added `node --check core/local-open.js` and `node tests/local-open.test.js` to the workflow. This extra CI coverage was added after run #329, so the new run must be checked before claiming the full current workflow is green.
- Runtime PDF Builder smoke checks passed for PDF header/footer, adaptive output under the configured size limit, and split-file naming. These use a mock canvas and are not a real browser export test.
- Still required before acceptance: a full real-browser smoke test and the 093 draft-recovery F5/reload regression test. Do not merge the draft PR or change production `main` before those checks.


## Local Open Core extraction — v7-20261022.1

- Moved the manual `openLocalDraft` flow into `core/local-open.js`, installed after the draft-store/recovery modules and before Drive Fusion. The Drive module receives the same `openLocalDraft` adapter; the local-open implementation itself remains independent of Drive Fusion.
- Kept `setDriveState`, `setOpenLoad`, `finishOpenLoad`, and `snapshotGroupsForProject` in the shared app/Core layer because manual local save/open also uses them. Drive Fusion receives those helpers as explicit dependencies rather than owning them.
- Added `tests/local-open.test.js` and a workflow step. A mocked IndexedDB test in the available runtime passed checks for restored form fields, local ID/no Drive ID, image order/caption/rotation, progress completion, render/layout, and database closure. This is not a real-browser IndexedDB/F5 test.

## Full source/module CI result — v1-20261022.8

- GitHub Actions run **#345** (`39818597073`) completed successfully on the isolated test branch. All steps passed: inline JavaScript syntax, draft-recovery source contract, GĐV search, local draft store/recovery, local-save, local-open, Drive Fusion, workspace snapshot, ZIP/XML, and PDF Builder.
- The first run after adding local-open coverage exposed a missing `window.scrollTo` stub in the Node test fixture. The browser code expects that standard browser API; the test fixture was corrected, and run #345 passed.
- This is a green source/module CI gate, not full browser acceptance. The IndexedDB implementation is still not being exercised in a real browser session, and the user's 10/10 baseline test of the original 093 recovery still needs to be repeated against the test build.
- Production `main` remains untouched. Do not merge or publish to the live Pages site until the browser regression checks are complete.

## Latest workflow confirmation — v1-20261022.10

- GitHub Actions run **#359** (`39819183815`) completed successfully for commit `b5977dfea15cb40fa44504859cae1bff738520c9`. The job reports **24 successful steps and 0 failed steps**, including the extracted Image Canvas Core test.
- This is the latest verified automated gate for the Core/Fusion source at that commit. Static and mocked-module tests pass; they do not replace a real-browser test with actual IndexedDB, image files, layout, and downloads.
- Remaining gate is real-browser acceptance only: open a test build, load images, save locally, reload/F5 and confirm draft recovery, open a saved local case, preview/export PDF and verify the app still starts in Classic. No production deploy or merge has been performed.


## Image Canvas Core extraction — v8-20261022

- Extracted `layoutDims`, image/logo loading, text wrapping, rotated contain drawing, and the shared A4 page renderer into `core/image-canvas.js`. The module receives the PDF canvas/size helpers and app-specific title/date/GĐV values through explicit adapters.
- The app installs this module immediately after PDF Builder initialization, before the first layout/render call. Existing render, preview, DOCX, and PDF flows continue to call the same helper names through returned aliases.
- Added `tests/image-canvas.test.js` and CI checks. Mocked-canvas validation passed for portrait/landscape grids, text wrapping, image/logo load promises, A4 dimensions, caption/GĐV labels, draw calls, and rotation. The five inline app scripts and external modules parsed successfully in the available runtime.
- Remaining acceptance gate is still real-browser regression: actual image selection/drag ordering, Classic default, local save and F5/reload restore, preview, PDF/Word output and downloads in Edge/Chrome. No production deployment or merge was performed.


## DOCX Builder Core extraction and current CI confirmation — v2-20261023.5

- Extracted the DOCX XML construction helpers `docxText`, `docxCaption`, `drawingXml`, `pageBreak`, and `makeDocxFiles` into `core/docx-builder.js`. The app initializes the module using the existing XML escaping and date-format helpers; the original DOCX metadata, captions, page sizing, media relationship IDs, and package XML behavior are preserved.
- Updated `index.html` to load DOCX Builder after ZIP/XML utilities and before the application controller. `core/app-core.js` now consumes the returned API instead of defining those five helpers inline.
- Added `tests/docx-builder.test.js` and CI syntax/test steps for the new module. GitHub Actions run **#385** (`39825363945`) completed successfully for head `1c546af52cabb6144c6d4e0f0e59adc499168138`; the DOCX Builder check and test, along with all existing workflow steps, passed.
- This is automated source/module validation, not a real-browser DOCX export/import acceptance test. The existing draft-recovery tests still use mocked storage/API wiring and do not prove real IndexedDB persistence across F5. The user's 10/10 recovery baseline remains the expected behavior to preserve.
- The branch remains isolated: no changes to production `main`, no deployment, and no PTI repository changes. Browser acceptance remains open because the available browser connector can inspect tabs but cannot interact with the local browser, and no isolated Pages test deployment is available from the current workflow.
- Next: continue mapping and modularizing remaining application-specific rendering/export orchestration in small units, while preserving original helper behavior and adding tests per module. Do not merge or publish until the real-browser regression gate is completed.


## Real-browser Draft Recovery test and Date Utils extraction — v2-20261023.7

- Added `tests/draft-recovery-browser.html` as an isolated fixture and `tests/draft-recovery-browser.test.cjs` using Playwright Chromium. GitHub Actions run **#395** (`39825756353`) completed successfully, including the step **“Test draft recovery in real Chromium with IndexedDB”**. The browser test seeded a draft, reloaded the page, and verified same-session restoration of metadata, group/current-image captions, rotation, ordering, and actual image Blob bytes; it then verified cleanup removes draft metadata and image records.
- This browser fixture exercises the extracted recovery module against real Chromium IndexedDB. It is not yet a complete acceptance test of the full production UI or the user's actual 10-image workflow; the user's existing 10/10 manual baseline remains authoritative for the full app.
- Extracted date formatting and date-input behavior without changing the current rules into `core/date-utils.js`. `index.html` loads it before `core/app-core.js`; the application Core now obtains `formatDateDMY`, `getDateISO`, and `setDateInput` from the module. The digit mask, caret adjustment, date validation, and blur normalization were carried over from the existing implementation.
- Added `tests/date-utils.test.js` to check date formatting, ISO parsing, leap-day validation, invalid dates, automatic separators while typing, and blur normalization. GitHub Actions run **#409** (`39826616509`) completed successfully, including the real Chromium IndexedDB recovery test and both Date Utils checks.
- No changes to `main`, no production deployment, and no PTI repository changes. Continue using the test branch only.

- Updated CI to cache the Playwright Chromium browser and avoid reinstalling Linux system dependencies on every push. Run **#409** completed successfully with this faster setup: https://github.com/ngocttgdbt-093/pti093/actions/runs/39826616509.


## Session-isolation regression and File Naming Core — v2-20261023.10

- Extended the real Chromium test to open a second tab with a separate `sessionStorage` work-session ID. The test verifies that a draft belonging to the first tab is not restored in the new session, the stale draft and image blobs are cleared, and old vehicle/case fields and Drive record ID are not carried into the new tab.
- GitHub Actions run **#415** (`39826818325`) passed the expanded real-browser test for both F5 restoration and new-session cleanup.
- Extracted the existing `fileBaseName`, `gdvShortName`, and `pdfFileName` rules into `core/file-naming.js`; application Core consumes the module API. The existing GĐV abbreviation map, plate sanitization, and PDF naming rules are retained.
- Added `tests/file-naming.test.js`. GitHub Actions run **#426** (`39826955610`) completed successfully, including the File Naming and Date Utils tests and the Chromium IndexedDB regression.
- The app's current test branch is still not deployed. These results are CI validation and isolated module/browser-fixture tests, not a full end-to-end acceptance of the production page with real user images.


## Image Reorder Core extraction — v2-20261023.11

- Extracted the existing thumbnail drag-and-drop and touch reorder controller into `core/image-reorder.js`: stable per-item drag IDs, DOM movement, synchronization back to `state.current.items`, draft-save scheduling, layout refresh, drag-style cleanup, and pointer/touch handling.
- `core/app-core.js` now delegates drag ID assignment and thumbnail event binding to the module. The previous inline helper functions and per-thumbnail drag/pointer handlers were removed from the app controller; the event behavior was carried over.
- Added `tests/image-reorder-browser.html` and `tests/image-reorder-browser.test.cjs`. The real Chromium regression simulates dragging the first thumbnail below the second and asserts DOM order, application-state order, dirty-draft scheduling, layout refresh, rerender, and cleanup of drag CSS classes.
- GitHub Actions run **#441** (`39827235287`) completed successfully, including Image Reorder module syntax validation, File Naming and Date Utils tests, and the Chromium browser regression suite.
- This confirms the extracted module contract and simulated reorder behavior in Chromium. A full manual check with real user photos and touch hardware remains a separate acceptance gate.


## Full application browser smoke gate — v2-20261023.12

- Added `tests/app-smoke-browser.test.cjs` to launch the complete `index.html` in Chromium via the local test server, check that the extracted modules are present, verify the six-image default layout and date placeholder, type `01012026`, and assert the real app date mask renders `01/01/2026` without uncaught page errors.
- GitHub Actions run **#446** (`39827453463`) completed successfully. It included the full application Chromium smoke test, draft recovery across reload and separate-tab session isolation, image reorder behavior, File Naming Core tests, Date Utils tests, and all existing module checks.
- Current refactor baseline: `core/app-core.js` decreased from 46,529 bytes before the recent extractions to 40,777 bytes after extracting DOCX Builder, Date Utils, File Naming, and Image Reorder. This is a source-size measurement, not a performance benchmark.
- Still not accepted: full manual workflow with real user photos, touch-device reorder, PDF/Word export opened in external apps, and the 10-image save/reload workflow. No production deployment or merge has occurred.


## PDF Export Core extraction and startup initialization fix — v2-20261023.14

- Extracted `renderPageRangeWithLabel` and `splitHighQualityPdf` into `core/pdf-export.js`. The module receives the existing PDF builder functions as dependencies; the existing size-limit calculation, progress reporting, per-part labels, and split-file naming are preserved.
- Added `tests/pdf-export.test.js` covering an empty preview, size-based splitting into multiple PDFs, part labels, output metadata, and progress reporting.
- The full-page Chromium smoke test exposed a real initialization-order defect: the Local Save button handler referenced `saveDraftWithoutPhotos` before `PTILocalSaveCore.install()` had returned that API. Moved the handler binding to immediately after the API destructuring. This is a functional bug fix discovered by the new startup test, not a change to the save algorithm.
- GitHub Actions run **#463** (`39827802955`) reached successful completion of the full Chromium recovery, session isolation, reorder, and app startup/date-mask checks, plus PDF Export Core syntax and unit tests; final run status is being confirmed.
- The app controller has now been reduced from 46,529 bytes at the start of these extractions to 38,350 bytes after DOCX Builder, Date Utils, File Naming, Image Reorder, and PDF Export extraction plus the handler-order fix. This is a source-size comparison only.


## Workspace Core group-commit extraction — v2-20261023.15.1

- Moved the existing `commitCurrent` business rule from `core/app-core.js` into `core/workspace.js` as `PTIWorkspaceCore.commitCurrent(state)`. The rule still returns `null` for an empty current group, merges a matching title into the last saved group, appends a different title, and reinserts an edited group at its original index while resetting `state.editing`.
- App Core now delegates to Workspace Core; the unit tests cover empty, merge, append, and edit-reinsert cases and assert the integration binding.
- GitHub Actions run **#474** (`39828123195`) completed successfully, including the expanded Workspace Core tests and the Chromium recovery, reorder, full-app smoke, and PDF Export checks.


## Shared GĐV search query expansion extraction — v2-20261023.16.1

- Moved the existing `searchQueryVariants` helper into `core/gdv-search.js` as `PTISharedCore.searchQueryVariants(query, names)`. The 093-specific GĐV list remains owned by App Core and is passed in; the shared Core now handles normalization, full-name/surname variants, initials, duplicate suppression, and the existing five-result cap.
- App Core delegates to the shared search API. Tests cover normalized names, initials, query expansion, missing matches, and result limits.
- The first test expectation incorrectly expected the surname `Ngọc` to appear when it normalizes to the same value as the original query `ngoc`; the implementation correctly suppresses that duplicate. The assertion was corrected to preserve the existing behavior.
- GitHub Actions run **#485** (`39828453790`) completed successfully, including the expanded GĐV search tests, Workspace Core group-commit tests, PDF Export, and the Chromium recovery/reorder/full-app smoke suite.


## First Classic Skin module extracted — v2-20261023.17

- Created `skin/classic-local-save.js` for the Classic skin's local-save progress panel and confirmation dialog. The module owns the presentation markup, text, styling, progress display, and cancel/confirm UI; `core/local-save.js` continues to own the save behavior.
- Removed those presentation functions from `core/app-core.js`; the app now installs the Classic Skin module and injects its UI callbacks into Local Save Core.
- Added a real Chromium fixture and test for normal progress, failed-save state, cancel, and confirm; the full-app smoke test also asserts that the skin module loads. GitHub Actions run **#503** (`39828802151`) completed successfully.
- This is the first explicit JavaScript Skin/Core boundary in this branch. Continue moving DOM presentation out of App Core in small units while leaving business rules and storage behavior in Core modules.
- After this extraction, `core/app-core.js` is 34,257 bytes versus the initial 46,529 bytes. The Classic skin module is not a production deployment; the test branch remains isolated.


## Classic Skin presentation modules expanded — v2-20261023.21

- Extracted four more DOM presentation components from App Core into `skin/`:
  - `classic-load-progress.js`: open/load progress bar, percentage, and completion state.
  - `classic-image-viewer.js`: full-size image overlay, rotation, Escape/backdrop/close-button dismissal, and object-URL cleanup.
  - `classic-status.js`: visible/hidden status messages and normal/warning Drive status styling.
  - `classic-layout.js`: layout-preview slots, grid columns, and portrait/landscape labels.
- App Core now installs these Skin modules and passes the progress callbacks into Local Open and Drive Fusion; business/storage logic remains in Core/Fusion.
- Added browser fixtures and interaction tests for each UI component, and extended the full-app smoke test to verify all Skin modules load.
- A test assumption in the Drive Fusion suite was updated after moving `finishOpenLoad` into Skin: the test now checks the function in `skin/classic-load-progress.js` while still verifying Drive Fusion receives the callback through dependency injection. A test-only backdrop click was also corrected to dispatch directly on the overlay itself.
- GitHub Actions run **#563** (`39829785066`) completed successfully with the browser suite, all four Skin syntax checks, and the existing Core/Fusion tests.
- `core/app-core.js` is now 32,112 bytes after the layout extraction; remaining work is to keep separating UI presentation from application/business orchestration without changing the current Classic behavior.


## Classic Group List Skin extraction — v2-20261023.22.1

- Moved saved-group list rendering from App Core to `skin/classic-group-list.js`. The module owns the empty-state text, saved-group labels/counts, row styling, and edit-button rendering; clicking Edit delegates the selected index back to App Core.
- Added a real Chromium fixture/test for empty and populated states and the edit callback. The full-app smoke test also verifies the Group List Skin is loaded.
- GitHub Actions run **#585** (`39830216365`) completed successfully with the group-list UI test and the full browser/Core/Fusion regression suite.
- App Core is now 31,422 bytes. The large thumbnail-grid renderer is still in App Core and remains a candidate for a carefully tested Skin extraction; no production changes have been made.


## Classic Image Grid Skin extraction — v2-20261023.23.1

- Moved thumbnail rendering and its presentation controls into `skin/classic-image-grid.js`: thumbnail cards, image rotation display, action buttons, caption textareas, caption Tab navigation, and enable/disable states for Clear/Save Next/Finish.
- Core behavior remains delegated through callbacks: replace/insert selection, rotate and delete state changes, metadata-only caption saves, image-dirty saves, image viewer, and reorder controller.
- Added a Chromium fixture/test for thumbnail order and labels, captions, Tab navigation, action callback delegation, rotation, deletion, and button states. Full-app smoke test verifies the Image Grid Skin is loaded.
- GitHub Actions run **#605** (`39830736157`) completed successfully, including the expanded Skin browser suite, real IndexedDB draft recovery/session isolation, image reorder, full app startup/date mask, and Core/Fusion tests.
- App Core is now approximately 29.8 KB (from 46.5 KB at the start of this series). This refactor is still on the isolated test branch; manual acceptance with real photos and device-specific touch interaction remains open.


## Classic Image Grid and PDF Warning Skin — v2-20261023.24

- Extracted the PDF warning panel, high-quality export checkbox, progress area, and export button from App Core into `skin/classic-pdf-warning.js`. The actual PDF splitting/export work remains in `core/pdf-export.js`; the Skin delegates the button/checkbox actions through an injected callback.
- Added a Chromium test for warning content, progress controls, checkbox-triggered export, button-triggered export, and hide/cleanup behavior. The full-app smoke test verifies the module is loaded.
- GitHub Actions run **#621** (`39831058354`) passed the PDF Warning Skin browser regression and existing Core/Fusion checks.
- The previous Image Grid Skin regression is confirmed by run **#605** (`39830736157`); the group list test is confirmed by **#585** (`39830216365`). These tests cover UI rendering/action delegation without deploying the test branch.
- App Core is now 27,359 bytes after moving PDF warning presentation out; it was 46,529 bytes at the beginning of this refactor series. No changes to production `main` or PTI have been made.


## 093 GĐV Fusion and Image Ingest Core — v2-20261023.27

- Moved the 093-specific GĐV selection list and custom-name prompt/storage behavior into `fusion/gdv-093.js`. App Core receives `names` and `selectedGdv` from that module; the shared GĐV search algorithm remains in `core/gdv-search.js` and accepts the 093 names as input.
- Added a Chromium test for standard selection, custom-name prompt, cached custom value, cancellation, localStorage behavior, and the exact 093-only name list. The full-app smoke test confirms GĐV Fusion loads.
- Extracted `addFiles` into `core/image-ingest.js`. It retains accepted image extensions, duplicate checks against the current group, file-name caption defaults, add-sequence assignment, render/save scheduling, and existing status messages.
- Added unit tests for supported/unsupported files, duplicate avoidance, captions, add sequence, and save scheduling. GitHub Actions run **#655** (`39831826237`) completed successfully; run **#643** (`39831599313`) also passed the GĐV Fusion checks.
- The latest App Core source is now about 26.6 KB, down from 46.5 KB at the start. The 093 GĐV list is now outside Core, and PTI has not been modified.


## Real Chromium + IndexedDB regression — v2-20261023.6

- Added `tests/draft-recovery-browser.html` and `tests/draft-recovery-browser.test.cjs` as an isolated test fixture for the actual `PTILocalDraftStore` and `PTI093DraftRecovery` modules.
- GitHub Actions run **#395** (`39825756353`) completed with conclusion `success`. Its Playwright/Chromium step passed, including an actual page reload with real browser IndexedDB, session ID continuity, case fields, image-group metadata, captions, rotation, original image Blob bytes, and draft cleanup.
- This is meaningful browser-level evidence for the isolated draft-recovery modules. It is not yet an end-to-end acceptance test of the complete production UI, because the fixture uses a minimal harness rather than loading the full application and its actual Skin.
- Production `main`, deployed Pages, and the separate PTI repository remain untouched. Keep this branch isolated and retain full-app browser acceptance as a separate gate.


## Classic File Intake Skin and 093 GĐV Fusion — v2-20261023.28

- Extracted the file-picker, folder-picker, and drag/drop zone event bindings into `skin/classic-file-intake.js`. It delegates the selected files to the existing `core/image-ingest.js` API and retains drag-state styling, event suppression, and input reset behavior.
- Added a Chromium test for dragenter/dragleave styling, dropped files, file picker/folder picker delegation, and resetting the input after selection. The full-app smoke test verifies File Intake Skin loads.
- GitHub Actions run **#672** (`39832255365`) completed successfully with the expanded browser suite and all Core/Fusion checks.
- The 093-specific GĐV list and custom-name selection are now in `fusion/gdv-093.js`; the shared search and image-ingest logic remain in Core. App Core has decreased to 26,094 bytes in the latest source snapshot, compared with 46,529 bytes at the start of this refactor.


## Latest branch verification checkpoint — v2-20261023.28

- Re-read the branch's current `index.html` and `core/app-core.js`: all newly extracted Skin/Fusion/Core modules are loaded before App Core; the main inline implementations for GĐV selection, image ingestion, local-save presentation, load-progress presentation, image viewer, and PDF warning are no longer in App Core. Small wrapper functions for layout/group-list rendering remain intentionally as Skin adapters.
- Current App Core source: **25,112 bytes / 268 lines**, versus 46,529 bytes at the initial audit baseline (about 46% smaller by byte count; not a runtime performance claim).
- Latest full validation workflow, **#679** (`39832377132`), completed successfully after the File Intake Skin and Image Ingest changes.
- Current acceptance boundary remains: test branch only; no merge/deployment, no production `main` changes, and no PTI repository changes. Full manual testing with the user's actual photo set and a physical touch device is still pending.


## Preview Builder and File Delivery Core extraction — v2-20261023.8

- Extracted page/preview iteration into `core/preview-builder.js`. It takes the existing `drawPage` function as a dependency and returns rendered pages, page definitions, and total image count without changing the page grouping rule.
- Extracted PDF file delivery into `core/file-delivery.js`, keeping the existing iOS share sheet/new-tab fallback and desktop download behavior. PDF generation and splitting remain separate from delivery.
- Added unit tests for Preview Builder and File Delivery, and wired both modules before App Core. GitHub Actions run **#696** (`39832618898`) completed successfully, including both module tests and the real Chromium recovery/reorder/full-app smoke suite.
- The current App Core file is 24,677 bytes in the latest branch snapshot. The branch is receiving parallel, non-production refactor commits; continue to re-read the current file SHA before every edit to avoid overwriting changes.


## DOCX image processing moved into DOCX Builder Core — v2-20261023.9

- Extended `core/docx-builder.js` with the existing `imageForDocx` helper. Image loading, orientation-aware canvas sizing, rotation, JPEG encoding, and byte conversion are dependency-injected so the DOCX builder can be tested without real image files or a DOM.
- Expanded `tests/docx-builder.test.js` to verify rotated landscape image dimensions, canvas translation/rotation, draw geometry, JPEG quality, and output bytes.
- GitHub Actions run **#702** (`39832769671`) completed successfully with the DOCX image-processing regression and all existing module/browser checks.
- This keeps DOCX-specific image transformation next to DOCX packaging rather than in the main App Core; no change to production deployment or PTI.


## High-quality PDF export controller extraction — v2-20261023.11

- Moved the high-quality PDF export orchestration from App Core into `core/pdf-export-controller.js`: duplicate-run guard, button/checkbox locking, progress updates, multi-file delivery, completion message, and error recovery.
- PDF splitting remains in `core/pdf-export.js`, while actual platform-specific file delivery remains in `core/file-delivery.js`. The controller receives both as injected dependencies.
- Added `tests/pdf-export-controller.test.js` for no-pages handling, multi-part export, progress state, and error recovery. GitHub Actions run **#710** (`39832981323`) passed.
- The latest App Core snapshot measured 22,541 bytes at this extraction point. This is another reduction in orchestration size; no production or PTI deployment occurred.


## Remove obsolete Word/DOCX draft workflow — v2-20261023.14

- Per project decision, Word/DOCX is not a supported draft persistence path; local IndexedDB draft recovery is the canonical draft workflow. Removed `saveDocx` / `openDocxFile` and their DOCX builder wiring from `core/app-core.js`.
- Removed `core/docx-builder.js`, its dedicated test, and `core/zip-utils.js`, which was only used by the retired DOCX path. Removed their script tags and the DOCX-specific CI steps/load-order assertions.
- Preserved local draft modules, `pti093_local_drafts_v1`, `AUTO-DRAFT`, session key, and Drive Fusion. No changes to `main`, production deployment, or the separate PTI repository.
- Required follow-up: run the complete CI after removal and verify no remaining DOCX/ZIP helper references. This commit records code removal; acceptance depends on the resulting workflow.


## Retired DOCX cleanup, Preview Skin, and standard PDF export — v2-20261023.19

- Removed the obsolete Word/DOCX draft path and its ZIP/XML helper because local IndexedDB is the canonical draft-recovery workflow. The follow-up cleanup removed stale ZIP CI steps and the smoke-test expectation that DOCX should load. Workflow run **#770** (`39834098942`) completed successfully after the preview-test syntax fix and retired-path cleanup.
- Extracted the preview UI into `skin/classic-preview.js`. It owns preview-page DOM rendering, preview summary/status, visibility of edit/new-case controls, scroll positioning, and assignment of `state.pages` / `state.pageDefs`. That assignment is required for the PDF export path.
- Extended the full-app Chromium smoke test to add a real SVG image through the actual file input, finish the image group, render a preview page, and trigger a PDF download. Workflow run **#775** (`39834334559`) completed successfully; the full app, preview, and PDF download path passed, alongside the draft recovery, image reorder, Skin, and Core/Fusion checks.
- Moved both standard PDF export and high-quality split export into `core/pdf-export-controller.js`. Unit tests now cover the standard compressed/uncompressed paths, warning display, completion cleanup, multi-part high-quality export, empty-page guard, and error recovery.
- Extracted layout/orientation control binding into `skin/classic-layout.js`. The current `core/app-core.js` snapshot is about **15,994 bytes**, compared with the initial 46,529-byte baseline (about 65.6% smaller by byte count; this is not a runtime-performance claim).
- Still isolated to `refactor/core-modules-test-20261022`: no merge, no production deployment, no changes to `main`, and no changes to the separate PTI repository. Full manual acceptance with the user's actual photo set and physical touch-device interaction remains open.


## Layout controls, GĐV preferences, and image editing Core — v2-20261023.20

- Moved the portrait/landscape and images-per-page controls from `core/app-core.js` into `skin/classic-layout.js`. The Skin now owns rendering and click binding for these controls; the Core supplies state and the autosave callback. Regression tests verify all six count choices, active-state changes, orientation selection, and autosave scheduling.
- Moved 093-specific GĐV preference restoration and persistence from inline application code into `fusion/gdv-093.js`. The Fusion retains the saved standard GĐV, custom-name prompt/cache, and autosave callback. Regression tests cover persistence and the custom-name flow. This remains 093-only; no PTI repository was modified.
- Extracted image edit transitions into `core/image-editing.js`: begin insert/replace, duplicate prevention, replacement while preserving caption/rotation/order metadata, insert sequencing, rotation, caption change, delete, clear confirmation, render, and draft-save scheduling. Unit tests cover these transitions and autosave semantics.
- Latest complete validation: GitHub Actions run **#797** (`39834741290`) passed on head `0b63f1c96d17c99b7b680e540138a65ee6940d04`, including real Chromium IndexedDB draft recovery, full-app smoke test, module syntax checks, and Core/Skin/Fusion tests.
- DOCX/Word draft storage remains retired; local IndexedDB is the supported draft recovery mechanism. No changes to `main`, no production deployment, and no changes to the separate PTI repository.
- Remaining work: continue reducing `core/app-core.js` by extracting cohesive responsibilities with regression coverage. Full user-device/manual acceptance and production release are still separate, explicit gates.


## Group Workflow, Drive Fusion bindings, and Preview return control — v2-20261023.23

- Extracted group editing, save-next, finish, and commit coordination into `core/group-workflow.js`; App Core now delegates those actions and the Classic Group List Skin edit callback. Tests cover commit, finish-to-preview, edit/cancel/confirm, state reset, and autosave.
- Moved Drive search/save/create button bindings into `fusion/drive.js` via `bindControls()`. App Core now injects dependencies and delegates UI wiring to the 093-only Fusion. Existing upload logic, concurrency behavior, per-file confirmation, and Drive storage helpers were not rewritten. GitHub Actions run **#848** (`39835717353`) passed after the Fusion binding/test updates.
- Moved the back-to-edit handler into `skin/classic-preview.js`, alongside preview presentation. The Skin now closes the full-screen preview when available, releases body scroll lock, scrolls back to the editor, and updates status.
- Latest full validation run **#855** (`39835875058`) completed successfully on head `3b00fa7540e0115a2284ff71addb78fcf3f4eb76`, including real Chromium draft recovery, full-app preview/PDF export smoke test, Image Editing Core, Group Workflow Core, Skin/Fusion tests, and syntax checks.
- Current `core/app-core.js` snapshot is about **10,289 bytes**, down from the original 46,529-byte baseline (about 77.9% smaller by byte count). This measures orchestration source size only, not runtime speed or acceptance completeness.
- The branch remains isolated; no merge, no production deployment, and no changes to the separate PTI repository. Manual acceptance on the user's actual PC/iPhone and actual case photos remains a release gate.


## Session Actions Core extraction — v2-20261023.24

- Moved the “Làm tiếp bản ảnh khác” / new-case transition into `core/session-actions.js`. The module persists the selected GĐV (including the custom-name path), disables the action while clearing the previous autosave draft, warns if cleanup fails, and reloads the page as before.
- Wired the module before application initialization and added `tests/session-actions.test.js` covering normal selection, custom GĐV, awaited draft cleanup, and cleanup-failure recovery. The load-order assertion was added to the draft-recovery integration test.
- DOCX/ZIP draft functionality remains fully retired: the branch no longer contains `core/docx-builder.js`, `core/zip-utils.js`, a DOCX builder test, or DOCX script/CI references. IndexedDB draft recovery and 093 Drive Fusion remain separate and unchanged in purpose.
- The latest completed validation visible during this audit update was run **#974** (`39836097410`) on commit `ee1ad96f2f9674915ebcbfd05e971b0fbba8d6d6`, which passed. Newer runs for the Session Actions tests/load-order checks were still running or queued at audit time; verify the latest branch-head run before declaring the current full workflow green.
- Current work remains isolated to `refactor/core-modules-test-20261022`. No merge, production deployment, changes to `main`, or changes to the PTI repository were performed.


## Device Context Core and UI Mode Toggle Skin — v2-20261023.25/.26

- Extracted the shared device label helper into `core/device-context.js`. Local Open and Drive Fusion receive the same injected `deviceStorageLabel` function, keeping the device classification consistent without coupling either module to browser globals. Tests cover iPhone/iPad/iPod, Android, desktop, and empty user-agent strings.
- Extracted the UI mode toggle from the final inline script into `skin/ui-mode-toggle.js` without changing its user-facing behavior: the first-run default remains Classic, an existing saved Modern choice is respected after the one-time migration flag, the toggle updates the stylesheet/body class/accessible label, and blocked localStorage does not prevent switching in the current page.
- Added `tests/ui-mode-toggle.test.js` and workflow syntax/unit steps. The regression test passed in CI, including Classic default, saved preference, both toggle directions, and blocked-storage behavior.
- Latest full workflow validation on branch head `7b50452580baef8d24a7a33103b449ce3d8f935d` completed successfully in GitHub Actions runs **#893** (`39836510500`) and **#892** (`39836503576`); both report success. The run logs show the real Chromium IndexedDB draft recovery, image reorder, full-app smoke test, and all Core/Skin/Fusion unit/contract checks passed.
- The obsolete DOCX/ZIP draft path remains removed. The branch still uses `pti093_local_drafts_v1`, `AUTO-DRAFT`, and the established session key for local draft recovery; Drive upload/save remains in the 093-only Fusion with its original concurrency and per-file tracking.
- Current scope remains the 093 test branch only. No merge, production deployment, changes to `main`, or changes to the PTI repository. Actual PC/iPhone manual acceptance remains a separate release gate.


## PDF and Local Save control ownership; App Core cleanup — v2-20261023.28

- Moved the standard PDF button binding into `core/pdf-export-controller.js`. The controller now owns the `#pdf` click handler and receives the button element directly, avoiding duplicate UI wiring in App Core. Extended its unit test to exercise the actual binding and standard export path.
- Moved the `#driveSaveDraft` click binding into `core/local-save.js`, where the local-save confirmation, persistence, status/progress, and cleanup flow already live. Added a regression assertion that the Core installs the control handler. This button continues to save locally; this change does not add a Drive case-save path to local-save Core.
- Removed unused aliases from `core/app-core.js` for helpers no longer called after extraction, and removed unused installer-result variables for modules whose install call performs its own control binding. No application algorithms or draft-storage identifiers were changed.
- App Core is now **9,140 bytes** in the latest fetched source, about **80.4% smaller** than the 46,529-byte baseline recorded earlier. This is a source-size comparison only, not a runtime speed claim.
- GitHub Actions runs **#920** (`39837180756`) and **#921** (`39837187559`) both completed successfully on head `afc1c1645e84b12702adf3ae88534e58a66a90ea`. The full workflow includes real Chromium draft recovery, image reordering, app smoke/PDF download, and the module/skin/fusion tests.
- No merge or deployment was performed; `main` and the PTI repository remain unchanged. Manual acceptance on the user's actual PC/iPhone and case images remains an explicit release gate.
