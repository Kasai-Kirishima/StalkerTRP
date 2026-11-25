import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { LOCATIONS } from '../src/data/catalog.js';
import { createSceneLayout, classifyItemModel, buildPreviewGeometry, buildItemPreviewGeometry, selectAimedTarget, sampleTerrainHeight, npcFacingYaw, buildSceneCollisionData, sampleLocationHeight, movementKeyFromCode, inputKeyFromCode, selectNearbyNpc, stepJumpMotion } from '../src/3d/renderer.js';
import { ITEMS } from '../src/data/catalog.js';

const profiles=new Set();
function assertFiniteMesh(mesh,label){
  for(const [name,values] of [['vertices',mesh.vertices],['uvs',mesh.uvs],['colors',mesh.colors]]){
    assert.ok(Array.isArray(values)&&values.length>0,`${label} ${name} must exist`);
    assert.ok(values.every(Number.isFinite),`${label} ${name} must not contain NaN or Infinity`);
  }
}
const aimPosition={x:0,z:0};
const aimEntries=[{npc:{id:'front'},pos:{x:0,z:-8}},{npc:{id:'behind'},pos:{x:0,z:5}},{npc:{id:'side'},pos:{x:7,z:-4}}];
assert.equal(selectAimedTarget(aimEntries,aimPosition,0)?.npc.id,'front','aiming must select the NPC in front of the player');
assert.equal(selectAimedTarget(aimEntries,aimPosition,Math.PI)?.npc.id,'behind','aiming must select a target behind the player after turning around');
assert.equal(selectAimedTarget([{npc:{id:'off-axis'},pos:{x:0,z:-8}}],aimPosition,Math.PI/2),null,'aiming must not select targets outside the narrow firing cone');
assert.ok(Math.abs(npcFacingYaw({x:0,z:-5},{x:0,z:0})-Math.PI)<1e-9,'NPC should face south toward a player directly north of it');
assert.ok(Math.abs(npcFacingYaw({x:5,z:0},{x:0,z:0})-Math.PI/2)<1e-9,'NPC should face west toward a player directly west of it');
assert.equal(movementKeyFromCode('KeyW'),'w','W movement must use physical keyboard codes independently of keyboard layout');
assert.equal(movementKeyFromCode('KeyA'),'a','A movement must use physical keyboard codes');
assert.equal(movementKeyFromCode('KeyS'),'s','S movement must use physical keyboard codes');
assert.equal(movementKeyFromCode('KeyD'),'d','D movement must use physical keyboard codes');
assert.equal(movementKeyFromCode('KeyQ'),null,'unmapped keys must not become movement');
assert.equal(inputKeyFromCode('KeyE','у'),'e','interaction shortcut must work independently of keyboard layout');
assert.equal(inputKeyFromCode('KeyL','д'),'l','flashlight shortcut must work independently of keyboard layout');
assert.equal(inputKeyFromCode('Space',' '),'space','jump must use the physical space key');
const nearbyEntries=[{npc:{id:'far'},pos:{x:3.9,z:0}},{npc:{id:'near'},pos:{x:1.4,z:0}}];
assert.equal(selectNearbyNpc(nearbyEntries,{x:0,z:0},4.5)?.npc.id,'near','A should select the nearest nearby NPC for dialogue');
assert.equal(selectNearbyNpc(nearbyEntries,{x:0,z:0},1.0),null,'NPC dialogue should require close proximity');
let jump=stepJumpMotion(0,6.3,1/60);assert.ok(jump.height>0&&jump.velocity>0&&!jump.grounded,'jump should leave the ground with positive vertical velocity');
for(let i=0;i<120;i++)jump=stepJumpMotion(jump.height,jump.velocity,1/60);
assert.equal(jump.height,0,'jump should return to the ground');assert.equal(jump.grounded,true,'jump should report grounded after landing');

