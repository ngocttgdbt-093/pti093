# Project 5 — Neutral Core host assembly plan (2026-10-29)

## Purpose

Define the next implementation slice after the source-level boundary audit and isolated module packaging. This document is a migration plan, not evidence that the runtime split is already implemented.

## Current verified state

- `core/app-core.js` remains the 093 composition root. It installs `PTI093GdvFusion`, `PTI093DriveFusion`, and Classic UI controllers.
- `index.html` remains the 093 host and loads `fusion/drive.js` and `fusion/gdv-093.js`.
- Core modules other than `core/app-core.js` pass the current static guard against direct references to app-specific Drive/GĐV integrations.
- Local draft persistence now has a Core-facing `PTIDraftStorageContract`, but legacy IndexedDB fallback paths remain during migration.
- Packaged Classic Skin, Drive Storage 093, and PTI GĐV Admin are not yet proof of separate runnable hosts.
- Existing CI uses mocked storage/API contracts; real Drive uploads and deployed PTI admin CRUD remain acceptance requirements.

## Target assembly boundaries

### Shared Core

Own only shared workflow and domain behavior: workspace, image ordering/selection, captions and autocorrect, local draft lifecycle, preview/PDF, and stable contracts.

Must not:
- load or initialize `PTI093DriveFusion`, `PTI093GdvFusion`, or PTI admin APIs;
- contain a concrete Apps Script endpoint;
- own app-specific administration UI;
- select a skin by hard-coded DOM IDs from a specific app shell.

### 093 host

Compose Shared Core with:
- existing Drive Fusion/storage adapter, unchanged upload semantics;
- 093 GĐV Fusion;
- selected 093 skin.

Drive invariant: concurrency remains 5; each file is tracked; upload completion is not confirmed until grouped commit/index update succeeds. Keep existing upload keys, SHA-256 and retry/idempotency behavior. Do not modify production Apps Script endpoints or backup scripts during host extraction.

### PTI host

Compose Shared Core with:
- PTI-specific GĐV Admin/API adapter;
- selected skin;
- no 093 Drive Fusion, no 093 Drive endpoint.

Do not make PTI's GĐV list inherit the 093 list or silently reuse 093 Drive persistence.

### Skin contract

A skin provides mount/update/unmount (or equivalent adapter contract) and owns presentation only. Core/host supplies workflow callbacks and state; changing a skin must not require changing domain rules or storage backends. The Classic date picker must use shared Core date utilities and preserve direct `dd/mm/yyyy` entry.

## Safe implementation sequence

1. **Freeze behavior with tests.** Preserve existing Core regression suite, AUTO-DRAFT/session-key contract, image order/captions/rotations, PDF export, and upload concurrency-five contract.
2. **Extract composition, not business logic.** Introduce a small host-neutral bootstrap/contract registry. Move 093-specific initialization from `core/app-core.js` into a clearly named 093 assembly file without changing function bodies or upload flow.
3. **Keep a compatibility entry point.** Existing `index.html` must continue to boot the 093 assembly until browser smoke tests pass. Do not switch production entry points in this step.
4. **Wire the Classic skin through its adapter.** Verify required DOM/controller dependencies and date picker wiring; do not duplicate date formatting.
5. **Create a separate PTI host.** It must install the PTI GĐV Admin adapter and explicitly omit 093 Drive Fusion. Confirm by runtime spy that no 093 Drive endpoint/API is called.
6. **Test each host independently.** Chromium startup, local draft save/reload/F5 recovery, captions/autocorrect, image ordering, preview/PDF, date entry and mobile layout.
7. **Manual acceptance before release.** On the real 093 app upload 10 images and verify 10/10 file outcomes plus grouped commit; on deployed PTI verify admin login and add/edit/delete persist after reload.
8. **Only then consider merging.** Keep all work on review branches. Never merge/deploy as a side effect of this refactor.

## Stop conditions

Stop and fix before proceeding if:
- the 093 upload implementation differs from the canonical tested function without a specific approved reason;
- AUTO-DRAFT/session IDs or IndexedDB schema change;
- the PTI host loads `fusion/drive.js` or references a 093 endpoint;
- a skin change requires modifying shared business logic;
- tests pass only because they stub out the behavior being claimed.

## Definition of done

- Static boundary tests pass for Shared Core and both hosts.
- All Core regression tests pass in 10 consecutive rounds.
- Both host browser smoke tests pass independently.
- Real 093 Drive upload and real deployed PTI GĐV CRUD are separately verified.
- PR documents identify what was tested with mocks versus real services.
- No merge or production deployment until explicit acceptance.
