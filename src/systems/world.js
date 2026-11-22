import { ASSETS, LOCATIONS, FACTIONS, SQUADS, ITEMS, QUESTS, NPCS, EXPLORE_SPOTS, NPC_APPEARANCES } from '../data/catalog.js';
import { advanceTime, createClock, getGameDateTime, syncRealElapsed } from './game-clock.js';
import { addItem, getItem, removeItem, countItem } from './inventory.js';
import { rememberEntity } from './russian-language.js';
import { generateDialogueReply } from './dialogue-engine.js';

const pick = (array) => array[Math.floor(Math.random() * array.length)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const getLocation = (id) => LOCATIONS.find(location => location.id === id);
export const getFaction = (id) => FACTIONS.find(faction => faction.id === id);

export function getFactionRelation(first, second) {
  if (!first || !second) return 'neutral';
  if (first === second) return 'ally';
  const relations = {
    military: { loner:'hostile', bandit:'hostile' },
    bandit: { loner:'neutral', military:'hostile' },
    loner: { bandit:'neutral', military:'hostile' }
  };
  return relations[first]?.[second] || 'neutral';
}

function factionCanEnter(faction, locationId) {
  const territory=getLocation(locationId)?.territory;
  if (!territory) return true;
  return faction===territory;
}

export function recordKnowledge(game, section, id, title, description='') {
  game.encyclopedia ||= { locations:[], people:[], anomalies:[], mutants:[], artifacts:[], equipment:[] };
  game.encyclopedia[section] ||= [];
  if (!game.encyclopedia[section].some(entry=>entry.id===id)) {
    game.encyclopedia[section].push({id,title,description,discoveredAt:game.clock?.worldMinutes||0});
  }
}

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
const STALKER_FIRST_NAMES = ['Макс','Саня','Клим','Боря','Феликс','Антон','Олег','Андрей','Макар','Алекс','Артём','Павел','Пётр','Никита','Марк','Костя','Егор','Нестор','Гриша','Захар','Хома','Ваня','Вася','Роман','Ростик','Леон','Лёва','Дима','Денис','Жора','Ян','Степан','Игнат','Тимур','Трофим','Юра'];
const STALKER_NICKNAMES = ['Йог','Центнер','Упырь','Костлявый','Косой','Кислый','Енот','Нудный','Гидра','Гравий','Гром','Гитарист','Горбун','Шумахер','Щука','Затвор','Землянин','Зомби','Хомяк','Хитрый','Фитиль','Факел','Ветер','Волосатый','Веник','Автомат','Плохиш','Пастух','Пудель','Пистон','Петля','Паровоз','Пушкин','Робот','Рихтер','Рыболов','Онегин','Ловкач','Лимон','Диггер','Дикарь','Жук','Якут','Якорь','Чехов','Чумной','Чаплин','Сиплый','Старик','Моряк','Морпех','Мутный','Беляев','Балбес','Болтун','Бык','Башмак','Бухой','Бахмут','Барин','Белый','Юрта'];
const FACTION_GROUPS = { loner:'Одиночки', bandit:'Бандиты', military:'Военные' };

function npcLook(faction) {
  const look=pick(NPC_APPEARANCES[faction]||NPC_APPEARANCES.loner);
  return {icon:look?.icon||'',appearance:look?.appearance||'',insignia:ASSETS.factionInsignias[faction]||''};
}

// Постоянные жители локаций. У каждого есть своя повседневная рутина и личное дело.
const VILLAGE_ROUTINES = [
  { role:'Новичок', task:'пытается найти пропавший рюкзак у старого сарая', morning:'обходит сараи в поисках пропавшего рюкзака', day:'расспрашивает местных о потерянном рюкзаке', evening:'сидит у костра и перебирает найденные вещи', night:'отдыхает в одном из пустых домов', greeting:'Если увидишь потёртый зелёный рюкзак — дай знать. Там почти всё, что у меня осталось.' },
  { role:'Сталкер-ремонтник', task:'чинит старый фонарь и собирает детали', morning:'разбирает фонарь на детали', day:'пытается починить фонарь у сарая', evening:'проверяет, заработал ли старый фонарь', night:'прячет инструменты и отдыхает', greeting:'Фонарь барахлит. Ищу нормальный провод и батарейки, а то ночью тут хоть глаз выколи.' },
  { role:'Повар у костра', task:'готовит еду для тех, кто вернулся с дороги', morning:'собирает воду и сухие ветки', day:'готовит нехитрый обед для новичков', evening:'раздаёт еду у костра', night:'убирает котелок и ложится спать', greeting:'Если есть крупа или консервы — неси. Пустой котелок сам себя не наполнит.' },
  { role:'Дозорный', task:'следит за дорогой и считает проходящие группы', morning:'проверяет подходы к деревне', day:'наблюдает за дорогой со стороны ворот', evening:'меняется постом с другим новичком', night:'несёт тихое дежурство у входа', greeting:'Слежу, кто приходит и уходит. Последние дни на дороге стало многолюдно.' },
  { role:'Сталкер-картограф', task:'сверяет старую карту с тропами вокруг Кордона', morning:'сверяет карту с ориентирами', day:'делает пометки о тропах возле деревни', evening:'перерисовывает маршрут при свете лампы', night:'складывает карту и отдыхает', greeting:'Старая карта врёт в мелочах. Пытаюсь отметить, где дорога просела и где лучше не срезать.' },
  { role:'Сборщик припасов', task:'собирает воду и продукты для маленькой группы', morning:'проверяет запасы воды', day:'таскает ящики с провизией к дому', evening:'делит припасы между соседями', night:'спит рядом со своими вещами', greeting:'Провизии мало. Ищу воду, хлеб и что-нибудь долго хранящееся.' },
  { role:'Охотник', task:'готовит снаряжение перед выходом к вагончику', morning:'чистит ружьё и проверяет патроны', day:'собирается к вагончику по следам собак', evening:'рассказывает у костра о следах мутантов', night:'держится поближе к освещённому дому', greeting:'У вагончика снова следы. Пока не решил, идти ли одному — стая там может быть немаленькая.' },
  { role:'Новичок', task:'ищет проводника до остановки', morning:'ждёт проводника у тропы', day:'расспрашивает опытных сталкеров о дороге', evening:'слушает разговоры у костра', night:'ночует в доме рядом с деревней', greeting:'Мне бы до остановки добраться без приключений. Говорят, там можно встретить людей.' },
  { role:'Сталкер-торговец', task:'обменивает мелкие припасы и ищет покупателя на хлам', morning:'раскладывает мелочёвку на старой доске', day:'предлагает припасы тем, кто возвращается с вылазки', evening:'считает выручку у костра', night:'прячет товар и отдыхает', greeting:'Есть немного мелочей на обмен. Ничего редкого, зато цены не кусаются.' },
  { role:'Дежурный по лагерю', task:'проверяет двери, замки и порядок в домах', morning:'обходит пустые дома и проверяет двери', day:'чинит щеколды и укрепляет ставни', evening:'проверяет, все ли вернулись в деревню', night:'сидит на дежурстве возле фонаря', greeting:'Стараюсь, чтобы в домах был порядок. После захода солнца лучше не бродить одному.' }
];
const CHECKPOINT_ROUTINES = [
  { role:'Часовой', task:'несёт службу и следит за дорогой', morning:'проверяет дорогу и бетонные заграждения', day:'несёт караул у въезда', evening:'сдаёт смену и докладывает командиру', night:'дежурит у прожектора', greeting:'Пост на месте. Двигайся спокойно и не создавай проблем.' },
  { role:'Связист', task:'проверяет связь с соседними постами', morning:'проверяет радиостанцию', day:'передаёт сводку на соседний блокпост', evening:'записывает сообщения в журнал', night:'слушает эфир в караулке', greeting:'Связь временами хрипит. Если услышишь что-то необычное — сообщи дежурному.' },
  { role:'Снабженец', task:'разбирает ящики с припасами', morning:'принимает ящики со снабжением', day:'сортирует патроны и аптечки', evening:'сверяет остатки по ведомости', night:'закрывает склад и отдыхает', greeting:'Склад не резиновый. Сначала назови, что именно тебе требуется.' },
  { role:'Патрульный', task:'проверяет окрестности блокпоста', morning:'обходит периметр', day:'проверяет следы у дороги', evening:'возвращается с короткого патруля', night:'держит участок под наблюдением', greeting:'За периметром следы свежие. Не советую уходить с дороги без причины.' }
];
const ATP_ROUTINES = [
  { role:'Часовой АТП', task:'охраняет въезд на территорию', morning:'проверяет въезд и считает машины', day:'стоит на посту у ворот АТП', evening:'меняется с напарником и проверяет двор', night:'охраняет проход между корпусами', greeting:'На территорию без разрешения Кефира не шастай.' },
  { role:'Сборщик металла', task:'ищет детали для ремонта машин', morning:'осматривает брошенные машины', day:'снимает пригодные детали со старого кузова', evening:'складывает металл у мастерской', night:'прячет инструмент в гараже', greeting:'Ищу целые детали. Половина местных тачек уже разобрана, но кое-что ещё осталось.' },
  { role:'Кладовщик', task:'сортирует найденные припасы', morning:'пересчитывает ящики в подсобке', day:'раскладывает добычу по кучам', evening:'докладывает Кефиру о запасах', night:'закрывает склад', greeting:'Не трогай ящики без спроса. Тут всё записано, даже если выглядит как хлам.' },
  { role:'Разведчик', task:'следит за дорогой к свиноферме', morning:'проверяет тропу к свиноферме', day:'наблюдает за подходами к АТП', evening:'рассказывает Кефиру о движении на дороге', night:'сидит в укрытии и слушает окрестности', greeting:'У дороги бывает движение. Я слежу, чтобы нас не застали врасплох.' },
  { role:'Боец Кефира', task:'тренируется и поддерживает порядок во дворе', morning:'проверяет снаряжение', day:'тренируется во дворе', evening:'играет в карты с остальными', night:'отдыхает в помещении АТП', greeting:'У нас свои порядки. Хочешь спокойно пройти — не цепляйся к людям.' },
  { role:'Добытчик', task:'перебирает вещи, принесённые с вылазки', morning:'отделяет полезные вещи от мусора', day:'сортирует найденное с последней вылазки', evening:'ищет покупателя на лишние припасы', night:'прячет добычу до утра', greeting:'После вылазки набрал всякого. Могу кое-чем поменяться, если предложишь что-то полезное.' }
];

function shuffled(source) {
  const result=[...source];
  for (let index=result.length-1; index>0; index--) {
    const swap=Math.floor(Math.random()*(index+1));
    [result[index],result[swap]]=[result[swap],result[index]];
  }
  return result;
}

function createNpcNameFactory() {
  // Draw names without replacement so a freshly spawned group does not contain
  // several identical first-name / nickname combinations.
  const firstNames=shuffled(STALKER_FIRST_NAMES);
  const nicknames=shuffled(STALKER_NICKNAMES);
  let fallbackIndex=0;
  return () => {
    const first=firstNames.shift() || STALKER_FIRST_NAMES[fallbackIndex%STALKER_FIRST_NAMES.length];
    const nickname=nicknames.shift() || STALKER_NICKNAMES[fallbackIndex%STALKER_NICKNAMES.length];
    fallbackIndex++;
    return `${first} ${nickname}`;
  };
}

function createAmbientNpc(id, location, faction, template, index, makeName) {
  const look=npcLook(faction);
  return {
    id, name:makeName(), role:template.role,
    group:FACTION_GROUPS[faction]||'Путники', faction, location, ...look,
    ambient:true, personalTask:template.task,
    routines:{ morning:template.morning, day:template.day, evening:template.evening, night:template.night },
    activity:template.day, greeting:template.greeting,
    memberIndex:index,
    spawnedAt:Date.now()
  };
}

function createAmbientNpcPopulation() {
  const people=[];
  const makeName=createNpcNameFactory();
  // Every new game gets a fresh roll: identities and daily roles are shuffled,
  // while each local stays assigned to the correct settlement / faction.
  shuffled(VILLAGE_ROUTINES).forEach((template,index)=>people.push(createAmbientNpc(`village-local-${index+1}`,'rookie-village','loner',template,index,makeName)));
  const checkpoints=['north-checkpoint','bridge-checkpoint','south-checkpoint'];
  checkpoints.forEach((location,index)=>shuffled(CHECKPOINT_ROUTINES).forEach((template,personIndex)=>people.push(createAmbientNpc(`checkpoint-${index+1}-guard-${personIndex+1}`,location,'military',template,personIndex,makeName))));
  shuffled(ATP_ROUTINES).forEach((template,index)=>people.push(createAmbientNpc(`atp-bandit-${index+1}`,'atp','bandit',template,index,makeName)));
  // Two randomly named captives stay hidden until the player enters the first-floor room.
  for (let index=1; index<=2; index++) {
    const look=npcLook('loner');
    people.push({id:`atp-captive-${index}`,name:makeName(),role:'Пленный сталкер',group:'Одиночки',faction:'loner',location:'atp',captured:true,areaId:'atp-first-floor-prisoners',...look,personalTask:'ждёт возможности выбраться из плена',activity:'сидит в запертой комнате',greeting:'Тише. Бандиты держат нас здесь. Если выберешься наружу, не оставляй нас им.',lines:{rumors:'Нас двое. Бандиты держат первый этаж. Снаружи у них несколько человек, но мы не знаем, сколько именно.',advice:'Поговори с нами, когда двор станет безопаснее. Пока лучше не поднимать шум.'}});
  }
  return people;
}

function ensureAmbientNpcs(game) {
  if (!Array.isArray(game.ambientNpcs)) game.ambientNpcs=createAmbientNpcPopulation();
  refreshAmbientNpcActivities(game);
  return game.ambientNpcs;
}

function refreshAmbientNpcActivities(game) {
  if (!Array.isArray(game.ambientNpcs)) return;
  const minute=((Number(game.clock?.worldMinutes)||0)%1440+1440)%1440;
  const hour=Math.floor(minute/60);
  const period=hour>=6&&hour<12?'morning':hour>=12&&hour<18?'day':hour>=18&&hour<23?'evening':'night';
  for (const npc of game.ambientNpcs) npc.activity=npc.routines?.[period]||npc.personalTask||npc.role;
}

const NPC_TRADE_STOCK = {
  loner:['bread','water','sausage','canned','bandage','ammo9x18','shells','boltpack','knife','pm'],
  bandit:['vodka','bread','sausage','canned','ammo9x18','shells','knife','pm','biker'],
  military:['water','canned','bandage','ai2','ammo9x18','ammo545','shells','antirad','boltpack','pa8']
};
const getItemName = (id) => ({medusa:'Медуза',meat_chunk:'Ломоть мяса',gravi:'Грави','stone-flower':'Каменный цветок'}[id] || id);
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
    const possible=LOCATIONS.filter(location=>!location.territory && location.id!=='sidorovich-bunker');
    return {
      id:`wanderer-${index+1}`, name:first, role:'Бродячий торговец', group:'Путники', faction:faction.id,
      location:pick(possible).id, ...npcLook(faction.id), greeting:'Поторопись, сталкер. Я не задерживаюсь на одном месте.',
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
  const profile=getDialogueNpc(game,traderId);
  if (!profile) return null;
  let record=game.traders.find(entry=>entry.id===traderId) || game.randomTraders.find(entry=>entry.id===traderId);
  if (!record) {
    game.npcTraders ||= {};
    record=game.npcTraders[traderId];
    if (!record) {
      const faction=profile.faction||'loner';
      const stockIds=profile.stockIds?.length ? profile.stockIds : NPC_TRADE_STOCK[faction]||NPC_TRADE_STOCK.loner;
      const multiplier=faction==='military'?1.18:faction==='bandit'?1.08:1.12;
      const personalSelection=shuffled(stockIds).slice(0,Math.max(4,Math.min(7,stockIds.length)));
      record=game.npcTraders[traderId]={
        id:traderId, location:profile.location,
        stock:makeStock(personalSelection,multiplier),
        buyMultiplier:faction==='military'?.46:faction==='bandit'?.36:.4,
        priceMultiplier:multiplier, barter:true
      };
    }
  }
  return { profile, record, trader:{...profile,...record} };
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
      reputation:0, rating:0, rank:faction?.rank || 'Новичок', armor:Math.min(30,starterInventory.reduce((sum,stack)=>sum+(getItem(stack.id)?.armor||0)*stack.qty,0)), armorId:starterInventory.find(stack=>(getItem(stack.id)?.armor||0)>0)?.id||null, maskId:null, sheltered:false, shelterSpotId:null,
      faction:character.faction, kills:0, artifacts:0, questsDone:0, locationsVisited:[faction?.spawn || 'rookie-village']
    },
    money,
    currencyName:'Купоны',
    encyclopedia:{locations:[],people:[],anomalies:[],mutants:[],artifacts:[],equipment:[]},
    secretAnomaly:{sceneSeen:false,observed:false,name:'',inactiveUntil:0},
    atpRescue:{started:false,cleared:false,rewardClaimed:false,remaining:6},
    locationLights:{},
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
    ambientNpcs:createAmbientNpcPopulation(),
    npcTraders:{},
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
  addLog(game, `Задание «${quest.title}» выполнено. Получено ${quest.reward} Купонов и +5 рейтинга.`);
  return quest;
}

