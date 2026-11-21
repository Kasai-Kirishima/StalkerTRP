import assert from 'node:assert/strict';
import { FACTIONS, ITEMS, LOCATIONS, NPCS, START_BUDGET, MAX_CARRY_KG } from '../src/data/catalog.js';
import { createGame, travelTo, talkToNpc, scoutLocation, searchLocation, startArtifactHunt, chooseArtifactSector, deactivateAnomaly } from '../src/systems/world.js';
import { addItem, getWeight, canFitLoadout } from '../src/systems/inventory.js';
import { beginEncounter, playerAttack } from '../src/systems/combat.js';
import { processPlayerAction } from '../src/systems/action-engine.js';
import { renderMenu, renderLoadout, renderGame } from '../src/ui/views.js';

assert.equal(FACTIONS.length,3);
assert.equal(LOCATIONS.length,17);
assert.equal(NPCS.length,4);
assert.ok(ITEMS.length >= 30);

for (const faction of FACTIONS) {
  const character={name:'Проверка',faction:faction.id};
  const game=createGame(character,[],START_BUDGET);
  assert.equal(game.locationId,faction.spawn);
  assert.equal(game.player.reputation,0);
  assert.equal(game.player.rating,0);
  assert.equal(game.money,START_BUDGET);
}

let selected={};
let purchase=canFitLoadout(selected,'bread',1,START_BUDGET);
assert.equal(purchase.ok,true);
selected=purchase.selected;
purchase=canFitLoadout(selected,'zarya',1,START_BUDGET);
assert.equal(purchase.ok,false,'budget must be enforced');

const character={id:'smoke',name:'Тестовый сталкер',faction:'loner',avatar:'',rank:'Новичок',stats:{}};
const game=createGame(character,[],START_BUDGET);
addItem(game.inventory,'binoculars',1);
assert.equal(scoutLocation(game,'farmstead').ok,true);
assert.equal(travelTo(game,'south-checkpoint').ok,false,'non-adjacent travel must be blocked');
assert.equal(travelTo(game,'farmstead').ok,true);
assert.equal(searchLocation(game).ok,true);
assert.equal(searchLocation(game).ok,false,'location loot should have a cooldown');
game.clock.worldMinutes += 181;
assert.equal(searchLocation(game).ok,true,'location loot should respawn');

// Wolf is available in the Loners' starting village.
const lonerGame=createGame(character,[],START_BUDGET);
assert.equal(talkToNpc(lonerGame,'wolf').ok,true);
assert.ok(processPlayerAction(lonerGame,'осмотреться').message.length>0);

// Artefact detector mini-game and bolt uses.
const banditChar={name:'Проверка',faction:'bandit'};
const banditGame=createGame(banditChar,[],START_BUDGET);
addItem(banditGame.inventory,'otklik',1);
addItem(banditGame.inventory,'boltpack',1);
banditGame.boltsRemaining=10;
assert.equal(travelTo(banditGame,'anomaly-dump').ok,true);
assert.equal(startArtifactHunt(banditGame).ok,true);
const found=chooseArtifactSector(banditGame,banditGame.artifactHunt.target);
assert.equal(found.found,true);
assert.equal(banditGame.player.artifacts,1);
assert.equal(deactivateAnomaly(banditGame).ok,true);
assert.equal(banditGame.boltsRemaining,9,'one bolt, not a whole pack, should be consumed');

// Combat should fall back to a melee weapon if the better firearm has no rounds.
addItem(game.inventory,'knife',1);
addItem(game.inventory,'pm',1);
beginEncounter(game,'bandit');
const attack=playerAttack(game);
assert.ok(attack.message.includes('Нож'));

const uiState={screen:'game',characters:[character],activeCharacterId:'smoke',pendingCharacter:null,settings:{soundEnabled:true,volume:.3,selectedTrack:'wind',ambientAutoplay:false,reducedMotion:false},account:{},draft:{name:'',birthDate:'',height:'',weight:'',personality:'',biography:'',notes:'',faction:'loner',avatar:''},loadout:{selected:{}},ui:{tab:'location',modal:null},game};
assert.ok(renderMenu(uiState).includes('Играть'));
assert.ok(renderLoadout(uiState).includes('КАТАЛОГ'));
assert.ok(renderGame(uiState).includes('game-shell'));
console.log('Smoke tests passed.');
