import { LOCATIONS, FACTIONS, SQUADS, ITEMS, QUESTS, NPCS } from '../data/catalog.js';
import { advanceTime, createClock, getGameDateTime, syncRealElapsed } from './game-clock.js';
import { addItem, getItem, removeItem, countItem } from './inventory.js';

const pick = (array) => array[Math.floor(Math.random() * array.length)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const getLocation = (id) => LOCATIONS.find(location => location.id === id);
export const getFaction = (id) => FACTIONS.find(faction => faction.id === id);

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
    ammoRounds:{ ammo9x18:countItem(starterInventory,'ammo9x18')*12, ammo9x19:countItem(starterInventory,'ammo9x19')*12, shells:countItem(starterInventory,'shells')*8 },
    boltsRemaining:countItem(starterInventory,'boltpack')*10,
    locationId:faction?.spawn || 'rookie-village',
    quests:QUESTS.map(quest => ({ ...quest, status:'available' })),
    log:[{ type:'system', text:`15 апреля. Ты прибыл на Кордон. Место старта: ${getLocation(faction?.spawn)?.name || 'Деревня новичков'}.` }],
    searchedAt:{},
    lootRespawnMinutes:180,
    squads:SQUADS.map(squad => ({ ...squad })),
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
  const text = `${location.desc} ${pick(extras)} ${hazardText}${squadText} Погода: ${game.weather.toLowerCase()}. ${time.time}.`;
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
    if (result.ok && ['ammo9x18','ammo9x19','shells'].includes(lootId)) game.ammoRounds[lootId] = (game.ammoRounds[lootId] || 0) + quantity * (lootId === 'shells' ? 8 : 12);
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
  advanceGame(game, 30 + Math.floor(Math.random()*20));
  game.locationId = destinationId;
  game.distanceTravelled += 1;
  if (!game.player.locationsVisited.includes(destinationId)) game.player.locationsVisited.push(destinationId);
  game.visitedAt[destinationId] = game.clock.worldMinutes;
  addLog(game, `Ты переместился: ${current.name} → ${destination.name}.`);
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
    game.activeEncounter = { type:'blind-dog', name:'Слепой пёс', hp:55, maxHp:55, damage:7+Math.floor(Math.random()*7), count:Math.random()<.3?2:1, imageIndex:Math.floor(Math.random()*2) };
    const message = 'Из-за укрытия выскакивает слепой пёс! Он замечает тебя и готовится броситься.';
    addLog(game, message, 'danger');
    return { ok:true, message:message + hazardNotice, encounter:true };
  }
  return { ok:true, message:`Ты добрался до локации «${destination.name}». ${describeLocation(game)}${hazardNotice}` };
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

export function talkToNpc(game, npcId) {
  const npc = NPCS.find(entry => entry.id === npcId);
  if (!npc) return { ok:false, message:'Собеседник не найден.' };
  if (npc.location !== game.locationId) return { ok:false, message:`${npc.name} сейчас не здесь. По последним сведениям он находится: ${getLocation(npc.location)?.name}.` };
  game.dialogueNpcId = npcId;
  progressQuest(game, `talk:${npcId}`);
  return { ok:true, npc };
}

export function replyNpc(game, npcId, topic) {
  const npc = NPCS.find(entry => entry.id === npcId);
  if (!npc) return 'Собеседник не найден.';
  const key = topic.toLowerCase();
  const mapped = Object.keys(npc.lines).find(entry => key.includes(entry) || entry.includes(key));
  return mapped ? npc.lines[mapped] : `${npc.name} смотрит на тебя с недоверием. «Сейчас мне нечего добавить. Сначала разберись с делом».`;
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
  return { ok:true, message:'Болт прошёл через поле без резкого отклонения. Ты отметил безопасный проход и отключил одну локальную аномалию.' };
}

export function startArtifactHunt(game) {
  const location = getLocation(game.locationId);
  if (!location?.hazards?.length) return { ok:false, message:'Здесь нет заметных аномальных сигналов.' };
  if (!countItem(game.inventory, 'otklik')) return { ok:false, message:'Для мини-игры нужен детектор «Отклик».' };
  game.artifactHunt = { target:Math.floor(Math.random()*3), attempts:0, found:false, locationId:location.id };
  return { ok:true, message:'Детектор ожил. Выбери один из трёх секторов, ориентируясь на усиление сигнала.' };
}

export function chooseArtifactSector(game, sector) {
  const hunt = game.artifactHunt;
  if (!hunt || hunt.found) return { ok:false, message:'Сначала запусти поиск артефакта.' };
  hunt.attempts += 1;
  if (sector === hunt.target) {
    hunt.found = true;
    const loot = addItem(game.inventory, 'medusa', 1);
    if (loot.ok) {
      game.player.artifacts += 1;
      grantReputation(game, 3);
      progressQuest(game, `artifact:${hunt.locationId}`);
      const message = 'Сигнал резко усилился. Под слоем мусора обнаружен артефакт «Медуза». Его удалось аккуратно извлечь.';
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
