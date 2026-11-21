import assert from 'node:assert/strict';
import { ASSETS, IMAGE_FALLBACKS, FACTIONS, ITEMS, LOCATIONS, NPCS, AVATAR_OPTIONS, RADIO_TRACKS, RADIO_STATIONS, PLAYER_TRACKS, START_BUDGET, MAX_CARRY_KG } from '../src/data/catalog.js';
import { createGame, travelTo, talkToNpc, scoutLocation, searchLocation, startArtifactHunt, chooseArtifactSector, deactivateAnomaly, getAvailableTraders, buyFromTrader, sellToTrader, acceptSidorovichJob, turnInSidorovichJob, replyNpc } from '../src/systems/world.js';
import { addItem, getWeight, canFitLoadout, countItem } from '../src/systems/inventory.js';
import { beginEncounter, playerAttack } from '../src/systems/combat.js';
import { processPlayerAction } from '../src/systems/action-engine.js';
import { renderMenu, renderLoadout, renderGame, renderModal } from '../src/ui/views.js';

assert.equal(FACTIONS.length,3);
assert.equal(LOCATIONS.length,18);
assert.equal(LOCATIONS.filter(location=>location.mapVisible!==false).length,17,'17 labelled map pins should appear over the supplied base map');
assert.deepEqual([LOCATIONS.find(l=>l.id==='rail-tunnel').x,LOCATIONS.find(l=>l.id==='rail-tunnel').y],[93,38],'east railway tunnel should be right and above locomotive');
assert.deepEqual([LOCATIONS.find(l=>l.id==='underpass').x,LOCATIONS.find(l=>l.id==='underpass').y],[38,59],'underpass should be right and slightly above the wagon');
assert.deepEqual(LOCATIONS.find(l=>l.id==='anomaly-dump').hazards,['gravity'],'the secret camp contains the Funnel gravity anomaly');
assert.equal(LOCATIONS.find(l=>l.id==='anomaly-dump').anomalyName,'Воронка');
assert.ok(LOCATIONS.every(location=>location.image?.startsWith('https://')),'all location scene images should use remote URLs');
assert.ok(ASSETS.map.endsWith('cordon-clean.webp'),'map must use the clean map provided by the user');
assert.ok(ASSETS.menu.startsWith('https://') && ASSETS.pda.startsWith('https://'));
assert.ok(['general','loner','bandit','military','npc','dog','food','medical','gear','flesh','fleshEye'].every(key=>IMAGE_FALLBACKS[key]?.startsWith('https://')),'all image categories need remote fallbacks');
assert.equal(NPCS.length,6,'four quest NPCs plus two additional traders');
assert.ok(NPCS.some(n=>n.id==='sidorovich'&&n.trader));
assert.ok(NPCS.some(n=>n.id==='shnurok'&&n.location==='atp'&&n.trader));
assert.ok(NPCS.some(n=>n.id==='kapterka'&&n.location==='south-checkpoint'&&n.trader));
assert.equal(AVATAR_OPTIONS.length,18,'all faction portraits and four key NPC portraits should be present');
assert.ok(AVATAR_OPTIONS.every(option=>option.src.startsWith('https://')),'all avatar portraits should use remote URLs');
assert.equal(RADIO_TRACKS.length,28,'the filtered music library should contain 28 tracks');
assert.equal(RADIO_STATIONS.length,3,'each faction base should have its own radio station');
assert.ok(RADIO_STATIONS.every(station=>station.trackIds.length>=27 && station.trackIds.every(id=>RADIO_TRACKS.some(track=>track.id===id))),'every base station should have valid music');
assert.ok(RADIO_STATIONS.find(s=>s.id==='bandit-atp-radio').trackIds.includes('vladimirsky-central'));
assert.ok(!RADIO_STATIONS.find(s=>s.id==='loner-village-radio').trackIds.includes('vladimirsky-central'));
assert.ok(!RADIO_STATIONS.find(s=>s.id==='military-checkpoint-radio').trackIds.includes('vladimirsky-central'));
assert.equal(PLAYER_TRACKS.length,RADIO_TRACKS.length,'personal player contains every song in the project');
assert.ok(PLAYER_TRACKS.some(track=>track.id==='vladimirsky-central'),'personal player includes every track');
assert.ok(RADIO_TRACKS.every(track=>Number.isInteger(track.startSeconds) && track.startSeconds>=0),'every track should have a valid YouTube start offset');
assert.ok(RADIO_TRACKS.every(track=>/^[A-Za-z0-9_-]{11}$/.test(track.videoId)),'each track must have a YouTube video ID');
assert.ok(RADIO_TRACKS.every(track=>track.year>=2012 || track.id==='vladimirsky-central'),'no pre-April-2012 song except the specifically requested bandit-station exception');
assert.ok(RADIO_TRACKS.find(track=>track.id==='piknik-chuzhestranets' && track.year===2014));
assert.ok(RADIO_TRACKS.filter(track=>track.id.startsWith('ts-')).every(track=>!Number.isInteger(track.endSeconds)||track.endSeconds>track.startSeconds),'long soundtrack segment boundaries must be valid when supplied');
assert.ok(ITEMS.length>=32);
assert.ok(ITEMS.every(item=>item.image?.startsWith('https://')),'every inventory item should have a remote image URL');
assert.ok(ITEMS.some(item=>item.id==='flesh-eye'&&item.cat==='Добыча'));
assert.equal(new Set(RADIO_TRACKS.map(track=>track.id)).size,RADIO_TRACKS.length,'radio track IDs should be unique');

