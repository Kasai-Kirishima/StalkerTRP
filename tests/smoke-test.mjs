import assert from 'node:assert/strict';
import { ASSETS, IMAGE_FALLBACKS, FACTIONS, ITEMS, LOCATIONS, EXPLORE_SPOTS, NPCS, AVATAR_OPTIONS, NPC_APPEARANCES, START_BUDGET, MAX_CARRY_KG, STARTER_ITEM_IDS, STARTER_LOADOUT_BY_FACTION, ITEM_ACQUISITION } from '../src/data/catalog.js';
import { createGame, travelTo, talkToNpc, getAvailableStalkers, scoutLocation, searchLocation, startArtifactHunt, chooseArtifactSector, deactivateAnomaly, getAvailableTraders, buyFromTrader, sellToTrader, acceptSidorovichJob, turnInSidorovichJob, acceptWolfDogQuest, turnInWolfDogQuest, acceptWorldQuest, startAreaSearch, claimAreaFind, sitAtCampfire, replyNpc, replyNpcFreeText, getTravelMinutes, getExploreSpots, advanceGame, takeShelter, leaveShelter, openStorage, getActiveLootItems, breakContainer, registerCorpseLoot, getFactionRelation, nameSecretAnomaly, turnInSecretAnomalyQuest, turnInPudelQuest, claimAtpRescueReward, beginAtpRescue, useTrampoline, simulateWorld, useVortex, escapeVortex, useCarousel, escapeCarousel, generateStalkerName, acceptPersonalQuest, turnInPersonalQuest, grantReputation, getTradeBuyPrice } from '../src/systems/world.js';
import { addItem, getWeight, canFitLoadout, countItem, useItem, transferItem } from '../src/systems/inventory.js';
import { beginEncounter, beginWolfDogPack, playerAttack, getBestWeapon } from '../src/systems/combat.js';
import { getItemCondition, damageItemCondition, getRepairCost, repairItemCondition, toggleArtifactBelt, removeArtifactFromBelt } from '../src/systems/equipment-condition.js';
import { getMainStoryQuest, mainStoryAction, resolveMainStoryEncounter } from '../src/systems/main-story.js';
import { processPlayerAction } from '../src/systems/action-engine.js';
import { generateDialogueReply, findRoute, matchLocationTarget, isRouteQuestion } from '../src/systems/dialogue-engine.js';
import { rememberEntity, stemRussianWord, containsReferencePronoun, genderedSubject } from '../src/systems/russian-language.js';
import { buildNpcAiPayload, requestNpcAiReply, isValidNpcAiEndpoint } from '../src/systems/npc-ai.js';
import { renderMenu, renderCreate, renderLoadout, renderGame, renderModal, renderGameSettings } from '../src/ui/views.js';
import { getRadioStationForLocation, RADIO_STATIONS } from '../src/data/radio-stations.js';
import { BUNDLED_MUSIC_TRACKS } from '../src/data/bundled-music.js';
import { createMusicEngine } from '../src/systems/music.js';
import { extractAudioFilesFromZip } from '../src/systems/music-archive.js';
const fs = await import('node:fs');
const pathModule = await import('node:path');
const { fileURLToPath } = await import('node:url');
const projectRootPath = fileURLToPath(new URL('../', import.meta.url));

assert.equal(FACTIONS.length,3);
// Imported item, weapon, mutant and PDA images must exist locally and survive offline.
const requiredArtwork=[ASSETS.pdaTexture,...Object.values(ASSETS.itemImages||{}),...Object.values(ASSETS.weaponImages||{}),...Object.values(ASSETS.mutants||{}).flat()];
for(const artwork of requiredArtwork) assert.ok(fs.existsSync(new URL(artwork)),`local artwork should exist: ${artwork}`);
assert.ok(ASSETS.mutants.blindDog.every(src=>decodeURIComponent(new URL(src).pathname).includes('/slepoipes')),'blind-dog assets should use the exact imported filenames');
assert.ok(!ITEMS.some(item=>/янтарь/i.test(item.name)),'processed cheese «Янтарь» must not exist as an item');
assert.ok(!NPCS.some(npc=>(npc.stockIds||[]).some(id=>/янтарь/i.test(id))),'processed cheese must not appear in trader stock');

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
for(const item of ITEMS){const artwork=item.image||ASSETS.itemImages?.[item.id]||ASSETS.armor?.[item.id];assert.ok(artwork,`inventory item ${item.id} must have artwork, not an emoji`);if(!artwork.startsWith('data:')&&!artwork.startsWith('http'))assert.ok(fs.existsSync(new URL(artwork)),`inventory artwork must exist locally for offline use: ${item.id}`);}

// Every map exit must point to a real location, have a return transition,
// and belong to one connected Cordon travel graph.
const locationIds=new Set(LOCATIONS.map(location=>location.id));
for (const location of LOCATIONS) {
  for (const neighbourId of location.neighbors||[]) {
    assert.ok(locationIds.has(neighbourId),`transition ${location.id} -> ${neighbourId} must target an existing location`);
    assert.ok(LOCATIONS.find(candidate=>candidate.id===neighbourId).neighbors.includes(location.id),`transition ${location.id} -> ${neighbourId} must have a return path`);
  }
}
for (const origin of LOCATIONS) {
  for (const destination of LOCATIONS) {
    const route=findRoute(origin.id,destination.id,'loner');
    assert.ok(route.length>=1,`there must be a route from ${origin.name} to ${destination.name}`);
    assert.equal(route[0],origin.id);
    assert.equal(route.at(-1),destination.id);
    for (let index=1; index<route.length; index++) assert.ok(LOCATIONS.find(location=>location.id===route[index-1]).neighbors.includes(route[index]),`route ${origin.id} -> ${destination.id} must use marked adjacent transitions`);
  }
}
// Exercise every marked one-step exit through the real movement function.
const savedRouteRandom=Math.random;
try {
  Math.random=()=>.99;
  for (const origin of LOCATIONS) for (const destinationId of origin.neighbors) {
    const routeGame=createGame({name:'Проверка маршрутов',faction:'loner'},[],START_BUDGET);
    routeGame.locationId=origin.id;
    routeGame.money=5000;
    routeGame.activeEncounter=null;
    const result=travelTo(routeGame,destinationId);
    assert.equal(result.ok,true,`marked transition ${origin.name} -> ${LOCATIONS.find(location=>location.id===destinationId).name} must be traversable`);
    assert.equal(routeGame.locationId,destinationId,`player should arrive at ${destinationId}`);
  }
} finally { Math.random=savedRouteRandom; }

// Bandits are blocked at both public entrances to Rookie Village.
for (const [originId,destinationId] of [['stop','rookie-village'],['rookie-village','sidorovich-bunker']]) {
  const banditGame=createGame({name:'Проверка запрета',faction:'bandit'},[],START_BUDGET);
  banditGame.locationId=originId;
  const blocked=travelTo(banditGame,destinationId);
  assert.equal(blocked.ok,false,`bandits must not enter ${destinationId}`);
  assert.notEqual(banditGame.locationId,destinationId);
}
const banditVillageNeighbors=LOCATIONS.find(location=>location.id==='rookie-village').neighbors.filter(id=>id!=='sidorovich-bunker');
for(const originId of banditVillageNeighbors){const banditGame=createGame({name:'Проверка периметра',faction:'bandit'},[],START_BUDGET);banditGame.locationId=originId;assert.equal(travelTo(banditGame,'rookie-village').ok,false,`bandits must be denied from ${originId} into Rookie Village`);}
const banditVillageGame=createGame({name:'Проверка NPC',faction:'bandit'},[],START_BUDGET);
assert.ok(!banditVillageGame.randomTraders.some(person=>person.faction==='bandit'&&person.location==='rookie-village'),'random bandit traders must not spawn in Rookie Village');
assert.ok(!getAvailableStalkers(banditVillageGame,'rookie-village').some(person=>person.faction==='bandit'),'bandit NPCs must never be offered inside Rookie Village');

// Every faction must be able to traverse every all-pairs route, not merely have a graph path.
for (const faction of FACTIONS) {
  for (const origin of LOCATIONS) for (const destination of LOCATIONS) {
    const route=findRoute(origin.id,destination.id,faction.id);
    if (faction.id==='bandit' && origin.id!==destination.id && ['rookie-village','sidorovich-bunker'].includes(destination.id) && !(origin.id==='sidorovich-bunker' && destination.id==='rookie-village')) {
      assert.equal(route.length,0,'bandits must not receive a route into the Rookie Village or Sidorovich bunker');
      continue;
    }
    assert.ok(route.length>=1,`${faction.id} route ${origin.id} -> ${destination.id} must exist`);
    const game=createGame({name:'Проверка полного пути',faction:faction.id},[],START_BUDGET);
    game.locationId=origin.id; game.money=30000; game.activeEncounter=null;
    const oldRandom=Math.random; Math.random=()=>.99;
    try {
      for (let step=1;step<route.length;step++) {
        game.activeEncounter=null;
        const result=travelTo(game,route[step]);
        assert.equal(result.ok,true,`${faction.id} cannot traverse ${route[step-1]} -> ${route[step]}`);
        assert.equal(game.locationId,route[step]);
        game.activeEncounter=null; // clear an expected hostile-post interception before the next leg
      }
    } finally { Math.random=oldRandom; }
  }
}

// NPCs should provide concrete, step-by-step directions for every destination.
const routeGuide={id:'route-guide',name:'Проводник',faction:'loner'};
for (const origin of LOCATIONS) for (const destination of LOCATIONS) {
  if (origin.id===destination.id) continue;
  const route=findRoute(origin.id,destination.id,'loner');
  const routeReply=generateDialogueReply(routeGuide,{locationId:origin.id,player:{faction:'loner'},dialogueContexts:{}},`Как пройти к ${destination.name}?`).answer;
  for (const routeId of route) assert.ok(routeReply.includes(LOCATIONS.find(location=>location.id===routeId).name),`route advice from ${origin.id} to ${destination.id} should mention every waypoint`);
  assert.ok(routeReply.includes('минут пешком'),'route advice should include an estimated walking time');
}

