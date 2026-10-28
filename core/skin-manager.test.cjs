const assert=require("node:assert/strict");const {createSkinManager}=require("./skin-manager.js");
(async()=>{
const events=[];const manager=createSkinManager({root:{id:"root"},context:{n:1}});
manager.register("classic",{async mount({context}){events.push("classic:"+context.n);return{async update(c){events.push("update:"+c.n)},async unmount(){events.push("unmount:classic")}}}});
manager.register("modern",{async mount({context}){events.push("modern:"+context.n);return{async unmount(){events.push("unmount:modern")}}}});
assert.deepEqual(manager.getRegistered(),["classic","modern"]);await manager.use("classic");assert.equal(manager.getActive(),"classic");await manager.update({n:2});await manager.use("modern",{n:3});assert.equal(manager.getActive(),"modern");assert.deepEqual(events,["classic:1","update:2","unmount:classic","modern:3"]);await manager.dispose();assert.equal(manager.getActive(),null);
assert.throws(()=>manager.register("modern",{}),/Skin already registered/);await assert.rejects(manager.use("missing"),/Unknown skin/);
const broken=createSkinManager({root:{}});broken.register("good",{mount(){return{unmount(){}}}});broken.register("bad",{mount(){throw new Error("mount failed")}});await broken.use("good");await assert.rejects(broken.use("bad"),/mount failed/);assert.equal(broken.getActive(),"good");
console.log("Async skin-manager tests passed.");
})().catch(e=>{console.error(e);process.exitCode=1;});
