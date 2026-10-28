(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  if(root) root.PTICoreSkinManager=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  function createSkinManager(options){
    options=options||{};
    const skins=new Map();
    let active=null;
    let activeInstance=null;
    let context=options.context||{};
    let root=options.root||null;
    function register(name,skin){
      if(typeof name!=="string"||!name.trim()) throw new TypeError("Skin name is required");
      if(!skin||typeof skin.mount!=="function") throw new TypeError("Skin must implement mount(context)");
      if(skins.has(name)) throw new Error("Skin already registered: "+name);
      skins.set(name,skin);
      return api;
    }
    function use(name,nextContext){
      if(!skins.has(name)) throw new Error("Unknown skin: "+name);
      if(active===name) {
        if(nextContext!==undefined) { context=nextContext; if(activeInstance&&typeof activeInstance.update==="function") activeInstance.update(context); }
        return activeInstance;
      }
      const previousName=active, previousSkin=previousName?skins.get(previousName):null, previousInstance=activeInstance;
      if(previousInstance&&typeof previousInstance.unmount==="function") previousInstance.unmount();
      active=null; activeInstance=null;
      if(nextContext!==undefined) context=nextContext;
      try{
        const instance=skins.get(name).mount({root:root,context:context,manager:api});
        active=name; activeInstance=instance||{};
        return activeInstance;
      }catch(error){
        if(previousSkin){
          try{
            activeInstance=previousSkin.mount({root:root,context:context,manager:api})||{};
            active=previousName;
          }catch(rollbackError){ error.rollbackError=rollbackError; }
        }
        throw error;
      }
    }
    function update(nextContext){
      context=nextContext;
      if(activeInstance&&typeof activeInstance.update==="function") activeInstance.update(context);
      return activeInstance;
    }
    function dispose(){
      if(activeInstance&&typeof activeInstance.unmount==="function") activeInstance.unmount();
      active=null; activeInstance=null;
    }
    const api={register,use,update,dispose,setRoot(value){root=value;return api;},getActive(){return active;},getRegistered(){return Array.from(skins.keys());}};
    return api;
  }
  return {createSkinManager:createSkinManager};
});