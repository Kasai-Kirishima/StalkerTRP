import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { LOCATIONS } from '../src/data/catalog.js';
import { createSceneLayout, classifyItemModel, buildPreviewGeometry, buildItemPreviewGeometry, selectAimedTarget, sampleTerrainHeight } from '../src/3d/renderer.js';
import { ITEMS } from '../src/data/catalog.js';

const profiles=new Set();
const aimPosition={x:0,z:0};
const aimEntries=[{npc:{id:'front'},pos:{x:0,z:-8}},{npc:{id:'behind'},pos:{x:0,z:5}},{npc:{id:'side'},pos:{x:7,z:-4}}];
assert.equal(selectAimedTarget(aimEntries,aimPosition,0)?.npc.id,'front','aiming must select the NPC in front of the player');
assert.equal(selectAimedTarget(aimEntries,aimPosition,Math.PI)?.npc.id,'behind','aiming must select a target behind the player after turning around');
assert.equal(selectAimedTarget([{npc:{id:'off-axis'},pos:{x:0,z:-8}}],aimPosition,Math.PI/2),null,'aiming must not select targets outside the narrow firing cone');
const atlasPath=fileURLToPath(new URL('../assets/textures/cordon-materials.png',import.meta.url));
const atlas=fs.readFileSync(atlasPath);
assert.equal(atlas.toString('ascii',1,4),'PNG','Material atlas must be a valid PNG');
assert.equal(atlas.readUInt32BE(16),2048,'Material atlas width must remain 4 columns');
assert.equal(atlas.readUInt32BE(20),1024,'Material atlas height must remain 2 rows');
for(const location of LOCATIONS){
  const layout=createSceneLayout(location.id,location.neighbors||[]);
  assert.equal(layout.id,location.id,`3D layout missing for ${location.id}`);
  assert.ok(['village','checkpoint','farm','industrial','forest','roadside'].includes(layout.profile),`Unknown 3D scene profile for ${location.id}`);
  assert.deepEqual(layout.neighbors,location.neighbors||[],`Travel exits diverge from world graph for ${location.id}`);
  profiles.add(layout.profile);
}
for(const required of ['village','checkpoint','farm','industrial','forest','roadside'])assert.ok(profiles.has(required),`Missing environment profile ${required}`);
for(const item of ITEMS){assert.ok(['weapon','armor','artifact','medicine','ammo','food','supply'].includes(classifyItemModel(item.id)),`3D item model missing for ${item.id}`);const model=buildItemPreviewGeometry(item.id);assert.ok(model?.mesh?.vertices?.length>60,`3D geometry missing for ${item.id}`);assert.equal(model.mesh.uvs.length,model.mesh.vertices.length/3*2,`3D texture UV missing for ${item.id}`);}
for(const location of LOCATIONS){const preview=buildPreviewGeometry(location.id);assert.ok(preview.world.vertices.length>1000,`Scene geometry missing for ${location.id}`);assert.equal(preview.world.uvs.length,preview.world.vertices.length/3*2,`Texture UVs missing for ${location.id}`);assert.ok(preview.player.vertices.length>100,`Player model missing for ${location.id}`);assert.ok(preview.firstPerson.vertices.length>100,`First-person arms and weapon mesh missing for ${location.id}`);assert.ok(preview.firstPerson.vertices.length<preview.player.vertices.length,`First-person view mesh should not be a full-body character for ${location.id}`);assert.ok(preview.groundSamples.length>=5,`Rolling terrain samples missing for ${location.id}`);assert.equal(preview.player.uvs.length,preview.player.vertices.length/3*2,`Player texture UVs missing for ${location.id}`);}
// Character previews must retain enough mesh detail for layered sleeves, elbows and articulated gloves.
const factionPreview=buildPreviewGeometry('rookie-village');
assert.equal(factionPreview.playerPosition.x,-8,'rookie village spawn should keep a clear first-person sightline');
assert.notDeepEqual(factionPreview.npcs[0].mesh.colors,factionPreview.npcs[1].mesh.colors,'loner and bandit outfits should have visibly different faction palettes');
assert.notDeepEqual(factionPreview.npcs[1].mesh.colors,factionPreview.npcs[2].mesh.colors,'bandit and military outfits should have visibly different faction palettes');
const rendererSource=fs.readFileSync(new URL('../src/3d/renderer.js',import.meta.url),'utf8');
assert.ok(rendererSource.includes('data-3d=\"sprint\"')&&rendererSource.includes('touchSprint'),'mobile 3D controls should support a hold-to-sprint button');
assert.ok(rendererSource.includes('is-${resolvedControls}')&&rendererSource.includes("['pc','mobile']"),'renderer should expose separate PC and mobile control modes');
const characterDetail=factionPreview.player.vertices.length;
assert.ok(characterDetail>9000,'Player character mesh lost expected arm/hand detail');
console.log(`3D renderer tests passed: ${LOCATIONS.length} locations, ${ITEMS.length} item model categories, procedural world, faction characters and 3D meshes for every catalog item.`);

const relief=[[-28,-20],[-10,-10],[0,0],[18,12],[25,-18],[9,25]].map(([x,z])=>sampleTerrainHeight(x,z));assert.ok(Math.max(...relief)-Math.min(...relief)>.45,'terrain should contain visible rises and dips rather than a flat plane');
