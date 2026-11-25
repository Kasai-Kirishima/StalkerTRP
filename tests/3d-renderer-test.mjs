import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { LOCATIONS } from '../src/data/catalog.js';
import { createSceneLayout, classifyItemModel, buildPreviewGeometry, buildItemPreviewGeometry, buildFirstPersonViewGeometry, selectAimedTarget, sampleTerrainHeight, cordonMapToWorld, clampCordonPosition, isInsideCordonBounds, clipRawMeshToCordonBounds, CORDON_WORLD_BOUNDS, sampleCordonTerrainHeight, npcFacingYaw, buildSceneCollisionData, sampleLocationHeight, sampleMapSurfaceHeight, movementKeyFromCode, inputKeyFromCode, selectNearbyNpc, stepJumpMotion, buildCloudLayer, daylightFor, npcMovementYaw, vehicleWheelAxis, vehicleWheelRadial } from '../src/3d/renderer.js';
import { ITEMS } from '../src/data/catalog.js';

const rendererText=fs.readFileSync(new URL('../src/3d/renderer.js',import.meta.url),'utf8');
const profiles=new Set();
assert.ok(npcFacingYaw({x:0,z:0},{x:1,z:0})<0,'NPC model must face east with the corrected local -Z forward axis');
const eastYaw=npcMovementYaw(1,0);assert.ok(Math.abs(eastYaw+Math.PI/2)<1e-9,'NPC forward direction should align with eastward movement');
const wheelAxle=vehicleWheelAxis(0),wheelTop=vehicleWheelRadial(0,Math.PI/2);assert.deepEqual(wheelAxle,{x:0,y:0,z:1});assert.ok(wheelTop.y>.99,'vehicle wheel radial geometry must be vertical, not a horizontal disc');
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
  assert.deepEqual(layout.neighbors,[],`Scene ${location.id} must not expose old scene-transition exits`);
  profiles.add(layout.profile);
}
for(const required of ['village','checkpoint','farm','industrial','forest','roadside'])assert.ok(profiles.has(required),`Missing environment profile ${required}`);
for(const item of ITEMS){assert.ok(['weapon','armor','artifact','medicine','ammo','food','supply'].includes(classifyItemModel(item.id)),`3D item model missing for ${item.id}`);const model=buildItemPreviewGeometry(item.id);assert.ok(model?.mesh?.vertices?.length>60,`3D geometry missing for ${item.id}`);assert.equal(model.mesh.uvs.length,model.mesh.vertices.length/3*2,`3D texture UV missing for ${item.id}`);assertFiniteMesh(model.mesh,`item ${item.id}`);}
for(const location of LOCATIONS){const preview=buildPreviewGeometry(location.id);assert.ok(preview.world.vertices.length>1000,`Scene geometry missing for ${location.id}`);assert.ok(preview.terrain?.vertices?.length>1000,`Map terrain mesh missing for ${location.id}`);assert.ok(preview.props?.vertices?.length>500,`Location props missing for ${location.id}`);assert.ok(preview.terrain.normals.every((value,index)=>index%3!==1||value>.55),`Terrain normals must face upward for ${location.id}`);assert.equal(preview.world.uvs.length,preview.world.vertices.length/3*2,`Texture UVs missing for ${location.id}`);assertFiniteMesh(preview.world,`world ${location.id}`);assert.ok(preview.player.vertices.length>100,`Player model missing for ${location.id}`);assert.ok(preview.firstPerson.vertices.length>100,`First-person arms and weapon mesh missing for ${location.id}`);assert.ok(preview.firstPerson.vertices.length<preview.player.vertices.length,`First-person view mesh should not be a full-body character for ${location.id}`);assertFiniteMesh(preview.player,`player ${location.id}`);assertFiniteMesh(preview.firstPerson,`first-person ${location.id}`);assert.ok(preview.groundSamples.length>=5,`Rolling terrain samples missing for ${location.id}`);assert.equal(preview.player.uvs.length,preview.player.vertices.length/3*2,`Player texture UVs missing for ${location.id}`);}
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
assert.ok(sampleMapSurfaceHeight('sidorovich-bunker',0,-2)>-1.8,'the map terrain sampler must remain at surface height above the bunker room');
assert.ok(sampleLocationHeight('sidorovich-bunker',0,18)>-1.8,'Bunker staircase must rise toward surface level');
assert.equal(LOCATIONS.find(loc=>loc.id==='sidorovich-bunker')?.mapVisible,true,'Sidorovich must have a distinct visible map location');
assert.ok(rendererSource.includes('data-3d=\"sprint\"')&&rendererSource.includes('touchSprint'),'mobile 3D controls should support a hold-to-sprint button');
assert.ok(rendererSource.includes('is-${resolvedControls}')&&rendererSource.includes("['pc','mobile']"),'renderer should expose separate PC and mobile control modes');
assert.ok(rendererSource.includes("terrainStepsX:resolvedControls==='mobile'?128:192")&&rendererSource.includes("terrainStepsZ:resolvedControls==='mobile'?256:384"),'mobile rendering should use a lighter terrain mesh to reduce GPU load');
assert.ok(rendererSource.includes("resolvedControls==='mobile'?1.25:1.6"),'mobile rendering should cap the WebGL pixel ratio to reduce fill-rate pressure');
assert.ok(rendererSource.includes('three-action-primary')&&rendererSource.includes('data-3d=\"more\"'),'mobile controls should keep the four most-used actions visible and fold secondary actions into a compact tray');
assert.ok(rendererSource.includes('three-action-extra')&&rendererSource.includes('aria-expanded=\"false\"'),'secondary mobile controls should start collapsed and expose their expanded state accessibly');
assert.ok(rendererSource.includes('function resetTouchInput()')&&rendererSource.includes("window.addEventListener('blur',resetTouchInput)")&&rendererSource.includes("document.addEventListener('visibilitychange',onVisibilityChange)"),'mobile movement/look controls must release cleanly when the browser loses focus or the app is backgrounded');
assert.ok(rendererSource.includes("if(action==='more')")&&rendererSource.includes("extra.hidden=!open"),'the secondary mobile control tray must open and close from the touch interface');

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
assert.ok(rendererSource.includes('const globalWorld=buildGlobalWorldGeometry')&&rendererSource.includes('locateGlobalLocation(pos.x,pos.z)')&&rendererSource.includes('continuous world'),'one global terrain mesh should remain active while location IDs only update quest context');
assert.ok(rendererSource.includes("className='three-flee-button'")&&rendererSource.includes('onFlee()'),'first-person scene must expose a direct escape action during an encounter');
assert.ok(rendererSource.includes('entry.npc.id!==combatNpcId'),'active threat NPC must not become an invisible movement wall');
assert.ok(rendererSource.includes('Math.hypot(pos.x-threat.x,pos.z-threat.z)>18'),'moving far enough away must end the encounter without a scene transition');
assert.ok(rendererSource.includes('CORDON_WORLD_BOUNDS.minX+3')&&rendererSource.includes('CORDON_WORLD_BOUNDS.maxZ-3'),'movement must stay inside the mapped world boundary');
assert.ok(!rendererSource.includes('lastTravelAt'),'the renderer must not trigger timed scene transitions');
assert.ok(rendererSource.includes('b.cylinderAxis(wx,.48,wz,.48,.42,dark,0,20)'),'utility truck wheels must use real vertical circular wheel meshes rather than degenerate axle beams');
assert.ok(rendererSource.includes('scale:.19')&&rendererSource.includes('scale:.17,isDropped:true'),'world item props should be reduced to a more believable size');
assert.ok(rendererSource.includes('restorePointerLock')&&rendererSource.includes('requestPointerLock({unadjustedMovement:true})'),'mouse look should be restored after an in-game rerender when pointer lock was active');
const mainSource=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');assert.ok(mainSource.includes("const restorePointerLock = document.pointerLockElement?.id === 'stalker-3d-world';"),'main render should preserve the pointer-lock state across HUD updates');
const swSource=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');assert.ok(swSource.includes('cordon-pda-v4220-mobile-controls'),'service worker cache must be bumped for the global-map release');
assert.ok(mainSource.includes('onFlashlightToggle:(active)=>{state.game.player.flashlightActive=active;state.ui.flashlight=active;persist();}'),'flashlight state should persist with player state');
const viewSource=fs.readFileSync(new URL('../src/ui/views.js',import.meta.url),'utf8');assert.ok(viewSource.includes('<span aria-hidden="true">⌖</span>')&&!viewSource.includes('map-pin-title'),'PDA map pins should show only an icon, without a visible label');
const characterDetail=factionPreview.player.vertices.length;
assert.ok(characterDetail>9000,'Player character mesh lost expected arm/hand detail');

