(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.PTICoreSkinManager=api;})(typeof window!=="undefined"?window:globalThis,function(){
"use strict";
function createSkinManager(options={}){const skins=new Map();let active=null,activeInstance=null,context=options.context||{},root=options.root||null,transition=Promise.resolve();
function register(name,skin){if(typeof name!=="string"||!name.trim())throw new TypeError("Skin name is required");if(!skin||typeof skin.mount!=="function")throw new TypeError("Skin must implement mount({root,context})");if(skins.has(name))throw new Error("Skin already registered: "+name);skins.set(name,skin);return api;}
function use(name,nextContext){const operation=async()=>{if(!skins.has(name))throw new Error("Unknown skin: "+name);if(active===name){if(nextContext!==undefined){context=nextContext;if(activeInstance&&typeof activeInstance.update==="function")await activeInstance.update(context);}return activeInstance;}
const previousName=active,previousSkin=previousName?skins.get(previousName):null,previousInstance=activeInstance,previousContext=context;
if(nextContext!==undefined)context=nextContext;
if(previousInstance&&typeof previousInstance.unmount==="function")await previousInstance.unmount();
active=null;activeInstance=null;
try{const instance=await skins.get(name).mount({root,context,manager:api});active=name;activeInstance=instance||{};return activeInstance;}
catch(error){if(previousSkin){try{activeInstance=await previousSkin.mount({root,context:previousContext,manager:api})||{};active=previousName;context=previousContext;}catch(rollbackError){error.rollbackError=rollbackError;}}throw error;}};
transition=transition.then(operation,operation);return transition;}
function update(nextContext){context=nextContext;const operation=async()=>{if(activeInstance&&typeof activeInstance.update==="function")await activeInstance.update(context);return activeInstance;};transition=transition.then(operation,operation);return transition;}
function dispose(){const operation=async()=>{if(activeInstance&&typeof activeInstance.unmount==="function")await activeInstance.unmount();active=null;activeInstance=null;};transition=transition.then(operation,operation);return transition;}
const api={register,use,update,dispose,setRoot(value){root=value;return api;},getActive(){return active;},getRegistered(){return Array.from(skins.keys());}};return api;}
return{createSkinManager};});
