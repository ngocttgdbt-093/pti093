# PTI GĐV Admin module

## Purpose
Standalone PTI-only administrator UI for managing the GĐV list. It is not part of shared Core and must not be loaded by the 093 app.

## Source and integration
- Source: `ngocttgdbt-093/pti`, `main:admin-gdv/admin-gdv.js`.
- Target package: `modules/pti-gdv-admin/admin-gdv.js`.
- Requires the host page to provide the existing `#gdv` select element.
- The module adds a lock button, authenticated management dialog, editable name list, add/remove controls, save and logout.
- It uses a dedicated PTI admin Apps Script API. Set `window.PTI_GDV_ADMIN_API_URL` before loading the script to override the configured endpoint for another deployment.

## API contract expected by the frontend
- `publicList`: read public PTI GĐV options.
- `login`: authenticate administrator and return a session token.
- `list`: return the managed list for the authenticated session.
- `save`: persist the normalized list and return the canonical saved names.
- `logout`: revoke the session.

The backend source is not included in this frontend package; it remains a separately deployed dependency. The frontend's existence does not prove the endpoint is configured securely or that server-side authorization is correct.

## Data and security boundaries
- Never point this module at the 093 Drive/records API.
- Do not merge the PTI list with the 093 hard-coded list or preferences.
- Server-side authorization must validate the session token for every protected operation; client-side hiding of controls is not authorization.
- Before release, verify admin password configuration, session expiry/revocation, origin validation, persistence after reload, duplicate/blank-name handling and audit/log policy.
- The UI displays a save success message only after the API responds successfully. A timeout is an unknown outcome and must be reconciled by reloading the canonical list.

## Verification status
Source syntax and module boundary checks are covered by the Project 5 package CI. A live authenticated add/edit/delete/save/reload test against the deployed PTI backend is still pending.
