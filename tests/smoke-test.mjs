import assert from 'node:assert/strict';
import { ASSETS, IMAGE_FALLBACKS, FACTIONS, ITEMS, LOCATIONS, EXPLORE_SPOTS, NPCS, AVATAR_OPTIONS, RADIO_TRACKS, RADIO_STATIONS, PLAYER_TRACKS, START_BUDGET, MAX_CARRY_KG, STARTER_ITEM_IDS, ITEM_ACQUISITION } from '../src/data/catalog.js';
import { createGame, travelTo, talkToNpc, scoutLocation, searchLocation, startArtifactHunt, chooseArtifactSector, deactivateAnomaly, getAvailableTraders, buyFromTrader, sellToTrader, acceptSidorovichJob, turnInSidorovichJob, acceptWolfDogQuest, turnInWolfDogQuest, acceptWorldQuest, startAreaSearch, claimAreaFind, sitAtCampfire, replyNpc, replyNpcFreeText, getTravelMinutes, getExploreSpots, advanceGame, takeShelter, leaveShelter, openStorage, getActiveLootItems, breakContainer, registerCorpseLoot } from '../src/systems/world.js';
import { addItem, getWeight, canFitLoadout, countItem, useItem, transferItem } from '../src/systems/inventory.js';
import { beginEncounter, beginWolfDogPack, playerAttack } from '../src/systems/combat.js';
import { processPlayerAction } from '../src/systems/action-engine.js';
import { rememberEntity, stemRussianWord, containsReferencePronoun, genderedSubject } from '../src/systems/russian-language.js';
import { renderMenu, renderLoadout, renderGame, renderModal } from '../src/ui/views.js';

assert.equal(FACTIONS.length,3);
// Survival needs increase over game time and can be managed through free-text RP.
const needsGame=createGame({name:'Проверка нужд',faction:'loner'},[],START_BUDGET);
needsGame.clock.lastRealTime=Date.now();
assert.equal(needsGame.player.hunger,12);
assert.equal(needsGame.player.thirst,18);
advanceGame(needsGame,60);
assert.ok(needsGame.player.hunger>13.2 && needsGame.player.hunger<13.5,'hunger should rise gradually over an in-game hour');
assert.ok(needsGame.player.thirst>19.7 && needsGame.player.thirst<20.1,'thirst should rise gradually over an in-game hour');
addItem(needsGame.inventory,'water',1);
addItem(needsGame.inventory,'bread',1);
const thirstBefore=needsGame.player.thirst;
assert.ok(processPlayerAction(needsGame,'выпил воды').message.includes('Жажда'));
assert.ok(needsGame.player.thirst<thirstBefore,'drinking should reduce thirst');
const hungerBefore=needsGame.player.hunger;
assert.ok(processPlayerAction(needsGame,'съел хлеб').message.includes('Голод'));
assert.ok(needsGame.player.hunger<hungerBefore,'eating should reduce hunger');

