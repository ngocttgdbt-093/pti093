# PTI093 Drive storage module

Frozen source: **Final V1-20261027**. This package is intended to be combined with Project 5's shared Core to restore the complete 093 app.

## Source and verification

- Frontend snapshot: GitHub branch [`final-v1-20261027`](https://github.com/ngocttgdbt-093/pti093/tree/final-v1-20261027), commit `8e321068ea279acf7c2b6e762cb07a93d1ec0254`.
- Frontend module fragments: [`DriveStorage093.frontend.js`](./DriveStorage093.frontend.js), extracted from the frozen, tested frontend.
- Live Apps Script backend: project `PTI093_DATA_API`, deployment version 25. The editor is [here](https://script.google.com/u/3/home/projects/1gflXIaWP734qdIzy0xBA3yAT5rPLS89y3y_zhUlIXaNHLFKe799k2f37/edit); deployment endpoint is recorded in `AppsScript-v25-MODULE-MAP.md`.
- Real Drive benchmark: 10/10 first sample images reached the app's confirmed-upload counter in 31.4 seconds. The saved `project.pti` contained 10 image items and 10 unique SHA-256 keys (`uploadIndexVersion: 1`).
- Frontend module syntax and whitespace checks passed. The live upload path used concurrency 5, per-image confirmation, SHA-256 dedupe, and a grouped final index commit.

## Core adapter contract

The frontend fragment is deliberately kept as a source module, not a standalone app. When joining it to Project 5 Core, provide or map these Core interfaces:

- `state.driveRecordId`, `state.driveUploadFailures`, `state.groups`, `state.current`, `state.orientation`, `state.per`, `state.addSeq`, and `state.localDraftId`.
- `$()`, `getAllGroups()`, `selectedGdv()`, `getDateISO()`, `getLocalDrafts()`, and `finalizeCompletedSession()`.
- `msg()`, `render()`, `renderLayout()`, `scheduleAutoDraftSave()`, `getDriveUploadedKeys()` storage behavior, and the open-load progress helpers.
- Existing Drive controls and progress elements: `driveCreate`, `driveSaveProject`, `driveState`, `driveId`, `driveProgress*`, `driveUploadMissing`, `driveSearch`, and `driveSearchResults`.
- Image items must retain `file`, stable `key`, `caption`, `rotate`, and optional Drive metadata (`driveFileId`, `driveFileName`, `driveUploadKey`, `drivePendingUploadKey`).

Do not count an image as confirmed before its server response or final index commit. Keep image concurrency at five. Keep `project.pti` as the record of truth and preserve existing `uploadIndex` values when saving project metadata.

## Join sequence

1. Keep Core's existing image editing and preview state as the source of the item list.
2. Mount the Drive module controls and connect create, update, search, and open actions to the module functions.
3. Keep `uploadImage` creation deferred; after both upload groups finish, call `commitUploadIndex` once for the set of pending items. The module increments each image's confirmed count only after that commit succeeds.
4. Map the Apps Script `PTI093_FOLDER_ID` to the intended Drive root and deploy under the Project 5 app's API configuration. Do not reuse a 093 production root without an explicit integration decision.
5. Run syntax checks, Core integration flows, SHA duplicate recovery, reopen-from-Drive, and a 10-image live Drive test before promoting the joined app.

The 093 final branch is the rollback source. Make integration changes on a separate branch and leave `final-v1-20261027` unchanged.

