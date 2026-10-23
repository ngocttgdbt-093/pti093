(function(global){
  'use strict';
  function getAllGroups(state){
    return (state.groups||[]).filter(g=>g.items&&g.items.length);
  }
  function snapshotGroupsForProject(state){
    const groups=(state.groups||[]).map(g=>({title:g.title,items:(g.items||[]).slice()}));
    if(state.current&&state.current.items&&state.current.items.length){
      const g={title:state.current.title,items:state.current.items.slice()};
      // Editing removes the selected group from state.groups until commit. A
      // project snapshot must restore it at its original position, not append
      // or merge it into a later group with the same title.
      if(Number.isInteger(state.editing)&&state.editing>=0){
        groups.splice(Math.min(state.editing,groups.length),0,g);
      }else{
        const last=groups[groups.length-1];
        if(last&&last.title===g.title)last.items.push(...g.items);else groups.push(g);
      }
    }
    return groups.filter(g=>g.items&&g.items.length);
  }
  function commitCurrent(state){
    if(!state.current.items.length)return null;
    const group={title:state.current.title,items:state.current.items};
    if(state.editing>=0){state.groups.splice(state.editing,0,group);state.editing=-1;}
    else{
      const last=state.groups[state.groups.length-1];
      if(last&&last.title===group.title)last.items.push(...group.items);
      else state.groups.push(group);
    }
    return group;
  }
  function beginEditGroup(state,index){
    const group=(state.groups||[])[index];
    if(!group)return false;
    state.current={title:group.title,items:group.items};
    state.filenameCaption=false;
    state.groups.splice(index,1);
    state.editing=index;
    state.pages=[];
    return true;
  }
  global.PTIWorkspaceCore = Object.assign(global.PTIWorkspaceCore||{}, {getAllGroups,snapshotGroupsForProject,commitCurrent,beginEditGroup});
})(window);
