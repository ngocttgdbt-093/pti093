# Core Refactor Audit — v1-20261022

## Purpose and safety boundaries

This file records the initial source audit for the shared Core refactor of GHÉP ẢNH 093 and GHÉP ẢNH PTI. It is an implementation log, not a claim that the refactor or browser acceptance tests are complete.

- Keep both `main` branches and current production deployments unchanged during refactor.
- Treat the currently working 093 Core, 093 Drive case-saving, and PTI administrator/user-directory function as stable behavior to preserve.
- PTI must not save image cases to Drive. Its Drive use is limited to the separate administrator/login/user-directory workflow.
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
