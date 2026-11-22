import { LOCATIONS, FACTIONS, SQUADS, ITEMS, QUESTS, NPCS, EXPLORE_SPOTS } from '../data/catalog.js';
import { advanceTime, createClock, getGameDateTime, syncRealElapsed } from './game-clock.js';
import { addItem, getItem, removeItem, countItem } from './inventory.js';
import { rememberEntity } from './russian-language.js';
import { generateDialogueReply } from './dialogue-engine.js';

const pick = (array) => array[Math.floor(Math.random() * array.length)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const getLocation = (id) => LOCATIONS.find(location => location.id === id);
export const getFaction = (id) => FACTIONS.find(faction => faction.id === id);

// Estimated walking time uses the actual Cordon map proportions (768×1536).
// The map is treated as roughly 2 m per source pixel; average Zone walking
// speed is reduced to 3 km/h for mud, debris, detours and cautious movement.
export function getTravelMinutes(fromId, toId) {
  const from = getLocation(fromId);
  const to = getLocation(toId);
  if (!from || !to || from.id === to.id) return 0;
  const dx = ((Number(from.x) || 0) - (Number(to.x) || 0)) * 7.68;
  const dy = ((Number(from.y) || 0) - (Number(to.y) || 0)) * 15.36;
  const mapPixels = Math.hypot(dx, dy);
  const metres = mapPixels * 2;
  const rawMinutes = metres / 3000 * 60;
  // Round to a five-minute interval so the estimate reads naturally in the PDA.
  return Math.max(5, Math.round(rawMinutes / 5) * 5);
}


const RANDOM_TRADER_NAMES = ['Серый','Муха','Гвоздь','Тихий','Пахарь','Клык','Рыжий','Шустрый','Филин','Крот'];
const getItemName = (id) => ({medusa:'Медуза',meat_chunk:'Ломоть мяса',gravi:'Грави'}[id] || id);
const RANDOM_TRADER_STOCK = ['bread','water','canned','sausage','bandage','ammo9x18','ammo9x19','ammo545','shells','knife','vodka','boltpack','ai2','antirad','binoculars','pm'];

function makeStock(ids, multiplier=1) {
  return [...new Set(ids)].map(id=>{
    const item=getItem(id);
    return item ? { id, qty:1+Math.floor(Math.random()*2), price:Math.max(1,Math.ceil(item.price*multiplier)) } : null;
  }).filter(Boolean);
}

function createTraderRecords() {
  const fixed = NPCS.filter(npc=>npc.trader).map(npc=>({
    id:npc.id, location:npc.location, stock:makeStock(npc.stockIds||[],npc.priceMultiplier||1),
    buyMultiplier:npc.buyMultiplier||.45
  }));
  const random = Array.from({length:4},(_,index)=>{
    const first=pick(RANDOM_TRADER_NAMES);
    const faction=pick(FACTIONS);
    const possible=LOCATIONS.filter(location=>location.id!=='sidorovich-bunker' && location.id!=='north-checkpoint');
    return {
      id:`wanderer-${index+1}`, name:first, role:'Бродячий торговец', group:'Путники', faction:faction.id,
      location:pick(possible).id, icon:faction.icon, greeting:'Поторопись, сталкер. Я не задерживаюсь на одном месте.',
      stock:makeStock(RANDOM_TRADER_STOCK.filter(()=>Math.random()>.42),1.28), buyMultiplier:.43,
      priceMultiplier:1.28, trader:true, random:true
    };
  });
  return { fixed, random };
}

function ensureTraderRecords(game) {
  if (!Array.isArray(game.traders) || !game.traders.length) {
    const records=createTraderRecords();
    game.traders=records.fixed;
    game.randomTraders=records.random;
  }
  if (!Array.isArray(game.randomTraders)) game.randomTraders=createTraderRecords().random;
  const forbiddenResale=new Set(['tail','flesh-eye','medusa','meat_chunk','gravi']);
  for (const trader of [...game.traders,...game.randomTraders]) {
    if (Array.isArray(trader.stock)) trader.stock=trader.stock.filter(entry=>!forbiddenResale.has(entry.id));
  }
}

function findTrader(game, traderId) {
  ensureTraderRecords(game);
  const profile=NPCS.find(npc=>npc.id===traderId && npc.trader);
  const record=game.traders.find(entry=>entry.id===traderId) || game.randomTraders.find(entry=>entry.id===traderId);
  if (!record) return null;
  return { profile, record, trader:profile ? {...profile,...record} : {...record} };
}

function updatePurchasedCounters(game, itemId, direction=1) {
  if (['ammo9x18','ammo9x19','ammo545','shells'].includes(itemId)) {
    const amount=itemId==='shells'?8:12;
    game.ammoRounds ??= {};
    game.ammoRounds[itemId]=Math.max(0,(game.ammoRounds[itemId]||0)+amount*direction);
  }
  if (itemId==='boltpack') game.boltsRemaining=Math.max(0,(game.boltsRemaining||0)+10*direction);
}

export function createGame(character, starterInventory = [], money = 0) {
  const faction = getFaction(character.faction);
  return {
    clock: createClock(),
    emission:{ nextAt:Math.floor((9+Math.random()*2)*1440), active:false, startedAt:null, endsAt:null, lastWarningAt:0 },
    player: {
      hp:100, maxHp:100, stamina:100, radiation:0, hunger:12, thirst:18, stress:0,
      reputation:0, rating:0, rank:faction?.rank || 'Новичок', armor:0, maskId:null, sheltered:false, shelterSpotId:null,
      faction:character.faction, kills:0, artifacts:0, questsDone:0, locationsVisited:[faction?.spawn || 'rookie-village']
    },
    money,
    inventory:starterInventory.map(entry => ({ ...entry })),
    ammoRounds:{ ammo9x18:countItem(starterInventory,'ammo9x18')*12, ammo9x19:countItem(starterInventory,'ammo9x19')*12, ammo545:countItem(starterInventory,'ammo545')*30, shells:countItem(starterInventory,'shells')*8 },
    boltsRemaining:countItem(starterInventory,'boltpack')*10,
    locationId:faction?.spawn || 'rookie-village',
    quests:QUESTS.map(quest => ({ ...quest, status:'available', progress:0 })),
    sidorovichJobs:{ active:null, cooldownUntil:0, completed:{ tails:0, collector:0, medusa:0 } },
    wolfDogQuest:null,
    log:[{ type:'system', text:`15 апреля. Ты прибыл на Кордон. Место старта: ${getLocation(faction?.spawn)?.name || 'Деревня новичков'}.` }],
    searchedAt:{},
    searchedAreas:{},
    pendingDiscovery:null,
    activeLoot:null,
    lootContainers:{},
    brokenCrates:{},
    stashes:{
      'cordon-basement':[{id:'bandage',qty:1},{id:'canned',qty:2},{id:'water',qty:1}],
      'atp-second-floor':[{id:'ammo9x18',qty:2},{id:'boltpack',qty:1},{id:'flash',qty:1}],
      'barracks-locker':[{id:'ammo545',qty:1},{id:'milmed',qty:1},{id:'antirad',qty:1}]
    },
    dialogueHistory:[],
    lootRespawnMinutes:180,
    squads:SQUADS.map(squad => ({ ...squad })),
    ...(() => { const traders=createTraderRecords(); return { traders:traders.fixed, randomTraders:traders.random }; })(),
    lastSquadMove:0,
    activeEncounter:null,
    artifactHunt:null,
    dialogueNpcId:null,
    anomalyStates:{},
    stashMarks:[],
    messages:[],
    playMinutes:0,
    distanceTravelled:0,
    currentDescription:'',
    weather:pick(['Пасмурно','Мелкий дождь','Сухой ветер','Низкая облачность']),
    visitedAt:{ [faction?.spawn || 'rookie-village']:0 }
  };
}

export function addLog(game, text, type='system') {
  game.log.unshift({ type, text, at:getGameDateTime(game.clock).full });
  game.log = game.log.slice(0, 80);
}

function updateRank(game) {
  const faction = getFaction(game.player.faction);
  const rating = game.player.rating;
  if (game.player.faction === 'loner') game.player.rank = rating >= 80 ? 'Опытный' : rating >= 30 ? 'Бывалый' : 'Новичок';
  else if (game.player.faction === 'bandit') game.player.rank = rating >= 80 ? 'Авторитет' : rating >= 30 ? 'Бывалый' : 'Шпана';
  else game.player.rank = rating >= 80 ? 'Сержант' : rating >= 30 ? 'Ефрейтор' : 'Рядовой';
  if (!faction) game.player.rank = 'Новичок';
}

export function grantReputation(game, amount) {
  game.player.reputation += amount;
  game.player.rating = Math.max(0, game.player.rating + amount);
  updateRank(game);
}

export function progressQuest(game, condition) {
  const quest = game.quests.find(entry => entry.condition === condition && entry.status === 'active');
  if (!quest) return null;
  quest.status = 'completed';
  game.money += quest.reward;
  game.player.questsDone += 1;
  grantReputation(game, 5);
  addLog(game, `Задание «${quest.title}» выполнено. Получено ${quest.reward} RU и +5 рейтинга.`);
  return quest;
}

export function acceptWorldQuest(game, questId) {
  const quest=game.quests?.find(entry=>entry.id===questId);
  if (!quest) return {ok:false,message:'Такого задания нет.'};
  if (quest.status!=='available') return {ok:false,message:'Это задание уже взято или завершено.'};
  if (quest.id==='wolf-dog-pack') return acceptWolfDogQuest(game);
  quest.status='active';
  quest.progress=0;
  quest.acceptedAt=game.clock.worldMinutes;
  addLog(game,`Принято задание «${quest.title}».`,'player');
  return {ok:true,quest,message:`Задание «${quest.title}» добавлено в КПК. ${quest.text}`};
}

function tickVitals(game, minutes) {
  const hours = minutes / 60;
  game.player.hunger = clamp((game.player.hunger||0) + hours * 1.3, 0, 100);
  game.player.thirst = clamp((game.player.thirst||0) + hours * 1.8, 0, 100);
  game.player.stamina = clamp(game.player.stamina + hours * 1.2, 0, 100);
  if (game.player.hunger >= 90 || game.player.thirst >= 95) game.player.hp = Math.max(1, game.player.hp - Math.ceil(hours * 1.5));
}

export function simulateWorld(game) {
  const due = game.clock.worldMinutes - game.lastSquadMove;
  if (due < 90) return;
  const cycles = Math.floor(due / 90);
  game.lastSquadMove += cycles * 90;
  for (let i=0; i<cycles; i++) {
    for (const squad of game.squads) {
      if (Math.random() > 0.38) continue;
      const current = getLocation(squad.location);
      const options = (current?.neighbors || []).filter(id => id !== squad.location);
      if (options.length) {
        squad.destination = pick(options);
        squad.location = squad.destination;
        squad.destination = null;
      }
    }
    ensureTraderRecords(game);
    for (const trader of game.randomTraders) {
      if (Math.random() > .48) continue;
      const current=getLocation(trader.location);
      const options=(current?.neighbors||[]).filter(id=>id!==trader.location);
      if (options.length) trader.location=pick(options);
    }
  }
}

function ensureEmission(game) {
  game.emission ||= { nextAt:Math.floor((9+Math.random()*2)*1440), active:false, startedAt:null, endsAt:null, lastWarningAt:0, warningSent:false };
  if (!Number.isFinite(game.emission.nextAt) || game.emission.nextAt<=0) game.emission.nextAt=(game.clock.worldMinutes||0)+Math.floor((9+Math.random()*2)*1440);
  if (typeof game.emission.active!=='boolean') game.emission.active=false;
  if (typeof game.emission.warningSent!=='boolean') game.emission.warningSent=false;
  return game.emission;
}

export function takeShelter(game, spotId=null) {
  if (game.activeEncounter) return {ok:false,message:'Во время боя нельзя спокойно пережидать выброс.'};
  const spots=EXPLORE_SPOTS.filter(spot=>spot.locationId===game.locationId && spot.kind==='search');
  const candidate=spotId ? spots.find(spot=>spot.id===spotId) : spots.find(spot=>spot.shelter);
  if (!candidate || !candidate.shelter) return {ok:false,message:'В этом месте нет надёжного укрытия. Найди помещение, подвал, кабину или служебное убежище.'};
  game.currentAreaId=candidate.id;
  game.player.sheltered=true;
  game.player.shelterSpotId=candidate.id;
  game.player.shelterLocationId=game.locationId;
  addLog(game,`Ты укрылся: ${candidate.name}. Во время выброса здесь можно переждать опасную волну.`,'player');
  return {ok:true,message:`Ты укрылся в месте «${candidate.name}». Если начнётся выброс, здесь будет безопаснее.`};
}

export function leaveShelter(game) {
  game.player.sheltered=false;
  game.player.shelterSpotId=null;
  game.player.shelterLocationId=null;
  if (game.currentAreaId) game.currentAreaId=null;
}

function processEmission(game, fromMinute, toMinute) {
  const emission=ensureEmission(game);
  let cursor=fromMinute;
  // Give the player a clear one-hour warning before the pulse. If a tab was
  // suspended, the warning is still logged on return as long as the event has not begun.
  if (!emission.active && !emission.warningSent && toMinute < emission.nextAt && toMinute >= emission.nextAt-60) {
    emission.warningSent=true;
    emission.lastWarningAt=toMinute;
    addLog(game,'Предупреждение: по радио передают, что выброс ожидается примерно через час. Найди надёжное укрытие и пополни запас воды.','danger');
  }
  while (cursor < toMinute + 0.0001) {
    if (!emission.active && emission.nextAt <= toMinute) {
      const start=Math.max(cursor, emission.nextAt);
      const ends=emission.nextAt+24;
      emission.active=true; emission.startedAt=emission.nextAt; emission.endsAt=ends;
      addLog(game,'Сирены воют над Кордоном. Начинается выброс — немедленно укройся, если ещё не сделал этого.','danger');
      // The warning phase lasts two simulated minutes. The dangerous pulse follows.
      const dangerStart=emission.nextAt+2;
      const overlap=Math.max(0,Math.min(toMinute,ends)-Math.max(fromMinute,dangerStart));
      if (overlap>0 && !(game.player.sheltered && game.player.shelterLocationId===game.locationId)) {
        const dose=Math.max(1,Math.ceil(overlap*1.7));
        game.player.radiation=Math.min(100,(game.player.radiation||0)+dose);
        game.player.hp=Math.max(1,game.player.hp-Math.ceil(overlap/5));
        addLog(game,`Ты остался снаружи во время выброса. Радиация +${dose}%, здоровье ухудшилось. Нужно было укрыться.`,'danger');
      } else if (overlap>0) addLog(game,'Выброс накрыл Кордон. Ты переждал его в укрытии — ущерба удалось избежать.','system');
      if (toMinute>=ends) {
        emission.active=false; emission.startedAt=null; emission.endsAt=null;
        emission.nextAt=ends+Math.floor((9+Math.random()*2)*1440); emission.warningSent=false;
        addLog(game,'Выброс отступил. Можно осторожно покинуть укрытие и осмотреться.','system');
      }
      cursor=Math.max(cursor,ends);
      if (cursor>=toMinute) break;
    } else if (emission.active) {
      const start=Math.max(fromMinute,emission.startedAt+2);
      const end=Math.min(toMinute,emission.endsAt);
      if (end>start && !(game.player.sheltered && game.player.shelterLocationId===game.locationId)) {
        const dose=Math.max(1,Math.ceil((end-start)*1.7));
        game.player.radiation=Math.min(100,(game.player.radiation||0)+dose);
        game.player.hp=Math.max(1,game.player.hp-Math.ceil((end-start)/5));
        addLog(game,`Выброс застал тебя снаружи. Радиация +${dose}%.`,'danger');
      }
      if (toMinute>=emission.endsAt) {
        const ended=emission.endsAt;
        emission.active=false; emission.startedAt=null; emission.endsAt=null;
        emission.nextAt=ended+Math.floor((9+Math.random()*2)*1440); emission.warningSent=false;
        addLog(game,'Выброс закончился. Сирены постепенно стихают.','system');
      }
      cursor=toMinute;
      break;
    } else break;
  }
}

export function advanceGame(game, minutes) {
  const before=game.clock.worldMinutes||0;
  const realElapsed=syncRealElapsed(game);
  advanceTime(game, minutes);
  const after=game.clock.worldMinutes||0;
  game.playMinutes += minutes+realElapsed;
  tickVitals(game, minutes+realElapsed);
  processEmission(game,before,after);
  simulateWorld(game);
}

export function describeLocation(game, locationId = game.locationId) {
  const location = getLocation(locationId);
  if (!location) return 'Ты не можешь определить своё местоположение.';
  rememberEntity(game, location, 'location');
  const time = getGameDateTime(game.clock);
  const squads = game.squads.filter(squad => squad.location === locationId);
  const extras = [
    'Где-то вдалеке хлопнула дверь.',
    'Ветер шевелит сухую траву, под ногами хрустит мелкий мусор.',
    'На земле заметны свежие следы, но определить, кому они принадлежат, трудно.',
    'Место кажется тихим. Слишком тихим для Кордона.',
    'Старая металлическая конструкция тихо поскрипывает.'
  ];
  const hazardText = location.hazards?.length ? location.hazards.map(h => h === 'radiation' ? 'В районе чувствуется радиационный фон.' : 'Рядом ощущается нестабильное гравитационное поле.').join(' ') : '';
  const squadText = squads.length ? ` Здесь находится: ${squads.map(s => s.name).join(', ')}.` : '';
  const text = `${location.name}. ${location.desc} ${pick(extras)} ${hazardText}${squadText} Погода: ${game.weather.toLowerCase()}. ${time.time}.`;
  game.currentDescription = text;
  return text;
}

export function searchLocation(game, { corpse=false } = {}) {
  const location = getLocation(game.locationId);
  if (!location) return { ok:false, message:'Неизвестная локация.' };
  const now = game.clock.worldMinutes;
  const last = game.searchedAt[location.id];
  if (last !== undefined && now - last < game.lootRespawnMinutes) {
    const remaining = Math.ceil((game.lootRespawnMinutes - (now-last))/60);
    return { ok:false, message:`Ты уже обыскивал это место. Новые припасы могут появиться примерно через ${remaining} ч.` };
  }
  game.searchedAt[location.id] = now;
  const lootId = pick(location.loot || ['bread','water','bandage']);
  const item = getItem(lootId);
  const chance = Math.random();
  let message;
  if (chance < 0.18) {
    const cash = 30 + Math.floor(Math.random()*120);
    game.money += cash;
    message = `${corpse ? 'В кармане погибшего' : 'Под обломками'} нашлось ${cash} RU.`;
  } else if (item) {
    const quantity = ['bread','water','ammo9x18','bandage'].includes(lootId) && Math.random() < .25 ? 2 : 1;
    const result = addItem(game.inventory, lootId, quantity);
    if (result.ok) { game.lastMentionedItemId=lootId; rememberEntity(game,item,'item'); }
    if (result.ok && ['ammo9x18','ammo9x19','ammo545','shells'].includes(lootId)) game.ammoRounds[lootId] = (game.ammoRounds[lootId] || 0) + quantity * (lootId === 'shells' ? 8 : lootId === 'ammo545' ? 30 : 12);
    if (result.ok && lootId === 'boltpack') game.boltsRemaining = (game.boltsRemaining || 0) + quantity * 10;
    message = result.ok ? `${corpse ? 'В вещах погибшего' : 'В укромном месте'} найдено: ${item.name}${quantity > 1 ? ` ×${quantity}` : ''}.` : `Ты заметил ${item.name}, но не смог забрать: ${result.reason}`;
  } else {
    message = 'Ничего полезного найти не удалось.';
  }
  if (corpse) message = message.replace('В укромном месте', 'В вещах погибшего');
  addLog(game, message);
  if (location.id === 'stop') progressQuest(game, 'search:stop');
  return { ok:true, message };
}


export function getExploreSpots(locationId) {
  const existing=EXPLORE_SPOTS.filter(spot=>spot.locationId===locationId);
  if (!existing.some(spot=>spot.id==='area-outside')) existing.push({id:'area-outside',locationId,name:'Снаружи · открытая территория',aliases:['снаружи','территория','двор','улица','вокруг'],kind:'search',shelter:false,description:'Открытый участок местности. Здесь можно осмотреть следы, брошенные вещи и подходы к укрытиям.',loot:(getLocation(locationId)?.loot||['bread','water','bandage']).filter(id=>!['medusa','meat_chunk','gravi','tail','flesh-eye'].includes(id))});
  return existing;
}

export function getActiveLootItems(game) {
  const active=game?.activeLoot;
  if (!active) return [];
  if (active.kind==='storage') return game.stashes?.[active.sourceId] || [];
  return game.lootContainers?.[active.sourceId]?.items || [];
}

export function breakContainer(game, spotId) {
  const spot=getExploreSpots(game.locationId).find(entry=>entry.id===spotId);
  if(!spot||spot.kind!=='breakable') return {ok:false,message:'Здесь нет ящика, который можно вскрыть.'};
  game.brokenCrates ||= {};
  game.lootContainers ||= {};
  if(!game.brokenCrates[spotId]) {
    const pool=[...new Set(spot.loot||[])].filter(id=>getItem(id));
    const shuffled=pool.sort(()=>Math.random()-.5);
    const count=Math.min(shuffled.length,1+Math.floor(Math.random()*3));
    game.lootContainers[spotId]={items:shuffled.slice(0,count).map(id=>({id,qty:1})),searchedAt:game.clock.worldMinutes};
    game.brokenCrates[spotId]=true;
    advanceGame(game,4);
    addLog(game,`Ты вскрыл ящик: ${spot.name}. Внутри обнаружились вещи.`);
  }
  game.activeLoot={kind:'loot',sourceId:spotId,title:spot.name};
  return {ok:true,message:game.lootContainers[spotId]?.items?.length?'Ящик вскрыт. Осмотри содержимое.':'Ящик уже вскрыт и пуст.'};
}

export function registerCorpseLoot(game, enemy) {
  if (!enemy) return null;
  game.lootContainers ||= {};
  game.corpseCounter=(game.corpseCounter||0)+1;
  const corpseId=`corpse-${game.corpseCounter}`;
  const pools={
    'blind-dog':['tail','meat_chunk','water'],
    flesh:['flesh-eye','meat_chunk','canned'],
    military:['ammo545','bandage','water','flash','pa8'],
    bandit:['ammo9x18','bread','vodka','bandage','flash'],
    stalker:['ammo9x18','bread','water','bandage','flash'],
    default:['bread','water','bandage','flash']
  };
  const pool=pools[enemy.type]||pools.default;
  const shuffled=[...new Set(pool)].filter(id=>getItem(id)).sort(()=>Math.random()-.5);
  const count=Math.min(shuffled.length,1+Math.floor(Math.random()*3));
  game.lootContainers[corpseId]={items:shuffled.slice(0,count).map(id=>({id,qty:1})),searchedAt:game.clock.worldMinutes,corpse:true};
  game.activeLoot={kind:'loot',sourceId:corpseId,title:`Вещи: ${enemy.name||'погибшего'}`};
  addLog(game,`Ты можешь обыскать останки: ${enemy.name||'противника'}.`);
  return corpseId;
}

export function openStorage(game, storageId, title='Личное хранилище') {
  game.stashes ||= {};
  if (!Array.isArray(game.stashes[storageId])) game.stashes[storageId]=[];
  game.activeLoot={kind:'storage',sourceId:storageId,title};
  return {ok:true,message:`Открыто хранилище: ${title}.`};
}

export function shelterForCurrentLocation(game) { return takeShelter(game); }

export function startAreaSearch(game, spotId) {
  const spot=getExploreSpots(game.locationId).find(entry=>entry.id===spotId);
  if (!spot) return {ok:false,message:'Неизвестное место для исследования.'};
  if (spot.locationId!==game.locationId) return {ok:false,message:'Это место находится в другой локации.'};
  if (spot.kind==='campfire') return sitAtCampfire(game,spotId);
  if (spot.kind==='storage') return openStorage(game,spot.storageId,spot.name);
  if (spot.kind==='breakable') return breakContainer(game,spotId);
  game.currentAreaId=spotId;
  game.lootContainers ||= {};
  game.searchedAreas ||= {};
  const now=game.clock.worldMinutes;
  const previous=game.lootContainers[spotId];
  if (!previous || (!previous.items?.length && now-(previous.searchedAt||0)>=180)) {
    const pool=[...new Set(spot.loot||[])].filter(id=>getItem(id));
    if (!pool.length) return {ok:false,message:'Здесь больше нечего искать.'};
    const shuffled=pool.sort(()=>Math.random()-.5);
    const count=Math.min(shuffled.length,1+Math.floor(Math.random()*4));
    const items=shuffled.slice(0,count).map(id=>({id,qty:1+((Math.random()>.82)?1:0)}));
    game.lootContainers[spotId]={items,searchedAt:now};
    game.searchedAreas[spotId]=now;
  } else if (!previous.items?.length) {
    const hours=Math.ceil((180-(now-(previous.searchedAt||now)))/60);
    return {ok:false,message:`Здесь уже всё обыскали. Новые вещи могут появиться примерно через ${Math.max(1,hours)} ч.`};
  }
  game.activeLoot={kind:'loot',sourceId:spotId,title:spot.name};
  const items=game.lootContainers[spotId].items;
  const options=items.map(entry=>({id:entry.id,name:getItem(entry.id)?.name||entry.id,description:getItem(entry.id)?.desc||'Старая находка.'}));
  game.pendingDiscovery={spotId,options,createdAt:now};
  advanceGame(game,6);
  addLog(game,`Ты обыскал: ${spot.name}. Найденные вещи можно забрать или оставить.`);
  return {ok:true,spot,items,options,message:items.length?`Обыск завершён: найдено ${items.length} видов вещей.`:'В этом месте ничего не осталось.'};
}

export function claimAreaFind(game, itemId) {
  const pending=game.pendingDiscovery;
  if (!pending) return {ok:false,message:'Сейчас нет незавершённого осмотра.'};
  const choice=pending.options.find(entry=>entry.id===itemId);
  if (!choice) return {ok:false,message:'Такой находки в этом месте нет.'};
  const result=addItem(game.inventory,itemId,1);
  if (!result.ok) return {ok:false,message:`Не удалось забрать находку: ${result.reason}`};
  const container=game.lootContainers?.[pending.spotId];
  const lootStack=container?.items?.find(entry=>entry.id===itemId);
  if(lootStack){lootStack.qty-=1;if(lootStack.qty<=0)container.items.splice(container.items.indexOf(lootStack),1);}
  if (['ammo9x18','ammo9x19','ammo545','shells'].includes(itemId)) {
    const capacity=itemId==='shells'?8:itemId==='ammo545'?30:12;
    game.ammoRounds ||= {};
    game.ammoRounds[itemId]=(game.ammoRounds[itemId]||0)+capacity;
  }
  if (itemId==='boltpack') game.boltsRemaining=(game.boltsRemaining||0)+10;
  game.searchedAreas ||= {};
  game.searchedAreas[pending.spotId]=game.clock.worldMinutes;
  game.lastMentionedItemId=itemId;
  game.pendingDiscovery=null;
  addLog(game,`Найдено: ${choice.name}.`);
  return {ok:true,message:`Ты забрал: ${choice.name}. Остальные вещи остались на месте.`};
}

export function sitAtCampfire(game, spotId=null) {
  const spot=spotId ? EXPLORE_SPOTS.find(entry=>entry.id===spotId) : EXPLORE_SPOTS.find(entry=>entry.locationId===game.locationId && entry.kind==='campfire');
  if (!spot || spot.locationId!==game.locationId || spot.kind!=='campfire') return {ok:false,message:'В этой локации нет подходящего костра.'};
  if (game.activeEncounter) return {ok:false,message:'Во время боя нельзя спокойно сидеть у костра.'};
  game.currentAreaId=spot.id;
  advanceGame(game,15);
  game.player.stress=Math.max(0,(game.player.stress||0)-8);
  game.player.stamina=Math.min(100,(game.player.stamina||0)+6);
  const ambience=[
    'Пламя потрескивает, искры поднимаются в холодный воздух. Несколько минут ты просто смотришь на огонь.',
    'Рядом переговариваются сталкеры. Разговоры затихают, когда ветер приносит из темноты далёкий лай.',
    'Ты устраиваешься поудобнее и греешь руки. На короткое время Зона кажется почти спокойной.',
    'Кто-то подкладывает в костёр сухую доску. Дым стелется над землёй, а разговоры идут вполголоса.'
  ];
  const message=`Ты присел у костра. ${pick(ambience)} Немного удалось перевести дух.`;
  addLog(game,message,'player');
  return {ok:true,message};
}

export function travelTo(game, destinationId) {
  const current = getLocation(game.locationId);
  const destination = getLocation(destinationId);
  if (!current || !destination) return { ok:false, message:'Неизвестный маршрут.' };
  if (!current.neighbors.includes(destinationId)) return { ok:false, message:'Прямого пути туда нет. Проверь соседние переходы на карте.' };
  if (game.activeEncounter) return { ok:false, message:'Сначала разберись с текущей угрозой.' };
  const travelMinutes = getTravelMinutes(current.id, destination.id);
  advanceGame(game, travelMinutes);
  leaveShelter(game);
  game.currentAreaId=null;
  game.locationId = destinationId;
  game.distanceTravelled += 1;
  if (!game.player.locationsVisited.includes(destinationId)) game.player.locationsVisited.push(destinationId);
  game.visitedAt[destinationId] = game.clock.worldMinutes;
  addLog(game, `Ты добрался пешком: ${current.name} → ${destination.name}. В пути: ${travelMinutes} мин.`);
  progressQuest(game, `visit:${destinationId}`);
  describeLocation(game);
  let hazardNotice = '';
  if (destination.hazards?.length && !game.anomalyStates[destinationId]) {
    if (destination.hazards.includes('radiation')) {
      const dose = 3 + Math.floor(Math.random()*5);
      game.player.radiation = Math.min(100, game.player.radiation + dose);
      hazardNotice += ` Дозиметр зашумел: радиация +${dose}%.`;
    }
    if (destination.hazards.includes('gravity')) {
      const damage = 2 + Math.floor(Math.random()*5);
      game.player.hp = Math.max(1, game.player.hp - damage);
      hazardNotice += ` Гравитационный рывок сбил тебя с ног: здоровье -${damage}.`;
    }
  }
  const danger = destination.hazards?.length ? .22 : .1;
  if (Math.random() < danger) {
    const fleshZone=['pig-farm','farmstead','forest-camp'].includes(destination.id);
    const useFlesh=fleshZone && Math.random()<.55;
    game.activeEncounter = useFlesh
      ? { type:'flesh', name:'Плоть', hp:76, maxHp:76, damage:11+Math.floor(Math.random()*5), count:1, image:'' }
      : { type:'blind-dog', name:'Слепой пёс', hp:55, maxHp:55, damage:7+Math.floor(Math.random()*7), count:Math.random()<.3?2:1, imageIndex:Math.floor(Math.random()*2) };
    const message = useFlesh ? 'Из-за развалин выходит Плоть. Мутант тяжело переступает копытами и готовится к атаке.' : 'Из-за укрытия выскакивает слепой пёс! Он замечает тебя и готовится броситься.';
    addLog(game, message, 'danger');
    return { ok:true, message:`Путь занял ${travelMinutes} мин. ${message}${hazardNotice}`, encounter:true, travelMinutes };
  }
  return { ok:true, message:`Путь занял ${travelMinutes} мин. Ты добрался до локации «${destination.name}». ${describeLocation(game)}${hazardNotice}`, travelMinutes };
}

export function scoutLocation(game, destinationId) {
  const current=getLocation(game.locationId);
  const destination=getLocation(destinationId);
  if (!destination || !current?.neighbors.includes(destinationId)) return { ok:false, message:'Бинокль позволяет осматривать только соседние локации.' };
  if (!countItem(game.inventory,'binoculars')) return { ok:false, message:'Для осмотра соседней локации нужен бинокль.' };
  const squads=game.squads.filter(s=>s.location===destinationId);
  const hazard=destination.hazards?.length ? (destination.hazards.includes('radiation')?' На участке может быть радиационный фон.':' В районе замечены признаки гравитационной аномалии.') : '';
  const people=squads.length ? ` Различимы отряды: ${squads.map(s=>s.name).join(', ')}.` : ' Движения крупных групп не замечено.';
  return { ok:true, message:`Осмотр через бинокль: ${destination.name}. ${destination.desc}${hazard}${people}` };
}

function getDialogueNpc(game, npcId) {
  return NPCS.find(entry => entry.id === npcId) || (game.randomTraders||[]).find(entry => entry.id === npcId) || null;
}

export function getSidorovichJobState(game) {
  game.sidorovichJobs ||= { active:null, cooldownUntil:0, completed:{ tails:0, collector:0, medusa:0 } };
  const jobs=game.sidorovichJobs;
  if (jobs.active?.type==='tails') jobs.active.progress=countItem(game.inventory,'tail');
  if (jobs.active?.type==='medusa') jobs.active.progress=countItem(game.inventory,'medusa');
  return jobs;
}

export function acceptSidorovichJob(game) {
  if (game.locationId!=='sidorovich-bunker') return {ok:false,message:'Сначала вернись в подвал Сидоровича.'};
  const jobs=getSidorovichJobState(game);
  if (jobs.active) return {ok:false,message:'У тебя уже есть его поручение. Сначала закончи его.'};
  if (game.clock.worldMinutes<jobs.cooldownUntil) return {ok:false,message:'Сидорович пока не подготовил новую работу. Загляни позже.'};
  const types=['tails','collector','medusa'];
  const type=types[Math.floor(Math.random()*types.length)];
  if (type==='tails') jobs.active={type,title:'Крутить хвосты собакам',description:'Принеси Сидоровичу 5 хвостов обычных слепых псов. Псевдособаки не подходят.',target:5,progress:countItem(game.inventory,'tail'),reward:850};
  if (type==='collector') {
    const candidates=(game.randomTraders||[]).filter(t=>t.faction==='loner');
    const debtor=candidates[Math.floor(Math.random()*candidates.length)] || (game.randomTraders||[])[0];
    if (!debtor) return {ok:false,message:'На Кордоне пока не нашлось подходящего должника.'};
    debtor.faction='loner'; debtor.group='Одиночки'; debtor.role='Сталкер-должник';
    jobs.active={type,title:'Коллектор',description:`Найди сталкера ${debtor.name} (${getLocation(debtor.location)?.name||'местоположение неизвестно'}) и поговори с ним о долге Сидоровичу. Затем вернись с докладом.`,targetNpcId:debtor.id,targetName:debtor.name,contacted:false,reward:600};
  }
  if (type==='medusa') jobs.active={type,title:'Ловля медузы',description:'Найди артефакт «Медуза» и принеси его Сидоровичу. Учёный с большой земли ждёт образец.',target:1,progress:countItem(game.inventory,'medusa'),reward:1100};
  addLog(game,`Получено цикличное поручение Сидоровича: «${jobs.active.title}».`,'player');
  return {ok:true,job:jobs.active,message:`Сидорович: «${jobs.active.description} За работу заплачу ${jobs.active.reward} RU».`};
}

export function turnInSidorovichJob(game) {
  if (game.locationId!=='sidorovich-bunker') return {ok:false,message:'Сдать поручение можно только Сидоровичу.'};
  const jobs=getSidorovichJobState(game), job=jobs.active;
  if (!job) return {ok:false,message:'Сейчас у меня для тебя нет незакрытого поручения.'};
  if (job.type==='tails') {
    const amount=countItem(game.inventory,'tail');
    if (amount<5) return {ok:false,message:`Сидорович: «Мне нужны пять хвостов. У тебя пока ${amount}.»`};
    removeItem(game.inventory,'tail',5);
  } else if (job.type==='medusa') {
    if (!countItem(game.inventory,'medusa')) return {ok:false,message:'Сидорович: «Без Медузы возвращаться не надо». '};
    removeItem(game.inventory,'medusa',1);
  } else if (job.type==='collector' && !job.contacted) return {ok:false,message:`Сначала найди ${job.targetName} и напомни ему о долге.`};
  game.money+=job.reward;
  game.player.questsDone=(game.player.questsDone||0)+1;
  grantReputation(game,5);
  jobs.completed[job.type]=(jobs.completed[job.type]||0)+1;
  jobs.active=null;
  jobs.cooldownUntil=game.clock.worldMinutes+120;
  addLog(game,`Поручение «${job.title}» выполнено. Сидорович выплатил ${job.reward} RU.`);
  return {ok:true,message:`Сидорович: «Ну, ${job.type==='tails'?'хвосты получил':job.type==='medusa'?'Медузу забрал':'должнику напомнил'} — дело сделано. Держи ${job.reward} RU. Сидорович не обидел!» Получено +5 рейтинга.`};
}


export function acceptWolfDogQuest(game) {
  const quest=game.quests?.find(entry=>entry.id==='wolf-dog-pack');
  if (!quest) return {ok:false,message:'Поручение Волка не найдено.'};
  if (quest.status==='completed') return {ok:false,message:'Волк уже благодарил тебя за помощь. Нового такого поручения пока нет.'};
  if (game.wolfDogQuest?.status==='active') return {ok:false,message:`Волк: «Собаки всё ещё у вагончика. Ты разобрался пока с ${game.wolfDogQuest.killed} из пяти».`};
  if (game.wolfDogQuest?.status==='ready' || quest.status==='ready') return {ok:false,message:'Волк ждёт, когда ты доложишь об уничтожении собак.'};
  game.wolfDogQuest={status:'active',killed:0,total:5};
  quest.status='active'; quest.progress=0;
  addLog(game,'Взято задание Волка: уничтожить пять слепых собак у вагончика севернее деревни новичков.');
  game.dialogueReply='Волк: «Отлично. Тут у вагончика, что севернее деревни, обосновались пять слепых собак. Новички идут, они на их гавкнут — новички и бегут куда глаза глядят. Ну а бывает, что и нападают на новичков. Убей собак, а там уже сочтёмся». У вагончика пять слепых собак.';
  return {ok:true,message:'Волк: «Отлично. Собаки обжились возле вагончика севернее деревни. Новички идут — они гавкают, те пугаются и бегут куда глаза глядят. А бывает, собаки и нападают. Убей пятерых, а там уже сочтёмся». На карте отмечен вагончик.'};
}

export function turnInWolfDogQuest(game) {
  const quest=game.quests?.find(entry=>entry.id==='wolf-dog-pack');
  if (!quest || game.wolfDogQuest?.status!=='ready' || quest.status!=='ready') return {ok:false,message:'Волк: «Сначала разберись с собаками у вагончика, потом поговорим». '};
  if (game.locationId!=='rookie-village') return {ok:false,message:'Волк ждёт тебя в деревне новичков.'};
  const reward=450;
  game.money+=reward;
  game.wolfDogQuest.status='completed';
  quest.status='completed';
  game.player.questsDone=(game.player.questsDone||0)+1;
  grantReputation(game,5);
  addLog(game,`Задание «Собаки у вагончика» выполнено. Волк заплатил ${reward} RU.`);
  game.dialogueReply=`Волк: «Вот это дело, сталкер. Теперь новички смогут спокойно ходить к вагончику. Держи ${reward} RU — заслужил».`;
  return {ok:true,message:`Волк: «Вот это дело, сталкер. Теперь новички смогут спокойно ходить к вагончику. Держи ${reward} RU — заслужил». Получено +5 рейтинга.`};
}

export function talkToNpc(game, npcId) {
  const npc = getDialogueNpc(game,npcId);
  if (!npc) return { ok:false, message:'Собеседник не найден.' };
  if (npc.location !== game.locationId) return { ok:false, message:`${npc.name} сейчас не здесь. По последним сведениям он находится: ${getLocation(npc.location)?.name||'неизвестно'}.` };
  game.dialogueNpcId = npcId;
  game.dialogueTopic = null;
  game.dialogueReply = '';
  game.dialogueHistory=[{role:'npc',text:npc.greeting||'Чего хотел, сталкер?'}];
  rememberEntity(game, npc, 'npc');
  const jobs=getSidorovichJobState(game);
  if (npcId==='sidorovich' && jobs.active?.type==='collector' && jobs.active.targetNpcId) { /* player returned to the quest giver */ }
  if (npcId!=='sidorovich' && jobs.active?.type==='collector' && jobs.active.targetNpcId===npcId) {
    jobs.active.contacted=true;
    addLog(game,`${npc.name} выслушал напоминание о долге Сидоровичу.`);
  }
  progressQuest(game, `talk:${npcId}`);
  return { ok:true, npc };
}

export function replyNpc(game, npcId, topic) {
  const npc = getDialogueNpc(game,npcId);
  if (!npc) return 'Собеседник не найден.';
  game.dialogueTopic=topic.toLowerCase();
  let answer='';
  if (npcId==='wolf' && ['работа','задание','помощь','поручение'].some(word=>topic.toLowerCase().includes(word))) {
    const job=game.wolfDogQuest;
    if (job?.status==='active') answer=`Волк: «Ты уже взялся за собак у вагончика. Пока уничтожено ${job.killed} из пяти. Не возвращайся раньше времени».`;
    else if (job?.status==='ready') answer='Волк: «Слышал, у вагончика стало тихо. Возвращайся ко мне, расскажешь, как всё прошло».';
    else if (job?.status==='completed') answer='Волк: «Спасибо за помощь. Теперь новички могут ходить к вагончику без этой своры».';
    else answer='Волк: «Здравствуй, сталкер. Не желаешь помочь таким как ты? Тут у вагончика, что севернее деревни, обосновались пять слепых собак. Новички идут, они на их гавкнут — новички и бегут куда глаза глядят. Ну а бывает, что и нападают на новичков. Убей собак, а там уже сочтёмся».';
    game.dialogueReply=answer;
    return answer;
  }
  if (npcId==='sidorovich' && ['работа','задания','квесты','поручения'].some(word=>topic.toLowerCase().includes(word))) {
    const jobs=getSidorovichJobState(game);
    if (jobs.active) answer=`У тебя уже есть поручение «${jobs.active.title}». ${jobs.active.description}`;
    else if (game.clock.worldMinutes<jobs.cooldownUntil) answer='Пока ничего нового. Дай мне немного времени, сталкер.';
    else answer='Хе-хе. Есть для тебя работа. Скажи, если готов взяться за поручение.';
    game.dialogueReply=answer;
    return answer;
  }
  const key = topic.toLowerCase();
  const mapped = Object.keys(npc.lines||{}).find(entry => key.includes(entry) || entry.includes(key));
  answer = mapped ? npc.lines[mapped] : `${npc.name} смотрит на тебя с недоверием. «Сейчас мне нечего добавить. Сначала разберись с делом».`;
  game.dialogueReply=answer;
  return answer;
}

export function replyNpcFreeText(game,npcId,rawText) {
  const npc=getDialogueNpc(game,npcId);
  const text=String(rawText||'').toLowerCase().replaceAll('ё','е').replace(/[«»„“”"']/g,' ').replace(/[^а-яa-z0-9 -]/g,' ').replace(/\s+/g,' ').trim();
  if (!npc || npc.location!==game.locationId) return {ok:false,message:'Собеседник сейчас не находится рядом.'};
  if (!text) return {ok:false,message:'Напиши, что хочешь сказать.'};
  let answer='';
  const includes=(...roots)=>roots.some(root=>text.includes(root));
  const generated=generateDialogueReply(npc,game,rawText);
  if (includes('работ','задан','квест','поруч','помощ','дело','подработ')) {
    game.dialogueTopic='работа';
    answer=replyNpc(game,npcId,'работа');
  } else if (generated) {
    answer=generated.answer;
  } else if (includes('привет','здравств','добрый день','здорово','салют','хай','ку','доброго','вечер добрый')) {
    answer=pick(npcId==='sidorovich'?['Ну, здравствуй. Не стой на пороге, говори, что нужно.','И тебе не хворать. Только без пустых разговоров.']:npcId==='wolf'?['Здорово, сталкер. Как дорога?','Привет. Рад, что вернулся целым.']:['Здорово. Что хотел?','Слышу тебя. Говори.']);
  } else if (includes('спасибо','благодар','выручил','выручили','респект','красава')) {
    answer=pick(['Да ладно, не стоит. Главное — сам не подставляйся.','Бывает. В Зоне ещё пригодится взаимовыручка.','Не за что. Смотри в оба и береги голову.']);
  } else if (includes('пока','прощай','увидимся','до встречи','бывай','счастливо','удачи')) {
    answer=pick(['Давай. И не задерживайся на открытом месте.','Бывай, сталкер. Ещё пересечёмся.','Удачи. Смотри, чтобы Зона не поймала тебя врасплох.']);
  } else if (includes('кто ты','как тебя зовут','расскажи о себе','твое имя','ты кто','представься')) {
    answer=`Я ${npc.name}. ${npc.role||'Местный'} на Кордоне. ${npc.greeting||'Делаю своё дело и не лезу куда не просят.'}`;
  } else if (includes('где','куда','как пройти','путь','дорог','направлен')) {
    const place=LOCATIONS.find(entry=>entry.name.toLowerCase().split(/\s+/).some(word=>word.length>3 && text.includes(word)));
    answer=place?`${place.name}: ${place.desc} Отсюда прямой переход ${getLocation(game.locationId)?.neighbors?.includes(place.id)?'есть':'не подтверждён'}. Посмотри маршрут на карте КПК.`:`Сейчас ты в районе «${getLocation(game.locationId)?.name}». Открой карту — там отмечены соседние переходы. По незнакомой дороге лучше не срезать.`;
  } else if (includes('мутант','собак','псевд','плот','кровосос','кабан','чудовищ')) {
    answer=npcId==='wolf'?'Обычные слепые псы чаще держатся стаей. Не дай им окружить себя и не трать все патроны сразу.':npcId==='sidorovich'?'За мутантов платят, если принесёшь целый и нужный материал. Но не путай обычную добычу с тем, что нужно учёным.':'Мутанты здесь не для того, чтобы их изучать вблизи. Держи оружие готовым и не шуми без причины.';
  } else if (includes('аномал','радиац','воронк','артефакт','медуз','грави','ломот')) {
    answer=npcId==='sidorovich'?'Сначала детектор и болты. Не суйся в неизвестное поле наугад. Артефакт может стоить денег, но здоровье дороже.':'Аномалии не предупреждают дважды. Смотри на мусор в воздухе, слушай детектор и держись подальше от странных вспышек.';
  } else if (includes('торгов','купить','продать','цена','товар','патрон','оружие','снаряж')) {
    if (npc.trader) answer='Можешь посмотреть мой товар и своё снаряжение в торговом окне. Цены указаны рядом с каждой вещью.';
    else answer=npcId==='wolf'?'За покупками иди к Сидоровичу. Я тут слежу, чтобы новички не влипали в неприятности.':'Торговля — не ко мне. Поговори со снабженцем или местным торговцем.';
  } else if (includes('слух','слышал','новост','что происходит','обстановка','опасно','что нового','как дела','как жизнь','погода')) {
    const rumor=npc.lines?.rumors||npc.lines?.situation||npc.lines?.advice||'Пока ничего определённого не слышал. На Кордоне обстановка меняется быстро.';
    answer=rumor;
  } else if (includes('зон','кордон','чернобыл','припят','выброс','катастроф')) {
    answer=npcId==='sidorovich'?'Большая земля думает, что знает о Зоне всё. А я каждый день вижу, как она меняется. Не верь каждому слуху и не суй нос туда, где не понимаешь, что происходит.':'Кордон только кажется спокойным. Дальше будет опаснее. Привыкай смотреть по сторонам и не ходить один без причины.';
  } else if (includes('долг','должник','сидорович')) {
    answer=npcId==='sidorovich'?'Долги забывать не советую. Если поручил тебе напомнить кому-то — сначала найди человека, поговори с ним, а потом возвращайся ко мне.':'С Сидоровичем лучше рассчитываться вовремя. Он помнит каждую копейку.';
  } else if (includes('почему','зачем','как думаешь','что думаешь','считаешь')) {
    answer=pick(['Сложно сказать наверняка. На Кордоне мало кто знает всю картину.','Я бы не спешил с выводами. Сначала собери факты, потом решай.','У каждого своя правда. Посмотри, кому выгодно то, о чём ты спрашиваешь.']);
  } else {
    const fallback=npcId==='sidorovich'?['Хм. Понимаю, о чём ты, но давай ближе к делу. Тебе нужны припасы, работа или информация?','Не люблю гадать. Скажи конкретнее: про Зону, товар или поручения?','Слова словами, сталкер. Если есть конкретика — выкладывай.','Сейчас у меня голова занята делами. Сформулируй вопрос покороче.']:npcId==='wolf'?['Понял тебя. Но на Кордоне лучше говорить прямо — что именно случилось?','Слушаю. Хочешь совет, помощь или просто поделиться новостями?','Не торопись. Давай разберёмся по порядку, что ты имеешь в виду.','Видал всякое, но пока не понял, к чему ты клонишь.']:['Я тебя услышал. Только давай без загадок — что именно ты хочешь узнать?','Может быть. Скажи чуть подробнее, тогда отвечу по делу.','Хм, звучит знакомо. Но деталей маловато, чтобы делать выводы.','Не уловил мысль. Перефразируй — я не телепат.'];
    answer=pick(fallback);
  }
  game.dialogueReply=answer;
  game.dialogueHistory ||= [];
  game.dialogueHistory.push({role:'player',text:String(rawText).slice(0,500)},{role:'npc',text:answer});
  game.dialogueHistory=game.dialogueHistory.slice(-16);
  addLog(game,`${npc.name}: ${answer}`);
  return {ok:true,message:answer};
}

export function getAvailableTraders(game, locationId=game.locationId) {
  ensureTraderRecords(game);
  const fixed=NPCS.filter(npc=>npc.trader && npc.location===locationId).map(npc=>{
    const record=game.traders.find(entry=>entry.id===npc.id);
    return {...npc,...record};
  });
  const wanderers=game.randomTraders.filter(trader=>trader.location===locationId);
  return [...fixed,...wanderers];
}

export function getTraderById(game, traderId) {
  return findTrader(game,traderId)?.trader || null;
}

export function buyFromTrader(game, traderId, itemId) {
  const found=findTrader(game,traderId);
  if (!found) return { ok:false, message:'Торговец больше не находится на связи.' };
  const stock=found.record.stock.find(entry=>entry.id===itemId && entry.qty>0);
  if (!stock) return { ok:false, message:'Этого товара сейчас нет в наличии.' };
  if (game.money<stock.price) return { ok:false, message:'Не хватает денег.' };
  const result=addItem(game.inventory,itemId,1);
  if (!result.ok) return { ok:false, message:result.reason };
  game.money-=stock.price;
  stock.qty-=1;
  updatePurchasedCounters(game,itemId,1);
  if (stock.qty<=0) found.record.stock=found.record.stock.filter(entry=>entry!==stock);
  const name=getItem(itemId)?.name||itemId;
  const message=`Куплено у ${found.trader.name}: ${name} за ${stock.price} RU.`;
  addLog(game,message);
  return { ok:true, message, price:stock.price };
}

export function sellToTrader(game, traderId, itemId, quantity=1) {
  const found=findTrader(game,traderId);
  if (!found) return { ok:false, message:'Торговец больше не находится на связи.' };
  const item=getItem(itemId);
  const qty=Math.max(1,Math.floor(Number(quantity)||1));
  if (!item || countItem(game.inventory,itemId)<qty) return { ok:false, message:'В рюкзаке нет такого количества предметов.' };
  const price=Math.max(1,Math.floor(item.price*(found.record.buyMultiplier||.4)));
  if (!removeItem(game.inventory,itemId,qty)) return { ok:false, message:'Не удалось изъять предмет из рюкзака.' };
  game.money+=price*qty;
  updatePurchasedCounters(game,itemId,-1*qty);
  // Mutant trophies and artifacts are bought from the player, but never returned to sale stock.
  if (['Добыча','Артефакты'].includes(item.cat)) {
    const message=`Продано ${item.name} ×${qty} торговцу ${found.trader.name}. Получено ${price*qty} RU.`;
    addLog(game,message);
    return {ok:true,message,price:price*qty};
  }
  let stock=found.record.stock.find(entry=>entry.id===itemId);
  if (!stock) {
    stock={id:itemId,qty:0,price:Math.max(price+1,Math.ceil(item.price*(found.trader.priceMultiplier||1.1)))};
    found.record.stock.push(stock);
  }
  stock.qty+=qty;
  const message=`Продано ${item.name} ×${qty} торговцу ${found.trader.name}. Получено ${price*qty} RU.`;
  addLog(game,message);
  return { ok:true, message, price:price*qty };
}

export function sleep(game, hours) {
  const amount = Math.max(1, Math.min(12, Number(hours) || 1));
  if (game.activeEncounter) return { ok:false, message:'Сейчас слишком опасно, чтобы спать.' };
  advanceGame(game, amount * 60);
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + amount * 3);
  game.player.stamina = 100;
  game.player.stress = Math.max(0, (game.player.stress || 0) - amount * 5);
  addLog(game, `Ты поспал ${amount} ч. Силы восстановлены, время прошло.`);
  return { ok:true, message:`Ты поспал ${amount} ч. Здоровье: ${game.player.hp}/${game.player.maxHp}.` };
}

export function deactivateAnomaly(game) {
  const location = getLocation(game.locationId);
  if (!location?.hazards?.length) return { ok:false, message:'В этой локации не обнаружено активных аномалий.' };
  if (game.anomalyStates[location.id]) return { ok:false, message:'Основной очаг в этой зоне уже отмечен как отключённый.' };
  game.boltsRemaining ??= countItem(game.inventory,'boltpack') * 10;
  if (game.boltsRemaining <= 0 || !countItem(game.inventory, 'boltpack')) return { ok:false, message:'Нужны болты. В снаряжении нет ни одной пачки.' };
  game.boltsRemaining -= 1;
  if (game.boltsRemaining % 10 === 0) removeItem(game.inventory, 'boltpack', 1);
  game.combatEffect={type:'bolt',until:(game.clock.worldMinutes||0)+2};
  advanceGame(game,1);
  game.anomalyStates[location.id] = true;
  addLog(game, 'Ты достал болт, бросил его через подозрительный участок и отметил безопасный проход.');
  return { ok:true, message:`Ты бросил болт через поле «${location.anomalyName||'аномалия'}». После металлического звона и короткого всплеска энергии удалось отметить безопасный проход и отключить одну локальную аномалию.` };
}

export function startArtifactHunt(game) {
  const location = getLocation(game.locationId);
  if (!location?.hazards?.length) return { ok:false, message:'Здесь нет заметных аномальных сигналов.' };
  if (!countItem(game.inventory, 'otklik')) return { ok:false, message:'Для мини-игры нужен детектор «Отклик».' };
  const pool = location.hazards.includes('gravity') ? ['medusa','gravi'] : location.id==='atp' ? ['gravi','medusa'] : ['medusa','meat_chunk'];
  game.artifactHunt = { target:Math.floor(Math.random()*2), attempts:0, found:false, locationId:location.id, artifactId:pool[Math.floor(Math.random()*pool.length)] };
  return { ok:true, message:'Детектор ожил. Выбери один из трёх секторов, ориентируясь на усиление сигнала.' };
}

export function chooseArtifactSector(game, sector) {
  const hunt = game.artifactHunt;
  if (!hunt || hunt.found) return { ok:false, message:'Сначала запусти поиск артефакта.' };
  hunt.attempts += 1;
  if (sector === hunt.target) {
    hunt.found = true;
    const artifactId = hunt.artifactId || 'medusa';
    const loot = addItem(game.inventory, artifactId, 1);
    if (loot.ok) {
      game.player.artifacts += 1;
      grantReputation(game, 3);
      progressQuest(game, `artifact:${hunt.locationId}`);
      const message = `Сигнал резко усилился. Под слоем мусора обнаружен артефакт «${getItemName(artifactId)}». Его удалось аккуратно извлечь.`;
      addLog(game, message);
      return { ok:true, found:true, message };
    }
    return { ok:false, found:true, message:'Сигнал найден, но инвентарь перегружен. Освободи место и повтори поиск позже.' };
  }
  if (hunt.attempts >= 3) {
    game.artifactHunt = null;
    return { ok:false, finished:true, message:'Сигнал распался. Сегодня здесь больше ничего не найти.' };
  }
  const distance = Math.abs(sector - hunt.target);
  return { ok:true, message:distance === 1 ? 'Сигнал слабый, но стал немного чище. Проверь соседний сектор.' : 'Почти нет отклика. Ищи в другом направлении.' };
}

export function updateWeather(game) {
  if (Math.random() < .25) game.weather = ['Пасмурно','Мелкий дождь','Сухой ветер','Низкая облачность','Туман у низины'][Math.floor(Math.random()*5)];
}
