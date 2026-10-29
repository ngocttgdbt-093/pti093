/* 093-specific host assembly.
 * Keeps app-specific integrations outside Shared Core without changing their behavior.
 * This module only composes existing adapters; upload/draft algorithms remain in their owners.
 */
(function(root){
  'use strict';
  function installGdv(deps){
    if(!deps || !deps.window || !deps.window.PTI093GdvFusion) throw new Error('093 host requires PTI093GdvFusion');
    return deps.window.PTI093GdvFusion.install({
      $:deps.$,
      prompt:deps.prompt,
      storage:deps.storage,
      state:deps.state
    });
  }
  function installDrive(deps){
    if(!deps || !deps.window || !deps.window.PTI093DriveFusion) throw new Error('093 host requires PTI093DriveFusion');
    var fusion=deps.window.PTI093DriveFusion.install({
      state:deps.state,
      $:deps.$,
      msg:deps.msg,
      setDriveState:deps.setDriveState,
      setOpenLoad:deps.setOpenLoad,
      finishOpenLoad:deps.finishOpenLoad,
      getAllGroups:deps.getAllGroups,
      snapshotGroupsForProject:deps.snapshotGroupsForProject,
      selectedGdv:deps.selectedGdv,
      scheduleAutoDraftSave:deps.scheduleAutoDraftSave,
      finalizeCompletedSession:deps.finalizeCompletedSession,
      getDateISO:deps.getDateISO,
      setDateInput:deps.setDateInput,
      render:deps.render,
      renderLayout:deps.renderLayout,
      deviceStorageLabel:deps.deviceStorageLabel,
      searchQueryVariants:deps.searchQueryVariants,
      getLocalDrafts:deps.getLocalDrafts,
      openLocalDraft:deps.openLocalDraft,
      normalizeRecordSearch:deps.normalizeRecordSearch,
      gdvSearchMatches:deps.gdvSearchMatches,
      gdvInitials:deps.gdvInitials,
      wrap:deps.wrap
    });
    fusion.bindControls();
    return fusion;
  }
  root.PTI093HostAssembly={installGdv:installGdv,installDrive:installDrive};
})(typeof window!=='undefined'?window:this);