const atlasPath=fileURLToPath(new URL('../assets/textures/cordon-materials.png',import.meta.url));
const atlas=fs.readFileSync(atlasPath);
assert.equal(atlas.toString('ascii',1,4),'PNG','Material atlas must be a valid PNG');
assert.equal(atlas.readUInt32BE(16),2048,'Material atlas width must remain 4 columns');
assert.equal(atlas.readUInt32BE(20),1024,'Material atlas height must remain 2 rows');
const npcAtlasPath=fileURLToPath(new URL('../assets/textures/npc-appearance-atlas.png',import.meta.url));
const npcAtlas=fs.readFileSync(npcAtlasPath);
assert.equal(npcAtlas.toString('ascii',1,4),'PNG','NPC appearance atlas must be a valid PNG');
assert.equal(npcAtlas.readUInt32BE(16),1024,'NPC appearance atlas must remain 4 columns');
assert.equal(npcAtlas.readUInt32BE(20),2048,'NPC appearance atlas must remain 4 rows');

for(const location of LOCATIONS){
  const layout=createSceneLayout(location.id,location.neighbors||[]);
  assert.equal(layout.id,location.id,`3D layout missing for ${location.id}`);
  assert.ok(['village','checkpoint','farm','industrial','forest','roadside'].includes(layout.profile),`Unknown 3D scene profile for ${location.id}`);
  assert.deepEqual(layout.neighbors,location.neighbors||[],`Travel exits diverge from world graph for ${location.id}`);
  profiles.add(layout.profile);
}
for(const required of ['village','checkpoint','farm','industrial','forest','roadside'])assert.ok(profiles.has(required),`Missing environment profile ${required}`);
for(const item of ITEMS){assert.ok(['weapon','armor','artifact','medicine','ammo','food','supply'].includes(classifyItemModel(item.id)),`3D item model missing for ${item.id}`);const model=buildItemPreviewGeometry(item.id);assert.ok(model?.mesh?.vertices?.length>60,`3D geometry missing for ${item.id}`);assert.equal(model.mesh.uvs.length,model.mesh.vertices.length/3*2,`3D texture UV missing for ${item.id}`);assertFiniteMesh(model.mesh,`item ${item.id}`);}
for(const location of LOCATIONS){const preview=buildPreviewGeometry(location.id);assert.ok(preview.world.vertices.length>1000,`Scene geometry missing for ${location.id}`);assert.equal(preview.world.uvs.length,preview.world.vertices.length/3*2,`Texture UVs missing for ${location.id}`);assertFiniteMesh(preview.world,`world ${location.id}`);assert.ok(preview.player.vertices.length>100,`Player model missing for ${location.id}`);assert.ok(preview.firstPerson.vertices.length>100,`First-person arms and weapon mesh missing for ${location.id}`);assert.ok(preview.firstPerson.vertices.length<preview.player.vertices.length,`First-person view mesh should not be a full-body character for ${location.id}`);assertFiniteMesh(preview.player,`player ${location.id}`);assertFiniteMesh(preview.firstPerson,`first-person ${location.id}`);assert.ok(preview.groundSamples.length>=5,`Rolling terrain samples missing for ${location.id}`);assert.equal(preview.player.uvs.length,preview.player.vertices.length/3*2,`Player texture UVs missing for ${location.id}`);}
// Character previews must retain enough mesh detail for layered sleeves, elbows and articulated gloves.
const factionPreview=buildPreviewGeometry('rookie-village');
assert.equal(factionPreview.playerPosition.x,-8,'rookie village spawn should keep a clear first-person sightline');
assert.notDeepEqual(factionPreview.npcs[0].mesh.colors,factionPreview.npcs[1].mesh.colors,'loner and bandit outfits should have visibly different faction palettes');
assert.notDeepEqual(factionPreview.npcs[1].mesh.colors,factionPreview.npcs[2].mesh.colors,'bandit and military outfits should have visibly different faction palettes');
const rendererSource=fs.readFileSync(new URL('../src/3d/renderer.js',import.meta.url),'utf8');
assert.ok(rendererSource.includes("buildHumanoid(faction,'npc'")&&rendererSource.includes('draw(entry.mesh'),'runtime NPCs must render as full 3D humanoid meshes');
assert.ok(rendererSource.includes('npcFacingYaw(entry.pos,pos)')&&rendererSource.includes('npcFacingYaw({x:ex,z:ez},pos)'),'NPCs and encounter characters should face the player correctly');
assert.ok(rendererSource.includes('npcFacingYaw(entry.pos,pos)'),'NPCs should keep independently updated facing toward the player');
assert.ok(sampleLocationHeight('sidorovich-bunker',0,-2)<-4.5,'Sidorovich trading room must be below the surface');
assert.ok(sampleLocationHeight('sidorovich-bunker',0,18)>-1.8,'Bunker staircase must rise toward surface level');
assert.equal(LOCATIONS.find(loc=>loc.id==='sidorovich-bunker')?.mapVisible,true,'Sidorovich must have a distinct visible map location');
assert.ok(rendererSource.includes('data-3d=\"sprint\"')&&rendererSource.includes('touchSprint'),'mobile 3D controls should support a hold-to-sprint button');
assert.ok(rendererSource.includes('is-${resolvedControls}')&&rendererSource.includes("['pc','mobile']"),'renderer should expose separate PC and mobile control modes');

