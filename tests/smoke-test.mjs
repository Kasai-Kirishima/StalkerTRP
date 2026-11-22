import assert from 'node:assert/strict';
import { ASSETS, IMAGE_FALLBACKS, FACTIONS, ITEMS, LOCATIONS, EXPLORE_SPOTS, NPCS, AVATAR_OPTIONS, NPC_APPEARANCES, START_BUDGET, MAX_CARRY_KG, STARTER_ITEM_IDS, STARTER_LOADOUT_BY_FACTION, ITEM_ACQUISITION } from '../src/data/catalog.js';
import { createGame, travelTo, talkToNpc, getAvailableStalkers, scoutLocation, searchLocation, startArtifactHunt, chooseArtifactSector, deactivateAnomaly, getAvailableTraders, buyFromTrader, sellToTrader, acceptSidorovichJob, turnInSidorovichJob, acceptWolfDogQuest, turnInWolfDogQuest, acceptWorldQuest, startAreaSearch, claimAreaFind, sitAtCampfire, replyNpc, replyNpcFreeText, getTravelMinutes, getExploreSpots, advanceGame, takeShelter, leaveShelter, openStorage, getActiveLootItems, breakContainer, registerCorpseLoot, getFactionRelation, nameSecretAnomaly, turnInSecretAnomalyQuest, turnInPudelQuest, claimAtpRescueReward, beginAtpRescue, useTrampoline, simulateWorld, useVortex, escapeVortex, useCarousel, escapeCarousel } from '../src/systems/world.js';
import { addItem, getWeight, canFitLoadout, countItem, useItem, transferItem } from '../src/systems/inventory.js';
import { beginEncounter, beginWolfDogPack, playerAttack } from '../src/systems/combat.js';
import { processPlayerAction } from '../src/systems/action-engine.js';
import { rememberEntity, stemRussianWord, containsReferencePronoun, genderedSubject } from '../src/systems/russian-language.js';
import { renderMenu, renderCreate, renderLoadout, renderGame, renderModal, renderGameSettings } from '../src/ui/views.js';
const fs = await import('node:fs');

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
assert.deepEqual(LOCATIONS.find(l=>l.id==='anomaly-dump').anomalies,['carousel','vortex'],'the secret camp has a carousel and vortex');
assert.equal(LOCATIONS.find(l=>l.id==='anomaly-dump').anomalyName,'Неизвестная аномалия');
assert.deepEqual(LOCATIONS.find(l=>l.id==='farmstead').anomalies,['trampoline'],'the farmstead has a trampoline anomaly');
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
assert.ok(NPCS.every(npc=>npc.icon?.includes('/assets/npc/Vneska/')),'key NPCs must use local portraits');
assert.ok(NPCS.filter(npc=>npc.id!=='sidorovich').every(npc=>npc.appearance?.includes('/assets/npc/Vneska/')),'all supplied key NPC body images must be paired with their portraits');
assert.ok(ASSETS.menu.includes('fonderevnanovickov') && ASSETS.pda.includes('kpkfon.webp'));
assert.ok(fs.existsSync(new URL(ASSETS.menu)),'main-menu background must be stored locally for offline display');
assert.ok(ASSETS.areaBackgrounds?.['village-basement']?.includes('fonpodvalderevnanovickov.webp'),'village basement should use its own local background');
assert.ok(ASSETS.areaBackgrounds?.['village-basement-storage']?.includes('fonpodvalderevnanovickov.webp'));
assert.ok(ASSETS.areaBackgrounds?.['atp-second-floor-storage']?.includes('fonatp.webp'));
assert.ok(ASSETS.areaBackgrounds?.['barracks-personal-storage']?.includes('fonygblokpost.webp'));
assert.ok(ASSETS.areaBackgrounds?.['locomotive-cabin']?.includes('fonlokomotiv.webp'),'locomotive cabin should use a local scene background');
assert.ok(!ASSETS.menu.startsWith('http'),'main-menu background must not rely on a remote image');
assert.ok(fs.existsSync(new URL(ASSETS.pda)),'PDA texture file must be included locally');
assert.ok(fs.existsSync(new URL(ASSETS.map)),'clean Cordon map must be included locally');
assert.ok(Object.values(ASSETS.locationBackgrounds).every(url=>fs.existsSync(new URL(url))),'all 18 location backgrounds must exist in the project');
assert.ok(Object.values(ASSETS.areaBackgrounds).every(url=>fs.existsSync(new URL(url))),'all interior and sub-area backgrounds must exist in the project');
assert.ok([...Object.values(ASSETS.npcPortraits).flatMap(value=>Array.isArray(value)?value:[value]),...Object.values(ASSETS.npcBodies).flatMap(value=>Array.isArray(value)?value:[value]),...Object.values(ASSETS.factionInsignias),...Object.values(ASSETS.rankInsignias),...Object.values(ASSETS.questIcons)].filter(Boolean).every(url=>fs.existsSync(new URL(url))),'all imported NPC, insignia, rank and quest images must exist locally');

