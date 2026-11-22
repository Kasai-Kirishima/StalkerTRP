import { LOCATIONS, FACTIONS, SQUADS, ITEMS, QUESTS, NPCS } from '../data/catalog.js';
import { advanceTime, createClock, getGameDateTime, syncRealElapsed } from './game-clock.js';
import { addItem, getItem, removeItem, countItem } from './inventory.js';
import { rememberEntity } from './russian-language.js';

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
    return item ? { id, qty:1+Math.floor(Math.random()*3), price:Math.max(1,Math.ceil(item.price*multiplier)) } : null;
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
    player: {
      hp:100, maxHp:100, stamina:100, radiation:0, hunger:0, thirst:0, stress:0,
      reputation:0, rating:0, rank:faction?.rank || 'Новичок', armor:0,
      faction:character.faction, kills:0, artifacts:0, questsDone:0, locationsVisited:[faction?.spawn || 'rookie-village']
    },
    money,
    inventory:starterInventory.map(entry => ({ ...entry })),
    ammoRounds:{ ammo9x18:countItem(starterInventory,'ammo9x18')*12, ammo9x19:countItem(starterInventory,'ammo9x19')*12, ammo545:countItem(starterInventory,'ammo545')*30, shells:countItem(starterInventory,'shells')*8 },
    boltsRemaining:countItem(starterInventory,'boltpack')*10,
    locationId:faction?.spawn || 'rookie-village',
    quests:QUESTS.map(quest => ({ ...quest, status:'available' })),
    sidorovichJobs:{ active:null, cooldownUntil:0, completed:{ tails:0, collector:0, medusa:0 } },
    log:[{ type:'system', text:`15 апреля. Ты прибыл на Кордон. Место старта: ${getLocation(faction?.spawn)?.name || 'Деревня новичков'}.` }],
    searchedAt:{},
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
  const quest = game.quests.find(entry => entry.condition === condition && entry.status === 'available');
  if (!quest) return null;
  quest.status = 'completed';
  game.money += quest.reward;
  game.player.questsDone += 1;
  grantReputation(game, 5);
  addLog(game, `Задание «${quest.title}» выполнено. Получено ${quest.reward} RU и +5 рейтинга.`);
  return quest;
}

function tickVitals(game, minutes) {
  const hours = minutes / 60;
  game.player.hunger = clamp(game.player.hunger + hours * 1.3, 0, 100);
  game.player.thirst = clamp(game.player.thirst + hours * 1.8, 0, 100);
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

export function advanceGame(game, minutes) {
  syncRealElapsed(game);
  advanceTime(game, minutes);
  game.playMinutes += minutes;
  tickVitals(game, minutes);
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

export function travelTo(game, destinationId) {
  const current = getLocation(game.locationId);
  const destination = getLocation(destinationId);
  if (!current || !destination) return { ok:false, message:'Неизвестный маршрут.' };
  if (!current.neighbors.includes(destinationId)) return { ok:false, message:'Прямого пути туда нет. Проверь соседние переходы на карте.' };
  if (game.activeEncounter) return { ok:false, message:'Сначала разберись с текущей угрозой.' };
  const travelMinutes = getTravelMinutes(current.id, destination.id);
  advanceGame(game, travelMinutes);
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

export function talkToNpc(game, npcId) {
  const npc = getDialogueNpc(game,npcId);
  if (!npc) return { ok:false, message:'Собеседник не найден.' };
  if (npc.location !== game.locationId) return { ok:false, message:`${npc.name} сейчас не здесь. По последним сведениям он находится: ${getLocation(npc.location)?.name||'неизвестно'}.` };
  game.dialogueNpcId = npcId;
  game.dialogueTopic = null;
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
  if (npcId==='sidorovich' && ['работа','задания','квесты','поручения'].some(word=>topic.toLowerCase().includes(word))) {
    const jobs=getSidorovichJobState(game);
    if (jobs.active) return `У тебя уже есть поручение «${jobs.active.title}». ${jobs.active.description}`;
    if (game.clock.worldMinutes<jobs.cooldownUntil) return 'Пока ничего нового. Дай мне немного времени, сталкер.';
    return 'Хе-хе. Есть для тебя работа. Скажи, если готов взяться за поручение.';
  }
  game.dialogueTopic=topic.toLowerCase();
  const key = topic.toLowerCase();
  const mapped = Object.keys(npc.lines||{}).find(entry => key.includes(entry) || entry.includes(key));
  return mapped ? npc.lines[mapped] : `${npc.name} смотрит на тебя с недоверием. «Сейчас мне нечего добавить. Сначала разберись с делом».`;
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
  game.anomalyStates[location.id] = true;
  addLog(game, 'Ты проверил подозрительный участок болтом и отметил безопасный проход.');
  return { ok:true, message:`Болт прошёл через поле «${location.anomalyName||'аномалия'}» без резкого отклонения. Ты отметил безопасный проход и отключил одну локальную аномалию.` };
}

export function startArtifactHunt(game) {
  const location = getLocation(game.locationId);
  if (!location?.hazards?.length) return { ok:false, message:'Здесь нет заметных аномальных сигналов.' };
  if (!countItem(game.inventory, 'otklik')) return { ok:false, message:'Для мини-игры нужен детектор «Отклик».' };
  const pool = location.hazards.includes('gravity') ? ['medusa','gravi'] : location.id==='atp' ? ['gravi','medusa'] : ['medusa','meat_chunk'];
  game.artifactHunt = { target:Math.floor(Math.random()*3), attempts:0, found:false, locationId:location.id, artifactId:pool[Math.floor(Math.random()*pool.length)] };
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
