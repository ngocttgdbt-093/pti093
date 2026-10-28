# Classic skin module

This directory extracts the default Classic interface as a replaceable skin module. It owns presentation only, not shared business logic.

## Boundaries
- Included: shared case metadata fields, date picker (dd/mm/yyyy), image intake/workflow UI, captions, layout controls, preview and PDF action controls.
- Excluded: Google Drive storage buttons/status/progress and Drive workflow; GĐV administration menus, buttons, dialogs and management tables; Modern skin toggle and Modern gallery.
- The **GĐV / Thụ lý value field** remains common case metadata. Administration of the GĐV list belongs to the separate PTI GĐV module.
- Local draft and PDF operations remain Core services; the skin only presents controls.

## Contract
`skin.js` exposes `PTICoreClassicSkin.mount({root,context})`, returning an instance with `update(context)` and `unmount()`. A host selects the skin by registration key. A future skin implements the same contract and registers under another key; Core business modules must not import or branch on skin names.

## Integration status
This commit packages Classic markup and its adapter separately. The legacy page is intentionally not switched over in this extraction commit: the host must mount the skin before initializing DOM-bound Core controllers. The date picker markup/controller is packaged here, and Core must initialize it after `PTI093DateUtils` is installed (the wiring is tracked separately in PR #16). That integration is a separate acceptance step so the current page is not broken prematurely.