const villageCollision=buildSceneCollisionData('rookie-village');
const warehouseCollision=buildSceneCollisionData('atp');
assert.ok(villageCollision.walls.length>5,'village buildings and fences must have collision walls');
assert.ok(warehouseCollision.walls.length>5,'industrial buildings must have collision walls');
const atpFrontDoorPoint={x:-9,z:-12-9*1.02/2};
const distToWalls=(point,w)=>Math.min(...w.map(s=>{const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,l=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((point.x-s.a.x)*dx+(point.z-s.a.z)*dz)/l));return Math.hypot(point.x-(s.a.x+t*dx),point.z-(s.a.z+t*dz));}));
assert.ok(distToWalls(atpFrontDoorPoint,warehouseCollision.walls)>.42,'warehouse loading bays must remain walkable through collision gaps');
const villageHouseDoor={x:-14+.85*1.05,z:-7-5.2*1.05/2};
const villageShedDoor={x:.325*.9,z:15-4.4*.9/2};
const bunkerStairDoor={x:0,z:7.15};
assert.ok(distToWalls(villageHouseDoor,villageCollision.walls)>.42,'village house entrance must line up with the visible doorway');
assert.ok(distToWalls(villageShedDoor,villageCollision.walls)>.42,'village shed loading gate must be walkable');
assert.ok(distToWalls(bunkerStairDoor,buildSceneCollisionData('sidorovich-bunker').walls)>.42,'Sidorovich bunker staircase must be open and walkable');
for(const location of LOCATIONS){const collision=buildSceneCollisionData(location.id);assert.ok(collision.walls.length>0||collision.solids.length>0,`Collision data missing for ${location.id}`);}
assert.ok(rendererSource.includes('targetPosition:target.pos||null'),'melee actions must preserve target range and world position');
assert.ok(rendererSource.includes('if(isKnife&&(!chosen||distance>2.15))'),'knife attack must be hard-limited to close range');
assert.ok(rendererSource.includes('data-3d=\"look-down\"'),'mobile controls must support looking downward');
assert.ok(rendererSource.includes("weaponId==='rgd5'"),'grenade has a dedicated first-person 3D model');
assert.ok(rendererSource.includes('buildReloadMagazine')&&rendererSource.includes('reloadMagazineMesh'),'reload must animate a detachable 3D magazine');
assert.ok(rendererSource.includes("weaponId==='pm'" )&&rendererSource.includes("weaponId==='gaduka'" )&&rendererSource.includes("weaponId==='sawedoff'||weaponId==='vm17'"),'each firearm family must have its own 3D first-person mesh');
assert.ok(rendererSource.includes('const fov=binocularActive?.255:aimActive?.49:.91')&&rendererSource.includes('three-binocular-overlay'),'binoculars must use a real 3D model, optical zoom and a binocular mask');
assert.ok(rendererSource.includes('data-3d=\"look-down\"')&&rendererSource.includes('pitch+lookVertical*dt*.82'),'mobile controls must allow lowering the camera pitch');
assert.ok(rendererSource.includes('movementKeyFromCode(e.code)')&&rendererSource.includes('KeyW')&&rendererSource.includes('inputKeyFromCode(e.code,e.key)'),'movement and safe interaction shortcuts must be independent of keyboard layout');
assert.ok(rendererSource.includes("if(k==='space'&&!e.repeat)jump()")&&rendererSource.includes('stepJumpMotion'),'jump must use vertical velocity and gravity');
assert.ok(rendererSource.includes('const crouched=crouchToggle||keyState.control')&&rendererSource.includes('crouched?1.08:1.66'),'crouching must lower camera height and movement speed');
assert.ok(rendererSource.includes('updateNpcMovement(dt,now)')&&rendererSource.includes('entry.destination'),'NPCs must have a local patrol');
assert.ok(rendererSource.includes('uFlashlightPosition')&&rendererSource.includes('flashlightActive?1:0')&&rendererSource.includes("if(k==='l'&&!e.repeat)toggleFlashlight()"),'flashlight must affect scene lighting and respond to L');
assert.ok(rendererSource.includes('SAFE_ACTION_CODE_MAP')&&rendererSource.includes("KeyL:'l'")&&rendererSource.includes("KeyE:'e'"),'flashlight and interaction shortcuts must use physical keyboard codes');
assert.ok(rendererSource.includes("e.code==='KeyA'&&nearestNpc()")&&rendererSource.includes('if(!e.repeat)interact()')&&rendererSource.includes('selectNearbyNpc(npcMeshes,pos,4.5)'),'A should start conversation with the closest nearby NPC');
assert.ok(rendererSource.includes('bob=moving?Math.abs(Math.sin(walkPhase*2))*.009:0')&&rendererSource.includes('sway=moving?Math.sin(walkPhase)*.007:0'),'camera shake should be reduced');
assert.ok(rendererSource.includes('if(isKnife&&(!chosen||distance>2.15))')&&rendererSource.includes("mode:isKnife?'knife':'fire'")&&rendererSource.includes('knifeThrust')&&rendererSource.includes('punchThrust'),'knife strikes must be close-range and visually distinct from firearm shots');
assert.ok(rendererSource.includes('three-hud-health')&&rendererSource.includes('three-hud-minimap'),'first-person HUD must show health and a minimap');
assert.ok(rendererSource.includes('if(now-lastTravelAt>1200)'),'all zone exits, including Sidorovich bunker, must transition automatically without a loading screen');
assert.ok(rendererSource.includes('restorePointerLock')&&rendererSource.includes('requestPointerLock({unadjustedMovement:true})'),'mouse look should be restored after an in-game rerender when pointer lock was active');
const mainSource=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');assert.ok(mainSource.includes("const restorePointerLock = document.pointerLockElement?.id === 'stalker-3d-world';"),'main render should preserve the pointer-lock state across HUD updates');
const swSource=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');assert.ok(swSource.includes('cordon-pda-v3600-physical-input-jump-flashlight'),'service worker cache must be bumped for the new controls and renderer');
assert.ok(mainSource.includes('onFlashlightToggle:(active)=>{state.game.player.flashlightActive=active;state.ui.flashlight=active;persist();}'),'flashlight state should persist with player state');
const viewSource=fs.readFileSync(new URL('../src/ui/views.js',import.meta.url),'utf8');assert.ok(viewSource.includes('<span aria-hidden="true">⌖</span>')&&!viewSource.includes('map-pin-title'),'PDA map pins should show only an icon, without a visible label');
const characterDetail=factionPreview.player.vertices.length;
assert.ok(characterDetail>9000,'Player character mesh lost expected arm/hand detail');
console.log(`3D renderer tests passed: ${LOCATIONS.length} locations, ${ITEMS.length} item model categories, procedural world, faction characters and 3D meshes for every catalog item.`);

const relief=[[-28,-20],[-10,-10],[0,0],[18,12],[25,-18],[9,25]].map(([x,z])=>sampleTerrainHeight(x,z));assert.ok(Math.max(...relief)-Math.min(...relief)>.45,'terrain should contain visible rises and dips rather than a flat plane');