assert.equal(isRouteQuestion('Где я сейчас нахожусь?'),true,'current-location questions should use real map data');
assert.equal(isRouteQuestion('Куда мне идти?'),true,'open-ended route questions should list actual exits');
assert.equal(isRouteQuestion('Как лучше добраться до АТП?'),true,'route questions with filler words should be recognized');
assert.equal(isRouteQuestion('Где я?'),true,'short current-position questions should be recognized');
assert.equal(isRouteQuestion('Есть ли здесь выход?'),true,'exit questions should be answered using actual map exits');
assert.equal(isRouteQuestion('Мне нужно попасть на АТП'),true,'need-to-reach phrasing should be recognized');
assert.equal(isRouteQuestion('Покажи маршрут до Тайного лагеря'),true,'requests to show a route should be recognized');
assert.equal(isRouteQuestion('Где купить патроны?'),false,'non-route questions beginning with где should remain eligible for conversational AI');
assert.equal(isRouteQuestion('Как попасть на КПП?'),true,'generic checkpoint route questions should be recognized for clarification');
assert.equal(isRouteQuestion('Как пройти к тоннелю?'),true,'generic tunnel route questions should be recognized for clarification');
assert.equal(isRouteQuestion('Как добраться до лагеря?'),true,'generic camp route questions should be recognized for clarification');
const checkpointClarification=generateDialogueReply(routeGuide,{locationId:'rookie-village',player:{faction:'loner'},dialogueContexts:{}},'Как попасть на КПП?').answer;
assert.ok(checkpointClarification.includes('Северный блокпост') && checkpointClarification.includes('Блокпост под мостом') && checkpointClarification.includes('Южный блокпост'),'ambiguous checkpoint requests should ask which real checkpoint the player means');
const tunnelClarification=generateDialogueReply(routeGuide,{locationId:'rookie-village',player:{faction:'loner'},dialogueContexts:{}},'Как пройти к тоннелю?').answer;
assert.ok(tunnelClarification.includes('Восточный туннель ЖД') && tunnelClarification.includes('Тоннель под ЖД насыпью') && tunnelClarification.includes('Тоннель в лощину'),'ambiguous tunnel requests should list mapped tunnel choices');
const campClarification=generateDialogueReply(routeGuide,{locationId:'rookie-village',player:{faction:'loner'},dialogueContexts:{}},'Как добраться до лагеря?').answer;
assert.ok(campClarification.includes('Лагерь в лесу') && campClarification.includes('Тайный лагерь'),'ambiguous camp requests should list mapped camp choices');
assert.equal(matchLocationTarget('Как попасть к Сидоровичу?')?.id,'sidorovich-bunker','NPC route finder should understand Sidorovich references');
assert.equal(matchLocationTarget('Как пройти к Косте Пуделю?')?.id,'farmstead','NPC route finder should understand the Poodle camp nickname');
assert.equal(matchLocationTarget('Как пройти к южному блокпосту?')?.id,'south-checkpoint','NPC route finder should match declined place names');
assert.equal(matchLocationTarget('Как добраться из деревни новичков до АТП?')?.id,'atp','the final named place should be treated as the destination');
const atpRouteAdvice=generateDialogueReply(routeGuide,{locationId:'rookie-village',player:{faction:'loner'},dialogueContexts:{}},'Как попасть на АТП?').answer;
assert.ok(atpRouteAdvice.includes('500 Купонов'),'route advice should warn loners about the ATP entrance fee');
const militaryRouteAdvice=generateDialogueReply(routeGuide,{locationId:'rookie-village',player:{faction:'loner'},dialogueContexts:{}},'Как пройти к южному блокпосту?').answer;
assert.ok(militaryRouteAdvice.includes('могут вступить в конфликт'),'route advice should warn about hostile military territory');
for (const faction of FACTIONS) for (const origin of LOCATIONS) for (const destination of LOCATIONS) {
  if (origin.id===destination.id) continue;
  const path=findRoute(origin.id,destination.id,faction.id);
  const answer=generateDialogueReply({id:`guide-${faction.id}`,name:'Проводник',faction:faction.id},{locationId:origin.id,player:{faction:faction.id},dialogueContexts:{}},`Как лучше добраться до ${destination.name}?`).answer;
  if (faction.id==='bandit' && ['rookie-village','sidorovich-bunker'].includes(destination.id) && !(origin.id==='sidorovich-bunker' && destination.id==='rookie-village')) {
    assert.ok(/закрыт|недоступна|нет связного маршрута/i.test(answer),'bandit NPC must refuse directions into the Rookie Village');
    continue;
  }
  for (const waypoint of path) assert.ok(answer.includes(LOCATIONS.find(location=>location.id===waypoint).name),`${faction.id} NPC route advice should include the waypoint ${waypoint}`);
  if (path.length>1) assert.ok(answer.includes('Шаг 1:'),'route instructions should be broken into actionable steps');
}

