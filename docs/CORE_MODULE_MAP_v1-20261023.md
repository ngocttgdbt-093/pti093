# GHÉP ẢNH 093 — Core / Fusion / Skin Module Map

**Branch:** `refactor/core-modules-review-20261023`  
**Scope:** refactor/test branch only; this document does not authorize merge or deployment.

## Architecture boundary

- **Core** owns reusable application rules and workflows: workspace state operations, local draft persistence/recovery, image editing/ingest/order, naming/date rules, PDF generation/export coordination, and device context.
- **Fusion** owns 093-specific integrations. In particular, `fusion/drive.js` contains the existing 093 Drive record search/open/create/save/upload workflow and upload-state tracking. Keep the original concurrency-5 batch uploader and per-file tracking intact; do not move this case-upload path into shared Core or PTI.
- **Skin** owns DOM rendering, layout, modal behavior, status/progress display, and skin-specific control bindings.
- **`core/app-core.js`** is the composition root: it creates state, installs modules, injects dependencies, and connects Core/Fusion/Skin APIs. It should not absorb extracted business logic back into itself.

## Core modules

| Module | Responsibility |
|---|---|
| `core/gdv-search.js` | Vietnamese-aware GĐV/search normalization, initials, query variants, partial-name matching |
| `core/workspace.js` | Workspace group access and non-mutating project snapshots |
| `core/group-workflow.js` | Group save/next, finish/preview, edit/cancel/confirm coordination; blocks group changes during workspace open |
| `core/local-draft-store.js` | IndexedDB open/transaction/list primitives |
| `core/draft-recovery.js` | Autosave scheduling, save/restore/cleanup, session lifecycle binding; persists Drive incomplete/provenance warnings but never persists in-flight open locks, and shows the relevant warning after reload |
| `core/session-actions.js` | New-case transition and selected-GĐV persistence; reserves the workspace while AUTO-DRAFT cleanup runs, and releases the lock if cleanup fails |
| `core/local-save.js` | Save a local case and its image blobs to IndexedDB; blocks stale snapshots while a workspace is opening, never uploads the case to Drive, and preserves provenance warnings for partial-origin local copies |
| `core/local-open.js` | Open an existing local case and restore fields/images; serializes workspace opens, refreshes AUTO-DRAFT after open, and releases the shared open lock on success/failure |
| `core/device-context.js` | Device label used by local-open and Drive Fusion |
| `core/image-ingest.js` | File filtering, duplicate handling, default captions, append sequence; blocks intake while another workspace is opening |
| `core/image-editing.js` | Insert/replace, caption, rotate, delete, clear and autosave semantics; blocks mutations during workspace open |
| `core/image-reorder.js` | Image-order operations and render/save callbacks; refuses order commits during workspace open |
| `core/case-editor.js` | Case title and filename-caption controls; blocks edits during workspace open |
| `core/date-utils.js` | dd/mm/yyyy mask, normalization, ISO conversion and validation |
| `core/file-naming.js` | Image basename, legacy-compatible/path-aware file keys, GĐV code and PDF filename rules |
| `core/file-delivery.js` | Browser download and iOS share/popup fallback; propagates user-cancelled share so export cannot be finalized falsely |
| `core/pdf-builder.js` | Page sizing, JPEG quality, byte generation, adaptive compression and splitting |
| `core/image-canvas.js` | Canvas loading/drawing, rotation/containment, page render |
| `core/preview-builder.js` | Ordered preview pages and page definitions |
| `core/pdf-export.js` | High-quality split PDF preparation; can render from an immutable page/page-definition snapshot instead of mutable live workspace state |
| `core/pdf-export-controller.js` | Standard/high-quality export orchestration; rejects stale exports if pages/page definitions change, serializes post-export AUTO-DRAFT cleanup against opens, preserves draft on cancelled iOS share, and retains AUTO-DRAFT after exporting a partial Drive workspace |
| `core/app-core.js` | Composition root only |

## Fusion modules

| Module | Responsibility |
|---|---|
| `fusion/drive.js` | 093-only Drive record search/open/create/save/upload, SHA-256 upload keys, pending/uploaded state and progress; serializes opens, autosaves opened records, and protects partial opens until a complete reopen or explicit local copy |
| `fusion/gdv-093.js` | 093-specific GĐV list, custom-name prompt/cache, selected-GĐV persistence |
| `fusion/drive-recovery-guard.js` | Drive upload-entry guard and legacy stray-text cleanup |

## Skin modules

- **Classic:** `classic-file-intake`, `classic-group-list`, `classic-image-grid`, `classic-image-viewer`, `classic-layout`, `classic-load-progress`, `classic-local-save`, `classic-pdf-warning`, `classic-preview`, `classic-status`. `classic-preview` rejects a build if the workspace opens or its immutable image/caption/rotation snapshot changes before rendering completes.
- **Other skin/presentation:** `ui-mode-toggle`, `modern-image-gallery`, `preview-modal`.

All of these live under `skin/`; the stylesheet layers live under `css/`.

## Invariants that must not regress