assert.ok(LOCATIONS.every(location=>getExploreSpots(location.id).length>=3),'each location should expose at least three RP areas including the exterior');
const activeVisualSources=['src/data/catalog.js','src/ui/views.js','src/systems/world.js','src/systems/combat.js','styles.css'].map(file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8')).join('\n');
const costumeFitCss=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
assert.match(costumeFitCss,/\.armor-inventory-item \.inventory-item-image \.armor-art-image\{[^}]*object-fit:contain;[^}]*object-position:center center;[^}]*transform:none/s,'tall costume art should fit without vertical cropping or stretching');
assert.match(costumeFitCss,/\.armor-inventory-item \.inventory-item-image\{[^}]*padding:/s,'armor image frame should retain a small safe margin around the silhouette');
for (const image of ['kozankaicon.webp','zaraicon.webp','berilicon.webp','pz-5icon.webp','debyticon.webp','kosyhaicon.webp','kozanplashicon.webp']) assert.ok(fs.statSync(new URL(`../assets/images/armor/${image}`,import.meta.url)).size>1000,`trimmed costume image ${image} must be included`);
const imageUrls=[...activeVisualSources.matchAll(/https?:\/\/[^\s'\"`)>]+/g)].map(match=>match[0]).filter(url=>/\.\w{3,4}(?:[?#]|$)|\/images(?:[/?#]|$)|\/upload\//i.test(url));
assert.ok(imageUrls.every(url=>url===ASSETS.menu),'only the main-menu background may use an external image URL');
assert.ok(Object.values(IMAGE_FALLBACKS).every(value=>!value),'no remote image fallbacks are allowed');
assert.equal(NPCS.length,7,'five quest and key NPCs plus two additional traders');
assert.ok(NPCS.some(n=>n.id==='sidorovich'&&n.trader));
assert.ok(NPCS.some(n=>n.id==='shnurok'&&n.location==='atp'&&n.trader));
assert.ok(NPCS.some(n=>n.id==='kapterka'&&n.location==='south-checkpoint'&&n.trader));
assert.equal(AVATAR_OPTIONS.length,20,'all full faction portrait/body pairs and three paired key NPC looks should be present');
assert.ok(AVATAR_OPTIONS.every(option=>option.appearance),'avatar gallery must not include portrait-only entries that would render empty body placeholders');
assert.ok(AVATAR_OPTIONS.every(option=>option.src.includes('/assets/npc/Vneska/')),'avatar choices should use the imported local portraits');
assert.ok(NPC_APPEARANCES.loner.every(look=>look.icon&&look.appearance),'each loner portrait must pair with its matching body');
assert.equal(NPC_APPEARANCES.bandit.length,7,'all seven supplied bandit body looks must be represented');
assert.equal(NPC_APPEARANCES.bandit[3].icon,NPC_APPEARANCES.bandit[4].icon,'the supplied bandit 4-and-5 portrait is shared by both matching body looks');
assert.ok(NPC_APPEARANCES.military.every(look=>look.icon&&look.appearance),'each military portrait must pair with its matching body');
assert.ok(Object.values(ASSETS.factionInsignias).every(url=>url.includes('/assets/insignia/')),'each faction must have a local insignia');
assert.ok(Object.values(ASSETS.rankInsignias).every(url=>url.includes('/assets/insignia/')),'rank badges must use local insignia');
assert.ok(Object.values(ASSETS.questIcons).every(url=>url.includes('/assets/quests/')),'quest icons must use the imported task artwork');
assert.ok(ITEMS.length>=32);
assert.ok(ITEMS.every(item=>!item.image),'inventory items should use local symbolic placeholders instead of image URLs');
assert.ok(ITEMS.some(item=>item.id==='flesh-eye'&&item.cat==='Добыча'));
assert.ok(ITEMS.filter(item=>item.cat==='Броня'&&item.id!=='stalnoishlem').every(item=>item.w*item.h>=6),'wearable suits should occupy at least six inventory cells');
assert.ok(ITEMS.filter(item=>item.cat==='Броня'&&item.id!=='stalnoishlem').every(item=>item.h>=3),'costume art should have a taller inventory footprint');

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

// Starter armour and a basic faction-matched gas mask are available at character creation.
for (const faction of FACTIONS) {
  const loadout=STARTER_LOADOUT_BY_FACTION[faction.id];
  assert.ok(loadout?.armor?.length && loadout?.mask?.length===1,`${faction.id} should have beginner armour and exactly one suitable starter mask`);
  for (const id of [...loadout.armor,...loadout.mask]) assert.ok(STARTER_ITEM_IDS.includes(id),`${id} should be selectable at character creation`);
  const html=renderLoadout({pendingCharacter:{faction:faction.id},draft:{faction:faction.id},loadout:{selected:{}}});
  for (const id of [...loadout.armor,...loadout.mask]) assert.ok(html.includes(`data-id=\"${id}\"`),`${id} should appear in the ${faction.id} starter shop`);
  for (const other of FACTIONS.filter(entry=>entry.id!==faction.id)) {
    const otherGear=STARTER_LOADOUT_BY_FACTION[other.id];
    for (const id of [...otherGear.armor,...otherGear.mask]) assert.ok(!loadout.armor.includes(id)&&!loadout.mask.includes(id),`${id} must not be a ${faction.id} starter option`);
  }
}

// Each new game spawns ten randomized villagers, soldiers on the checkpoints and bandits at ATP.
const populationOne=createGame({name:'Население 1',faction:'loner'},[],START_BUDGET);
const populationTwo=createGame({name:'Население 2',faction:'loner'},[],START_BUDGET);
assert.equal(populationOne.ambientNpcs.filter(npc=>npc.location==='rookie-village').length,10,'the rookie village should spawn ten locals');
assert.ok(populationOne.ambientNpcs.filter(npc=>npc.location==='rookie-village').every(npc=>npc.personalTask&&npc.routines&&npc.greeting),'each village NPC should have a personal routine and task');
for (const checkpoint of ['north-checkpoint','bridge-checkpoint','south-checkpoint']) {
  const guards=populationOne.ambientNpcs.filter(npc=>npc.location===checkpoint);
  assert.equal(guards.length,4,`${checkpoint} should spawn a small military guard group`);
  assert.ok(guards.every(npc=>npc.faction==='military'));
}
const atpBandits=populationOne.ambientNpcs.filter(npc=>npc.location==='atp'&&npc.faction==='bandit');
assert.equal(atpBandits.length,6,'ATP should spawn six ambient bandits');
assert.ok(atpBandits.every(npc=>npc.faction==='bandit'));
assert.equal(populationOne.ambientNpcs.filter(npc=>npc.captured).length,2,'two randomly named captive stalkers should be hidden in the ATP first-floor room');
assert.equal(new Set(populationOne.ambientNpcs.map(npc=>npc.name)).size,populationOne.ambientNpcs.length,'spawned NPC names should be unique within one game');
assert.notDeepEqual(populationOne.ambientNpcs.map(npc=>npc.name),populationTwo.ambientNpcs.map(npc=>npc.name),'new game sessions should reroll ambient NPC identities');

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
const dialogueState={screen:'game',characters:[character],activeCharacterId:'smoke',pendingCharacter:null,settings:{reducedMotion:false},account:{},ui:{tab:'location',modal:null,music:{mode:'local',trackId:null,queue:[],index:0,playing:false}},game:dialogueGame};
assert.ok(!renderGame(dialogueState).includes('quest-accept'));
replyNpc(dialogueGame,'sidorovich','работа');
const sidorovichDialogue=renderGame(dialogueState);
assert.ok(sidorovichDialogue.includes('quest-accept'));

// Local player accepts only files explicitly selected by the player.

// Bandit NPCs use faction-specific Fenya and the correct supplied appearance pair.
const banditTalkGame=createGame({name:'Проверка фени',faction:'loner'},[],START_BUDGET);
banditTalkGame.locationId='atp';
assert.equal(talkToNpc(banditTalkGame,'kefir').ok,true);
const fenyaReply=replyNpcFreeText(banditTalkGame,'kefir','Что нового слышно?').message;
assert.ok(/маляв|район|шухер|фарт|хабар|фраер/.test(fenyaReply.toLowerCase()),'bandit dialogue should use fenya vocabulary');
const banditEncounterGame=createGame({name:'Проверка боя',faction:'loner'},[],START_BUDGET);
beginEncounter(banditEncounterGame,'bandit');
assert.ok(banditEncounterGame.activeEncounter.icon?.includes('/assets/npc/Vneska/banditicon'));
assert.ok(banditEncounterGame.activeEncounter.appearance?.includes('/assets/npc/Vneska/bandit'));
assert.ok(banditEncounterGame.activeEncounter.insignia?.includes('/assets/insignia/bandituicon.webp'));
assert.equal(processPlayerAction(banditEncounterGame,'послушать музыку').action,'player-open','music command should open the local PDA player');

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
const wolfDialogueState={screen:'game',characters:[character],activeCharacterId:'smoke',pendingCharacter:null,settings:{reducedMotion:false},account:{},ui:{tab:'location',pdaOpen:false,modal:null,music:{mode:'local',trackId:null,queue:[],index:0,playing:false}},game:wolfQuestGame};
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

// Every local stalker can be approached and offered a trade, including generated squad members.
const contactGame=createGame({name:'Контакт',faction:'loner'},[],START_BUDGET);
contactGame.locationId='rookie-village';
const localPeople=getAvailableStalkers(contactGame);
assert.ok(localPeople.some(person=>person.id==='wolf'),'key NPCs remain interactable');
const squadContact=localPeople.find(person=>person.squadId==='squad-loners');
assert.ok(squadContact,'members of the local squad should appear as individual contacts');
assert.equal(talkToNpc(contactGame,squadContact.id).ok,true,'a generated squad member should accept dialogue');
const squadTrader=getAvailableTraders(contactGame).find(person=>person.id===squadContact.id);
assert.ok(squadTrader && squadTrader.stock.length>0,'any stalker should have a small personal barter inventory');
const squadOffer=squadTrader.stock[0];
assert.equal(buyFromTrader(contactGame,squadContact.id,squadOffer.id).ok,true,'a player can buy from a regular stalker');
const contactScene=renderGame({game:contactGame,characters:[{id:'contact',name:'Контакт',faction:'loner'}],activeCharacterId:'contact',ui:{tab:'location',modal:null,pdaOpen:false,music:{}},settings:{}});
assert.ok(contactScene.includes(`data-action="trade-open" data-id="${squadContact.id}"`),'local squad member should expose a direct trade action in the scene');


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
for (const armorId of ['leather','kosyha','kozanka','debyt']) assert.ok(STARTER_ITEM_IDS.includes(armorId),`${armorId} should be selectable as starter armour`);
const starterArmourGame=createGame(character,[{id:'debyt',qty:1}],START_BUDGET-1800);
assert.equal(starterArmourGame.player.armorId,'debyt','starter armour should be equipped when a new game is created');
assert.equal(starterArmourGame.player.armor,12,'starter armour protection should be active immediately');
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

const uiState={screen:'game',characters:[character],activeCharacterId:'smoke',pendingCharacter:null,settings:{reducedMotion:false},account:{},draft:{name:'',birthDate:'',height:'',weight:'',personality:'',biography:'',notes:'',faction:'loner',avatar:''},loadout:{selected:{}},ui:{tab:'location',pdaOpen:false,modal:null,music:{mode:'local',trackId:null,queue:[],index:0,playing:false}},game};
assert.ok(renderMenu(uiState).includes('Играть'));
assert.ok(renderMenu(uiState).includes('fonderevnanovickov'),'menu should reference a local background');
const createHtml=renderCreate(uiState);
assert.ok(createHtml.includes('open-avatars') && createHtml.includes('ПРИНАДЛЕЖНОСТЬ К ГРУППИРОВКЕ'));
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
const locationHtml=renderGame(uiState);
assert.ok(!locationHtml.includes('Радио Деревни новичков') && !locationHtml.includes('data-action="radio-base-open"'),'there must be no in-location radio controls');
assert.ok(!/https?:\/\//i.test(locationHtml),'the location scene must not add external music URLs');
assert.ok(!locationHtml.includes('music-dock'),'the bottom music dock should remain removed');
assert.ok(locationHtml.includes('npc-mini-body') && locationHtml.includes('faction-insignia'),'nearby NPC roster should show paired local character art and faction emblems');
assert.ok(locationHtml.includes('Купонов') && !/\bRU\b/.test(locationHtml),'all balances should use the in-world Coupons currency label');
addItem(game.inventory,'bread',1);
addItem(game.inventory,'water',1);
const inventoryUi=renderModal({...uiState,ui:{...uiState.ui,modal:'inventory-panel'}});
assert.ok(inventoryUi.includes('🍞') && inventoryUi.includes('💧'),'inventory should use distinct item-specific icons rather than a repeated generic symbol');
assert.ok(costumeFitCss.includes('object-fit:contain'),'armor artwork should preserve its full silhouette');
assert.match(costumeFitCss,/\.scene-interactions\s*\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s,'desktop NPC list should use a compact two-column layout');
const remoteRadioState={...uiState,game:{...uiState.game,locationId:'elevator'}};
assert.ok(!renderGame(remoteRadioState).includes('Радио'),'no location should expose an internet radio station');
uiState.ui.pdaOpen=true;
uiState.ui.tab='player';
uiState.ui.localMusicTracks=[{id:'local-test-1',title:'Тестовая композиция',fileName:'test.ogg',size:1024}];
uiState.ui.music={mode:'local',trackId:'local-test-1',queue:['local-test-1'],index:0,playing:false};
const playerHtml=renderGame(uiState);
assert.ok(playerHtml.includes('Локальная библиотека'));
assert.ok(playerHtml.includes('local-music-files'));
assert.ok(playerHtml.includes('Добавить музыку с устройства'));
assert.ok(playerHtml.includes('player-play-track'));
assert.ok(playerHtml.includes('без сетевых музыкальных потоков'));
const musicRuntimeSource=['src/systems/music.js','src/main.js','src/ui/views.js'].map(file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8')).join('\n');
assert.ok(!/iframe|videoId|https?:\/\//i.test(musicRuntimeSource),'music runtime must not embed remote players or network streams');
uiState.ui.tab='trade';
uiState.ui.tradeNpcId='sidorovich';
uiState.game.locationId='sidorovich-bunker';
uiState.ui.modal='trade-panel';
const tradeHtml=renderModal(uiState);
assert.ok(tradeHtml.includes('Что предлагает') && tradeHtml.includes('Что предлагаешь ты'));
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
assert.ok(avatarModal.includes('Волк') && !avatarModal.includes('Сидорович'),'loner avatar picker should offer only complete matching portrait/body sets');
assert.ok(avatarModal.includes('avatar-option-body'),'avatar picker must show the matching full-body appearance alongside each portrait');
assert.ok(!avatarModal.includes('Кефир') && !avatarModal.includes('Дмитрий Дзержинский'),'loner avatar picker must not mix in bandit or military appearances');
const banditAvatarModal=renderModal({...uiState,draft:{...uiState.draft,faction:'bandit'},ui:{...uiState.ui,modal:'avatars'}});
assert.ok(banditAvatarModal.includes('avatar-option-body') && banditAvatarModal.includes('Кефир'));
assert.equal((banditAvatarModal.match(/class="avatar-option-body"/g)||[]).length,8,'bandit avatar picker should show all seven matched bandit body appearances');
const militaryAvatarModal=renderModal({...uiState,draft:{...uiState.draft,faction:'military'},ui:{...uiState.ui,modal:'avatars'}});
assert.ok(militaryAvatarModal.includes('Дмитрий Дзержинский') && !militaryAvatarModal.includes('Кефир'),'military avatar picker should only show military faction appearances');
uiState.ui.tab='stats';
const statsHtml=renderGame(uiState);
assert.ok(statsHtml.includes('profile-edit-form') && statsHtml.includes('Выбрать значок'),'PDA statistics must provide editable character dossier');
assert.ok(statsHtml.includes('profile-heading-art') && statsHtml.includes('faction-insignia') && statsHtml.includes('rank-insignia'),'character dossier should show both faction and rank insignia');
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
const questVisibilityState={screen:'game',characters:[character],activeCharacterId:'smoke',settings:{reducedMotion:false},ui:{tab:'quests',pdaOpen:true,mapView:'map',modal:null,music:{mode:'local',trackId:null,queue:[],index:0,playing:false}},game:questVisibilityGame};
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
const personalReply=replyNpcFreeText(conversationGame,'wolf','Расскажи, скучаешь по дому?');
assert.ok(personalReply.ok && personalReply.message.length>20,'the expanded dialogue engine should answer personal small-talk');
assert.equal(conversationGame.dialogueContext.lastIntent,'personal');

// The four requested natural-language questions are recognized as dedicated conversation intents.
for (const [phrase,intent] of [
  ['Что нового слышно?','news'],
  ['Что в Зоне происходит?','zone_situation'],
  ['Кто такой Сидорович?','sidorovich_info'],
  ['Расскажи про Кордон.','cordon_info']
]) {
  const reply=replyNpcFreeText(conversationGame,'wolf',phrase);
  assert.ok(reply.ok && reply.message.length>35,`NPC should give a substantive answer to: ${phrase}`);
  assert.equal(conversationGame.dialogueContext.lastIntent,intent,`the dialogue engine should classify: ${phrase}`);
}

// Trading opens from ordinary RP phrases and works with ordinary generated NPCs too.
const freeTradeGame=createGame({name:'Свободная торговля',faction:'loner'},[],START_BUDGET);
freeTradeGame.locationId='rookie-village';
const ambientTrader=freeTradeGame.ambientNpcs.find(npc=>npc.location==='rookie-village');
talkToNpc(freeTradeGame,ambientTrader.id);
const tradePhrase=replyNpcFreeText(freeTradeGame,ambientTrader.id,'Давай торговать.');
assert.equal(tradePhrase.action,'trade','the dialogue phrase «торговать» should request the trade panel');
assert.ok(getAvailableTraders(freeTradeGame).find(person=>person.id===ambientTrader.id)?.stock.length,'a regular spawned villager should have a personal barter inventory');
const generalTradeAction=processPlayerAction(freeTradeGame,`торговать с ${ambientTrader.name}`);
assert.equal(generalTradeAction.action,'trade','the general action field should open trading when the player names a nearby NPC');
assert.equal(generalTradeAction.npcId,ambientTrader.id);




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
const corpsePanelState={screen:'game',characters:[character],activeCharacterId:'smoke',settings:{reducedMotion:false},ui:{tab:'location',modal:'loot-panel',music:{mode:'local',trackId:null,queue:[],index:0,playing:false}},game:crateGame};
assert.ok(renderModal(corpsePanelState).includes('Вещи погибшего'),'corpse loot should be clearly labelled in the left pane');
const storageSpot=getExploreSpots('rookie-village').find(entry=>entry.kind==='storage');
assert.ok(storageSpot,'the Cordon village basement should expose a personal storage spot');
assert.equal(openStorage(lootUiGame,storageSpot.storageId,storageSpot.name).ok,true);
assert.ok(getActiveLootItems(lootUiGame).length>=1,'personal storage should contain persistent starter items');
const atpStorage=getExploreSpots('atp').find(entry=>entry.storageId==='atp-second-floor');
const barracksStorage=getExploreSpots('south-checkpoint').find(entry=>entry.storageId==='barracks-locker');
assert.ok(atpStorage && barracksStorage,'ATP second floor and barracks must expose personal storage');
assert.ok(lootUiGame.squads.length>=8,'the Cordon should have more than the original three squads');
const lootPanelState={screen:'game',characters:[character],activeCharacterId:'smoke',settings:{reducedMotion:false},ui:{tab:'location',pdaOpen:false,modal:'loot-panel',mapView:'map',music:{mode:'local',trackId:null,queue:[],index:0,playing:false}},game:lootUiGame};
const lootMarkup=renderModal(lootPanelState);
assert.ok(lootMarkup.includes('Найденные вещи') || lootMarkup.includes('Хранилище'));
assert.ok(lootMarkup.includes('Рюкзак игрока') && lootMarkup.includes('Забрать всё') && lootMarkup.includes('Сложить всё'));
const inventoryMarkup=renderModal({...lootPanelState,ui:{...lootPanelState.ui,modal:'inventory-panel'}});
assert.ok(inventoryMarkup.includes('ОСНОВНОЙ 1') && inventoryMarkup.includes('Быстрый доступ'),'inventory should display two main weapon slots and quick access');
for (const slot of ['primary1','primary2','pistol','knife','armor','mask']) assert.ok(inventoryMarkup.includes(`data-slot=\"${slot}\"`),`inventory should expose a dedicated ${slot} equipment slot`);
const equipmentGame=createGame({name:'Экипировка',faction:'loner'},[],START_BUDGET);
for (const id of ['debyt','pa8','pm','knife']) addItem(equipmentGame.inventory,id,1);
const equipmentState={...lootPanelState,game:equipmentGame,ui:{...lootPanelState.ui,modal:'inventory-panel'}};
const equipmentMarkup=renderModal(equipmentState);
assert.ok(equipmentMarkup.includes('В слот брони') && equipmentMarkup.includes('В слот противогаза') && equipmentMarkup.includes('В слот оружия'),'inventory item cards should offer direct assignment to each equipment category');
assert.ok(ITEMS.some(item=>item.id==='berill'&&item.armor>0),'armor catalog should include the Berill suit');
assert.ok(ITEMS.some(item=>item.id==='pg4'&&item.cat==='Защита'),'gas mask catalog should include PG-4');


// Faction relations, restricted NPC roaming, and the ATP entrance fee use Coupons.
assert.equal(getFactionRelation('military','loner'),'hostile');
assert.equal(getFactionRelation('military','bandit'),'hostile');
assert.equal(getFactionRelation('bandit','loner'),'neutral');
const zoneTravelGame=createGame({name:'Купоны',faction:'loner'},[],START_BUDGET);
zoneTravelGame.locationId='ravine-tunnel'; zoneTravelGame.money=1000;
const savedRandom=Math.random; Math.random=()=>.99;
const atpEntry=travelTo(zoneTravelGame,'atp');
Math.random=savedRandom;
assert.equal(atpEntry.ok,true);
assert.equal(zoneTravelGame.money,500,'a loner pays 500 Coupons to enter ATP');
assert.ok(zoneTravelGame.log.some(entry=>entry.text.includes('500 Купонов')),'the ATP entry fee should be recorded in the game log');
assert.ok(populationOne.ambientNpcs.filter(npc=>npc.faction==='loner'&&!npc.captured).every(npc=>!['atp','north-checkpoint','bridge-checkpoint','south-checkpoint'].includes(npc.location)),'loners must not spawn inside bandit or military territory');

// Pudel asks for the exact diet sausage, and his quest pays Coupons.
const pudelGame=createGame({name:'Проверка',faction:'loner'},[],START_BUDGET);
pudelGame.locationId='farmstead';
assert.equal(talkToNpc(pudelGame,'kostya-pudel').ok,true);
assert.ok(NPCS.find(npc=>npc.id==='kostya-pudel').lines.work.includes('диетическая'));
assert.ok(replyNpcFreeText(pudelGame,'kostya-pudel','Есть работа?').message.includes('вкуснотища'),'Pudel should deliver the requested sausage dialogue when asked for work');
assert.equal(acceptWorldQuest(pudelGame,'pudel-sausage').ok,true);
addItem(pudelGame.inventory,'sausage',1);
assert.equal(turnInPudelQuest(pudelGame).ok,true);
assert.equal(pudelGame.quests.find(quest=>quest.id==='pudel-sausage').status,'completed');

// The secret anomaly may be named by the player; Sidorovich's briefing is submitted only after returning.
const anomalyQuestGame=createGame({name:'Исследователь',faction:'loner'},[],START_BUDGET);
anomalyQuestGame.locationId='sidorovich-bunker';
talkToNpc(anomalyQuestGame,'sidorovich');
assert.ok(replyNpcFreeText(anomalyQuestGame,'sidorovich','Есть работа?').message.includes('уникальная'),'Sidorovich should present the New Anomaly briefing');
assert.equal(acceptWorldQuest(anomalyQuestGame,'signal-dump').ok,true);
anomalyQuestGame.locationId='anomaly-dump'; anomalyQuestGame.secretAnomaly.observed=true;
assert.equal(nameSecretAnomaly(anomalyQuestGame,'Сверчок').ok,true);
assert.equal(anomalyQuestGame.quests.find(quest=>quest.id==='signal-dump').status,'ready');
anomalyQuestGame.locationId='sidorovich-bunker';
assert.equal(turnInSecretAnomalyQuest(anomalyQuestGame).ok,true);
assert.equal(anomalyQuestGame.quests.find(quest=>quest.id==='signal-dump').status,'completed');

// The ATP captive pair is individually talkable after entering their first-floor room.
const captiveGame=createGame({name:'Освободитель',faction:'loner'},[],START_BUDGET);
captiveGame.locationId='atp';
captiveGame.currentAreaId='atp-first-floor-prisoners';
const captives=getAvailableStalkers(captiveGame).filter(person=>person.captured);
assert.equal(captives.length,2);
assert.equal(talkToNpc(captiveGame,captives[0].id).ok,true);
const captiveReply=replyNpcFreeText(captiveGame,captives[0].id,'Расскажи, как вас захватили?');
assert.ok(captiveReply.ok && captiveReply.message.includes('Бандиты'));

// The ATP rescue consists of six stages, frees the prisoners and unlocks Sidorovich's reward.
const rescueGame=createGame({name:'Спасатель',faction:'loner'},[],START_BUDGET);
rescueGame.locationId='atp'; addItem(rescueGame.inventory,'knife',1);
assert.equal(beginAtpRescue(rescueGame).ok,true);
for(let stage=0;stage<6;stage++) {
  assert.ok(rescueGame.activeEncounter?.atpAssault,`ATP rescue stage ${stage+1} should spawn a bandit`);
  rescueGame.activeEncounter.hp=1; rescueGame.combatCooldownUntil=0;
  playerAttack(rescueGame);
}
assert.equal(rescueGame.atpRescue.cleared,true);
assert.equal(rescueGame.ambientNpcs.filter(person=>person.captured).length,0);
assert.equal(getAvailableStalkers(rescueGame,'atp').some(person=>person.faction==='bandit'),false,'cleared ATP should no longer host its bandit NPCs');
rescueGame.locationId='sidorovich-bunker';
assert.equal(claimAtpRescueReward(rescueGame).ok,true);
assert.equal(countItem(rescueGame.inventory,'aksu'),1);
assert.equal(countItem(rescueGame.inventory,'debyt'),1);

// The Bear detector can find the Stone Flower at the Secret Camp; the Trampoline toss is capped at 15 m.
const detectorGame=createGame({name:'Детектор',faction:'loner'},[],START_BUDGET);
detectorGame.locationId='anomaly-dump'; addItem(detectorGame.inventory,'medved',1);
const savedRandomForArtifact=Math.random; Math.random=()=>0;
assert.equal(startArtifactHunt(detectorGame).ok,true);
assert.equal(chooseArtifactSector(detectorGame,0).found,true);
Math.random=savedRandomForArtifact;
assert.equal(countItem(detectorGame.inventory,'stone-flower'),1);
const trampolineGame=createGame({name:'Трамплин',faction:'loner'},[],START_BUDGET);
trampolineGame.locationId='farmstead';
const savedRandomForTrampoline=Math.random; Math.random=()=>.999;
const trampolineResult=useTrampoline(trampolineGame);
Math.random=savedRandomForTrampoline;
assert.equal(trampolineResult.ok,true);
const trampolineHeight=Number(trampolineResult.message.match(/на ([\d.]+) м/)?.[1]);
assert.ok(trampolineHeight>=0&&trampolineHeight<=15,'Trampoline height must stay within 0–15 metres');

// Fresh conversation intents cover routes, attractions, notable people, loot, mutants, anomalies and emissions.
const routeGame=createGame({name:'Маршрут',faction:'loner'},[],START_BUDGET);
routeGame.locationId='rookie-village'; talkToNpc(routeGame,'wolf');
const routeReply=replyNpcFreeText(routeGame,'wolf','Как пройти в Тайный лагерь?');
assert.ok(routeReply.message.includes('Деревня новичков → Лагерь в лесу → Тайный лагерь'));
for (const phrase of ['Что тут за достопримечательности?','Какие известные люди есть?','Что ты знаешь про мутантов?','Что ты знаешь об аномалиях?','Что ты знаешь о выбросах?','Где можно найти ценный хабар?']) {
  const reply=replyNpcFreeText(routeGame,'wolf',phrase);
  assert.ok(reply.ok && reply.message.length>30,`NPC should answer the question: ${phrase}`);
}
assert.ok(processPlayerAction(routeGame,'побухать').message.includes('горячим чаем'),'the RP prompt should offer a safe campfire alternative instead of alcohol use');
const vodkaResult=useItem(routeGame,'vodka');
assert.equal(vodkaResult.ok,false,'alcohol is not a usable player item');



// Faction squads may travel through neutral territory but never enter a hostile-controlled area.
const roamingGame=createGame({name:'Патруль',faction:'loner'},[],START_BUDGET);
roamingGame.squads=[{id:'test-loner-patrol',name:'Проверочный патруль',faction:'loner',location:'ravine-tunnel',members:2,destination:null}];
roamingGame.randomTraders=[]; roamingGame.clock.worldMinutes=90; roamingGame.lastSquadMove=0;
const savedRandomForRoaming=Math.random; Math.random=()=>0;
simulateWorld(roamingGame);
Math.random=savedRandomForRoaming;
assert.ok(!['atp','bridge-checkpoint','south-checkpoint','north-checkpoint'].includes(roamingGame.squads[0].location),'loner squads must not roam into bandit or military territory');
assert.ok(populationOne.ambientNpcs.every(npc=>!/[«»\"“”]/.test(npc.name)),'spawned NPC nicknames should not be wrapped in quotation marks');

// The PDA gradually exposes encyclopedia/help sections and adjustable sound settings.
const encyclopediaView=renderGame({...dialogueState,ui:{...dialogueState.ui,pdaOpen:true,tab:'encyclopedia'}});
assert.ok(encyclopediaView.includes('Энциклопедия Зоны'));
const helpView=renderGame({...dialogueState,ui:{...dialogueState.ui,pdaOpen:true,tab:'help'}});
assert.ok(helpView.includes('Помощь сталкеру') && helpView.includes('Карусель') && helpView.includes('Воронка'));
const soundSettingsView=renderGameSettings({settings:{soundEnabled:true,soundVolume:.4,uiScale:1,reducedMotion:false}});
assert.ok(soundSettingsView.includes('data-setting="soundEnabled"') && soundSettingsView.includes('data-setting="soundVolume"'));

// Both gravity anomalies allow escape attempts and become temporarily inactive after a discharge.
const vortexGame=createGame({name:'Проверка воронки',faction:'loner'},[],START_BUDGET);
vortexGame.locationId='anomaly-dump';
assert.equal(useVortex(vortexGame).ok,true);
const savedRandomForVortex=Math.random; Math.random=()=>.99;
assert.equal(escapeVortex(vortexGame).ok,true);
const vortexFailure=escapeVortex(vortexGame);
Math.random=savedRandomForVortex;
assert.ok(vortexFailure.message.includes('разряд') && vortexGame.anomalyCooldowns.vortexUntil>vortexGame.clock.worldMinutes);
assert.ok(useVortex(vortexGame).message.includes('временно затихла'));
const carouselGame=createGame({name:'Проверка карусели',faction:'loner'},[],START_BUDGET);
carouselGame.locationId='anomaly-dump';
assert.equal(useCarousel(carouselGame).ok,true);
const savedRandomForCarousel=Math.random; Math.random=()=>.99;
assert.equal(escapeCarousel(carouselGame).ok,true);
const carouselFailure=escapeCarousel(carouselGame);
Math.random=savedRandomForCarousel;
assert.ok(carouselFailure.message.includes('выбрасывает') && carouselGame.anomalyCooldowns.carouselUntil>carouselGame.clock.worldMinutes);

console.log('Smoke tests passed: PDA/map modes, imported NPC/faction/quest artwork, local audio player, bandit dialogue, proportional costume inventory layout, quest visibility/progress, trade overlays, RP exploration, profile and combat.');