export function acceptWorldQuest(game, questId) {
  const quest=game.quests?.find(entry=>entry.id===questId);
  if (!quest) return {ok:false,message:'Такого задания нет.'};
  if (quest.status!=='available') return {ok:false,message:'Это задание уже взято или завершено.'};
  if (quest.id==='wolf-dog-pack') return acceptWolfDogQuest(game);
  quest.status=(questId==='signal-dump' && game.secretAnomaly?.observed && game.secretAnomaly?.name) ? 'ready' : 'active';
  quest.progress=quest.status==='ready'?1:0;
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
  ensureAmbientNpcs(game);
  const due = game.clock.worldMinutes - game.lastSquadMove;
  if (due < 90) return;
  const cycles = Math.floor(due / 90);
  game.lastSquadMove += cycles * 90;
  for (let i=0; i<cycles; i++) {
    for (const squad of game.squads) {
      if (Math.random() > 0.38) continue;
      const current = getLocation(squad.location);
      const options = (current?.neighbors || []).filter(id => id !== squad.location && factionCanEnter(squad.faction,id));
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
      const options=(current?.neighbors||[]).filter(id=>id!==trader.location && factionCanEnter(trader.faction,id));
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
  recordKnowledge(game,'locations',location.id,location.name,location.desc);
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
    message = `${corpse ? 'В кармане погибшего' : 'Под обломками'} нашлось ${cash} Купонов.`;
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
  if (spotId==='atp-first-floor-prisoners') {
    addLog(game,'Ты вошёл в комнату первого этажа. За перегородкой находятся двое пленных сталкеров.');
    return {ok:true,spot,message:'В комнате двое пленных сталкеров. Поговори с ними; они расскажут, что произошло.'};
  }
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
  if (destinationId==='atp' && game.player.faction==='loner') {
    if ((game.money||0)<500) return {ok:false,message:'За вход на АТП требуют 500 Купонов. Денег не хватает.'};
    game.money-=500; addLog(game,'За проход на территорию АТП уплачено 500 Купонов.');
  }
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
  if (destinationId==='anomaly-dump' && !game.secretAnomaly?.sceneSeen) {
    game.secretAnomaly ||= {sceneSeen:false,observed:false,name:'',inactiveUntil:0};
    game.secretAnomaly.sceneSeen=true; game.secretAnomaly.observed=true;
    game.anomalyCooldowns ||= {vortexUntil:0,carouselUntil:0};
    game.anomalyCooldowns.vortexUntil=game.clock.worldMinutes+6; game.anomalyCooldowns.carouselUntil=game.clock.worldMinutes+6;
    const scene='У края лагеря плоть выскакивает из-за укрытия. Неизвестное поле слегка приподнимает мутанта, закручивает в воздухе и отбрасывает к воронке. Короткий разряд гасит свечение; обе аномалии на время затихают. Сцена заканчивается вспышкой и тяжёлым грохотом — без возможности рассмотреть подробности.';
    addLog(game,scene,'danger');
    recordKnowledge(game,'anomalies','secret-unknown','Неизвестное поле','Наблюдалось в Тайном лагере. Связано с подбрасыванием и вращением объектов; точные свойства предстоит выяснить.');
    const anomalyQuest=game.quests?.find(entry=>entry.id==='signal-dump'&&entry.status==='active');
    if(anomalyQuest) anomalyQuest.progress=1;
    hazardNotice += ` ${scene}`;
  }
  if (destination.territory && destination.territory!==game.player.faction && getFactionRelation(game.player.faction,destination.territory)==='hostile') {
    const enemyFaction=destination.territory;
    game.activeEncounter={type:enemyFaction,name:enemyFaction==='military'?'Военный патруль':'Бандитский дозор',hp:68,maxHp:68,damage:9+Math.floor(Math.random()*5),count:1,faction:enemyFaction,...npcLook(enemyFaction)};
    const message=enemyFaction==='military'?'Военные замечают чужака на охраняемой территории и требуют остановиться.':'Бандитский дозор перекрывает путь и требует объяснений.';
    addLog(game,message,'danger');
    return {ok:true,message:`Путь занял ${travelMinutes} мин. ${message}${hazardNotice}`,encounter:true,travelMinutes};
  }
  if (destinationId==='farmstead' && Math.random()<.38) {
    const height=Math.round(Math.random()*15*10)/10;
    const landingDamage=Math.max(0,Math.ceil(height*.55-2));
    game.player.hp=Math.max(1,game.player.hp-landingDamage);
    hazardNotice += ` Трамплин резко подбрасывает тебя примерно на ${height.toFixed(1)} м. После приземления здоровье ${landingDamage?`снижается на ${landingDamage}`:'не пострадало'}.`;
    recordKnowledge(game,'anomalies','trampoline','Трамплин','Гравитационное поле кратко подбрасывает попавшего внутрь на высоту до 15 метров.');
  }
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
    recordKnowledge(game,'mutants',useFlesh?'flesh':'blind-dog',useFlesh?'Плоть':'Слепой пёс',useFlesh?'Крупный мутант, часто замеченный у старых построек.':'Слепой пёс держится стаями у заброшенных построек.');
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

function ensureSquadMembers(game) {
  game.squadMembers ||= [];
  for (const squad of game.squads||[]) {
    const existing=game.squadMembers.filter(member=>member.squadId===squad.id);
    const needed=Math.max(1,Number(squad.members)||1);
    for (let index=existing.length; index<needed; index++) {
      const faction=squad.faction||'loner';
      const first=pick(STALKER_FIRST_NAMES);
      const nickname=pick(STALKER_NICKNAMES);
      game.squadMembers.push({
        id:`${squad.id}-member-${index+1}`,
        name:`${first} ${nickname}`,
        role:index===0?'Сталкер':'Боец отряда',
        group:FACTION_GROUPS[faction]||'Путники',
        faction, squadId:squad.id, memberIndex:index,
        location:squad.location, ...npcLook(faction),
        greeting:pick([
          'Здорово. Не видел тебя раньше. Ты по делу или просто пережидаешь? ',
          'Привет, сталкер. Дорога сегодня какая-то беспокойная. ',
          'Чего хотел? Только говори потише, вокруг уши есть. ',
          'Здорово. У костра места хватит, если не собираешься устраивать шум. ',
          'Слушаю. Если знаешь что-то полезное — выкладывай.'
        ]).trim()
      });
    }
  }
  return game.squadMembers;
}

export function getAvailableStalkers(game, locationId=game.locationId) {
  ensureSquadMembers(game);
  ensureAmbientNpcs(game);
  const squadMembers=game.squadMembers.map(member=>{
    const squad=(game.squads||[]).find(entry=>entry.id===member.squadId);
    return {...member,location:squad?.location||member.location};
  });
  const people=[...NPCS,...(game.randomTraders||[]),...(game.ambientNpcs||[]),...squadMembers];
  const seen=new Set();
  const territory=getLocation(locationId)?.territory;
  return people.filter(person=>{
    if (locationId!=null && person.location!==locationId) return false;
    if (person.captured && game.currentAreaId!=='atp-first-floor-prisoners') return false;
    if (person.faction==='loner' && ['bandit','military'].includes(territory) && !person.captured) return false;
    if (person.faction==='bandit' && territory==='military') return false;
    if (person.faction==='military' && territory==='bandit') return false;
    if (game.atpRescue?.cleared && locationId==='atp' && person.faction==='bandit') return false;
    if (seen.has(person.id)) return false;
    seen.add(person.id); return true;
  });
}

export function getStalkerById(game,npcId) {
  ensureSquadMembers(game);
  ensureAmbientNpcs(game);
  const member=game.squadMembers.find(entry=>entry.id===npcId);
  if (member) {
    const squad=(game.squads||[]).find(entry=>entry.id===member.squadId);
    return {...member,location:squad?.location||member.location};
  }
  return NPCS.find(entry=>entry.id===npcId) || (game.randomTraders||[]).find(entry=>entry.id===npcId) || (game.ambientNpcs||[]).find(entry=>entry.id===npcId) || null;
}

function getDialogueNpc(game, npcId) {
  return getStalkerById(game,npcId);
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
  return {ok:true,job:jobs.active,message:`Сидорович: «${jobs.active.description} За работу заплачу ${jobs.active.reward} Купонов».`};
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
  addLog(game,`Поручение «${job.title}» выполнено. Сидорович выплатил ${job.reward} Купонов.`);
  return {ok:true,message:`Сидорович: «Ну, ${job.type==='tails'?'хвосты получил':job.type==='medusa'?'Медузу забрал':'должнику напомнил'} — дело сделано. Держи ${job.reward} Купонов. Сидорович не обидел!» Получено +5 рейтинга.`};
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
  addLog(game,`Задание «Собаки у вагончика» выполнено. Волк заплатил ${reward} Купонов.`);
  game.dialogueReply=`Волк: «Вот это дело, сталкер. Теперь новички смогут спокойно ходить к вагончику. Держи ${reward} Купонов — заслужил».`;
  return {ok:true,message:`Волк: «Вот это дело, сталкер. Теперь новички смогут спокойно ходить к вагончику. Держи ${reward} Купонов — заслужил». Получено +5 рейтинга.`};
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
  recordKnowledge(game,'people',npc.id,npc.name,`${npc.role||'Персонаж'} · ${npc.group||npc.faction||'Путник'}`);
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
    const anomalyQuest=game.quests?.find(entry=>entry.id==='signal-dump');
    if (anomalyQuest?.status==='available') answer='Слушай, сталкер, появилась в Тайном лагере странная аномалия. Таких у нас ещё не было. Возможно, она и вовсе уникальная, а я как торговец скажу тебе: всё, что уникально, можно хорошо продать. К тому же кто знает, какие у неё артефакты. Так что сходи и посмотри. Придёшь, расскажешь — с меня причитается.';
    else if (anomalyQuest?.status==='active') answer='Поручение по неизвестной аномалии ещё в силе. Доберись до Тайного лагеря, осмотри поле и придумай ему название. Потом вернёшься с докладом.';
    else if (anomalyQuest?.status==='ready') answer=`Ты уже назвал аномалию «${game.secretAnomaly?.name||'неизвестно'}». Возвращайся с докладом, мне интересно, что ты там увидел.`;
    else if (jobs.active) answer=`У тебя уже есть поручение «${jobs.active.title}». ${jobs.active.description}`;
    else if (game.clock.worldMinutes<jobs.cooldownUntil) answer='Пока ничего нового. Дай мне немного времени, сталкер.';
    else answer='Хе-хе. Есть для тебя работа. Скажи, если готов взяться за поручение.';
    game.dialogueReply=answer;
    return answer;
  }
  const key = topic.toLowerCase();
  const aliases=[
    {target:'work',roots:['работ','задан','квест','поруч','помощ','дело','подработ']},
    {target:'trade',roots:['торгов','куп','прод','обмен','бартер','товар']},
    {target:'rumors',roots:['слух','новост','что слышно','обстанов']},
    {target:'food',roots:['еда','колбас','голод','перекус']},
    {target:'advice',roots:['совет','подсказ','помоги']},
    {target:'anomaly',roots:['аномал','неизвестн']}
  ];
  const alias=aliases.find(entry=>entry.roots.some(root=>key.includes(root)));
  const mapped = (alias&&npc.lines?.[alias.target]) ? alias.target : Object.keys(npc.lines||{}).find(entry => key.includes(entry) || entry.includes(key));
  if (npcId==='sidorovich' && key.includes('работ') && game.quests?.some(entry=>entry.id==='signal-dump'&&entry.status==='available')) {
    answer='Слушай, сталкер, появилась в Тайном лагере странная аномалия. Таких у нас ещё не было. Возможно, она и вовсе уникальная, а я как торговец скажу тебе: всё, что уникально, можно хорошо продать. К тому же кто знает, какие у неё артефакты. Так что сходи и посмотри. Придёшь, расскажешь — с меня причитается.';
  } else {
    answer = mapped ? npc.lines[mapped] : `${npc.name} смотрит на тебя с недоверием. «Сейчас мне нечего добавить. Сначала разберись с делом».`;
  }
  game.dialogueReply=answer;
  return answer;
}

export function replyNpcFreeText(game,npcId,rawText) {
  const npc=getDialogueNpc(game,npcId);
  const text=String(rawText||'').toLowerCase().replaceAll('ё','е').replace(/[«»„“”"']/g,' ').replace(/[^а-яa-z0-9 -]/g,' ').replace(/\s+/g,' ').trim();
  if (!npc || npc.location!==game.locationId) return {ok:false,message:'Собеседник сейчас не находится рядом.'};
  if (!text) return {ok:false,message:'Напиши, что хочешь сказать.'};
  const includes=(...roots)=>roots.some(root=>text.includes(root));
  let answer='';
  if (npc.captured) {
    answer=includes('кто','что случ','как попал','как захват','захват','почему','плен','когда','расскажи')
      ? 'Нас двоих держат здесь уже не первый день. Бандиты с АТП перехватили нашу группу, вещи забрали, а нас заперли на первом этаже. Мы слышали, что во дворе дежурит несколько человек. Если станет тихо, попробуем уйти.'
      : 'Пожалуйста, не уходи, пока они рядом. Мы не знаем, сколько бандитов осталось во дворе. Если решишь помочь, сначала осмотрись и будь осторожен.';
    game.dialogueReply=answer; game.dialogueHistory ||= [];
    game.dialogueHistory.push({role:'player',text:String(rawText).slice(0,500)},{role:'npc',text:answer});
    game.dialogueHistory=game.dialogueHistory.slice(-16); addLog(game,`${npc.name}: ${answer}`);
    return {ok:true,message:answer};
  }

  if (includes('торгов','торговать','обмен','купить','продать','цен','товар','покажи ассортимент','что продаешь','что есть в наличии')) {
    const answer=pick([`Ладно, ${npc.name==='Сидорович'?'сталкер':'договорились'}. Открываю обмен — посмотри, что у меня есть, и что готов предложить сам.`,`Давай к делу. В торговом окне увидишь мой запас и цены выкупа на твои вещи.`,`Есть о чём поговорить. Открывай сделку: товар слева, твой рюкзак справа.`]);
    game.dialogueReply=answer;
    game.dialogueHistory ||= [];
    game.dialogueHistory.push({role:'player',text:String(rawText).slice(0,500)},{role:'npc',text:answer});
    game.dialogueHistory=game.dialogueHistory.slice(-16);
    addLog(game,`${npc.name}: ${answer}`);
    return {ok:true,message:answer,action:'trade',traderId:npcId};
  }
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
  return getAvailableStalkers(game,locationId).map(person=>findTrader(game,person.id)?.trader).filter(Boolean);
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
  const message=`Куплено у ${found.trader.name}: ${name} за ${stock.price} Купонов.`;
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
    const message=`Продано ${item.name} ×${qty} торговцу ${found.trader.name}. Получено ${price*qty} Купонов.`;
    addLog(game,message);
    return {ok:true,message,price:price*qty};
  }
  let stock=found.record.stock.find(entry=>entry.id===itemId);
  if (!stock) {
    stock={id:itemId,qty:0,price:Math.max(price+1,Math.ceil(item.price*(found.trader.priceMultiplier||1.1)))};
    found.record.stock.push(stock);
  }
  stock.qty+=qty;
  const message=`Продано ${item.name} ×${qty} торговцу ${found.trader.name}. Получено ${price*qty} Купонов.`;
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
  if (!countItem(game.inventory, 'otklik') && !countItem(game.inventory, 'medved')) return { ok:false, message:'Для мини-игры нужен детектор «Отклик» или «Медведь».' };
  const hasMedved=countItem(game.inventory,'medved')>0;
  recordKnowledge(game,'equipment',hasMedved?'medved':'otklik',hasMedved?'Детектор «Медведь»':'Детектор «Отклик»','Используется для обнаружения аномальных сигналов.');
  const pool = location.id==='anomaly-dump' && hasMedved ? ['stone-flower','medusa','gravi'] : location.hazards.includes('gravity') ? ['medusa','gravi'] : location.id==='atp' ? ['gravi','medusa'] : ['medusa','meat_chunk'];
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
      recordKnowledge(game,'artifacts',artifactId,getItem(artifactId)?.name||artifactId,getItem(artifactId)?.desc||'Найденный артефакт.');
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

export function nameSecretAnomaly(game, rawName) {
  const name=String(rawName||'').trim().replace(/[<>"']/g,'').slice(0,32);
  if (game.locationId!=='anomaly-dump' || !game.secretAnomaly?.observed) return {ok:false,message:'Сначала доберись до Тайного лагеря и внимательно осмотри аномалию.'};
  if (name.length<3) return {ok:false,message:'Название должно содержать хотя бы три символа.'};
  game.secretAnomaly.name=name;
  const quest=game.quests?.find(entry=>entry.id==='signal-dump');
  if (quest?.status==='active') quest.status='ready';
  recordKnowledge(game,'anomalies','secret-unknown',name,'Необычное поле Тайного лагеря. Название придумано игроком.');
  addLog(game,`Ты дал неизвестной аномалии название «${name}».`,'player');
  return {ok:true,message:`Аномалия теперь отмечена в КПК как «${name}». Вернись к Сидоровичу с докладом.`};
}

export function turnInSecretAnomalyQuest(game) {
  if (game.locationId!=='sidorovich-bunker') return {ok:false,message:'Вернись к Сидоровичу в подвал.'};
  const quest=game.quests?.find(entry=>entry.id==='signal-dump');
  if (!quest || quest.status!=='ready' || !game.secretAnomaly?.name) return {ok:false,message:'Сначала исследуй аномалию и дай ей название.'};
  quest.status='completed'; game.money+=quest.reward; game.player.questsDone=(game.player.questsDone||0)+1; grantReputation(game,5);
  addLog(game,`Задание «Новая аномалия» выполнено. Получено ${quest.reward} Купонов.`);
  return {ok:true,message:`Сидорович внимательно слушает доклад о «${game.secretAnomaly.name}». «Вот это уже интересно. Держи ${quest.reward} Купонов — и пока никому лишнего не рассказывай».`};
}

export function turnInPudelQuest(game) {
  if (game.locationId!=='farmstead') return {ok:false,message:'Костя Пудель ждёт у костра на развалинах хутора.'};
  const quest=game.quests?.find(entry=>entry.id==='pudel-sausage');
  if (!quest || quest.status!=='active') return {ok:false,message:'Сначала поговори с Костей Пуделем и возьми его просьбу.'};
  if (!countItem(game.inventory,'sausage')) return {ok:false,message:'Нужна именно диетическая колбаса.'};
  removeItem(game.inventory,'sausage',1); quest.status='completed'; game.money+=quest.reward; game.player.questsDone=(game.player.questsDone||0)+1; grantReputation(game,3);
  addLog(game,`Задание «Колбаска для Пуделя» выполнено. Получено ${quest.reward} Купонов.`);
  return {ok:true,message:`Костя Пудель довольно кивает: «Вот это ты вовремя. Спасибо, сталкер». Получено ${quest.reward} Купонов.`};
}

export function claimAtpRescueReward(game) {
  if (game.locationId!=='sidorovich-bunker') return {ok:false,message:'За наградой нужно вернуться к Сидоровичу.'};
  const state=game.atpRescue||{};
  if (!state.cleared) return {ok:false,message:'Пока нет подтверждения, что пленники освобождены.'};
  if (state.rewardClaimed) return {ok:false,message:'Награда за спасение уже получена.'};
  const a=addItem(game.inventory,'aksu',1); if (!a.ok) return {ok:false,message:`Не удалось получить АКСУ: ${a.reason}`};
  const b=addItem(game.inventory,'debyt',1); if (!b.ok) { removeItem(game.inventory,'aksu',1); return {ok:false,message:`Не удалось получить костюм «Дебют»: ${b.reason}`}; }
  state.rewardClaimed=true; addLog(game,'Сидорович выдал за спасение пленников АКСУ и костюм «Дебют».');
  return {ok:true,message:'Сидорович нехотя, но признаёт услугу: «Забирай. АКСУ и Дебют. И не делай вид, что я это раздаю каждому». Награда получена.'};
}

export function beginAtpRescue(game) {
  if (game.locationId!=='atp') return {ok:false,message:'Пленные находятся на первом этаже двухэтажного здания АТП.'};
  if (game.atpRescue?.cleared) return {ok:false,message:'Бандиты уже отступили, пленники свободны.'};
  if (game.activeEncounter) return {ok:false,message:'Сначала закончи текущую схватку.'};
  game.atpRescue ||= {started:false,cleared:false,rewardClaimed:false,remaining:6};
  game.atpRescue.started=true; game.atpRescue.remaining=6;
  game.activeEncounter={type:'bandit',name:'Бандитский дозор',hp:65,maxHp:65,damage:10,count:1,faction:'bandit',...npcLook('bandit'),atpAssault:true,atpIndex:1};
  addLog(game,'Ты решаешь отвлечь бандитов и добраться до комнаты, где держат сталкеров. Схватка начинается.','danger');
  return {ok:true,encounter:true,message:'Бандиты заметили тебя. Придётся пройти через их дозор, чтобы освободить пленников.'};
}

export function advanceAtpRescue(game) {
  const rescue=game.atpRescue;
  if (!rescue?.started) return false;
  rescue.remaining=Math.max(0,(rescue.remaining||1)-1);
  if (rescue.remaining>0) {
    game.activeEncounter={type:'bandit',name:`Бандит на АТП · ${7-rescue.remaining}/6`,hp:58+Math.floor(Math.random()*15),maxHp:70,damage:9+Math.floor(Math.random()*5),count:1,faction:'bandit',...npcLook('bandit'),atpAssault:true,atpIndex:5-rescue.remaining};
    addLog(game,'Следующий бандит пытается перекрыть проход.');
  } else {
    rescue.started=false; rescue.cleared=true; game.activeEncounter=null;
    for (const captive of game.ambientNpcs||[]) {
      if (captive.captured) { captive.captured=false; captive.location='rookie-village'; captive.role='Освобождённый сталкер'; captive.activity='пришёл в деревню и отдыхает после плена'; captive.greeting='Ты вытащил нас оттуда. Мы добрались до деревни. Спасибо, сталкер.'; }
      if (captive.faction==='bandit' && captive.location==='atp') { captive.location='ravine-tunnel'; captive.role='Отступивший бандит'; captive.activity='отступил с территории АТП'; captive.personalTask='держится подальше от АТП'; }
    }
    addLog(game,'На АТП стало тихо. Двое пленных сталкеров освобождены и могут покинуть здание.','success');
  }
  return true;
}

export function toggleCurrentLocationLight(game) {
  game.locationLights ||= {};
  const enabled=!game.locationLights[game.locationId];
  game.locationLights[game.locationId]=enabled;
  addLog(game,enabled?'Ты включил свет в помещении.':'Ты выключил свет в помещении.','player');
  return {ok:true,message:enabled?'Свет включён.':'Свет выключен.'};
}

export function useTrampoline(game) {
  if (game.locationId!=='farmstead') return {ok:false,message:'Трамплин находится на развалинах хутора.'};
  const height=Math.round(Math.random()*150)/10;
  const landingDamage=Math.max(0,Math.ceil(height*.55-2));
  game.player.hp=Math.max(1,game.player.hp-landingDamage);
  recordKnowledge(game,'anomalies','trampoline','Трамплин','Гравитационное поле подбрасывает попавшего внутрь на высоту от 0 до 15 метров.');
  addLog(game,`Трамплин подбрасывает тебя примерно на ${height.toFixed(1)} м. После приземления здоровье ${landingDamage?`снижается на ${landingDamage}`:'не пострадало'}.`,'danger');
  return {ok:true,message:`Гравитационное поле резко подбрасывает тебя на ${height.toFixed(1)} м и возвращает на землю. ${landingDamage?`Ты теряешь ${landingDamage} здоровья.`:'Приземление обошлось без потерь.'}`};
}

export function useVortex(game) {
  if (game.locationId!=='anomaly-dump') return {ok:false,message:'Воронка находится в Тайном лагере.'};
  game.anomalyCooldowns ||= {vortexUntil:0,carouselUntil:0};
  const inactiveUntil=Number(game.anomalyCooldowns.vortexUntil||0);
  if (inactiveUntil>game.clock.worldMinutes) return {ok:true,message:'После разряда воронка временно затихла. Можно быстро пройти по краю.'};
  recordKnowledge(game,'anomalies','vortex','Воронка','Гравитационная аномалия притягивает предметы и человека к центру, затем сжимает поле и выпускает разряд.');
  game.vortexCaught={attempts:2};
  addLog(game,'Воронка тянет к центру. Тебя удерживает гравитационное поле — нужно попытаться вырваться.','danger');
  return {ok:true,message:'Воронка начинает притягивать тебя. Напиши «вырваться» или «сопротивляться», чтобы попытаться выбраться.'};
}

export function escapeVortex(game) {
  if (!game.vortexCaught) return {ok:false,message:'Сейчас тебя не удерживает аномалия.'};
  if (Math.random()<.62) { game.vortexCaught=null; addLog(game,'Тебе удаётся выбраться из зоны притяжения.','player'); return {ok:true,message:'Ты вырываешься из поля и отползаешь на безопасное расстояние.'}; }
  game.vortexCaught.attempts-=1;
  if (game.vortexCaught.attempts<=0) {
    game.player.hp=Math.max(1,game.player.hp-14); game.vortexCaught=null; game.anomalyCooldowns ||= {vortexUntil:0,carouselUntil:0}; game.anomalyCooldowns.vortexUntil=game.clock.worldMinutes+18;
    addLog(game,'Воронка сжимается, затем проходит мощный разряд. Поле временно отключается.','danger');
    return {ok:true,message:'Воронка на короткое время сдавливает поле и выпускает разряд. Ты отбрасываешься в сторону, получаешь 14 урона; аномалия временно неактивна.'};
  }
  return {ok:true,message:'Притяжение усиливается, но ещё есть шанс выбраться. Попробуй снова.'};
}

export function useCarousel(game) {
  if (game.locationId!=='anomaly-dump') return {ok:false,message:'Карусель находится в Тайном лагере.'};
  game.anomalyCooldowns ||= {vortexUntil:0,carouselUntil:0};
  if (Number(game.anomalyCooldowns.carouselUntil||0)>game.clock.worldMinutes) return {ok:true,message:'После разряда поле карусели временно отключено. Можно осторожно пройти.'};
  recordKnowledge(game,'anomalies','carousel','Карусель','Поле поднимает попавшего внутрь и постепенно ускоряет вращение. После короткого разряда временно затихает.');
  game.carouselCaught={stage:1,attempts:2};
  addLog(game,'Поле карусели подхватывает тебя и начинает медленно поднимать над землёй. Вращение ускоряется.','danger');
  return {ok:true,message:'Карусель поднимает тебя в воздух и постепенно ускоряет вращение. Можно попытаться вырваться — напиши «вырваться». '};
}

export function escapeCarousel(game) {
  if (!game.carouselCaught) return {ok:false,message:'Сейчас ты не попал в поле карусели.'};
  if (Math.random()<.48) { game.carouselCaught=null; addLog(game,'Тебе удаётся выскользнуть из поля карусели.','player'); return {ok:true,message:'Ты вырываешься из вращающегося поля и падаешь на безопасный участок.'}; }
  game.carouselCaught.attempts-=1; game.carouselCaught.stage=2;
  if (game.carouselCaught.attempts<=0) {
    game.carouselCaught=null; game.player.hp=Math.max(1,game.player.hp-24); game.anomalyCooldowns ||= {vortexUntil:0,carouselUntil:0}; game.anomalyCooldowns.carouselUntil=game.clock.worldMinutes+15;
    addLog(game,'Карусель резко меняет направление, затем поле гаснет после короткого разряда.','danger');
    return {ok:true,message:'Вращение резко ускоряется и выбрасывает тебя за пределы поля. Ты теряешь 24 здоровья; после разряда аномалия временно отключается.'};
  }
  return {ok:true,message:'Вращение становится быстрее. У тебя осталась ещё одна попытка вырваться.'};
}

export function updateWeather(game) {
  if (Math.random() < .25) game.weather = ['Пасмурно','Мелкий дождь','Сухой ветер','Низкая облачность','Туман у низины'][Math.floor(Math.random()*5)];
}
