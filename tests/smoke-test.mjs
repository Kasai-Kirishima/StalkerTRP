import assert from 'node:assert/strict';
import { ASSETS, IMAGE_FALLBACKS, FACTIONS, ITEMS, LOCATIONS, NPCS, AVATAR_OPTIONS, RADIO_TRACKS, RADIO_STATIONS, PLAYER_TRACKS, START_BUDGET, MAX_CARRY_KG, STARTER_ITEM_IDS, ITEM_ACQUISITION } from '../src/data/catalog.js';
import { createGame, travelTo, talkToNpc, scoutLocation, searchLocation, startArtifactHunt, chooseArtifactSector, deactivateAnomaly, getAvailableTraders, buyFromTrader, sellToTrader, acceptSidorovichJob, turnInSidorovichJob, acceptWolfDogQuest, turnInWolfDogQuest, replyNpc, getTravelMinutes } from '../src/systems/world.js';
import { addItem, getWeight, canFitLoadout, countItem } from '../src/systems/inventory.js';
import { beginEncounter, beginWolfDogPack, playerAttack } from '../src/systems/combat.js';
import { processPlayerAction } from '../src/systems/action-engine.js';
import { rememberEntity, stemRussianWord, containsReferencePronoun, genderedSubject } from '../src/systems/russian-language.js';
import { renderMenu, renderLoadout, renderGame, renderModal } from '../src/ui/views.js';

assert.equal(FACTIONS.length,3);
assert.equal(LOCATIONS.length,18);
assert.equal(LOCATIONS.filter(location=>location.mapVisible!==false).length,17,'17 labelled map pins should appear over the supplied base map');
assert.deepEqual([LOCATIONS.find(l=>l.id==='rail-tunnel').x,LOCATIONS.find(l=>l.id==='rail-tunnel').y],[93,37],'east railway tunnel should be right and above locomotive');
assert.deepEqual([LOCATIONS.find(l=>l.id==='underpass').x,LOCATIONS.find(l=>l.id==='underpass').y],[39,59],'underpass should be right and slightly above the wagon');
assert.deepEqual(LOCATIONS.find(l=>l.id==='anomaly-dump').hazards,['gravity'],'the secret camp contains the Funnel gravity anomaly');
assert.equal(LOCATIONS.find(l=>l.id==='anomaly-dump').anomalyName,'Воронка');
assert.ok(LOCATIONS.every(location=>!location.image),'location backgrounds must not use external images');
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
assert.ok(ASSETS.menu.startsWith('https://') && ASSETS.pda===null);
assert.equal(ASSETS.menu,'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5OXJVGkhNyzTjS2YABky-DUSo45VdfMiDvddnm2NsexQfHmc4giGVzRY&s=10','main-menu must use only the user-provided external background');
const fs = await import('node:fs');
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
uiState.ui.tab='radio';
const radioHtml=renderGame(uiState);
assert.ok(radioHtml.includes('Радио Кордон'));
assert.ok(!radioHtml.includes('data-action="radio-play-track"'),'radio must not allow selecting individual tracks');
assert.ok(radioHtml.includes('случайный эфир'));
const remoteRadioState={...uiState,game:{...uiState.game,locationId:'elevator'}};
const remoteRadioHtml=renderGame(remoteRadioState);
assert.ok(remoteRadioHtml.includes('нет радиопередатчика'));
assert.ok(!remoteRadioHtml.includes('Очередь станции'),'remote locations must not expose another base playlist');
uiState.settings.removedPlayerTrackIds=['track-001'];
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
const tradeHtml=renderGame(uiState);
assert.ok(tradeHtml.includes('Товар торговца') && tradeHtml.includes('Продать торговцу'));
uiState.ui.tab='map';
uiState.ui.tradeNpcId=null;
const mapHtml=renderGame(uiState);
assert.ok(mapHtml.includes('cordon-clean.webp'),'the clean user map must render as the PDA map base layer');
assert.ok(mapHtml.includes('data-action="location-open"'));
uiState.ui.modal='map-location';
uiState.ui.mapLocationId='anomaly-dump';
const mapModal=renderModal(uiState);
assert.ok(mapModal.includes('Тайный лагерь') && mapModal.includes('Воронка') && mapModal.includes('ФОТОГРАФИЯ ПОДЛОКАЦИИ'));
uiState.ui.modal='avatars';
const avatarModal=renderModal(uiState);
assert.ok(avatarModal.includes('Сидорович') && avatarModal.includes('Волк') && avatarModal.includes('Кефир') && avatarModal.includes('Дмитрий Дзержинский'));
uiState.ui.tab='stats';
const statsHtml=renderGame(uiState);
assert.ok(statsHtml.includes('profile-edit-form') && statsHtml.includes('Выбрать значок'),'PDA statistics must provide editable character dossier');
console.log('Smoke tests passed: quests, radio, map, profile editor, AKSU/ammo, artifacts, trade, combat and previous systems.');