1. Local draft database remains `pti093_local_drafts_v1`; automatic draft ID remains `AUTO-DRAFT`; session key remains `pti093_work_session_id`.
2. Preserve image bytes, image order, captions, rotation, group title, form metadata, GĐV preference, restore ordering, and session cleanup behavior.
3. The user manually tested the existing 093 F5/reload recovery 10/10 times successfully on 2026-10-22. Treat this as the known-good behavioral baseline.
4. DOCX/Word temporary draft storage and its ZIP/XML helper modules are retired. Do not reintroduce them as a draft mechanism.
5. Local Save Core must not call Drive case-upload functions. Drive Fusion remains 093-specific and retains concurrency 5 and per-file upload-state tracking.
6. After PDF, Drive, or local save has succeeded, a subsequent AUTO-DRAFT cleanup failure must be reported as a separate cleanup warning, never as a false export/save failure. `finalizeCompletedSession()` returns an explicit boolean result; PDF Export and Drive Fusion must check `false` even though the finalizer catches its own IndexedDB exception. A user-cancelled iOS share is not a successful export and must retain AUTO-DRAFT.
6a. A Drive record opened with missing images must be visibly marked incomplete and protected from overwrite/upload until a full reopen succeeds; persist this guard across AUTO-DRAFT reload.
7. Do not change `main`, deploy production, or modify the separate PTI repository during this refactor without a separate explicit release decision.

## Validation status — updated 2026-10-23

- Preview race regression: `classic-preview` snapshots group/item identity plus title, caption, rotation, key and file reference before asynchronous canvas generation; if an open starts or the snapshot changes, stale pages are discarded without overwriting PDF pages or hiding editor controls. Chromium-independent unit tests cover pending-open and changed-caption races.
- New-case transition now reserves `workspaceOpenPending` while AUTO-DRAFT is deleted, preventing concurrent local/Drive opens from racing cleanup and then being discarded by reload; cleanup failure releases the lock and leaves the existing Drive identity intact.
- Preview race tests passed on source/test head `dfd6e08639953423869180db2ca8907dcbfb76b6` (push **#1431**, PR **#1432**). The new-case lock and PDF stable-snapshot/post-export cleanup lock passed PR validation **#1452** on head `b22d4bf29e8c1454e28b932cfcd4e6cddeb6a41f`; push CI **#1451** had all 73 steps completed without failed steps and was finalizing when last checked. This documentation update triggers a fresh validation run.
- The workflow includes real Chromium IndexedDB draft recovery, orphaned-image cleanup, new-session cleanup, image reordering, full-app smoke/date-mask checks, Classic UI regression tests, and Core/Fusion unit/contract tests.
- IndexedDB failure-boundary coverage now includes unsupported IndexedDB, a throwing `window.indexedDB` getter (`SecurityError`), synchronous `indexedDB.open()` exceptions, asynchronous open-request errors, and the Draft Recovery guarantee that a blocked database is not reported as successfully restored. PR CI run #1115 passed on test head `9b4e3809ef122b7763e0a5f768d004674e3f32be`; the documentation update itself triggers another CI run.

## Dependency load-order regression — 2026-10-23

- Expanded `tests/local-references.test.js` to assert that the local IndexedDB adapter loads before Draft Recovery; all Core/Fusion/Classic Skin dependencies load before `core/app-core.js`; late UI patches load after App Core initialization; and retired DOCX/ZIP modules remain absent from the script path.
- This is a structural regression guard: it does not claim a runtime speed improvement. The user explicitly clarified that the historical 093 Drive uploader is operating acceptably and that a 26-second upload target is not a current acceptance requirement. Preserve its proven behavior and focus optimization work on correctness, failure recovery, modular boundaries, and tests.
- Static reference audit confirms `index.html` has zero inline JavaScript blocks; all 53 local `src`/`href` references resolve to repository files with no duplicate local references.
- The DOCX/ZIP draft path removal contract passes. The automatic draft remains IndexedDB-based with the existing `pti093_local_drafts_v1`, `AUTO-DRAFT`, and `pti093_work_session_id` contracts.
- Local-save success-path tests verify section order, captions, rotations, stored file objects, and Drive-state separation after transaction completion.
- The established Drive upload batching/progress implementation remains intact: concurrency 5 and per-file processing/progress are unchanged. `pti093UploadAll` now checks all three write guards before starting: the shared `workspaceOpenPending`, Drive `driveOpenPending`, and `driveOpenIncomplete` flags. This also blocks the Drive Save Changes button's direct uploader call while a local draft is opening. `tests/drive-fusion.test.js` has a regression assertion that the uploader refuses the shared-lock state without issuing a network request.
- The clean review branch is intended to be a small, reviewable diff against `main`; the long-history branch/PR #7 is retained only as audit history and must not be merged.
- Still separate from CI: manual acceptance on the user's actual PC/iPhone and real case photo sets. PR #8 remains draft-only; no merge or production deployment is authorized.


## Workspace-transition autosave hardening — 2026-10-23

- Draft Recovery captures the workspace revision before waiting for IndexedDB and rejects stale AUTO-DRAFT snapshots before opening a write transaction if a local/Drive workspace transition completed while the database was opening. Regression: `tests/draft-recovery-race.test.js`.
- Local Save now applies the same revision/pending guard after IndexedDB opens and before writing. It checks again after the write transaction before detaching Drive/local identifiers from the active workspace. If a transition occurs during the write, it warns that a local copy was written but preserves the newly active workspace and skips AUTO-DRAFT cleanup. Regression: `tests/local-save.test.js`.
- Commit `0882b274` passed PR workflow run **#1471** (all 73 steps successful). Local Save race fix `ea5d793` passed PR workflow run **#1473** (all 73 steps successful). These are automated tests; manual PC/iPhone acceptance remains outstanding.
