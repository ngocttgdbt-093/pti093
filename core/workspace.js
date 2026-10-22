(function(global){
  'use strict';
  function getAllGroups(state){
    return (state.groups||[]).filter(g=>g.items&&g.items.length);
  }
  function snapshotGroupsForProject(state){
    const groups=(state.groups||[]).map(g=>({title:g.title,items:(g.items||[]).slice()}));
    if(state.current&&state.current.items&&state.current.items.length){
      const g={title:state.current.title,items:state.current.items.slice()};
      const last=groups[groups.length-1];
      if(last&&last.title===g.title)last.items.push(...g.items);else groups.push(g);
    }
    return groups.filter(g=>g.items&&g.items.length);
  }
  global.PTIWorkspaceCore = Object.assign(global.PTIWorkspaceCore||{}, {getAllGroups,snapshotGroupsForProject});
})(window);
