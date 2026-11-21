import assert from 'node:assert/strict';
import { ASSETS, IMAGE_FALLBACKS, FACTIONS, ITEMS, LOCATIONS, NPCS, AVATAR_OPTIONS, RADIO_TRACKS, RADIO_STATIONS, START_BUDGET, MAX_CARRY_KG } from '../src/data/catalog.js';
import { createGame, travelTo, talkToNpc, scoutLocation, searchLocation, startArtifactHunt, chooseArtifactSector, deactivateAnomaly } from '../src/systems/world.js';
import { addItem, getWeight, canFitLoadout } from '../src/systems/inventory.js';
import { beginEncounter, playerAttack } from '../src/systems/combat.js';
import { processPlayerAction } from '../src/systems/action-engine.js';
import { renderMenu, renderLoadout, renderGame, renderModal } from '../src/ui/views.js';

assert.equal(FACTIONS.length,3);
assert.equal(LOCATIONS.length,17);
assert.ok(LOCATIONS.every(location=>location.image?.startsWith('https://')),'every location must use a remote image');
assert.ok(Object.values(ASSETS).filter(value=>typeof value==='string').every(url=>url.startsWith('https://')));
assert.ok(['general','loner','bandit','military','npc','dog','food','medical','gear'].every(key=>IMAGE_FALLBACKS[key]?.startsWith('https://')),'all image categories need remote fallbacks');
assert.equal(NPCS.length,4);
assert.equal(AVATAR_OPTIONS.length,18,'all faction portraits and four key NPC portraits should be present');
assert.ok(AVATAR_OPTIONS.every(option=>option.src.startsWith('https://')),'all avatar portraits should use remote URLs');
assert.equal(RADIO_TRACKS.length,40,'radio should contain forty real music tracks');
assert.equal(RADIO_STATIONS.length,3,'each faction base should have its own radio station');
assert.ok(RADIO_STATIONS.every(station=>station.trackIds.length===20 && station.trackIds.every(id=>RADIO_TRACKS.some(track=>track.id===id))),'each base should have a valid twenty-track station playlist');
assert.ok(RADIO_TRACKS.every(track=>Number.isInteger(track.startSeconds) && track.startSeconds>=0),'every track should have a valid YouTube start offset');
assert.ok(RADIO_TRACKS.every(track=>/^[A-Za-z0-9_-]{11}$/.test(track.videoId)),'each track must have a YouTube video ID');
assert.ok(ITEMS.length >= 30);
assert.ok(ITEMS.every(item=>item.image?.startsWith('https://')),'every inventory item should have a remote image URL');
assert.equal(new Set(RADIO_TRACKS.map(track=>track.id)).size,40,'radio track IDs should be unique');

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

const uiState={screen:'game',characters:[character],activeCharacterId:'smoke',pendingCharacter:null,settings:{soundEnabled:true,volume:.3,selectedTrack:'wind',ambientAutoplay:false,reducedMotion:false,radioStationId:'loner-village-radio'},account:{},draft:{name:'',birthDate:'',height:'',weight:'',personality:'',biography:'',notes:'',faction:'loner',avatar:''},loadout:{selected:{}},ui:{tab:'location',modal:null},game};
assert.ok(renderMenu(uiState).includes('Играть'));
assert.ok(renderLoadout(uiState).includes('КАТАЛОГ'));
assert.ok(renderGame(uiState).includes('game-shell'));
uiState.ui.tab='radio';
assert.ok(renderGame(uiState).includes('Радио Кордон'));
uiState.ui.radioPlaying=true;
assert.ok(renderGame(uiState).includes('youtube-nocookie.com/embed/'));
assert.ok(renderGame(uiState).includes('Радио Деревни новичков'));
assert.ok(renderGame(uiState).includes('20 из 40'));
uiState.settings.radioTrackId='ts-sad';
assert.ok(renderGame(uiState).includes('start=136'));
uiState.settings.radioTrackId='firelake-dirge';
const baseUi={...uiState,ui:{...uiState.ui,tab:'location'},game:createGame(character,[],START_BUDGET)};
assert.ok(renderGame(baseUi).includes('radio-base-open'),'the loner base should expose its own radio button');
for (const station of RADIO_STATIONS) {
  const stationGame={...createGame(character,[],START_BUDGET),locationId:station.locationId};
  const stationHtml=renderGame({...baseUi,game:stationGame});
  assert.ok(stationHtml.includes(`data-id="${station.id}"`),`${station.name} should be available on its base`);
}
uiState.ui.modal='avatars';
const avatarModal=renderModal(uiState);
assert.ok(avatarModal.includes('Сидорович') && avatarModal.includes('Волк') && avatarModal.includes('Кефир') && avatarModal.includes('Дмитрий Дзержинский'));
console.log('Smoke tests passed, including radio and all avatar portraits.');
