# Draft Storage Contract — 2026-10-29

## Purpose

Keep Core workflows independent from a particular persistence implementation. Core code receives `PTIDraftStorageContract`; the app assembly chooses and injects a provider. The current provider is `PTILocalDraftStore` backed by IndexedDB. This is a source-level migration step, not yet a complete neutral runtime split.

## Contract surface

- `readBundle(id)`: read one draft metadata record and its image blobs.
- `readBundles(ids)`: read multiple draft IDs and image sets from one readonly transaction. This is used by AUTO-DRAFT recovery so the active session and legacy `AUTO-DRAFT` key are evaluated from one consistent snapshot.
- `writeBundle(meta, images, onProgress?)`: write metadata, delete prior image blobs for that ID, and write the replacement image set in one readwrite transaction.
- `writeMetadata(meta)`: update only metadata. Used when autosave changes captions or case metadata without marking image blobs dirty.
- `deleteBundle(id)`: delete metadata and all associated image blobs in one readwrite transaction.

Provider validation happens at installation. IDs must be non-empty; write images must refer to the same draft ID as the metadata. Read operations resolve only after their IndexedDB transaction completes, not merely after individual request success.

## Current integrations

- `core/local-open.js`: prefers `readBundle`; legacy direct-IndexedDB fallback remains for tests/older assemblies.
- `core/local-save.js`: prefers `writeBundle`. The active Drive/local identity and per-image Drive references are cleared only after the contract write succeeds. Failure keeps the original workspace associations intact.
- `core/draft-recovery.js`: uses `writeBundle` when image blobs are dirty, `writeMetadata` for metadata-only autosave, `deleteBundle` during cleanup, and `readBundles` to restore active/legacy AUTO-DRAFT atomically.
- `core/app-core.js`: currently remains the legacy 093 assembly and injects the current local draft provider. It is not yet the neutral app-independent runtime entry point.

## Compatibility and safety

- Direct IndexedDB fallback paths are intentionally retained during migration. Remove them only after every caller is injected with the contract and tests prove equivalent behavior.
- The contract is for local drafts. It does not implement Drive operations and must not route PTI to the 093 Drive/Fusion API.
- Drive-specific metadata remains in workspace snapshots for compatibility; this change does not delete or rename those fields.
- The provider and Core contract tests use a mocked IndexedDB implementation in CI. They do not prove browser quota behavior, cross-tab locking, real Drive uploads, or Apps Script backend authorization.

## CI evidence

See [Project 5 Core Runtime Boundary Audit workflow](https://github.com/ngocttgdbt-093/pti093/actions/workflows/core-runtime-boundary-audit.yml) and the latest passing run linked in PR #20. The current test suite runs ten consecutive rounds to catch nondeterministic regressions.

## Next safe steps

1. Add an explicit provider contract test for restore when the active draft is absent and the legacy draft belongs to the same session.
2. Migrate remaining draft-recovery direct IndexedDB paths only after this fallback case is covered.
3. Separate the legacy 093 assembly from a neutral Core runtime entry point; inject app-specific storage, GĐV, and skin providers rather than loading them from Core.
4. Keep 093 Drive storage and PTI GĐV admin separate, then run browser smoke tests for each host before any merge/deploy.
