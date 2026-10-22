# GHÉP ẢNH 093 — Core / Fusion / Skin Module Map

**Branch:** `refactor/core-modules-test-20261022`  
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
| `core/group-workflow.js` | Group save/next, finish/preview, edit/cancel/confirm coordination |
| `core/local-draft-store.js` | IndexedDB open/transaction/list primitives |
| `core/draft-recovery.js` | Autosave scheduling, save/restore/cleanup, session lifecycle binding |
| `core/session-actions.js` | New-case transition and selected-GĐV persistence |
| `core/local-save.js` | Save a local case/draft without photos; owns the local-save button binding |
| `core/local-open.js` | Open an existing local case and restore fields/images |
| `core/device-context.js` | Device label used by local-open and Drive Fusion |
| `core/image-ingest.js` | File filtering, duplicate handling, default captions, append sequence |
| `core/image-editing.js` | Insert/replace, caption, rotate, delete, clear and autosave semantics |
| `core/image-reorder.js` | Image-order operations and render/save callbacks |
| `core/case-editor.js` | Case title and filename-caption controls |
| `core/date-utils.js` | dd/mm/yyyy mask, normalization, ISO conversion and validation |
| `core/file-naming.js` | Image basename, GĐV code and PDF filename rules |
| `core/file-delivery.js` | Browser download and iOS share/popup fallback |
| `core/pdf-builder.js` | Page sizing, JPEG quality, byte generation, adaptive compression and splitting |
| `core/image-canvas.js` | Canvas loading/drawing, rotation/containment, page render |
| `core/preview-builder.js` | Ordered preview pages and page definitions |
| `core/pdf-export.js` | High-quality split PDF preparation |
| `core/pdf-export-controller.js` | Standard/high-quality export orchestration and PDF button binding |
| `core/app-core.js` | Composition root only |

## Fusion modules

| Module | Responsibility |
|---|---|
| `fusion/drive.js` | 093-only Drive record search/open/create/save/upload, SHA-256 upload keys, pending/uploaded state and progress |
| `fusion/gdv-093.js` | 093-specific GĐV list, custom-name prompt/cache, selected-GĐV persistence |
| `fusion/drive-recovery-guard.js` | Drive upload-entry guard and legacy stray-text cleanup |

## Skin modules

- **Classic:** `classic-file-intake`, `classic-group-list`, `classic-image-grid`, `classic-image-viewer`, `classic-layout`, `classic-load-progress`, `classic-local-save`, `classic-pdf-warning`, `classic-preview`, `classic-status`.
- **Other skin/presentation:** `ui-mode-toggle`, `modern-image-gallery`, `preview-modal`.

All of these live under `skin/`; the stylesheet layers live under `css/`.

## Invariants that must not regress

1. Local draft database remains `pti093_local_drafts_v1`; automatic draft ID remains `AUTO-DRAFT`; session key remains `pti093_work_session_id`.
2. Preserve image bytes, image order, captions, rotation, group title, form metadata, GĐV preference, restore ordering, and session cleanup behavior.
3. The user manually tested the existing 093 F5/reload recovery 10/10 times successfully on 2026-10-22. Treat this as the known-good behavioral baseline.
4. DOCX/Word temporary draft storage and its ZIP/XML helper modules are retired. Do not reintroduce them as a draft mechanism.
5. Local Save Core must not call Drive case-upload functions. Drive Fusion remains 093-specific and retains concurrency 5 and per-file upload-state tracking.
6. After PDF, Drive, or local save has succeeded, a subsequent AUTO-DRAFT cleanup failure must be reported as a separate cleanup warning, never as a false export/save failure. `finalizeCompletedSession()` returns an explicit boolean result; PDF Export and Drive Fusion must check `false` even though the finalizer catches its own IndexedDB exception.
6. Do not change `main`, deploy production, or modify the separate PTI repository during this refactor without a separate explicit release decision.

## Validation status — updated 2026-10-23

- Full GitHub Actions validation on code head `88fadc1c1e9cc64adf647e25a84e22644e8346e9`: run **#1084** passed. This module-map-only refresh is separately validated by the next CI run.
- The workflow includes real Chromium IndexedDB draft recovery, orphaned-image cleanup, new-session cleanup, image reordering, full-app smoke/date-mask checks, Classic UI regression tests, and Core/Fusion unit/contract tests.
- Static reference audit confirms `index.html` has zero inline JavaScript blocks; all 53 local `src`/`href` references resolve to repository files with no duplicate local references.
- The DOCX/ZIP draft path removal contract passes. The automatic draft remains IndexedDB-based with the existing `pti093_local_drafts_v1`, `AUTO-DRAFT`, and `pti093_work_session_id` contracts.
- Direct comparison of `pti093UploadAll` on `main` with `fusion/drive.js` found the normalized executable function body matched; only a comment was corrected. The Drive Fusion contract test explicitly asserts concurrency 5 and awaited per-file processing.
- GitHub's branch comparison reports hundreds of commits ahead of `main`; keep this PR draft-only and review/squash the branch history before any release.
- Still separate from CI: manual acceptance on the user's actual PC/iPhone and real case photo sets. The PR remains draft-only; no merge or production deployment is authorized.
