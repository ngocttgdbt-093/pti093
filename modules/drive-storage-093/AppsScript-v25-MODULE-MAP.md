# Apps Script backend map (PTI093_DATA_API v25)

The live Apps Script source remains in the 093 project editor so its deployed source and the handoff reference do not drift:

- Project editor: https://script.google.com/u/3/home/projects/1gflXIaWP734qdIzy0xBA3yAT5rPLS89y3y_zhUlIXaNHLFKe799k2f37/edit
- Web app endpoint: https://script.google.com/macros/s/AKfycbwmydXC8QZEKDBoRvJOGZSfQjdYSWzteyAMIYjr7RfoEIiHFetnGUj8A0FlB0hjJcB2kw/exec
- Active deployment observed during the 10-image test: version 25.

## Drive actions to port

| Action | Purpose | Handoff requirement |
| --- | --- | --- |
| `createRecord` | Create case folder, `images/`, and `project.pti` | Replace the 093 root-folder configuration with the destination app's Drive root. |
| `uploadImage` | Verify browser SHA-256, create image, write `PTI093_UPLOAD_KEY` marker; `deferIndex: true` returns pending metadata | Preserve idempotency by `recordId + uploadKey`; never trust the browser hash without server recomputation. |
| `commitUploadIndex` | Validate pending file IDs and markers, deduplicate by SHA-256, then update `project.pti` under ScriptLock | Batch all pending items; only return confirmed after the project write succeeds. |
| `uploadStatus` | Resolve an interrupted iframe response without sending the image again | Return `found`, `pendingIndex`, `fileId`, `recordId`, and `uploadKey` for the exact upload. |
| `saveProject` / `projectStatus` | Save metadata and confirm the matching revision | Preserve `uploadIndex` and `uploadIndexVersion` when the Core saves project metadata. |
| `openRecord` / `searchRecords` / `getImage` | Search, reopen, and load the existing image set | Preserve `fileId`, `fileName`, client key, SHA key, caption, order, and rotation. |

The active code also uses `getPTI093UploadTargets_` to cache the case, image, and project file IDs. Its project index migration scans old images and adds SHA markers before switching `uploadIndexVersion` to `1`. The module must retain this migration or an equivalent compatibility step.

## Recovery and safety invariants

- Do not delete a created image as an error-recovery shortcut. Retry by upload key and reconcile with `project.pti`.
- Acquire `LockService` around index merge/project write; release it in `finally`.
- Do not overwrite existing index entries with an empty Core payload.
- Keep image transport capped at five concurrent requests; grouped index commit happens after the upload groups.
- The two existing Apps Script backup files are outside this module and were not changed.

This map describes the deployed v25 backend behavior. For a standalone copy of the backend source, copy the Drive action handlers and their helper functions from `Mã.gs` in the linked Apps Script project; avoid copying the two backup files as active code.

