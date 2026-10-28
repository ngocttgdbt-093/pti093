# Integration Notes — Project 5 Core
## Required port scope
Port only these three parts from GHÉP ẢNH 093 source commit `9c7c39d26c87bd99a74f1fde013fc0fa0e2a8c94`:
1. Compact context menu markup and theme-matched styles.
2. The context-menu delete action and custom confirmation dialog.
3. The handler wiring that reuses existing bulk caption, selected-image IDs, render, draft autosave, and toast/message functions.

## Framework-neutral behavior contract
```text
onImageContextMenu(event, card):
  ignore interactive controls such as textarea/input/button/select
  prevent native context menu
  if card is not selected:
    clear selection and select card
  open compact menu at pointer position, clamped to viewport

onCaptionAction():
  close menu
  call existing bulk-caption workflow

onDeleteAction():
  close menu
  snapshot selected stable image IDs
  if snapshot empty: return
  open custom confirmation dialog with count
  cancel / Escape / backdrop => close only
  confirm:
    intersect snapshot IDs with current live image IDs
    if none remain: close and clear selection
    remove only matching items using stable IDs
    close dialog
    clear selection
    render
    schedule existing auto-draft save once
    show success message with actual removed count
```

## Source identifiers (adapt to Core naming)
- Selection: `selected`, `keyFor(card)`, `cards()`, `updateSelectionUI()`, `clearSelection()`
- Menu: `#captionContextMenu`, `openMenu(x,y)`, `closeMenu()`
- Caption action: `applyBulkCaption()`
- Stable identity: `pti093EnsureDragId(item)` (replace with Core's equivalent; do not copy this name blindly)
- State/render/save/notice: `state.current.items`, `render()`, `scheduleAutoDraftSave(true)`, `msg()` (map to Core equivalents)

## Integration cautions
- Use the existing Core selection set as the source of truth; avoid a second independent selection state.
- Snapshot stable IDs when opening confirmation; revalidate against live items on confirm.
- Never mutate the array while iterating DOM card indices.
- Ensure dialog listeners are removed on close and prevent duplicate event bindings.
- If Core already has a shared modal/toast service, use it while preserving the visual and behavioral acceptance criteria.
- No Drive module/API/configuration is included or authorized by this package.

## Required evidence before marking complete
Record the Project 5 repository/branch and resulting commit/PR, test command(s) and results, plus a browser check confirming exact selected count and no-op cancellation. Do not report integration as complete until those checks pass.