// Every faction receives a valid route, and each route can be walked edge by edge.
for (const faction of FACTIONS) {
  for (const origin of LOCATIONS) for (const destination of LOCATIONS) {
    const route=findRoute(origin.id,destination.id,faction.id);
    if (faction.id==='bandit' && origin.id!==destination.id && ['rookie-village','sidorovich-bunker'].includes(destination.id) && !(origin.id==='sidorovich-bunker' && destination.id==='rookie-village')) {
      assert.equal(route.length,0,'bandits must not receive routes into the Rookie Village or Sidorovich bunker');
      continue;
    }
    assert.ok(route.length>=1,`${faction.id} should have a route ${origin.id} -> ${destination.id}`);
    const routeGame=createGame({name:'Полная проверка пути',faction:faction.id},[],START_BUDGET);
    routeGame.locationId=origin.id; routeGame.money=30000; routeGame.activeEncounter=null;
    const savedRandom=Math.random; Math.random=()=>.99;
    try {
      for (let index=1;index<route.length;index++) {
        routeGame.activeEncounter=null;
        const move=travelTo(routeGame,route[index]);
        assert.equal(move.ok,true,`${faction.id} route edge ${route[index-1]} -> ${route[index]} should work`);
        assert.equal(routeGame.locationId,route[index]);
        routeGame.activeEncounter=null;
      }
    } finally { Math.random=savedRandom; }
  }
}
// NPCs understand several natural route-question forms, not just one exact phrase.
for (const destination of LOCATIONS) {
  for (const phrase of [`Как добраться до ${destination.name}?`,`Где находится ${destination.name}?`,`Как пройти к ${destination.name}?`,`Как лучше добраться до ${destination.name}?`,`Подскажи дорогу до ${destination.name}`,`Мне нужно попасть в ${destination.name}`]) {
    assert.equal(matchLocationTarget(phrase)?.id,destination.id,`route parser should resolve: ${phrase}`);
  }
}
const localRouteAdvice=generateDialogueReply(routeGuide,{locationId:'rookie-village',player:{faction:'loner'},dialogueContexts:{}},'Куда мне идти?').answer;
assert.ok(localRouteAdvice.includes('Отсюда отмечены переходы') && localRouteAdvice.includes('Остановка'),'when no destination is named, NPCs should list real adjacent exits');
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
assert.ok(!/\@import\s+url\(['\"]?https?:/i.test(costumeFitCss),'the visual style must not depend on remote fonts or a network connection');
assert.match(costumeFitCss,/\.armor-inventory-item \.inventory-item-image \.armor-art-image\{[^}]*object-fit:contain;[^}]*object-position:center center;[^}]*transform:none/s,'tall costume art should fit without vertical cropping or stretching');
assert.match(costumeFitCss,/\.armor-inventory-item \.inventory-item-image\{[^}]*padding:/s,'armor image frame should retain a small safe margin around the silhouette');
for (const image of ['kozankaicon.webp','zaraicon.webp','berilicon.webp','pz-5icon.webp','debyticon.webp','kosyhaicon.webp','kozanplashicon.webp']) assert.ok(fs.statSync(new URL(`../assets/images/armor/${image}`,import.meta.url)).size>1000,`trimmed costume image ${image} must be included`);
const imageUrls=[...activeVisualSources.matchAll(/https?:\/\/[^\s'\"`)>]+/g)].map(match=>match[0]).filter(url=>/\.\w{3,4}(?:[?#]|$)|\/images(?:[/?#]|$)|\/upload\//i.test(url));
assert.ok(imageUrls.every(url=>url===ASSETS.menu),'only the main-menu background may use an external image URL');
assert.ok(Object.values(IMAGE_FALLBACKS).every(value=>!value),'no remote image fallbacks are allowed');
assert.equal(NPCS.length,10,'key traders, the village technician, the courier, and the farm scout should be present in the catalog');
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

// Starter economy supports a practical multi-item kit and distinct leather jacket/cosukha art.
assert.equal(START_BUDGET,5000,'starting budget should allow one practical faction kit without funding an advanced loadout');
assert.ok(fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8').includes("sw.js?v=300"),'service worker registration URL should refresh with the release');
const serviceWorkerSource=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
assert.ok(serviceWorkerSource.includes('./src/data/bundled-music.js')&&serviceWorkerSource.includes('./src/data/radio-stations.js'),'offline shell should cache the built-in music manifest and base radio station data');
assert.ok(serviceWorkerSource.includes('cordon-pda-v3000-personal-barter-gm'),'service worker cache name should change for the current release');
const swUrl=new URL('../sw.js',import.meta.url);
const precachePaths=[...serviceWorkerSource.matchAll(/\"(\.\/[^\"]+)\"/g)].map(match=>match[1]);
assert.ok(precachePaths.length>=150,'the offline shell should include the expanded artwork bundle');
for(const path of precachePaths) assert.ok(fs.existsSync(new URL(path,swUrl)),`every offline cache entry must exist: ${path}`);
for (const artwork of requiredArtwork) { const assetPath=fileURLToPath(new URL(artwork)); const relative=pathModule.relative(projectRootPath,assetPath).split(pathModule.sep).join('/'); assert.ok(serviceWorkerSource.includes(`./${relative}`),`offline cache should include ${relative}`); }
assert.ok(ASSETS.armor.leather.includes('kozankaicon.webp'),'Кожанка must use the Kozanka leather jacket artwork');
assert.ok(ASSETS.armor.biker.includes('kosyhaicon.webp'),'Косуха must use its own Kosyha artwork');
const kitFit=canFitLoadout({bread:1},'water',1,START_BUDGET);
assert.equal(kitFit.ok,true,'several different starter goods should be selectable together');
assert.equal(canFitLoadout({bread:1},'bread',1,START_BUDGET).ok,true,'basic food quantities may exceed one item');
assert.equal(canFitLoadout({pm:1},'sawedoff',1,START_BUDGET).ok,false,'the starter kit should contain only one firearm');
assert.equal(canFitLoadout({leather:1},'kozanka',1,START_BUDGET).ok,false,'the starter kit should contain only one suit');
assert.equal(canFitLoadout({'mask-loner-basic':1},'mask-bandit-basic',1,START_BUDGET).ok,false,'the starter kit should contain only one gas mask');
assert.equal(canFitLoadout({},'rgd5',1,START_BUDGET).ok,false,'grenades are not beginner starter equipment');

// Starter armour and a basic faction-matched gas mask are available at character creation.
for (const faction of FACTIONS) {
  const loadout=STARTER_LOADOUT_BY_FACTION[faction.id];
  assert.ok(loadout?.armor?.length && loadout?.mask?.length===1,`${faction.id} should have beginner armour and exactly one suitable starter mask`);
  for (const id of [...loadout.armor,...loadout.mask]) assert.ok(STARTER_ITEM_IDS.includes(id),`${id} should be selectable at character creation`);
  const html=renderLoadout({pendingCharacter:{faction:faction.id},draft:{faction:faction.id},loadout:{selected:{}}});
  for (const id of [...loadout.armor,...loadout.mask]) assert.ok(html.includes(`data-id=\"${id}\"`),`${id} should appear in the ${faction.id} starter shop`);
  for (const other of FACTIONS.filter(entry=>entry.id!==faction.id)) {
    const otherGear=STARTER_LOADOUT_BY_FACTION[other.id];
    for (const id of [...otherGear.armor,...otherGear.mask]) {
      if (id==='kozanplash') continue; // basic cloak is a shared beginner option for loners and bandits
      assert.ok(!loadout.armor.includes(id)&&!loadout.mask.includes(id),`${id} must not be a ${faction.id} starter option`);
    }
  }
}

// Each faction can afford a proper beginner kit: best allowed suit, faction mask, one sidearm, ammo, medical aid and food/water.
for (const faction of FACTIONS) {
  const profile=STARTER_LOADOUT_BY_FACTION[faction.id];
  const bestSuit=[...profile.armor].sort((a,b)=>ITEMS.find(item=>item.id===b).price-ITEMS.find(item=>item.id===a).price)[0];
  const basicKit=[bestSuit,profile.mask[0],'pm','ammo9x18','bandage','bread','water'];
  let selectedKit={};
  for (const id of basicKit) {
    const fitted=canFitLoadout(selectedKit,id,1,START_BUDGET);
    assert.equal(fitted.ok,true,`${faction.id} basic beginner kit should fit the starting budget (${id})`);
    selectedKit=fitted.selected;
  }
  assert.ok(Object.entries(selectedKit).every(([id,qty])=>qty<=2),`${faction.id} basic kit quantities should stay modest`);
}
assert.ok(ITEMS.filter(item=>item.cat!=='Задания').every(item=>Number.isFinite(item.price)&&item.price>0),'every tradable item should have a positive base price');
assert.ok(ITEMS.filter(item=>item.cat==='Задания').every(item=>item.price===0),'story quest items should not have a sale price');
assert.ok(NPCS.filter(npc=>npc.trader).every(npc=>npc.priceMultiplier>=1.02&&npc.priceMultiplier<=1.07&&npc.buyMultiplier>=.33&&npc.buyMultiplier<=.37),'fixed traders should use the balanced location-specific markups and buyback rates');

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
assert.equal(wolfQuestGame.money,cashBeforeWolf+320);
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
legacyStockGame.economyVersion=0;
legacyStockGame.traders.find(t=>t.id==='sidorovich').stock.find(entry=>entry.id==='bread').price=1;
const migratedSidorovich=getAvailableTraders(legacyStockGame,'sidorovich-bunker').find(t=>t.id==='sidorovich');
assert.ok(migratedSidorovich.stock.find(entry=>entry.id==='bread').price>1,'old saves should receive new trader prices without losing stock');
assert.equal(legacyStockGame.economyVersion,6,'old saves should be marked with the current economy version');
assert.ok(['zarya','berill','stalnoishlem','pg4'].every(id=>migratedSidorovich.stock.some(entry=>entry.id===id)),'Sidorovich legacy stock should receive the newly catalogued protective gear');
assert.ok(migratedSidorovich.stock.every(entry=>!['tail','flesh-eye','medusa','meat_chunk','gravi'].includes(entry.id)),'legacy saves must be migrated off mutant/artifact sale stock');
const oldLocalEconomy=createGame({name:'Старая торговля местного',faction:'loner'},[],START_BUDGET);
const localTraderProfile=oldLocalEconomy.ambientNpcs.find(npc=>npc.location==='rookie-village');
oldLocalEconomy.npcTraders={[localTraderProfile.id]:{id:localTraderProfile.id,location:'rookie-village',stock:[{id:'bread',qty:2,price:1},{id:'berill',qty:1,price:1},{id:'zarya',qty:1,price:1},{id:'stalnoishlem',qty:1,price:1},{id:'pg4',qty:1,price:1}],buyMultiplier:.36}};
oldLocalEconomy.economyVersion=0;
const migratedLocal=getAvailableTraders(oldLocalEconomy,'rookie-village').find(t=>t.id===localTraderProfile.id);
assert.ok(migratedLocal,'legacy ordinary stalker should keep their personal barter record');
assert.ok(migratedLocal.stock.every(entry=>!['berill','zarya','stalnoishlem','pg4','pa8','pa10','psz5','medved'].includes(entry.id)),'ordinary Cordon NPCs must not retain late-game armor or rare detectors after migration');
assert.ok(migratedLocal.stock.length>=2 && migratedLocal.stock.length<=7,'personal low-tier trader stock should remain compact after migration');
const oldRoamingEconomy=createGame({name:'Старый бродячий торговец',faction:'loner'},[],START_BUDGET);
const oldRoamer=oldRoamingEconomy.randomTraders[0];
oldRoamer.stock.push({id:'berill',qty:1,price:1},{id:'zarya',qty:1,price:1},{id:'pg4',qty:1,price:1});
oldRoamingEconomy.economyVersion=0;
const migratedRoamer=getAvailableTraders(oldRoamingEconomy,oldRoamer.location).find(t=>t.id===oldRoamer.id);
assert.ok(migratedRoamer.stock.every(entry=>!['berill','zarya','stalnoishlem','pg4','psz5'].includes(entry.id)),'old travelling traders must migrate away from late-game South stock');

// Trader locations: Shnurok on ATP, military quartermaster at southern checkpoint.
shopGame.locationId='atp';
assert.ok(getAvailableTraders(shopGame).some(trader=>trader.id==='shnurok'));
shopGame.locationId='south-checkpoint';
assert.ok(getAvailableTraders(shopGame).some(trader=>trader.id==='kapterka'));
const kapterkaStock=getAvailableTraders(shopGame,'south-checkpoint').find(trader=>trader.id==='kapterka').stock;
assert.ok(['debyt','pa8','pa10','pm','vm17'].every(id=>kapterkaStock.some(entry=>entry.id===id)),'southern checkpoint quartermaster should offer practical low/mid-tier supplies');
const oldQuartermasterGame=createGame({name:'Старый склад',faction:'loner'},[],START_BUDGET);
oldQuartermasterGame.economyVersion=0;
oldQuartermasterGame.traders.find(entry=>entry.id==='kapterka').stock.push({id:'zarya',qty:1,price:1},{id:'berill',qty:1,price:1},{id:'pg4',qty:1,price:1});
const migratedQuartermaster=getAvailableTraders(oldQuartermasterGame,'south-checkpoint').find(entry=>entry.id==='kapterka');
assert.ok(migratedQuartermaster.stock.every(entry=>!['zarya','berill','stalnoishlem','pg4','psz5'].includes(entry.id)),'old saves must migrate Kapterka to her current regional supply list');
assert.ok(kapterkaStock.every(entry=>!['zarya','berill','psz5','pg4','aksu','medved'].includes(entry.id)),'advanced suits and rare detectors should not flood the early Cordon market');
const shnurokStock=getAvailableTraders(shopGame,'atp').find(trader=>trader.id==='shnurok').stock;
assert.ok(['biker','kozanka','pm','sawedoff'].every(id=>shnurokStock.some(entry=>entry.id===id)),'ATP trader should stock faction-appropriate low/mid-tier equipment');
assert.ok(shnurokStock.every(entry=>!['stalnoishlem','pg4','zarya','berill'].includes(entry.id)),'ATP trader should not make late-game protective gear readily available on the South');

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
const ambientOffers=getAvailableTraders(contactGame,'rookie-village').filter(person=>contactGame.ambientNpcs.some(npc=>npc.id===person.id));
assert.ok(ambientOffers.length>=3,'ordinary stalkers should expose personal barter offers');
assert.ok(Object.keys(contactGame.npcTraders).length>=ambientOffers.length,'each ordinary stalker must have a separate persisted barter record');
assert.notStrictEqual(contactGame.npcTraders[ambientOffers[0].id].stock,contactGame.npcTraders[ambientOffers[1].id].stock,'each stalker must own an independent stock list');
const cartographerOffer=ambientOffers.find(person=>person.role==='Сталкер-картограф');
const cookOffer=ambientOffers.find(person=>person.role==='Повар у костра');
assert.ok(cartographerOffer && cookOffer,'the village must populate distinct specialist roles');
assert.notDeepEqual(cartographerOffer.stock.map(entry=>entry.id).sort(),cookOffer.stock.map(entry=>entry.id).sort(),'barter offers should follow each NPC occupation rather than one shared faction list');
assert.notEqual(cartographerOffer.priceMultiplier,cookOffer.priceMultiplier,'ordinary stalkers should have individual prices');
assert.ok(ambientOffers.every(person=>person.stock.every(entry=>!['zarya','berill','stalnoishlem','pg4','psz5','aksu','medved'].includes(entry.id))),'ordinary Cordon stock should stay within the early-game tier');
const squadOffer=[...squadTrader.stock].filter(entry=>entry.qty>0).sort((a,b)=>a.price-b.price)[0];
assert.ok(squadOffer,'a regular stalker should have at least one available barter item');
assert.equal(buyFromTrader(contactGame,squadContact.id,squadOffer.id).ok,true,'a player can buy an affordable item from a regular stalker');
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
for (const restricted of ['aksu','ammo545','psz5','aurora','optik','zarya','kosyha','otklik','flash','tail','flesh-eye','medusa','meat_chunk','gravi']) {
  assert.ok(!STARTER_ITEM_IDS.includes(restricted),`${restricted} must not be in starter selection`);
  assert.equal(canFitLoadout({},restricted,1,START_BUDGET).ok,false,`${restricted} must be blocked from starter selection`);
}
for (const itemId of STARTER_ITEM_IDS) assert.ok(ITEMS.some(item=>item.id===itemId),`starter item ${itemId} must exist`);
for (const armorId of ['leather','kozanplash','kozanka','debyt']) assert.ok(STARTER_ITEM_IDS.includes(armorId),`${armorId} should be selectable as starter armour`);
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
// Use an isolated encounter here: earlier travel checks may legitimately start a random fight.
const combatVisualGame=createGame(character,[],START_BUDGET);
addItem(combatVisualGame.inventory,'knife',1);
addItem(combatVisualGame.inventory,'pm',1);
addItem(combatVisualGame.inventory,'ammo9x18',1);
combatVisualGame.equippedWeaponId='pm';
beginEncounter(combatVisualGame,'bandit');
const combatHtml=renderGame({screen:'game',characters:[character],activeCharacterId:'smoke',settings:{},ui:{tab:'location',pdaOpen:false,modal:null,music:{mode:'local',queue:[],index:0,playing:false}},game:combatVisualGame});
assert.ok(combatHtml.includes('enemy-portrait-art') && combatHtml.includes('enemy-body-art') && combatHtml.includes('enemy-faction-row'),'combat should show separate portrait, full-body appearance and faction insignia');
assert.ok(combatHtml.includes('data-action="combat-attack"') && combatHtml.includes('data-action="combat-reload"'),'combat HUD should expose attack and reload actions only during an encounter');
assert.ok(combatHtml.includes('first-person-weapon right') && combatHtml.includes('assets/items/pm.webp'),'equipped weapons should render as inward-facing first-person hand sprites');
assert.equal(getBestWeapon(combatVisualGame.inventory,combatVisualGame)?.id,'pm','ammo stacks in the backpack must initialize a firearm magazine');
assert.ok((combatVisualGame.weaponMagazines?.pm||0)>0,'a purchased/found ammo stack must put rounds in the selected weapon magazine');
combatVisualGame.equippedWeaponId='knife';
const attack=playerAttack(combatVisualGame);
assert.ok(attack.message.includes('Нож'));

const uiState={screen:'game',characters:[character],activeCharacterId:'smoke',pendingCharacter:null,settings:{reducedMotion:false},account:{},draft:{name:'',birthDate:'',height:'',weight:'',personality:'',biography:'',notes:'',faction:'loner',avatar:''},loadout:{selected:{}},ui:{tab:'location',pdaOpen:false,modal:null,music:{mode:'local',trackId:null,queue:[],index:0,playing:false}},game};
assert.ok(renderMenu(uiState).includes('Играть'));
assert.ok(renderMenu(uiState).includes('fonderevnanovickov'),'menu should reference a local background');
const createHtml=renderCreate(uiState);
assert.ok(createHtml.includes('generate-stalker-name') && createHtml.includes('Случайное имя'),'character creation should offer the built-in random stalker name generator');
assert.ok(createHtml.includes('open-avatars') && createHtml.includes('open-appearances') && createHtml.includes('appearance-upload') && createHtml.includes('ПРИНАДЛЕЖНОСТЬ К ГРУППИРОВКЕ'),'portrait and full-body appearance should be independently selectable and uploadable');
assert.ok(createHtml.includes('pda-screen-wrap') && createHtml.includes('kpkfon.webp'),'character creation must use the provided PDA housing');
assert.ok(createHtml.includes('faction-choice-insignia'),'faction choices should display their group insignia');
assert.ok(createHtml.includes('pda-create-fields') && createHtml.includes('field-notes') && !createHtml.includes('<details'),'character details should be visible in a compact, continuous registration form');
assert.ok(createHtml.includes('Стартовую локацию') || createHtml.includes('стартовую локацию'),'faction selection should explain its effect without extra badges');
assert.ok(renderLoadout(uiState).includes('СТАРТОВАЯ ПОДБОРКА'));
assert.ok(renderLoadout(uiState).includes('Плащ') && renderLoadout(uiState).includes('до 3 шт.'),'beginner characters should be able to choose a faction-allowed cloak and several basic supplies');
for (const hidden of ['АКСУ','Пачка патронов 5.45×39','Хвост слепого пса','Глаз плоти','Медуза','Ломоть мяса','Грави','Заря']) assert.ok(!renderLoadout(uiState).includes(hidden),`${hidden} must not appear in the starter screen`);
const idleViewState={...uiState,game:createGame(character,[],START_BUDGET)};
const closedPdaHtml=renderGame(idleViewState);
assert.ok(closedPdaHtml.includes('КПК') && closedPdaHtml.includes('pda-toggle-button'));
assert.ok(!closedPdaHtml.includes('aria-label="Разделы КПК"'),'PDA tabs must stay hidden until the device is opened');
assert.ok(closedPdaHtml.includes('scene-gm'),'the closed-PDA game view should show the location narrative');
assert.ok(!closedPdaHtml.includes('scene-places') && !closedPdaHtml.includes('scene-interactions'),'the lower-left world data/functions panel should be removed');
assert.ok(closedPdaHtml.includes('equipment-hotbar') && closedPdaHtml.includes('quick-hotbar'),'the world view should show weapon and four quick-use slots under the weapon panel');
assert.ok(/weapon-hud (?:left|right) idle/.test(closedPdaHtml) && !closedPdaHtml.includes('data-action="combat-attack"'),'exploration should use a compact equipment HUD without disabled combat controls');
uiState.ui.pdaOpen=true;
assert.ok(renderGame(uiState).includes('aria-label="Разделы КПК"'),'opening the PDA should reveal tabs across the top');
const pointMapHtml=renderGame({...uiState,ui:{...uiState.ui,pdaOpen:true,tab:'map'}});
assert.ok(pointMapHtml.includes('map-pin point-only'),'the PDA map should use simple location dots');
assert.ok(!pointMapHtml.includes('map-pin-title')&&!pointMapHtml.includes('data-location-name'),'the PDA map should not render location names or title labels');
uiState.game.locationId='rookie-village';
uiState.ui.pdaOpen=false;
uiState.ui.tab='location';
const locationHtml=renderGame(uiState);
assert.ok(!locationHtml.includes('data-action="radio-toggle"') && !locationHtml.includes('Радио Деревни новичков'),'base radio must be activated by natural command, not shown as a HUD panel');
assert.equal(getRadioStationForLocation('rookie-village')?.id,'loner-village','Rookie Village should expose its radio only through the interaction system');
assert.equal(getRadioStationForLocation('atp')?.id,'bandit-atp','the ATP bandit base should have its own radio station');
assert.equal(getRadioStationForLocation('forest-camp'),null,'ordinary forest camp should not expose a radio function');
assert.equal(getRadioStationForLocation('north-checkpoint'),null,'radio should not appear at every military outpost');
assert.equal(getRadioStationForLocation('south-checkpoint')?.id,'south-checkpoint','South Checkpoint should have its own radio station');
assert.equal(getRadioStationForLocation('elevator'),null,'ordinary travel locations should not expose base radios');
assert.equal(RADIO_STATIONS.length,3,'only the Rookie Village, ATP and South Checkpoint should have radio points');
assert.equal(BUNDLED_MUSIC_TRACKS.length,71,'the built-in music title catalog should contain the 71 names from the supplied music folder');
for(const track of BUNDLED_MUSIC_TRACKS) assert.ok(track.source==='catalog' && track.title && !track.url,'the website should embed music titles only, without requiring a local import or claiming audio is bundled');
const originalDocument=globalThis.document;
const fakeAudio={listeners:{},src:'',paused:true,addEventListener(type,fn){this.listeners[type]=fn;},load(){},async play(){this.paused=false;return true;},pause(){this.paused=true;},removeAttribute(name){if(name==='src')this.src='';}};
globalThis.document={createElement(tag){assert.equal(tag,'audio');return fakeAudio;},body:{appendChild(){}}};
try { const engine=createMusicEngine(); const sample={id:'bundled-smoke',title:'Проверочный эфир',url:'./assets/music/smoke.ogg',fileName:'smoke.ogg',stations:['loner-village']}; const [meta]=engine.addBundledTracks([sample]); assert.equal(meta.source,'bundled'); assert.equal(engine.count,1); assert.equal(await engine.play(meta),true); assert.equal(fakeAudio.src,sample.url); engine.stop(); engine.clear(); } finally { if(originalDocument===undefined) delete globalThis.document; else globalThis.document=originalDocument; }
assert.ok(!/https?:\/\//i.test(locationHtml),'the location scene must not add external music URLs');
assert.ok(!locationHtml.includes('music-dock'),'the bottom music dock should remain removed');
assert.ok(!locationHtml.includes('npc-interaction'),'the player should request nearby contacts instead of having an NPC strip permanently open over the scene');
assert.ok(locationHtml.includes('Купонов') && !/\bRU\b/.test(locationHtml),'all balances should use the in-world Coupons currency label');
addItem(game.inventory,'bread',1);
addItem(game.inventory,'water',1);
const inventoryUi=renderModal({...uiState,ui:{...uiState.ui,modal:'inventory-panel'}});
assert.ok(inventoryUi.includes('bread.webp') && inventoryUi.includes('water.webp'),'inventory should render item artwork instead of emoji symbols');
assert.ok(!/[🍞💧🌭🥫🧥🦺🔫🔪📡☢]/u.test(inventoryUi),'inventory must not display emoji fallback icons');
assert.ok(inventoryUi.includes('inventory-item-clear'),'inventory cards should use the repaired responsive grid layout');
assert.ok(costumeFitCss.includes('object-fit:contain'),'armor artwork should preserve its full silhouette');
assert.match(costumeFitCss,/\.loadout-screen \.shop-grid\{[^}]*overflow-y:auto/s,'starter shop item list should scroll independently from its sticky footer');
assert.match(costumeFitCss,/\.dialogue-transcript \.dialogue-line p\{[^}]*white-space:pre-wrap/s,'dialogue transcript should render plain text lines');
assert.match(costumeFitCss,/\.dialogue-simple\{[^}]*background:transparent;border:0;box-shadow:none/s,'dialogue should not wrap each exchange in a large chat window');
assert.match(costumeFitCss,/\.first-person-weapon\.right img\{transform:rotate\(-13deg\)\}/,'weapon artwork on the right should point inward toward screen centre');
assert.match(costumeFitCss,/\.first-person-weapon\.left img\{transform:scaleX\(-1\) rotate\(-13deg\)\}/,'weapon artwork moved to the left should be mirrored toward screen centre');
assert.match(costumeFitCss,/\.scene-interactions\s*\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s,'desktop NPC list should use a compact two-column layout');
assert.match(costumeFitCss,/\.pda-screen-wrap\{[^}]*aspect-ratio:4\/3/s,'character creation should preserve the PDA frame proportions');
assert.match(costumeFitCss,/\.pda-screen-wrap\{[^}]*padding:13\.7% 11\.7% 12\.2%/s,'character creation content should align with the PDA glass without hiding the device frame');
assert.match(costumeFitCss,/\.pda-fullscreen-page\{[^}]*rgba\(7,12,8,\.48\)[^}]*var\(--pda-texture\)/s,'fullscreen PDA should keep the supplied background texture visible');
assert.match(costumeFitCss,/\.pda-fullscreen-page\{[^}]*var\(--pda-texture\)/s,'the fullscreen PDA should use the supplied PDA glass texture');
assert.match(costumeFitCss,/\.contact-card-clean\{[^}]*grid-template-columns:82px/s,'contacts should use compact rows with separate artwork cells');
const remoteRadioState={...uiState,game:{...uiState.game,locationId:'elevator'}};
assert.ok(!renderGame(remoteRadioState).includes('Радио'),'no location should expose an internet radio station');
uiState.ui.pdaOpen=true;
uiState.ui.tab='player';
uiState.ui.localMusicTracks=BUNDLED_MUSIC_TRACKS;
uiState.ui.music={mode:'catalog',trackId:BUNDLED_MUSIC_TRACKS[0].id,queue:BUNDLED_MUSIC_TRACKS.map(t=>t.id),index:0,playing:false};
const playerHtml=renderGame(uiState);
assert.ok(playerHtml.includes('Список композиций'));
assert.ok(!playerHtml.includes('player-play-track') && !playerHtml.includes('player-prev') && !playerHtml.includes('player-next'));
assert.ok(playerHtml.includes('71') && playerHtml.includes(BUNDLED_MUSIC_TRACKS[0].title),'the player should display built-in track names only, without fake playback controls');
assert.ok(!playerHtml.includes('Импортировать ZIP') && !playerHtml.includes('local-music-archive') && !playerHtml.includes('Выбрать папку Music'),'the player must use its built-in title catalog without asking for import'); 
const musicRuntimeSource=['src/systems/music.js','src/systems/music-archive.js','src/main.js','src/ui/views.js'].map(file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8')).join('\n');
assert.ok(!/iframe|videoId|youtube\.com|youtu\.be|spotify\.com|radio\./i.test(musicRuntimeSource),'music runtime must not embed remote players or network radio streams');
assert.ok(musicRuntimeSource.includes('addBundledTracks') && musicRuntimeSource.includes("source==='catalog'"),'PDA and base radios should share the built-in title catalog');
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
assert.ok(!mapModal.includes('Проложить путь') && !mapModal.includes('Время пешком') && !mapModal.includes('Соседних переходов'),'the map point popup should show only a marker description, not route or path data');
uiState.ui.modal='avatars';
const avatarModal=renderModal(uiState);
assert.ok(avatarModal.includes('Волк') && avatarModal.includes('Кефир') && avatarModal.includes('Дмитрий Дзержинский'),'portrait and appearance options should be available across all factions');
assert.ok(avatarModal.includes('avatar-option-single portrait-only') && avatarModal.includes('data-action="choose-avatar"'),'portrait picker should show only the portrait and keep appearance selection independent');
assert.ok(avatarModal.includes('ОБЩИЙ КАТАЛОГ') && avatarModal.includes('не зависит от группировки'),'the picker must explicitly allow cross-faction portrait and appearance selection');
const banditAvatarModal=renderModal({...uiState,draft:{...uiState.draft,faction:'bandit'},ui:{...uiState.ui,modal:'avatars'}});
assert.ok(banditAvatarModal.includes('avatar-option-single portrait-only') && banditAvatarModal.includes('Волк') && banditAvatarModal.includes('Дмитрий Дзержинский'));
const banditAppearanceModal=renderModal({...uiState,draft:{...uiState.draft,faction:'bandit'},ui:{...uiState.ui,modal:'avatars',avatarPickMode:'appearance'}});
assert.ok(banditAppearanceModal.includes('avatar-option-body') && banditAppearanceModal.includes('data-action="choose-appearance"') && !banditAppearanceModal.includes('portrait-only'),'appearance picker should show body art without coupling it to portraits');
assert.equal((banditAvatarModal.match(/class="avatar-option-single portrait-only"/g)||[]).length,20,'portrait picker should show the complete cross-faction catalog');
assert.equal((banditAppearanceModal.match(/class="avatar-option-body"/g)||[]).length,20,'appearance picker should show the complete cross-faction catalog');
assert.ok(AVATAR_OPTIONS.every(option=>option.src&&option.appearance&&option.insignia),'every appearance option should contain a portrait, full-body art and faction insignia');
assert.ok(ASSETS.rankInsignias['Капитан']&&ASSETS.rankInsignias['Старший сержант'],'military ranks should have their own rank insignia assets');
const militaryAvatarModal=renderModal({...uiState,draft:{...uiState.draft,faction:'military'},ui:{...uiState.ui,modal:'avatars'}});
assert.ok(militaryAvatarModal.includes('Дмитрий Дзержинский') && militaryAvatarModal.includes('Кефир') && militaryAvatarModal.includes('Волк'),'military avatar picker should also allow cross-faction appearances');
uiState.ui.tab='stats';
const statsHtml=renderGame(uiState);
assert.ok(statsHtml.includes('profile-edit-form') && statsHtml.includes('Выбрать портрет'),'PDA statistics must provide editable character dossier');
assert.ok(statsHtml.includes('profile-heading-art') && statsHtml.includes('faction-insignia') && !statsHtml.includes('rank-insignia'),'character dossier should show only the faction mark, not redundant rank stickers');
// PDA tabs keep inventory/trade/radio out; these remain location or independent overlays.
const tabState={...uiState,ui:{...uiState.ui,pdaOpen:true,tab:'location',modal:null,mapView:'map'}};
const tabMarkup=renderGame(tabState);
assert.ok(tabMarkup.includes('Карта Кордона') && tabMarkup.includes('map-pins') && tabMarkup.includes('point-only') && !tabMarkup.includes('map-route-lines'),'opening the PDA on an obsolete scene tab should default to a pin-only map without routes');
assert.ok(tabMarkup.includes('kpkfon.webp') && tabMarkup.includes('--pda-shell:url'),'the PDA should use the supplied device bezel as its background');
assert.ok(!tabMarkup.includes('data-tab="location"') && !tabMarkup.includes('>Местность<'),'the PDA must not expose a separate Local Area tab');
assert.ok(!tabMarkup.includes('data-tab="inventory"')&&!tabMarkup.includes('data-tab="trade"')&&!tabMarkup.includes('data-tab="radio"'));
assert.ok(!tabMarkup.includes('music-dock'));
const contactsMarkup=renderGame({...tabState,ui:{...tabState.ui,tab:'contacts'}});
assert.ok(contactsMarkup.includes('contact-card-clean') && contactsMarkup.includes('contact-clean-portrait'),'contacts should show a single compact NPC portrait');
assert.ok(!contactsMarkup.includes('contact-clean-body'),'contacts must not show the extra full-body image below the portrait');
assert.ok(contactsMarkup.includes('talk-action') && contactsMarkup.includes('contact-action-button') && contactsMarkup.includes('Диалог'),'contacts should expose clear labelled dialogue actions');
assert.ok(!contactsMarkup.includes('Не здесь'),'contacts should not list remote NPCs as unavailable cards');

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
assert.ok(wolfTrailerModal.includes('Вагончик') && !wolfTrailerModal.includes('0/5'),'map pins must stay simple and not embed quest routes or progress');
const conversationGame=createGame(character,[],START_BUDGET);
conversationGame.locationId='rookie-village';
talkToNpc(conversationGame,'wolf');
const plainDialogueHtml=renderGame({screen:'game',characters:[character],activeCharacterId:'smoke',settings:{},ui:{tab:'location',pdaOpen:false,modal:null,music:{mode:'local',queue:[],index:0,playing:false}},game:conversationGame});
const plainDialogueBlock=plainDialogueHtml.match(/<main class=\"dialogue-simple\"[\s\S]*?<\/main>/)?.[0]||'';
assert.ok(plainDialogueBlock.includes('dialogue-line') && plainDialogueBlock.includes('Волк'),'dialogue should use a simple name-and-text transcript');
assert.ok(plainDialogueBlock.includes('dialogue-profile-portrait') && plainDialogueBlock.includes('faction-insignia') && plainDialogueBlock.includes('rank-insignia') && !plainDialogueBlock.includes('npc-scene-body') && !plainDialogueBlock.includes('enemy-body-art'),'dialogue should show portrait, faction and rank marks without a full body image');
assert.ok(!plainDialogueBlock.includes('<label for="npc-message">') && !plainDialogueBlock.includes('Сообщение будет учтено'),'dialogue should avoid redundant explanatory copy');
const conversationReply=replyNpcFreeText(conversationGame,'wolf','Что случилось возле вагончика и почему собаки нападают на новичков?');
assert.equal(conversationReply.ok,true);
assert.ok(conversationGame.dialogueHistory.some(entry=>entry.role==='player' && entry.text.includes('вагончика')),'full-text NPC conversation should preserve the player message in the chat');
assert.ok(conversationGame.dialogueHistory.at(-1).role==='npc','NPC response should be appended after the player message');
const fallbackTalkGame=createGame({name:'Проверка фразы',faction:'loner'},[],START_BUDGET);
fallbackTalkGame.locationId='rookie-village'; talkToNpc(fallbackTalkGame,'wolf');
const fallbackSavedRandom=Math.random; Math.random=()=>0.99;
const fallbackTalkReply=replyNpcFreeText(fallbackTalkGame,'wolf','квагл фрумпа дзю');
Math.random=fallbackSavedRandom;
assert.equal(fallbackTalkReply.ok,true,'an unknown player phrase should still receive an NPC response');
assert.ok(fallbackTalkGame.dialogueHistory.at(-1).text.length>10,'an unrecognized input must append a generated in-character reply to the transcript');
assert.equal(conversationGame.dialogueContext.lastIntent,'mutants','the dialogue engine should classify natural player phrases into a remembered topic');
const followupReply=replyNpcFreeText(conversationGame,'wolf','А что дальше?');
assert.ok(followupReply.ok && followupReply.message.includes('По поводу того, о чём говорили'),'NPC follow-up replies should use the previous conversation context');
const directionReply=replyNpcFreeText(conversationGame,'wolf','Где я сейчас нахожусь?');
assert.ok(directionReply.message.includes('Деревня новичков') && !directionReply.message.includes('rookie-village'),'direction replies should use human-readable location names');
const concreteRouteReply=replyNpcFreeText(conversationGame,'wolf','Мне нужно попасть на АТП, подскажи, как лучше добраться?');
assert.ok(concreteRouteReply.ok && concreteRouteReply.message.includes('Остановка') && concreteRouteReply.message.includes('АТП') && concreteRouteReply.message.includes('500 Купонов'),'a real NPC should give a concrete route, intermediate waypoint, and correct entrance warning');
const poodleRouteReply=replyNpcFreeText(conversationGame,'wolf','Как дойти до Кости Пуделя?');
assert.ok(poodleRouteReply.ok && poodleRouteReply.message.includes('Развалины хутора'),'NPCs should recognize quest and nickname landmarks as route destinations');
const personalReply=replyNpcFreeText(conversationGame,'wolf','Расскажи, скучаешь по дому?');
assert.ok(personalReply.ok && personalReply.message.length>20,'the expanded dialogue engine should answer personal small-talk');
assert.equal(conversationGame.dialogueContext.lastIntent,'personal');
// Expanded NPC conversation topics should resolve even with common paraphrases and typos.
const npcTopicCases=[
  ['Кто ты?','identity'],
  ['А ты кто такой?','identity'],
  ['Расскажи о себе','identity'],
  ['Какова твоя история?','backstory'],
  ['Как ты здесь оказался?','backstory'],
  ['Как тебя сюда занесло?','backstory'],
  ['Чем сейчас занят?','activity'],
  ['Что по делам?','activity'],
  ['Откуда у тебя это снаряжение?','equipment_origin'],
  ['Где раздобыл ствол?','equipment_origin'],
  ['Твои мысли о зоне','thoughts_zone'],
  ['Как ты смотришь на Зону?','thoughts_zone'],
  ['Твои мысли о персонаже','thoughts_person'],
  ['Твои мысли о персонже','thoughts_person'],
  ['Что ты обо мне думаешь?','thoughts_person'],
  ['Твои мысли о фракции','thoughts_faction'],
  ['Что думаешь о военных?','thoughts_faction'],
  ['Что скажешь про бандитов?','thoughts_faction'],
  ['Твои мысли о мутантах','thoughts_mutants'],
  ['Кого из мутантов опасаться?','thoughts_mutants'],
  ['Твои мысли об аномалиях','thoughts_anomalies'],
  ['Как обходить аномалии?','thoughts_anomalies'],
  ['Твои мысли о смысле жизни','thoughts_life'],
  ['Что в жизни главное?','thoughts_life'],
  ['Дай совет','advice'],
  ['Что посоветуешь новичку?','advice']
];
for(const [phrase,expectedIntent] of npcTopicCases){
  const generated=generateDialogueReply({id:'topic-npc',name:'Серый',role:'Сталкер',faction:'loner'},createGame(character,[],START_BUDGET),phrase);
  assert.equal(generated.intent,expectedIntent,`NPC should understand: ${phrase}`);
  assert.ok(generated.answer.length>35,`NPC should give a substantive answer to: ${phrase}`);
}
const militaryOpinion=generateDialogueReply({id:'opinion-npc',name:'Серый',role:'Сталкер',faction:'loner'},createGame(character,[],START_BUDGET),'Что думаешь о военных?');
assert.match(militaryOpinion.answer,/военн|армейц/i,'faction opinions should address the faction named by the player, not default to the NPC own faction');
for(let i=0;i<30;i++) assert.match(generateStalkerName(),/^[А-ЯЁ][а-яё]+ [А-ЯЁ][а-яё-]+$/u,'random player names should combine a first name and a nickname from the stalker name database');

// Unrecognized nonsense should receive a random, faction-appropriate in-character reply.
const savedDialogueRandom=Math.random;
try {
  Math.random=()=>0;
  const unknownText='квагл фрумпа дзю';
  const unknownLoner=generateDialogueReply({id:'unknown-loner',name:'Сталкер',faction:'loner'},createGame(character,[],START_BUDGET),unknownText);
  const unknownMilitary=generateDialogueReply({id:'unknown-military',name:'Военный',faction:'military'},createGame({name:'Военный',faction:'military'},[],START_BUDGET),unknownText);
  const unknownBandit=generateDialogueReply({id:'unknown-bandit',name:'Бандит',faction:'bandit'},createGame({name:'Бандит',faction:'bandit'},[],START_BUDGET),unknownText);
  assert.equal(unknownLoner.intent,'general');
  assert.match(unknownLoner.answer,/не понял|телепат|мысли вслух|не уловил|без этой зауми|нормальн/i,'loners should ask to rephrase an unrecognized message');
  assert.match(unknownMilitary.answer,/формулировка|доклад|запрос|гражданский|служебный канал/i,'military NPCs should answer in a formal service tone');
  assert.match(unknownBandit.answer,/фраер|рамсы|маляв|базар|браток/i,'bandits should answer with their own fenya/jargon');
  assert.ok(unknownLoner.answer.includes('Янтарь'),'the removed cheese may appear only as a rare dialogue rumour');
  Math.random=()=>0.99;
  const ordinaryReply=generateDialogueReply({id:'ordinary-loner',name:'Сталкер',faction:'loner'},createGame(character,[],START_BUDGET),unknownText);
  assert.ok(!ordinaryReply.answer.includes('Янтарь'),'the rare cheese rumour should not be added to ordinary dialogue every time');
} finally { Math.random=savedDialogueRandom; }


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

// Natural RP approach phrases open a nearby-person picker or a named NPC dialogue.
const approachGame=createGame({name:'Подойти к сталкеру',faction:'loner'},[],START_BUDGET);
approachGame.locationId='rookie-village';
const genericApproach=processPlayerAction(approachGame,'Я подошёл к сталкеру.');
assert.equal(genericApproach.action,'nearby-people','generic approach RP should show people nearby');
const namedApproach=processPlayerAction(approachGame,'Я подошёл к Волку.');
assert.equal(namedApproach.action,'dialogue','a named approach should open the matching NPC dialogue');
assert.equal(namedApproach.npcId,'wolf');
const conversationalGame=createGame({name:'Разговор',faction:'loner'},[],START_BUDGET);
conversationalGame.locationId='rookie-village';
for(const [phrase,intent] of [['Как ты сюда попал?','backstory'],['Чем сейчас занят?','activity'],['Откуда у тебя снаряга?','equipment'],['Кто ты такой?','identity'],['Дай совет.','advice']]){const answer=replyNpcFreeText(conversationalGame,'wolf',phrase);assert.ok(answer.ok&&answer.message.length>30,`Wolf should answer naturally: ${phrase}`);assert.equal(conversationalGame.dialogueContext.lastIntent,intent,`dialogue AI should resolve intent: ${phrase}`);}

// Radio commands are only available at the three configured bases and on/off commands are distinct.
const radioGame=createGame({name:'Радио',faction:'loner'},[],START_BUDGET);
radioGame.locationId='rookie-village';
assert.equal(processPlayerAction(radioGame,'включи радио').action,'radio-on');
assert.equal(processPlayerAction(radioGame,'выключи радио').action,'radio-off');
radioGame.locationId='farmstead';
assert.match(processPlayerAction(radioGame,'включи радио').message,/Радиоприёмники доступны/);




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
const savedCheeseRandom=Math.random; Math.random=()=>.99;
const atpEntry=travelTo(zoneTravelGame,'atp');
Math.random=savedCheeseRandom;
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
assert.ok(encyclopediaView.includes('split-guide-layout') && encyclopediaView.includes('guide-side-tabs') && encyclopediaView.includes('guide-detail'),'encyclopedia should use left-side tabs and a right-side reading pane');
const helpView=renderGame({...dialogueState,ui:{...dialogueState.ui,pdaOpen:true,tab:'help'}});
assert.ok(helpView.includes('Помощь сталкеру') && helpView.includes('Что писать') && helpView.includes('ПРИМЕРЫ ФРАЗ'));
assert.ok(helpView.includes('guide-side-tabs') && helpView.includes('guide-detail'),'help should use the same split navigation layout as the encyclopedia');
assert.ok(helpView.includes('RP-действия'),'help should teach practical roleplay commands rather than world lore');
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


// The hidden Sidorovich bunker is accessible through a clear contextual entrance from the village.
const bunkerSceneGame=createGame({name:'Проверка входа',faction:'loner'},[],START_BUDGET);
bunkerSceneGame.locationId='rookie-village';
const bunkerSceneHtml=renderGame({game:bunkerSceneGame,characters:[{id:'test',name:'Проверка',faction:'loner'}],activeCharacterId:'test',settings:{},ui:{tab:'location',pdaOpen:false}});
assert.ok(!bunkerSceneHtml.includes('main-story-quest'),'the main storyline should not clutter the live location screen');
talkToNpc(bunkerSceneGame,'wolf');
const bunkerQuestHtml=renderGame({game:bunkerSceneGame,characters:[{id:'test',name:'Проверка',faction:'loner'}],activeCharacterId:'test',settings:{},ui:{tab:'quests',pdaOpen:true}});
assert.ok(bunkerQuestHtml.includes('Спуститься к Сидоровичу') && bunkerQuestHtml.includes('data-id="sidorovich-bunker"'),'quest journal should expose a clear entrance to Sidorovich bunker after Wolf gives the hint');
bunkerSceneGame.locationId='sidorovich-bunker';
const bunkerExitHtml=renderGame({game:bunkerSceneGame,characters:[{id:'test',name:'Проверка',faction:'loner'}],activeCharacterId:'test',settings:{},ui:{tab:'location',pdaOpen:false}});
assert.ok(bunkerExitHtml.includes('Выйти в деревню'),'Sidorovich bunker should expose a visible return route');

// NPC generative AI adapter: safe opt-in endpoint, compact world context and graceful fallback.
assert.equal(isValidNpcAiEndpoint('https://example.test/npc-chat'),true);
assert.equal(isValidNpcAiEndpoint('javascript:alert(1)'),false);
assert.equal(isValidNpcAiEndpoint('https://user:pass@example.test'),false);
const aiGame=createGame({name:'Тестовый сталкер',faction:'loner'},[],START_BUDGET);
const aiNpc={id:'ai-guide',name:'Проводник',role:'сталкер-картограф',faction:'loner',group:'Одиночки',lines:{rumors:'На остановке сегодня тихо.'}};
const aiPayload=buildNpcAiPayload({game:aiGame,npc:aiNpc,playerMessage:'Расскажи, что слышно'});
assert.ok(aiPayload.system.includes('Не выдумывай игровые факты'));
assert.equal(aiPayload.context.player.currentLocation,'Деревня новичков');
assert.ok(aiPayload.context.availableExits.some(exit=>exit.name==='Остановка'));
assert.ok(aiPayload.context.npc.knownDialogue && aiPayload.context.npc.knownDialogue.rumors==='На остановке сегодня тихо.','AI context should include grounded NPC dialogue knowledge');
assert.ok('worldState' in aiPayload.context,'AI context should include the current game world state');
assert.ok(aiPayload.context.nearbyPeople.length>0,'NPC AI should know who is actually nearby');
aiGame.ambientNpcs.push({id:'hidden-village-bandit',name:'Лишний бандит',role:'Бандит',faction:'bandit',location:'rookie-village'});
const filteredNearbyPayload=buildNpcAiPayload({game:aiGame,npc:aiNpc,playerMessage:'Кто тут рядом?'});
assert.ok(!filteredNearbyPayload.context.nearbyPeople.some(person=>person.id==='hidden-village-bandit'),'NPC AI must not claim hostile-faction characters are visibly present in a protected village');
const wolfAiPayload=buildNpcAiPayload({game:aiGame,npc:NPCS.find(npc=>npc.id==='wolf'),playerMessage:'Расскажи о себе'});
assert.equal(wolfAiPayload.context.npc.unique,true,'named story NPCs should be identified as unique');
assert.ok(wolfAiPayload.system.includes('уникальный сюжетный NPC'),'unique NPC prompts should preserve authored biography and voice');
assert.ok(aiPayload.system.includes('обычный, неуникальный сталкер'),'ordinary NPCs may vary their small talk while obeying world facts');
const scopedAiGame={...aiGame,dialogueHistory:[{role:'player',npcId:'other-npc',text:'Чужой разговор'},{role:'player',npcId:'ai-guide',text:'Наш разговор'}]};
const scopedPayload=buildNpcAiPayload({game:scopedAiGame,npc:aiNpc,playerMessage:'Продолжим'});
assert.ok(!JSON.stringify(scopedPayload.messages).includes("Чужой разговор"),"generative NPC context must not leak another NPC's conversation");
assert.ok(JSON.stringify(scopedPayload.messages).includes("Наш разговор"),"generative NPC context should keep the current NPC's conversation");
let capturedAiRequest=null;
const aiResponse=await requestNpcAiReply({endpoint:'https://example.test/npc-chat',game:aiGame,npc:aiNpc,playerMessage:'Что нового?',fetchImpl:async(url,options)=>{capturedAiRequest={url,options};return {ok:true,json:async()=>({reply:'Слышал, у остановки сегодня спокойно.'})};}});
assert.equal(aiResponse.ok,true);
assert.equal(aiResponse.reply,'Слышал, у остановки сегодня спокойно.');
assert.equal(capturedAiRequest.url,'https://example.test/npc-chat');
assert.ok(JSON.parse(capturedAiRequest.options.body).messages.length>=2);
const aiFailed=await requestNpcAiReply({endpoint:'https://example.test/npc-chat',game:aiGame,npc:aiNpc,playerMessage:'Привет',fetchImpl:async()=>({ok:false,status:503})});
assert.equal(aiFailed.ok,false,'an unavailable AI endpoint must leave the local dialogue fallback available');

// Release 2.9.7: playable mobile layout and interconnected story/equipment systems.
const mobileCss=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
assert.match(mobileCss,/@media\s*\(max-width:\s*760px\)/,'mobile layout must have a dedicated compact breakpoint');
assert.match(mobileCss,/\.mobile-game-nav\s*\{[^}]*position:\s*fixed/s,'mobile navigation must stay reachable at the bottom of the screen');
assert.match(mobileCss,/env\(safe-area-inset-bottom\)/,'mobile controls must respect the phone safe-area inset');
assert.match(mobileCss,/orientation:\s*landscape/,'mobile landscape mode must remain playable');
const mobileViewport=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(mobileViewport,/viewport-fit=cover/,'mobile viewport must account for phone notches and rounded edges');
assert.match(mobileViewport,/interactive-widget=resizes-content/,'the mobile layout viewport should resize when the on-screen keyboard opens');
const pwaManifest=JSON.parse(fs.readFileSync(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
assert.equal(pwaManifest.orientation,'any','the installed PWA must not force the phone into landscape orientation');
const mobileGame=createGame({name:'Телефон',faction:'loner'},[],START_BUDGET);
const mobileHtml=renderGame({screen:'game',characters:[{id:'mobile',name:'Телефон',faction:'loner'}],activeCharacterId:'mobile',settings:{},ui:{tab:'location',pdaOpen:false,modal:null,music:{mode:'local',trackId:null,queue:[],index:0,playing:false}},game:mobileGame});
assert.ok(mobileHtml.includes('mobile-game-nav'),'mobile game view must include quick navigation');
assert.ok(mobileHtml.includes('action-composer'),'mobile game view must retain the action input');

// Registration form stays continuous and compact: no isolated expandable block or large empty side column.
const registrationHtml=renderCreate({draft:{name:'',birthDate:'',height:'',weight:'',personality:'',biography:'',notes:'',faction:'loner',avatar:'',appearance:''}});
assert.ok(registrationHtml.includes('pda-create-layout')&&registrationHtml.includes('pda-create-fields'),'registration form should use the compact identity-and-fields layout');
for (const fieldName of ['birthDate','height','weight','personality','biography','notes']) assert.ok(registrationHtml.includes(`name="${fieldName}"`),`registration should show ${fieldName} directly in the form`);
assert.ok(!registrationHtml.includes('<details')&&!registrationHtml.includes('Дополнительные данные персонажа'),'registration must not hide character fields behind a separate expandable block');
assert.ok(registrationHtml.includes('pda-visual-card')&&registrationHtml.includes('Выбрать внешность'),'portrait and appearance controls should be visible as compact cards');

// The main storyline starts with the journal note and progresses only after the required NPC/action.
const storyGame=createGame({name:'Проверка сюжета',faction:'loner'},[],START_BUDGET);
storyGame.money=20000;
assert.equal(storyGame.mainStory.stage,'meet-wolf');
assert.ok(storyGame.log.some(entry=>entry.text.includes('Записка:')),'new loner character should receive the opening note');
assert.equal(getMainStoryQuest(storyGame).location,'rookie-village');
const storyTalk=(npcId,locationId)=>{storyGame.locationId=locationId;const result=talkToNpc(storyGame,npcId);assert.equal(result.ok,true,`story NPC ${npcId} should be available at ${locationId}`);return storyGame.dialogueHistory[0]?.text||'';};
const storyAction=(action,locationId)=>{storyGame.locationId=locationId;const result=mainStoryAction(storyGame,action);assert.equal(result.ok,true,`${action} should work at ${locationId}: ${result.message}`);return result;};
assert.match(storyTalk('wolf','rookie-village'),/Сидорович/);
assert.equal(storyGame.mainStory.stage,'go-to-sidorovich');
assert.equal(getMainStoryQuest(storyGame).title,'Совет Волка','speaking with Wolf should create the explicit next quest to visit Sidorovich');
assert.match(getMainStoryQuest(storyGame).objective,/Сидоровича/,'the journal objective should clearly direct the player to Sidorovich');
const storyViewState={screen:'game',characters:[{id:'story-test',name:'Проверка сюжета',faction:'loner'}],activeCharacterId:'story-test',settings:{},ui:{tab:'quests',pdaOpen:true,modal:null,music:{mode:'local',trackId:null,queue:[],index:0,playing:false}},game:storyGame};
const wolfAfterTalkHtml=renderGame(storyViewState);
assert.ok(wolfAfterTalkHtml.includes('Совет Волка')&&wolfAfterTalkHtml.includes('Спуститься к Сидоровичу'),'after Wolf dialogue the active quest and its direct action must be visible in the quest journal');
assert.equal(travelTo(storyGame,'sidorovich-bunker').ok,true,'the player should be able to follow the new quest from the village to Sidorovich');
assert.match(storyTalk('sidorovich','sidorovich-bunker'),/флешк/);
assert.equal(storyGame.mainStory.stage,'find-first-flash');
storyAction('story-flash-search','trailer');
assert.equal(countItem(storyGame.inventory,'flash'),1);
storyTalk('sidorovich','sidorovich-bunker');
assert.equal(storyGame.mainStory.stage,'deliver-supplies');
assert.equal(countItem(storyGame.inventory,'supply-bundle'),1);
storyAction('story-supplies-deliver','forest-camp');
storyTalk('sidorovich','sidorovich-bunker');
assert.equal(storyGame.mainStory.stage,'fetch-meat');
storyAction('story-meat-pickup','anomaly-dump');
storyTalk('sidorovich','sidorovich-bunker');
assert.equal(countItem(storyGame.inventory,'wrapped-present'),1,'the checkpoint delivery must use a unique wrapped gift item');
assert.match(ITEMS.find(item=>item.id==='wrapped-present').desc,/ленточк/,'wrapped gift must have the requested ribbon description');
storyAction('story-present-deliver','south-checkpoint');
storyTalk('sidorovich','sidorovich-bunker');
storyAction('story-underpass-start','underpass');
const underpassEncounter=storyGame.activeEncounter; storyGame.activeEncounter=null;
resolveMainStoryEncounter(storyGame,underpassEncounter);
storyTalk('sidorovich','sidorovich-bunker');
assert.equal(getAvailableStalkers(storyGame,'ravine-tunnel').some(npc=>npc.id==='wounded-courier'),true,'wounded courier should appear only at the courier story stage');
assert.match(storyTalk('wounded-courier','ravine-tunnel'),/локомотив/);
storyGame.player.reputation=20; storyGame.locationId='locomotive';
assert.equal(mainStoryAction(storyGame,'story-bandit-negotiate').ok,true,'the player should be able to negotiate with the locomotive bandits');
storyTalk('sidorovich','sidorovich-bunker');
storyAction('story-elevator-start','elevator');
const elevatorEncounter=storyGame.activeEncounter; storyGame.activeEncounter=null;
resolveMainStoryEncounter(storyGame,elevatorEncounter);
storyTalk('sidorovich','sidorovich-bunker');
assert.equal(getAvailableStalkers(storyGame,'farmstead').some(npc=>npc.id==='cordon-scout'),true,'scout should appear at the farmstead story stage');
assert.match(storyTalk('cordon-scout','farmstead'),/ферм/);
storyAction('story-farm-start','pig-farm');
const farmEncounter=storyGame.activeEncounter; storyGame.activeEncounter=null;
resolveMainStoryEncounter(storyGame,farmEncounter);
storyTalk('sidorovich','sidorovich-bunker');
assert.equal(storyGame.mainStory.stage,'beyond-cordon','the current Cordon storyline should end at the northern exit before the not-yet-built Garbage region');

// Failed supply delivery creates a real 5,000-Coupon debt and cannot be paid short.
const debtGame=createGame({name:'Долг',faction:'loner'},[],START_BUDGET);
debtGame.money=4999; debtGame.mainStory.stage='deliver-supplies'; addItem(debtGame.inventory,'supply-bundle',1);
assert.equal(mainStoryAction(debtGame,'story-supplies-fail').ok,true);
debtGame.locationId='sidorovich-bunker';
assert.equal(mainStoryAction(debtGame,'story-pay-debt').ok,false,'the 5,000-Coupon debt must not accept an underpayment');
debtGame.money=5000;
assert.equal(mainStoryAction(debtGame,'story-pay-debt').ok,true);
assert.equal(debtGame.mainStory.stage,'fetch-meat');

// Named NPCs answer building and trade questions with location-grounded information.
const npcKnowledgeGame=createGame({name:'Проверка диалогов',faction:'loner'},[],START_BUDGET);
npcKnowledgeGame.locationId='rookie-village'; talkToNpc(npcKnowledgeGame,'wolf');
const wolfBuildings=replyNpcFreeText(npcKnowledgeGame,'wolf','Расскажи о зданиях в деревне и где найти техника');
assert.equal(wolfBuildings.ok,true);
assert.match(wolfBuildings.message,/подвал старого дома/);
npcKnowledgeGame.locationId='sidorovich-bunker'; talkToNpc(npcKnowledgeGame,'sidorovich');
const sidorovichTrade=replyNpcFreeText(npcKnowledgeGame,'sidorovich','Что продаёшь и есть ли скидка?');
assert.equal(sidorovichTrade.ok,true);
assert.match(sidorovichTrade.message,/репутац/);
const sidorovichBuildings=replyNpcFreeText(npcKnowledgeGame,'sidorovich','Расскажи про здания и места торговли на Кордоне');
assert.equal(sidorovichBuildings.ok,true);
assert.match(sidorovichBuildings.message,/Маслов/);
npcKnowledgeGame.locationId='south-checkpoint'; talkToNpc(npcKnowledgeGame,'dzerzhinsky');
assert.match(replyNpcFreeText(npcKnowledgeGame,'dzerzhinsky','Что находится на блокпосту?').message,/казарм/);

// Ordinary stalkers can give, track and pay out a small one-item errand.
const personalQuestGame=createGame({name:'Мелкое поручение',faction:'loner'},[],START_BUDGET);
const localQuestNpc=personalQuestGame.ambientNpcs.find(npc=>npc.location==='rookie-village'&&npc.smallQuest);
assert.ok(localQuestNpc,'the village should have ordinary stalkers with small errands');
assert.ok(getAvailableStalkers(personalQuestGame,'rookie-village').some(npc=>npc.id===localQuestNpc.id));
talkToNpc(personalQuestGame,localQuestNpc.id);
assert.match(replyNpc(personalQuestGame,localQuestNpc.id,'работа'),/Принесёшь|нужна одна вещь/);
assert.equal(acceptPersonalQuest(personalQuestGame,localQuestNpc.id).ok,true);
addItem(personalQuestGame.inventory,localQuestNpc.smallQuest.itemId,1);
const cashBeforeErrand=personalQuestGame.money;
assert.equal(turnInPersonalQuest(personalQuestGame,localQuestNpc.id).ok,true);
assert.equal(personalQuestGame.money,cashBeforeErrand+localQuestNpc.smallQuest.reward);
assert.equal(localQuestNpc.smallQuest.status,'completed');

// Five belt slots, deterioration, Maslov's repair and reputation discounts are functional.
const equipmentMechanicsGame=createGame({name:'Снаряжение',faction:'loner'},[],START_BUDGET);
for(const [id,qty] of [['medusa',2],['stone-flower',1],['meat_chunk',1],['gravi',1]]) addItem(equipmentMechanicsGame.inventory,id,qty);
for(const id of ['medusa','medusa','stone-flower','meat_chunk','gravi']) assert.equal(toggleArtifactBelt(equipmentMechanicsGame,id).ok,true,`artifact ${id} should be wearable`);
assert.equal(equipmentMechanicsGame.artifactBelt.filter(Boolean).length,5,'the artifact belt must support five occupied slots');
addItem(equipmentMechanicsGame.inventory,'medusa',1);
assert.equal(toggleArtifactBelt(equipmentMechanicsGame,'medusa').ok,false,'the sixth artifact must not fit on a full belt');
assert.equal(removeArtifactFromBelt(equipmentMechanicsGame,2).ok,true);
assert.equal(equipmentMechanicsGame.artifactBelt.filter(Boolean).length,4);
addItem(equipmentMechanicsGame.inventory,'pm',1); addItem(equipmentMechanicsGame.inventory,'ammo9x18',1);
addItem(equipmentMechanicsGame.inventory,'leather',1); addItem(equipmentMechanicsGame.inventory,'mask-loner-basic',1);
equipmentMechanicsGame.money=10000; equipmentMechanicsGame.player.maskId='mask-loner-basic'; equipmentMechanicsGame.player.armorId='leather'; equipmentMechanicsGame.player.armor=8;
damageItemCondition(equipmentMechanicsGame,'pm',35); damageItemCondition(equipmentMechanicsGame,'leather',40); damageItemCondition(equipmentMechanicsGame,'mask-loner-basic',25);
const baseRepairCost=getRepairCost(equipmentMechanicsGame,'pm');
equipmentMechanicsGame.player.reputation=100;
assert.ok(getRepairCost(equipmentMechanicsGame,'pm')<baseRepairCost,'high reputation should reduce Maslov repair costs');
assert.equal(repairItemCondition(equipmentMechanicsGame,'pm').ok,true);
assert.equal(getItemCondition(equipmentMechanicsGame,'pm'),100);
assert.equal(repairItemCondition(equipmentMechanicsGame,'leather').ok,true);
assert.equal(repairItemCondition(equipmentMechanicsGame,'mask-loner-basic').ok,true);
const trader={id:'test-trader'}; const stock={id:'bread',price:100};
equipmentMechanicsGame.player.reputation=0; const standardPrice=getTradeBuyPrice(equipmentMechanicsGame,trader,stock);
equipmentMechanicsGame.player.reputation=100; assert.ok(getTradeBuyPrice(equipmentMechanicsGame,trader,stock)<standardPrice,'good reputation should lower trader prices');
const basementGame=createGame({name:'Техник',faction:'loner'},[],START_BUDGET); basementGame.currentAreaId='village-basement';
assert.ok(getAvailableStalkers(basementGame,'rookie-village').some(npc=>npc.id==='maslov'),'Maslov must be physically present in the old house basement');

// Combat wears down weapons and armour; radiation wears down gas masks.
const combatWearGame=createGame({name:'Износ',faction:'loner'},[],START_BUDGET);
addItem(combatWearGame.inventory,'pm',1); addItem(combatWearGame.inventory,'ammo9x18',1); addItem(combatWearGame.inventory,'leather',1);
combatWearGame.equippedWeaponId='pm'; combatWearGame.weaponMagazines={pm:8}; combatWearGame.player.armorId='leather'; combatWearGame.player.armor=8;
combatWearGame.activeEncounter={type:'bandit',name:'Проверочный противник',hp:300,maxHp:300,damage:15,count:1};
const randomBeforeCombat=Math.random; Math.random=()=>.99;
const weaponAttackResult=playerAttack(combatWearGame); Math.random=randomBeforeCombat;
assert.equal(weaponAttackResult.ok,true);
assert.ok(getItemCondition(combatWearGame,'pm')<100,'firing must wear down the weapon');
assert.ok(getItemCondition(combatWearGame,'leather')<100,'taking a hit must wear down armour');
combatWearGame.itemCondition.pm=0;
assert.equal(getBestWeapon(combatWearGame.inventory,combatWearGame),null,'a completely broken weapon must no longer be usable');
const maskWearGame=createGame({name:'Износ противогаза',faction:'loner'},[],START_BUDGET);
addItem(maskWearGame.inventory,'mask-loner-basic',1); maskWearGame.player.maskId='mask-loner-basic';
maskWearGame.clock.lastRealTime=Date.now(); maskWearGame.emission.nextAt=60; advanceGame(maskWearGame,10); advanceGame(maskWearGame,55);
assert.ok(getItemCondition(maskWearGame,'mask-loner-basic')<100,'a gas mask must deteriorate while filtering radiation during an emission');

// Military NPCs and player ranks/callsigns should stay synchronized as reputation grows.
const militaryGame=createGame({name:'Военный тест',faction:'military'},[],START_BUDGET);
assert.ok(militaryGame.player.callsign,'military player character should receive a callsign');
assert.equal(militaryGame.player.militaryRank,'Рядовой');
grantReputation(militaryGame,30);
assert.equal(militaryGame.player.rank,'Ефрейтор');
assert.equal(militaryGame.player.militaryRank,'Ефрейтор','the military rank label must update together with the public rank');
militaryGame.locationId='south-checkpoint';
const localMilitary=getAvailableStalkers(militaryGame,'south-checkpoint').filter(npc=>npc.faction==='military');
assert.ok(localMilitary.length>0);
assert.ok(localMilitary.every(npc=>npc.militaryRank&&npc.callsign),'military NPCs must have both rank and callsign');

// Item details and the Maslov workshop render compact, useful information.
const detailState={game:equipmentMechanicsGame,ui:{modal:'item-details',itemDetailsId:'pm'}};
const itemDetailsHtml=renderModal(detailState);
assert.ok(itemDetailsHtml.includes('ПМм')&&itemDetailsHtml.includes('Урон')&&itemDetailsHtml.includes('Состояние'),'item details should show description, stats and durability');
damageItemCondition(equipmentMechanicsGame,'pm',30);
const repairState={game:equipmentMechanicsGame,ui:{modal:'repair-panel'}};
const repairHtml=renderModal(repairState);
assert.ok(repairHtml.includes('Мастерская Маслова')&&repairHtml.includes('Починить'),'the basement technician should offer item repair actions');

console.log('Smoke tests passed: PDA/map modes, imported NPC/faction/quest artwork, title-only music catalogue, personal barter migration, contextual NPC/Game Master dialogue, bandit dialogue, proportional inventory layout, quest visibility/progress, trade overlays, RP exploration, profile and combat.');

// The in-browser ZIP importer reads audio locally and handles regular ZIP central directories.
function makeStoredZip(fileName, content) {
  const encoder=new TextEncoder();
  const name=encoder.encode(fileName);
  const data=content instanceof Uint8Array?content:new Uint8Array(content);
  const local=new Uint8Array(30+name.length+data.length);
  const localView=new DataView(local.buffer);
  localView.setUint32(0,0x04034b50,true); localView.setUint16(4,20,true);
  localView.setUint16(8,0,true); localView.setUint32(18,data.length,true); localView.setUint32(22,data.length,true);
  localView.setUint16(26,name.length,true); local.set(name,30); local.set(data,30+name.length);
  const central=new Uint8Array(46+name.length);
  const centralView=new DataView(central.buffer);
  centralView.setUint32(0,0x02014b50,true); centralView.setUint16(4,20,true); centralView.setUint16(6,20,true);
  centralView.setUint16(10,0,true); centralView.setUint32(20,data.length,true); centralView.setUint32(24,data.length,true);
  centralView.setUint16(28,name.length,true); centralView.setUint32(42,0,true); central.set(name,46);
  const end=new Uint8Array(22); const endView=new DataView(end.buffer);
  endView.setUint32(0,0x06054b50,true); endView.setUint16(8,1,true); endView.setUint16(10,1,true);
  endView.setUint32(12,central.length,true); endView.setUint32(16,local.length,true);
  const zip=new Blob([local,central,end]); Object.defineProperty(zip,'name',{value:'test-music.zip'}); return zip;
}
const tinyMusicZip=makeStoredZip('Music/test-track.mp3',new Uint8Array([0x49,0x44,0x33,0x00]));
const importedZipTracks=await extractAudioFilesFromZip(tinyMusicZip);
assert.equal(importedZipTracks.length,1,'ZIP import should extract supported audio files');
assert.equal(importedZipTracks[0].name,'test-track.mp3');
assert.equal(importedZipTracks[0].size,4);
assert.equal(importedZipTracks[0].type,'audio/mpeg');