const emptyBareHands=buildFirstPersonViewGeometry('loner','empty','none');
const emptyArmoredHands=buildFirstPersonViewGeometry('loner','empty','leather');
assertFiniteMesh(emptyBareHands,'unarmored empty-hands view');
assertFiniteMesh(emptyArmoredHands,'armored empty-hands view');
assert.ok(emptyBareHands.vertices.length/3>5000,'empty-hands view should contain two detailed open hands, not hide the arms');
assert.notDeepEqual(emptyBareHands.colors.slice(0,3),emptyArmoredHands.colors.slice(0,3),'unarmored arms should use visible skin rather than an armor sleeve');
assert.ok(rendererText.includes("weaponId==='empty'||!weaponId")&&rendererText.includes('const equippedId=weaponSlotChoice&&')&&!rendererText.includes('game.equipmentSlots?.pistol'),'no active weapon selection should render empty hands even when a backpack or equipment slot has weapons');
assert.ok(!rendererText.includes("||'aksu';"),'renderer must not invent a default weapon when all equipment slots are empty');

console.log(`3D renderer tests passed: ${LOCATIONS.length} locations, ${ITEMS.length} item model categories, procedural world, faction characters and 3D meshes for every catalog item.`);

const relief=[[-28,-20],[-10,-10],[0,0],[18,12],[25,-18],[9,25]].map(([x,z])=>sampleTerrainHeight(x,z));assert.ok(Math.max(...relief)-Math.min(...relief)>.45,'terrain should contain visible rises and dips rather than a flat plane');

