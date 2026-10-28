# Replaceable skin contract

1. Core owns business state and services; skins own markup, styling, and presentation behavior only.
2. Core exposes a stable mount point and context/event contract. It must not query skin-specific class names.
3. Register a skin by key (for example `register("classic", PTICoreClassicSkin)`) and select it through configuration, not Core edits.
4. Required skin API: `mount({root,context,manager})`, returning an instance with optional `update(context)` and `unmount()`.
5. Feature modules register independently: Drive storage contributes its own UI/actions; PTI GĐV administration contributes its own UI/actions. Neither is part of shared Core or Classic.
6. Classic is the default skin shipped beside Core. Modern/other skins are optional packages and must not load by default.
7. Skins express user intent; Core performs operations and passes state through context. Do not duplicate business logic inside a skin.
8. Mount markup before initializing DOM-bound controllers. Dispose skin-owned listeners before switching skins.
