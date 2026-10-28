# Core Skin API (Project 5)

## Boundary
Core owns business state and workflows. Classic is the bundled default skin and is registered through the same API as optional skins. A new skin implements the contract below; it must not reimplement image selection, captions, ordering, local drafts, preview, or PDF business logic.

## Skin contract
- `mount({ root, context, manager })`: attach UI and return an instance.
- `update(context)`: render changed shared state (optional).
- `unmount()`: remove listeners, observers and skin-owned DOM (optional but strongly recommended).

## Registration and replacement
```js
const skins = PTICoreSkinManager.createSkinManager({ root: document.querySelector("#app"), context: coreContext });
skins.register("classic", ClassicSkin);
skins.register("modern", ModernSkin); // optional module
skins.use("classic");                 // default
skins.use("modern");                  // replace skin without rewriting Core
```

The manager deliberately knows nothing about Drive or GĐV administration. Those are separately composed modules. A skin must call Core APIs rather than own or duplicate business state. Do not connect the manager to the production entry point until the current monolithic app-core dependencies have been separated and regression tests pass.