// A scheduled emission gives roughly one hour of warning and damages exposed players only.
const exposedGame=createGame({name:'Снаружи',faction:'loner'},[],START_BUDGET);
exposedGame.clock.lastRealTime=Date.now();
exposedGame.emission.nextAt=60;
advanceGame(exposedGame,10);
assert.ok(exposedGame.log.some(entry=>entry.text.includes('примерно через час')),'emission warning should appear one hour ahead');
advanceGame(exposedGame,55);
assert.equal(exposedGame.emission.active,true,'emission should be active around day 10 schedule');
assert.ok(exposedGame.player.radiation>0,'exposed player should receive radiation during the emission');
const shelteredGame=createGame({name:'В укрытии',faction:'loner'},[],START_BUDGET);
shelteredGame.clock.lastRealTime=Date.now();
shelteredGame.emission.nextAt=60;
assert.equal(takeShelter(shelteredGame,'village-house').ok,true);
advanceGame(shelteredGame,10);
advanceGame(shelteredGame,55);
assert.equal(shelteredGame.emission.active,true);
assert.equal(shelteredGame.player.radiation,0,'a sheltered player should be protected from the emission');
advanceGame(shelteredGame,19);
assert.equal(shelteredGame.emission.active,false,'the emission should end after its 24-minute period');
assert.ok(shelteredGame.emission.nextAt>=shelteredGame.clock.worldMinutes+9*1440 && shelteredGame.emission.nextAt<=shelteredGame.clock.worldMinutes+11*1440,'the next emission should be scheduled roughly ten days later');
leaveShelter(shelteredGame);
assert.equal(shelteredGame.player.sheltered,false);
assert.equal(LOCATIONS.length,18);
assert.equal(LOCATIONS.filter(location=>location.mapVisible!==false).length,17,'17 labelled map pins should appear over the supplied base map');
assert.deepEqual([LOCATIONS.find(l=>l.id==='rail-tunnel').x,LOCATIONS.find(l=>l.id==='rail-tunnel').y],[93,37],'east railway tunnel should be right and above locomotive');
assert.deepEqual([LOCATIONS.find(l=>l.id==='underpass').x,LOCATIONS.find(l=>l.id==='underpass').y],[39,59],'underpass should be right and slightly above the wagon');
assert.deepEqual(LOCATIONS.find(l=>l.id==='anomaly-dump').hazards,['gravity'],'the secret camp contains the Funnel gravity anomaly');
assert.equal(LOCATIONS.find(l=>l.id==='anomaly-dump').anomalyName,'Воронка');
const boltVisualGame=createGame({name:'Болт',faction:'loner'},[],START_BUDGET);
boltVisualGame.locationId='anomaly-dump';
addItem(boltVisualGame.inventory,'boltpack',1);
boltVisualGame.boltsRemaining=10;
assert.equal(deactivateAnomaly(boltVisualGame).ok,true);
assert.equal(boltVisualGame.combatEffect?.type,'bolt','throwing a bolt at an anomaly should show the throw animation');
assert.ok(LOCATIONS.every(location=>!location.image),'location backgrounds must not use external images');
assert.ok(LOCATIONS.every(location=>EXPLORE_SPOTS.some(spot=>spot.locationId===location.id)),'every marked Cordon sublocation should have at least one discoverable RP search spot');
assert.ok(EXPLORE_SPOTS.every(spot=>(spot.loot||[]).every(id=>!['tail','flesh-eye','medusa','meat_chunk','gravi'].includes(id))),'mutant trophies and artifacts must never appear as ordinary room-search loot');
assert.ok(ASSETS.map.endsWith('cordon-clean.webp'),'map must use the clean map provided by the user');
assert.ok(getTravelMinutes('atp','stop') < getTravelMinutes('north-checkpoint','south-checkpoint'),'travel estimates must scale with real map distance');
assert.equal(getTravelMinutes('atp','stop'),5,'very short marked-map walks should take about five minutes');
assert.ok(ITEMS.every(item=>!item.image),'items must not have external or local image URLs');
assert.ok(ITEMS.some(item=>item.id==='aksu' && item.ammo==='ammo545'),'AKSU must use 5.45x39 ammunition');
assert.ok(ITEMS.some(item=>item.id==='ammo545'),'5.45x39 ammo pack must exist');
assert.ok(ITEMS.some(item=>item.id==='meat_chunk' && item.name.includes('Ломоть мяса')),'Flesh artifact must exist');
assert.ok(ITEMS.some(item=>item.id==='gravi' && item.name.includes('Грави')),'Gravi artifact must exist');
assert.ok(LOCATIONS.find(location=>location.id==='elevator').desc.includes('фотографией Чернобыльской АЭС'),'Elevator description must mention the NPP photograph');
assert.ok(NPCS.every(npc=>!npc.icon),'NPCs must use built-in portrait placeholders');
assert.ok(ASSETS.menu.startsWith('https://') && ASSETS.pda.includes('kpkfon.webp'));
assert.ok(ASSETS.areaBackgrounds?.['village-basement']?.includes('fonpodvalderevnanovickov.webp'),'village basement should use its own local background');
assert.ok(ASSETS.areaBackgrounds?.['village-basement-storage']?.includes('fonpodvalderevnanovickov.webp'));
assert.ok(ASSETS.areaBackgrounds?.['atp-second-floor-storage']?.includes('fonatp.webp'));
assert.ok(ASSETS.areaBackgrounds?.['barracks-personal-storage']?.includes('fonygblokpost.webp'));
assert.ok(ASSETS.areaBackgrounds?.['locomotive-cabin']?.includes('fonlokomotiv.webp'),'locomotive cabin should use a local scene background');
assert.equal(ASSETS.menu,'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5OXJVGkhNyzTjS2YABky-DUSo45VdfMiDvddnm2NsexQfHmc4giGVzRY&s=10','main-menu must use only the user-provided external background');
const fs = await import('node:fs');
assert.ok(fs.existsSync(new URL(ASSETS.pda)),'PDA texture file must be included locally');
assert.ok(fs.existsSync(new URL(ASSETS.map)),'clean Cordon map must be included locally');
assert.ok(Object.values(ASSETS.locationBackgrounds).every(url=>fs.existsSync(new URL(url))),'all 18 location backgrounds must exist in the project');
assert.ok(Object.values(ASSETS.areaBackgrounds).every(url=>fs.existsSync(new URL(url))),'all interior and sub-area backgrounds must exist in the project');
assert.ok(LOCATIONS.every(location=>getExploreSpots(location.id).length>=3),'each location should expose at least three RP areas including the exterior');
const activeVisualSources=['src/data/catalog.js','src/ui/views.js','src/systems/world.js','src/systems/combat.js','styles.css'].map(file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8')).join('\n');
const imageUrls=[...activeVisualSources.matchAll(/https?:\/\/[^\s'\"`)>]+/g)].map(match=>match[0]).filter(url=>/\.\w{3,4}(?:[?#]|$)|\/images(?:[/?#]|$)|\/upload\//i.test(url));
assert.ok(imageUrls.every(url=>url===ASSETS.menu),'only the main-menu background may use an external image URL');
assert.ok(Object.values(IMAGE_FALLBACKS).every(value=>!value),'no remote image fallbacks are allowed');
assert.equal(NPCS.length,6,'four quest NPCs plus two additional traders');
assert.ok(NPCS.some(n=>n.id==='sidorovich'&&n.trader));
assert.ok(NPCS.some(n=>n.id==='shnurok'&&n.location==='atp'&&n.trader));
assert.ok(NPCS.some(n=>n.id==='kapterka'&&n.location==='south-checkpoint'&&n.trader));
assert.equal(AVATAR_OPTIONS.length,18,'all faction portraits and four key NPC portraits should be present');
assert.ok(AVATAR_OPTIONS.every(option=>option.src.startsWith('builtin:')),'avatar choices should use built-in symbolic placeholders');
assert.equal(RADIO_STATIONS.length,3,'each faction base should have its own radio station');
assert.ok(RADIO_STATIONS.every(station=>station.trackIds.length>=20 && new Set(station.trackIds).size===station.trackIds.length && station.trackIds.every(id=>RADIO_TRACKS.some(track=>track.id===id))),'each base station should contain at least 20 valid unique tracks');
const stationTrackIds=RADIO_STATIONS.flatMap(station=>station.trackIds);
assert.ok(new Set(stationTrackIds).size<stationTrackIds.length,'some suitable songs may overlap between stations');
const banditTracks=RADIO_STATIONS.find(s=>s.id==='bandit-atp-radio').trackIds.map(id=>RADIO_TRACKS.find(track=>track.id===id));
assert.ok(banditTracks.some(track=>track.title==='Владимирский централ' && track.artist==='Владимир Круг'));
assert.ok(!RADIO_STATIONS.find(s=>s.id==='loner-village-radio').trackIds.map(id=>RADIO_TRACKS.find(track=>track.id===id)).some(track=>track.title==='Владимирский централ'));
assert.ok(!RADIO_STATIONS.find(s=>s.id==='military-checkpoint-radio').trackIds.map(id=>RADIO_TRACKS.find(track=>track.id===id)).some(track=>track.title==='Владимирский централ')); 
assert.equal(PLAYER_TRACKS.length,RADIO_TRACKS.length,'personal player contains the complete unique radio library');
assert.equal(PLAYER_TRACKS.length,100,'personal player should contain the complete 100-track catalog');
assert.ok(PLAYER_TRACKS.some(track=>track.title==='Владимирский централ' && track.artist==='Владимир Круг'),'personal player includes bandit-only track');
assert.ok(!PLAYER_TRACKS.some(track=>track.artist==='Наутилус Помпилиус'),'Nautilus tracks should be fully replaced');
assert.ok(PLAYER_TRACKS.some(track=>track.artist==='Вячеслав Бутусов' && track.title.includes('Песня идущего домой') && track.year===2004),'Butusov 2004 song should replace Nautilus material');
assert.ok(PLAYER_TRACKS.filter(track=>track.artist==='Кино').length>=10,'Kino should be represented in the updated playlist');
assert.ok(PLAYER_TRACKS.filter(track=>track.artist==='Гражданская Оборона').length>=10,'Civil Defence should be represented in the updated playlist');
assert.ok(RADIO_TRACKS.every(track=>Number.isInteger(track.startSeconds) && track.startSeconds>=0),'every track should have a valid YouTube start offset');
assert.ok(PLAYER_TRACKS.every(track=>/^[A-Za-z0-9_-]{11}$/.test(track.videoId)),'each track must have a YouTube video ID');
assert.ok(PLAYER_TRACKS.every(track=>Number.isInteger(track.year) && track.year<=2011),'all songs must be released before 2012');
assert.ok(PLAYER_TRACKS.every(track=>track.era!==track.artist),'artist name must not be duplicated as era in the player');
assert.ok(!PLAYER_TRACKS.some(track=>/true stalker|anger of darkness|kreazot-max/i.test(`${track.artist} ${track.title} ${track.label} ${track.id}`)),'no True Stalker soundtrack remains');
assert.ok(!PLAYER_TRACKS.some(track=>/Дориан|Вечное движение/i.test(`${track.title} ${track.label}`)),'Piknik 2026 album material must be excluded');
const requiredArtists=['Гражданская Оборона','Пикник','Кино','Король и Шут','Кукрыниксы','Чёрный Обелиск','ДДТ','Ratt','Bon Jovi','ZZ Top','Владимир Круг','Сектор Газа','Сплин','Би-2','Агата Кристи','Инструкция по выживанию','Ария','Жадан і Собаки','Приключения Электроников'];
assert.ok(requiredArtists.every(artist=>PLAYER_TRACKS.some(track=>track.artist===artist)),'curated CIS-focused library should retain the main requested groups');
assert.ok(PLAYER_TRACKS.some(track=>track.title==='Египтянин' && track.artist==='Пикник'));
assert.ok(PLAYER_TRACKS.some(track=>track.title==='Звонімір Бобан' && track.year===2008));
assert.ok(PLAYER_TRACKS.some(track=>track.title==='Трава у дома' && track.year===2003));
assert.ok(!PLAYER_TRACKS.some(track=>track.title==='Дориан (Грей)' || track.title==='Вечное движение'));
assert.ok(!PLAYER_TRACKS.some(track=>track.title==='Чужестранец' && track.artist==='Пикник'),'the previously excluded Piknik track should stay out of the playlist');
assert.ok(PLAYER_TRACKS.filter(track=>Number.isInteger(track.endSeconds)).every(track=>track.endSeconds>track.startSeconds),'all time-coded segment boundaries must be valid');
for (const station of RADIO_STATIONS) {
  const stationSongs=station.trackIds.map(id=>PLAYER_TRACKS.find(track=>track.id===id));
  assert.ok(stationSongs.every(Boolean));
  assert.ok(stationSongs.filter(track=>['Bon Jovi','ZZ Top','Ratt'].includes(track.artist)).length<=2,'western rock should remain a minority');
  assert.ok(Math.max(...Object.values(stationSongs.reduce((counts,track)=>({...counts,[track.artist]:(counts[track.artist]||0)+1}),{})))<=5,'no single artist should dominate a station');
}
assert.ok(ITEMS.length>=32);
assert.ok(ITEMS.every(item=>!item.image),'inventory items should use local symbolic placeholders instead of image URLs');
assert.ok(ITEMS.some(item=>item.id==='flesh-eye'&&item.cat==='Добыча'));
assert.equal(new Set(PLAYER_TRACKS.map(track=>track.id)).size,PLAYER_TRACKS.length,'all music IDs should be unique');
assert.ok((await import('node:fs')).readFileSync(new URL('../styles.css',import.meta.url),'utf8').includes('.map-pin{width:34px;height:34px;min-width:34px;min-height:34px;'),'map circles should be larger touch targets');

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
const expectedWalk=getTravelMinutes(game.locationId,'stop');
const offsetBeforeWalk=game.clock.timeOffsetMinutes;
const walkResult=travelTo(game,'stop');
assert.equal(walkResult.ok,true);
assert.equal(walkResult.travelMinutes,expectedWalk);
assert.equal(game.clock.timeOffsetMinutes-offsetBeforeWalk,expectedWalk,'travel must advance the clock by the distance-based estimate');
assert.ok(walkResult.message.includes(`Путь занял ${expectedWalk} мин.`));
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
assert.equal(PLAYER_TRACKS.length,RADIO_TRACKS.length,'personal player should contain all curated station songs');
assert.equal(PLAYER_TRACKS.length,100,'full music library should have 100 unique songs');

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

// Full Wolf quest: accept from dialogue, reach the wagon north of the village, defeat five dogs, and return for payment.
const wolfQuestGame=createGame(character,[],START_BUDGET);
addItem(wolfQuestGame.inventory,'knife',1);
assert.equal(talkToNpc(wolfQuestGame,'wolf').ok,true);
const wolfOffer=replyNpc(wolfQuestGame,'wolf','работа');
assert.ok(wolfOffer.includes('вагончика') && wolfOffer.includes('пять слепых собак'));
wolfQuestGame.dialogueHistory=[{role:'npc',text:wolfOffer}];
assert.ok(wolfQuestGame.dialogueReply.includes('новичков'));
const wolfDialogueState={screen:'game',characters:[character],activeCharacterId:'smoke',pendingCharacter:null,settings:{reducedMotion:false,radioStationId:'loner-village-radio'},account:{},ui:{tab:'location',pdaOpen:false,modal:null,music:{mode:null,stationId:null,trackId:null,queue:[],index:0,playing:false}},game:wolfQuestGame};
assert.ok(renderGame(wolfDialogueState).includes('пять слепых собак'),'Wolf offer must be visible inside the dialogue modal');
assert.equal(acceptWolfDogQuest(wolfQuestGame).ok,true);
assert.equal(wolfQuestGame.quests.find(q=>q.id==='wolf-dog-pack').status,'active');
const randomBeforeWolf=Math.random;
Math.random=()=>0.99;
assert.equal(travelTo(wolfQuestGame,'trailer').ok,true,'the wagon is reachable from the rookie village');
Math.random=()=>0;
assert.equal(beginWolfDogPack(wolfQuestGame).ok,true);
for (let index=0;index<5;index++) {
  if (index>0) advanceGame(wolfQuestGame,1); // respect the short post-shot recovery cooldown
  assert.equal(wolfQuestGame.activeEncounter?.type,'blind-dog',`dog ${index+1} should be spawned`);
  wolfQuestGame.activeEncounter.hp=1;
  const result=playerAttack(wolfQuestGame);
  assert.equal(result.ok,true);
}
assert.equal(wolfQuestGame.wolfDogQuest.killed,5);
assert.equal(wolfQuestGame.wolfDogQuest.status,'ready');
assert.equal(wolfQuestGame.quests.find(q=>q.id==='wolf-dog-pack').status,'ready');
Math.random=()=>0.99;
assert.equal(travelTo(wolfQuestGame,'rookie-village').ok,true);
assert.equal(talkToNpc(wolfQuestGame,'wolf').ok,true);
const cashBeforeWolf=wolfQuestGame.money;
assert.equal(turnInWolfDogQuest(wolfQuestGame).ok,true);
assert.equal(wolfQuestGame.money,cashBeforeWolf+450);
assert.equal(wolfQuestGame.wolfDogQuest.status,'completed');
Math.random=randomBeforeWolf;

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
addItem(shopGame.inventory,'flesh-eye',1);
assert.equal(sellToTrader(shopGame,'sidorovich','flesh-eye',1).ok,true);
assert.ok(!getAvailableTraders(shopGame,'sidorovich-bunker').find(t=>t.id==='sidorovich').stock.some(entry=>entry.id==='flesh-eye'),'mutant trophies may be sold but must not be placed back on sale');
const legacyStockGame=createGame({name:'Старое сохранение',faction:'loner'},[],START_BUDGET);
legacyStockGame.traders.find(t=>t.id==='sidorovich').stock.push({id:'tail',qty:2,price:400},{id:'medusa',qty:1,price:650});
const migratedSidorovich=getAvailableTraders(legacyStockGame,'sidorovich-bunker').find(t=>t.id==='sidorovich');
assert.ok(migratedSidorovich.stock.every(entry=>!['tail','flesh-eye','medusa','meat_chunk','gravi'].includes(entry.id)),'legacy saves must be migrated off mutant/artifact sale stock');

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
const dogGame=createGame(character,[],START_BUDGET);
addItem(dogGame.inventory,'knife',1);
beginEncounter(dogGame,'blind-dog');
dogGame.activeEncounter.hp=1;
const dogRandom=Math.random;
Math.random=()=>0;
const dogFight=playerAttack(dogGame);
Math.random=dogRandom;
assert.equal(dogFight.finished,true);
assert.equal(countItem(dogGame.inventory,'tail'),1,'blind dogs drop their own tail as a combat trophy');


// Starter equipment is deliberately limited; rare goods, mutant parts and artifacts are excluded.
assert.ok(STARTER_ITEM_IDS.length < ITEMS.length,'starter selection must be smaller than the full item catalogue');
assert.deepEqual(ITEM_ACQUISITION.mutantDrops,['tail','flesh-eye']);
assert.deepEqual(ITEM_ACQUISITION.artifactHunt,['medusa','meat_chunk','gravi']);
assert.ok(ITEM_ACQUISITION.traderOnly.every(id=>!STARTER_ITEM_IDS.includes(id)));
assert.ok(ITEM_ACQUISITION.searchOnly.every(id=>!STARTER_ITEM_IDS.includes(id)));
for (const restricted of ['aksu','ammo545','psz5','aurora','optik','zarya','otklik','flash','tail','flesh-eye','medusa','meat_chunk','gravi']) {
  assert.ok(!STARTER_ITEM_IDS.includes(restricted),`${restricted} must not be in starter selection`);
  assert.equal(canFitLoadout({},restricted,1,START_BUDGET).ok,false,`${restricted} must be blocked from starter selection`);
}
for (const itemId of STARTER_ITEM_IDS) assert.ok(ITEMS.some(item=>item.id===itemId),`starter item ${itemId} must exist`);
assert.ok(ITEMS.every(item=>!['tail','flesh-eye','medusa','meat_chunk','gravi'].includes(item.id) || ['Добыча','Артефакты'].includes(item.cat)));
assert.ok(LOCATIONS.every(location=>(location.loot||[]).every(id=>!['tail','flesh-eye','medusa','meat_chunk','gravi'].includes(id))), 'mutant parts/artifacts must not appear in ordinary stash search');
const initialShopGame=createGame(character,[],START_BUDGET);
for (const trader of getAvailableTraders(initialShopGame,'sidorovich-bunker').concat(getAvailableTraders(initialShopGame,'atp'),getAvailableTraders(initialShopGame,'south-checkpoint'))) {
  assert.ok((trader.stock||[]).every(stock=>!['tail','flesh-eye','medusa','meat_chunk','gravi'].includes(stock.id)), 'trader shelves must not directly sell mutant trophies or artifacts');
}

// Russian cases and gendered pronouns: a named referent can be addressed by он/она/оно in different cases.
assert.equal(stemRussianWord('поговорила').startsWith('поговор'),true);
assert.equal(containsReferencePronoun('подойди к нему'),true);
assert.equal(containsReferencePronoun('поговори с ней'),true);
assert.equal(containsReferencePronoun('осмотри его'),true);
assert.equal(containsReferencePronoun('расскажи об этом'),true);
const pronounGame=createGame({name:'Язык',faction:'loner'},[],START_BUDGET);
assert.equal(processPlayerAction(pronounGame,'поговори с Волком').action,'dialogue');
assert.equal(processPlayerAction(pronounGame,'поговори с ним').action,'dialogue','masculine pronoun in dative should resolve to the last-mentioned NPC');
rememberEntity(pronounGame,{id:'flesh',name:'Плоть',type:'flesh',gender:'f'},'creature');
const femaleInspect=processPlayerAction(pronounGame,'осмотри её').message;
assert.ok(femaleInspect.includes('Она') && femaleInspect.includes('Плоть'),'feminine pronoun should resolve and agree with the mutant name');
rememberEntity(pronounGame,{id:'anomaly-dump',name:'Тайный лагерь',gender:'m'},'location');
assert.ok(processPlayerAction(pronounGame,'осмотри его').message.includes('Тайный лагерь'),'masculine accusative pronoun should resolve to a remembered location');
const combatPronounGame=createGame({name:'Язык',faction:'loner'},[],START_BUDGET);
rememberEntity(combatPronounGame,{id:'blind-dog',name:'Слепой пёс',type:'blind-dog',gender:'m'},'creature');
assert.equal(processPlayerAction(combatPronounGame,'напади на него').action,'combat','masculine pronoun should resolve in an attack command');
const feminineCombatGame=createGame({name:'Язык',faction:'loner'},[],START_BUDGET);
rememberEntity(feminineCombatGame,{id:'flesh',name:'Плоть',type:'flesh',gender:'f'},'creature');
assert.equal(processPlayerAction(feminineCombatGame,'ударь её').action,'combat','feminine pronoun should resolve in an attack command');
assert.equal(genderedSubject({name:'Волк',id:'wolf'}),'Он');
assert.equal(genderedSubject({name:'Плоть',id:'flesh'}),'Она');
assert.equal(genderedSubject({name:'АТП',id:'atp'}),'Оно');
const neuterGame=createGame({name:'Язык',faction:'loner'},[],START_BUDGET);
rememberEntity(neuterGame,{id:'atp',name:'АТП',gender:'n'},'location');
assert.ok(processPlayerAction(neuterGame,'это').message.startsWith('Оно — это АТП'),'neuter pronoun should resolve to an inanimate neuter referent');
const wolfCasesGame=createGame({name:'Язык',faction:'loner'},[],START_BUDGET);
for (const command of ['поговори с Волком','спроси у Волка','обратись к Волку','подойди к Волку']) {
  wolfCasesGame.locationId='rookie-village';
  const response=processPlayerAction(wolfCasesGame,command);
  assert.equal(response.action,'dialogue',`NPC case form should resolve: ${command}`);
}
const sidorovichCasesGame=createGame({name:'Язык',faction:'loner'},[],START_BUDGET);
sidorovichCasesGame.locationId='sidorovich-bunker';
for (const command of ['поговори с Сидоровичем','спроси у Сидоровича','подойди к Сидоровичу']) {
  assert.equal(processPlayerAction(sidorovichCasesGame,command).action,'dialogue',`Sidorovich case form should resolve: ${command}`);
}
assert.ok(processPlayerAction(wolfCasesGame,'расскажи про него').message.includes('Волк'),'genitive pronoun should refer to the last-mentioned NPC');
assert.equal(processPlayerAction(wolfCasesGame,'подойди к нему').action,'dialogue','dative pronoun should resolve when approaching a remembered NPC');
const militaryPronounGame=createGame({name:'Язык',faction:'military'},[],START_BUDGET);
militaryPronounGame.locationId='south-checkpoint';
assert.equal(processPlayerAction(militaryPronounGame,'спроси у Каптёрки').action,'dialogue');
assert.equal(processPlayerAction(militaryPronounGame,'подойди к ней').action,'dialogue','feminine dative pronoun should resolve to a remembered female NPC');
assert.ok(processPlayerAction(militaryPronounGame,'где она?').message.includes('Южный блокпост'),'feminine pronoun should preserve the remembered referent in a question');
assert.equal(processPlayerAction(militaryPronounGame,'ударь её').action,'combat','a remembered female NPC can be targeted with a feminine pronoun');
assert.equal(militaryPronounGame.activeEncounter.name,'Каптёрка');
assert.equal(militaryPronounGame.activeEncounter.gender,'f');


const sleepGame=createGame({name:'Язык',faction:'loner'},[],START_BUDGET);
assert.equal(processPlayerAction(sleepGame,'спроси у Волка').action,'dialogue','спроси must not be confused with спать');
assert.equal(processPlayerAction(sleepGame,'переночуй').action,'sleep','переночуй must be parsed as sleep, not movement');
const exploreGame=createGame({name:'Язык',faction:'loner'},[],START_BUDGET);
assert.ok(processPlayerAction(exploreGame,'поищи припасы').message.length>0,'search command with пoищи should be recognized');

// Combat still falls back to a melee weapon when a firearm has no rounds.
addItem(game.inventory,'knife',1);
addItem(game.inventory,'pm',1);
beginEncounter(game,'bandit');
const attack=playerAttack(game);
assert.ok(attack.message.includes('Нож'));

const uiState={screen:'game',characters:[character],activeCharacterId:'smoke',pendingCharacter:null,settings:{reducedMotion:false,radioStationId:'loner-village-radio'},account:{},draft:{name:'',birthDate:'',height:'',weight:'',personality:'',biography:'',notes:'',faction:'loner',avatar:''},loadout:{selected:{}},ui:{tab:'location',pdaOpen:false,modal:null,music:{mode:null,stationId:null,trackId:null,queue:[],index:0,playing:false}},game};
assert.ok(renderMenu(uiState).includes('Играть'));
assert.ok(renderLoadout(uiState).includes('СТАРТОВАЯ ПОДБОРКА'));
for (const hidden of ['АКСУ','Пачка патронов 5.45×39','Хвост слепого пса','Глаз плоти','Медуза','Ломоть мяса','Грави','Заря']) assert.ok(!renderLoadout(uiState).includes(hidden),`${hidden} must not appear in the starter screen`);
const closedPdaHtml=renderGame(uiState);
assert.ok(closedPdaHtml.includes('Открыть КПК'));
assert.ok(!closedPdaHtml.includes('aria-label="Разделы КПК"'),'PDA tabs must stay hidden until the device is opened');
assert.ok(closedPdaHtml.includes('Текущая локация') || closedPdaHtml.includes('ДЕЙСТВИЯ'));
uiState.ui.pdaOpen=true;
assert.ok(renderGame(uiState).includes('aria-label="Разделы КПК"'),'opening the PDA should reveal tabs across the top');
uiState.game.locationId='rookie-village';
uiState.ui.pdaOpen=false;
uiState.ui.tab='location';
const radioHtml=renderGame(uiState);
assert.ok(radioHtml.includes('Радио Деревни новичков'),'local base radio must appear in the location scene without opening the PDA');
assert.ok(radioHtml.includes('data-action="radio-base-open"'));
assert.ok(!radioHtml.includes('data-action="radio-play-track"'),'radio must not allow selecting individual tracks');
assert.ok(!radioHtml.includes('music-dock'),'the bottom music dock must be removed');
const remoteRadioState={...uiState,game:{...uiState.game,locationId:'elevator'}};
const remoteRadioHtml=renderGame(remoteRadioState);
assert.ok(!remoteRadioHtml.includes('Радио Деревни новичков') && !remoteRadioHtml.includes('Радио АТП') && !remoteRadioHtml.includes('Радио Южного блокпоста'),'a remote location must not expose a base station');
assert.ok(!remoteRadioHtml.includes('Очередь станции'),'remote locations must not expose another base playlist');
uiState.settings.removedPlayerTrackIds=['track-001'];
uiState.ui.pdaOpen=true;
uiState.ui.tab='player';
const playerHtml=renderGame(uiState);
assert.ok(playerHtml.includes('Моя подборка'));
assert.ok(playerHtml.includes('Убранные композиции'));
assert.ok(playerHtml.includes('player-remove-track'));
assert.ok(playerHtml.includes('player-restore-track'));
assert.ok(playerHtml.includes('player-play-track'));
assert.ok(playerHtml.includes('Владимирский централ'),'personal player should expose every track, including the bandit-only radio exception');
assert.ok(playerHtml.includes('Песня идущего домой'),'personal player should include the replacement Butusov song');
uiState.ui.tab='trade';
uiState.ui.tradeNpcId='sidorovich';
uiState.game.locationId='sidorovich-bunker';
uiState.ui.modal='trade-panel';
const tradeHtml=renderModal(uiState);
assert.ok(tradeHtml.includes('Товар торговца') && tradeHtml.includes('Продать торговцу'));
assert.ok(!renderGame(uiState).includes('Раздел торговли'),'trade must not be part of PDA navigation');
uiState.ui.modal=null;
uiState.ui.tab='map';
uiState.ui.pdaOpen=true;
uiState.ui.tradeNpcId=null;
uiState.ui.mapView='map';
const mapHtml=renderGame(uiState);
assert.ok(mapHtml.includes('cordon-clean.webp'),'the clean user map must render as the PDA map base layer');
assert.ok(mapHtml.includes('data-action="location-open"'));
assert.ok(!mapHtml.includes('data-action="map-view"'),'the map should no longer have separate places/objectives tabs');
assert.ok(!mapHtml.includes('Все отмеченные места'),'the separate location directory should be removed from the map screen');
assert.ok(!mapHtml.includes('Активные задания'),'the quest list should move into the selected map-point modal');
uiState.ui.mapView='map';
uiState.ui.modal='map-location';
uiState.ui.mapLocationId='anomaly-dump';
const mapModal=renderModal(uiState);
assert.ok(mapModal.includes('Тайный лагерь') && mapModal.includes('Воронка') && mapModal.includes('ВИЗУАЛЬНЫЙ ОРИЕНТИР'));
assert.ok(mapModal.includes('МЕСТА В ЭТОЙ ЛОКАЦИИ') && mapModal.includes('ЦЕЛИ ЗАДАНИЙ В ЭТОЙ ЛОКАЦИИ'),'the selected map point should own its local places and quest targets');
uiState.ui.modal='avatars';
const avatarModal=renderModal(uiState);
assert.ok(avatarModal.includes('Сидорович') && avatarModal.includes('Волк') && avatarModal.includes('Кефир') && avatarModal.includes('Дмитрий Дзержинский'));
uiState.ui.tab='stats';
const statsHtml=renderGame(uiState);
assert.ok(statsHtml.includes('profile-edit-form') && statsHtml.includes('Выбрать значок'),'PDA statistics must provide editable character dossier');
// PDA tabs keep inventory/trade/radio out; these remain location or independent overlays.
const tabState={...uiState,ui:{...uiState.ui,pdaOpen:true,tab:'location',modal:null,mapView:'map'}};
const tabMarkup=renderGame(tabState);
assert.ok(tabMarkup.includes('Места и обыск') && !tabMarkup.includes('МЕСТА В ЭТОЙ ЛОКАЦИИ'),'the scene should remove its local place chips and keep a compact exploration entry');
assert.ok(!tabMarkup.includes('data-tab="inventory"')&&!tabMarkup.includes('data-tab="trade"')&&!tabMarkup.includes('data-tab="radio"'));
assert.ok(!tabMarkup.includes('music-dock'));
const contactsMarkup=renderGame({...tabState,ui:{...tabState.ui,tab:'contacts'}});
assert.ok(!contactsMarkup.includes('data-action="trade-open"'),'contacts tab should not expose trade inside the PDA');

// Quests are hidden from the quest list until accepted and then show progress.
const questVisibilityGame=createGame(character,[],START_BUDGET);
const hiddenQuest=questVisibilityGame.quests.find(q=>q.id!=='wolf-dog-pack');
const questVisibilityState={screen:'game',characters:[character],activeCharacterId:'smoke',settings:{reducedMotion:false},ui:{tab:'quests',pdaOpen:true,mapView:'map',modal:null,music:{mode:null,stationId:null,trackId:null,queue:[],index:0,playing:false}},game:questVisibilityGame};
assert.ok(!renderGame(questVisibilityState).includes(hiddenQuest.title),'unaccepted jobs must stay out of the quest log');
assert.equal(acceptWorldQuest(questVisibilityGame,hiddenQuest.id).ok,true);
assert.ok(renderGame(questVisibilityState).includes(hiddenQuest.title),'an accepted job must appear in the quest log');

// Explore interiors, choose a single item, and campfire RP actions work in their own locations.
const exploreTestGame=createGame(character,[],START_BUDGET);
const explored= startAreaSearch(exploreTestGame,'village-house');
assert.equal(explored.ok,true);
assert.ok(explored.options.length>0);
assert.equal(claimAreaFind(exploreTestGame,explored.options[0].id).ok,true);
assert.equal(exploreTestGame.pendingDiscovery,null);
const housePhraseGame=createGame(character,[],START_BUDGET);
const housePhrase=processPlayerAction(housePhraseGame,'изучил дом');
assert.equal(housePhrase.action,'explore-find','free text should recognise inflected commands like изучил дом');
const basementPhraseGame=createGame(character,[],START_BUDGET); basementPhraseGame.locationId='sidorovich-bunker';
assert.equal(processPlayerAction(basementPhraseGame,'обыскал подвал').action,'explore-find','search should resolve a basement alias in the current sublocation');

const fireMessage=processPlayerAction(exploreTestGame,'сел у костра');
assert.ok(fireMessage.message.includes('костра') || fireMessage.message.includes('костёр'),'campfire RP action should be recognized');
assert.ok(exploreTestGame.player.stress<0 || exploreTestGame.player.stamina>=100 || exploreTestGame.log.some(entry=>entry.text.includes('присел у костра')),'campfire action should affect character/rest log');

// The map marker modal includes an active Wolf task only after the task has been accepted.
const wolfMapGame=createGame(character,[],START_BUDGET);
acceptWolfDogQuest(wolfMapGame);
const wolfMapState={...questVisibilityState,game:wolfMapGame,ui:{...questVisibilityState.ui,modal:'map-location',mapLocationId:'trailer'}};
const wolfTrailerModal=renderModal(wolfMapState);
assert.ok(wolfTrailerModal.includes('Собаки у вагончика') && wolfTrailerModal.includes('0/5'));
const conversationGame=createGame(character,[],START_BUDGET);
conversationGame.locationId='rookie-village';
talkToNpc(conversationGame,'wolf');
const conversationReply=replyNpcFreeText(conversationGame,'wolf','Что случилось возле вагончика и почему собаки нападают на новичков?');
assert.equal(conversationReply.ok,true);
assert.ok(conversationGame.dialogueHistory.some(entry=>entry.role==='player' && entry.text.includes('вагончика')),'full-text NPC conversation should preserve the player message in the chat');
assert.ok(conversationGame.dialogueHistory.at(-1).role==='npc','NPC response should be appended after the player message');
assert.equal(conversationGame.dialogueContext.lastIntent,'mutants','the dialogue engine should classify natural player phrases into a remembered topic');
const followupReply=replyNpcFreeText(conversationGame,'wolf','А что дальше?');
assert.ok(followupReply.ok && followupReply.message.includes('По поводу того, о чём говорили'),'NPC follow-up replies should use the previous conversation context');
const directionReply=replyNpcFreeText(conversationGame,'wolf','Где я сейчас нахожусь?');
assert.ok(directionReply.message.includes('Деревня новичков') && !directionReply.message.includes('rookie-village'),'direction replies should use human-readable location names');




// v16 loot windows and permanent personal storage containers.
const lootUiGame=createGame({name:'Обыск',faction:'loner'},[],START_BUDGET);
const multiLoot=startAreaSearch(lootUiGame,'village-house');
assert.equal(multiLoot.ok,true);
assert.ok(multiLoot.items.length>=1,'a search should create a multi-item loot container');
assert.equal(lootUiGame.activeLoot.sourceId,'village-house');
const sourceLoot=getActiveLootItems(lootUiGame);
const lootItem=sourceLoot[0];
assert.ok(transferItem(sourceLoot,lootUiGame.inventory,lootItem.id,1,true).ok,'one item should move from loot into the player backpack');
assert.equal(countItem(lootUiGame.inventory,lootItem.id),1);
const crateGame=createGame(character,[],1000);
const crateSpot=getExploreSpots('rookie-village').find(entry=>entry.kind==='breakable');
assert.ok(crateSpot,'the village should have a breakable crate');
const broken=breakContainer(crateGame,crateSpot.id);
assert.equal(broken.ok,true);
assert.equal(crateGame.brokenCrates[crateSpot.id],true);
const firstCrateCount=getActiveLootItems(crateGame).length;
assert.ok(firstCrateCount>=1,'a broken crate should reveal loot');
breakContainer(crateGame,crateSpot.id);
assert.equal(getActiveLootItems(crateGame).length,firstCrateCount,'reopening an already broken crate must not reroll its loot');
const corpseId=registerCorpseLoot(crateGame,{type:'bandit',name:'Бандит у насыпи'});
assert.ok(corpseId && crateGame.activeLoot.title.includes('Бандит у насыпи'),'defeated opponents should have a loot container for the left search pane');
assert.ok(getActiveLootItems(crateGame).length>=1,'corpse containers should hold items that can be transferred');
const corpsePanelState={screen:'game',characters:[character],activeCharacterId:'smoke',settings:{reducedMotion:false},ui:{tab:'location',modal:'loot-panel',music:{mode:null,stationId:null,trackId:null,queue:[],index:0,playing:false}},game:crateGame};
assert.ok(renderModal(corpsePanelState).includes('Вещи погибшего'),'corpse loot should be clearly labelled in the left pane');
const storageSpot=getExploreSpots('rookie-village').find(entry=>entry.kind==='storage');
assert.ok(storageSpot,'the Cordon village basement should expose a personal storage spot');
assert.equal(openStorage(lootUiGame,storageSpot.storageId,storageSpot.name).ok,true);
assert.ok(getActiveLootItems(lootUiGame).length>=1,'personal storage should contain persistent starter items');
const atpStorage=getExploreSpots('atp').find(entry=>entry.storageId==='atp-second-floor');
const barracksStorage=getExploreSpots('south-checkpoint').find(entry=>entry.storageId==='barracks-locker');
assert.ok(atpStorage && barracksStorage,'ATP second floor and barracks must expose personal storage');
assert.ok(lootUiGame.squads.length>=8,'the Cordon should have more than the original three squads');
const lootPanelState={screen:'game',characters:[character],activeCharacterId:'smoke',settings:{reducedMotion:false},ui:{tab:'location',pdaOpen:false,modal:'loot-panel',mapView:'map',music:{mode:null,stationId:null,trackId:null,queue:[],index:0,playing:false}},game:lootUiGame};
const lootMarkup=renderModal(lootPanelState);
assert.ok(lootMarkup.includes('Найденные вещи') || lootMarkup.includes('Хранилище'));
assert.ok(lootMarkup.includes('Рюкзак игрока') && lootMarkup.includes('Забрать всё') && lootMarkup.includes('Сложить всё'));
const inventoryMarkup=renderModal({...lootPanelState,ui:{...lootPanelState.ui,modal:'inventory-panel'}});
assert.ok(inventoryMarkup.includes('ОСНОВНОЙ 1') && inventoryMarkup.includes('Быстрый доступ'),'inventory should display two main weapon slots and quick access');
assert.ok(ITEMS.some(item=>item.id==='berill'&&item.armor>0),'armor catalog should include the Berill suit');
assert.ok(ITEMS.some(item=>item.id==='pg4'&&item.cat==='Защита'),'gas mask catalog should include PG-4');

console.log('Smoke tests passed: PDA/map modes, quest visibility/progress, local radio, inventory/trade overlays, RP exploration, campfire rest, Wolf quest, profile, combat and existing systems.');