for (const faction of FACTIONS) {
  const character={name:'Проверка',faction:faction.id};
  const game=createGame(character,[],START_BUDGET);
  assert.equal(game.locationId,faction.spawn);
  assert.equal(game.player.reputation,0);
  assert.equal(game.player.rating,0);
  assert.equal(game.money,START_BUDGET);
  assert.equal(game.randomTraders.length,4,'each new game should generate four traveling traders');
  assert.ok(game.traders.some(entry=>entry.id==='sidorovich'));
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
assert.equal(scoutLocation(game,'trailer').ok,true);
assert.equal(travelTo(game,'south-checkpoint').ok,false,'non-adjacent travel must be blocked');
assert.equal(travelTo(game,'stop').ok,true);
assert.equal(searchLocation(game).ok,true);
assert.equal(searchLocation(game).ok,false,'location loot should have a cooldown');
game.clock.worldMinutes += 181;
assert.equal(searchLocation(game).ok,true,'location loot should respawn');



// The Sidorovich quest button appears after the player asks about work in dialogue.
const dialogueGame=createGame(character,[],START_BUDGET);
dialogueGame.locationId='sidorovich-bunker';
talkToNpc(dialogueGame,'sidorovich');
const dialogueState={screen:'game',characters:[character],activeCharacterId:'smoke',pendingCharacter:null,settings:{reducedMotion:false,radioStationId:'loner-village-radio'},account:{},ui:{tab:'location',modal:null,music:{mode:null,stationId:null,trackId:null,queue:[],index:0,playing:false}},game:dialogueGame};
assert.ok(!renderGame(dialogueState).includes('quest-accept'));
replyNpc(dialogueGame,'sidorovich','работа');
const sidorovichDialogue=renderGame(dialogueState);
assert.ok(sidorovichDialogue.includes('quest-accept'));

// Every base station has at least 20 unique tracks; the personal player has the full library.
for (const station of RADIO_STATIONS) {
  assert.ok(station.trackIds.length>=20,`${station.name} must have at least 20 songs`);
  assert.equal(new Set(station.trackIds).size,station.trackIds.length,`${station.name} must not repeat songs in its playlist`);
}
assert.ok(PLAYER_TRACKS.length>=20,'personal player should contain the full available music library');

// Sidorovich's repeatable assignments: tails, debt collector, and Medusa.
const jobGame=createGame(character,[],START_BUDGET);
jobGame.locationId='sidorovich-bunker';
assert.equal(talkToNpc(jobGame,'sidorovich').ok,true);
const randomBeforeJobs=Math.random;
Math.random=()=>0;
assert.equal(acceptSidorovichJob(jobGame).job.type,'tails');
addItem(jobGame.inventory,'tail',5);
assert.equal(turnInSidorovichJob(jobGame).ok,true);
assert.equal(countItem(jobGame.inventory,'tail'),0);
jobGame.clock.worldMinutes+=121;
Math.random=()=>0.5;
const collector=acceptSidorovichJob(jobGame).job;
assert.equal(collector.type,'collector');
const debtor=jobGame.randomTraders.find(trader=>trader.id===collector.targetNpcId);
assert.ok(debtor);
jobGame.locationId=debtor.location;
assert.equal(talkToNpc(jobGame,debtor.id).ok,true);
jobGame.locationId='sidorovich-bunker';
assert.equal(turnInSidorovichJob(jobGame).ok,true);
jobGame.clock.worldMinutes+=121;
Math.random=()=>0.99;
assert.equal(acceptSidorovichJob(jobGame).job.type,'medusa');
addItem(jobGame.inventory,'medusa',1);
assert.equal(turnInSidorovichJob(jobGame).ok,true);
Math.random=randomBeforeJobs;

// Wolf is available in the Loners' starting village.
const lonerGame=createGame(character,[],START_BUDGET);
assert.equal(talkToNpc(lonerGame,'wolf').ok,true);
assert.ok(processPlayerAction(lonerGame,'осмотреться').message.length>0);

// Full buy / sell flow with Sidorovich.
const shopGame=createGame(character,[],START_BUDGET);
shopGame.locationId='sidorovich-bunker';
const sidorovich=getAvailableTraders(shopGame).find(trader=>trader.id==='sidorovich');
assert.ok(sidorovich && sidorovich.stock.length>0);
const breadBefore=countItem(shopGame.inventory,'bread');
const moneyBefore=shopGame.money;
const buy=buyFromTrader(shopGame,'sidorovich','bread');
assert.equal(buy.ok,true);
assert.equal(countItem(shopGame.inventory,'bread'),breadBefore+1);
assert.ok(shopGame.money<moneyBefore);
const sell=sellToTrader(shopGame,'sidorovich','bread',1);
assert.equal(sell.ok,true);
assert.equal(countItem(shopGame.inventory,'bread'),breadBefore);
assert.ok(shopGame.money>moneyBefore-buy.price);

// Trader locations: Shnurok on ATP, military quartermaster at southern checkpoint.
shopGame.locationId='atp';
assert.ok(getAvailableTraders(shopGame).some(trader=>trader.id==='shnurok'));
shopGame.locationId='south-checkpoint';
assert.ok(getAvailableTraders(shopGame).some(trader=>trader.id==='kapterka'));

// Artefact detector mini-game and bolt uses, including the secret camp's Funnel anomaly.
const banditChar={name:'Проверка',faction:'bandit'};
const banditGame=createGame(banditChar,[],START_BUDGET);
addItem(banditGame.inventory,'otklik',1);
addItem(banditGame.inventory,'boltpack',1);
banditGame.boltsRemaining=10;
const randomBeforeRoute=Math.random;
Math.random=()=>0.99;
assert.equal(travelTo(banditGame,'stop').ok,true);
assert.equal(travelTo(banditGame,'atp').ok,true);
assert.equal(travelTo(banditGame,'anomaly-dump').ok,true);
assert.equal(startArtifactHunt(banditGame).ok,true);
const found=chooseArtifactSector(banditGame,banditGame.artifactHunt.target);
assert.equal(found.found,true);
assert.equal(banditGame.player.artifacts,1);
assert.equal(deactivateAnomaly(banditGame).ok,true);
assert.equal(banditGame.boltsRemaining,9,'one bolt, not a whole pack, should be consumed');
Math.random=randomBeforeRoute;

// Flesh combat drops the Eye of Flesh on a successful trophy roll.
const mutantGame=createGame(character,[],START_BUDGET);
addItem(mutantGame.inventory,'knife',1);
beginEncounter(mutantGame,'flesh');
assert.equal(mutantGame.activeEncounter.name,'Плоть');
mutantGame.activeEncounter.hp=1;
const originalRandom=Math.random;
Math.random=()=>0;
const fleshFight=playerAttack(mutantGame);
Math.random=originalRandom;
assert.equal(fleshFight.finished,true);
assert.equal(countItem(mutantGame.inventory,'flesh-eye'),1);

// Combat still falls back to a melee weapon when a firearm has no rounds.
addItem(game.inventory,'knife',1);
addItem(game.inventory,'pm',1);
beginEncounter(game,'bandit');
const attack=playerAttack(game);
assert.ok(attack.message.includes('Нож'));

const uiState={screen:'game',characters:[character],activeCharacterId:'smoke',pendingCharacter:null,settings:{reducedMotion:false,radioStationId:'loner-village-radio'},account:{},draft:{name:'',birthDate:'',height:'',weight:'',personality:'',biography:'',notes:'',faction:'loner',avatar:''},loadout:{selected:{}},ui:{tab:'location',modal:null,music:{mode:null,stationId:null,trackId:null,queue:[],index:0,playing:false}},game};
assert.ok(renderMenu(uiState).includes('Играть'));
assert.ok(renderLoadout(uiState).includes('КАТАЛОГ'));
assert.ok(renderGame(uiState).includes('game-shell'));
uiState.ui.tab='radio';
const radioHtml=renderGame(uiState);
assert.ok(radioHtml.includes('Радио Кордон'));
assert.ok(!radioHtml.includes('data-action="radio-play-track"'),'radio must not allow selecting individual tracks');
assert.ok(radioHtml.includes('случайный эфир'));
uiState.ui.tab='player';
const playerHtml=renderGame(uiState);
assert.ok(playerHtml.includes('Музыкальная библиотека'));
assert.ok(playerHtml.includes('player-play-track'));
assert.ok(playerHtml.includes('Владимирский централ'),'personal player should expose every track, including the bandit-only radio exception');
uiState.ui.tab='trade';
uiState.ui.tradeNpcId='sidorovich';
uiState.game.locationId='sidorovich-bunker';
const tradeHtml=renderGame(uiState);
assert.ok(tradeHtml.includes('Товар торговца') && tradeHtml.includes('Продать торговцу'));
uiState.ui.tab='map';
uiState.ui.tradeNpcId=null;
const mapHtml=renderGame(uiState);
assert.ok(mapHtml.includes('cordon-clean.webp'));
assert.ok(mapHtml.includes('data-action="location-open"'));
uiState.ui.modal='map-location';
uiState.ui.mapLocationId='anomaly-dump';
const mapModal=renderModal(uiState);
assert.ok(mapModal.includes('Тайный лагерь') && mapModal.includes('Воронка') && mapModal.includes('ФОТОГРАФИЯ ПОДЛОКАЦИИ'));
uiState.ui.modal='avatars';
const avatarModal=renderModal(uiState);
assert.ok(avatarModal.includes('Сидорович') && avatarModal.includes('Волк') && avatarModal.includes('Кефир') && avatarModal.includes('Дмитрий Дзержинский'));
console.log('Smoke tests passed: repeatable Sidorovich jobs, 20+ unique tracks per station, player library, map, trade, combat and previous systems.');