const clouds=buildCloudLayer().toRaw();
assert.ok(clouds.vertices.length>1500,'procedural cloud layer must contain multiple volumetric cloud clusters');
assert.ok(clouds.vertices.every(Number.isFinite),'cloud mesh vertices must remain finite');
assert.ok(rendererText.includes('draw(cloudMesh,modelMatrix(pos.x+cloudDrift,sampleGlobalTerrainHeight(pos.x,pos.z)+18,pos.z))'),'clouds must be drawn and drift across the sky');
assert.ok(rendererText.includes('function addBedroll')&&rendererText.includes('addBedroll(b,-5,4,'),'rookie village must contain a visible sleep bedroll');
assert.ok(rendererText.includes("if(k==='z'&&!e.repeat)"),'sleep interaction shortcut must be available at the bedroll');
const nowForClockTest=new Date();const localMinuteOfDay=nowForClockTest.getHours()*60+nowForClockTest.getMinutes();
const noonOffset=(12*60-localMinuteOfDay+1440)%1440;
const dayClock={startedAt:nowForClockTest.getTime(),timeOffsetMinutes:noonOffset};
const nightClock={...dayClock,timeOffsetMinutes:noonOffset+12*60};
assert.ok(daylightFor(dayClock).daylight>daylightFor(nightClock).daylight,'daylight must vary over the day/night cycle');
const menuSource=fs.readFileSync(new URL('../src/ui/views.js',import.meta.url),'utf8');
assert.ok(menuSource.includes('ВЕРСИЯ 4.2.2'),'main menu must display the current version');
assert.ok(!rendererText.includes('three-help'),'obsolete bottom control hint must be removed');
const mapNW=cordonMapToWorld(0,0),mapSE=cordonMapToWorld(100,100);
assert.deepEqual(mapNW,{x:-768,z:-1536},'map origin must use the full 768×1536 Cordon proportions');
assert.deepEqual(mapSE,{x:768,z:1536},'map bounds must preserve the full Cordon proportions');
assert.deepEqual(CORDON_WORLD_BOUNDS,{minX:-768,maxX:768,minZ:-1536,maxZ:1536},'walkable world bounds must match the mapped Cordon rectangle');
assert.deepEqual(clampCordonPosition({x:900,z:-1800},3),{x:765,z:-1533},'loaded player positions outside the map must be clamped back inside');
assert.deepEqual(clampCordonPosition({x:-900,z:1800},3),{x:-765,z:1533},'both map edges must clamp symmetrically');
assert.equal(isInsideCordonBounds({x:768,z:1536}),true,'the exact source-map edge remains inside the world');
assert.equal(isInsideCordonBounds({x:768.1,z:1536}),false,'positions beyond the source-map edge are outside the playable world');
const edgeClip=clipRawMeshToCordonBounds({vertices:[0,0,0,1,0,0,0,0,1, 767,0,0,769,0,0,767,0,1],normals:Array(18).fill(0),colors:Array(18).fill(1),uvs:Array(12).fill(.5)},{x:0,z:0});
assert.equal(edgeClip.vertices.length,9,'terrain props extending beyond the minimap/map rectangle must be omitted at the boundary');
assert.ok(Number.isFinite(sampleCordonTerrainHeight(50,44)),'map relief sampler must return finite heights');
assert.ok(sampleCordonTerrainHeight(50,43)>sampleCordonTerrainHeight(50,47)+1.2,'railway embankment should rise above the mapped bridge cut');
assert.ok(sampleCordonTerrainHeight(33,43)>sampleCordonTerrainHeight(33,46)+1.0,'maintenance underpass should cut through the railway bank');
assert.ok(sampleCordonTerrainHeight(86,59)<sampleCordonTerrainHeight(78,59)-.75,'eastern ravine should sit below its surrounding shoulder');
const mapRelief=[sampleCordonTerrainHeight(10,20),sampleCordonTerrainHeight(50,47),sampleCordonTerrainHeight(86,59),sampleCordonTerrainHeight(18,66)];
assert.ok(Math.max(...mapRelief)-Math.min(...mapRelief)>1.2,'map-scale ridges, lowland and ravine relief must remain distinguishable');
assert.ok(rendererText.includes('cordon-clean.webp')&&rendererText.includes('uMapMode')&&rendererText.includes('addCordonRoadNetwork'),'gameplay terrain must use the source Cordon map texture and its mapped road profile');
assert.ok(rendererText.includes('mapMottle')&&rendererText.includes('mapGrain'),'map-textured terrain must retain fine-scale ground breakup');
assert.ok(rendererText.includes('bunkerVoid'),'surface mesh must preserve the Sidorovich bunker opening');
const bunkerPreview=buildPreviewGeometry('sidorovich-bunker');
assert.ok(bunkerPreview.terrain.vertices.length/3<112*112*6,'surface triangles must be omitted over the Sidorovich bunker room');
assert.ok(bunkerPreview.terrain.uvs.every(value=>value>=0&&value<=1),'map-aligned ground UVs must stay within the source image');
