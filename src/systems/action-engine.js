import { NPCS, LOCATIONS } from '../data/catalog.js';
import { addLog, describeLocation, searchLocation, talkToNpc, startArtifactHunt, deactivateAnomaly, getLocation, scoutLocation } from './world.js';
import { playerAttack, beginEncounter } from './combat.js';
import { useItem, countItem } from './inventory.js';

const random = (items) => items[Math.floor(Math.random()*items.length)];
const lower = (value) => String(value || '').toLowerCase().replaceAll('ё','е');

export function processPlayerAction(game, rawText) {
  const text = lower(rawText).trim();
  if (!text) return { message:'Напиши действие или вопрос.' };

  const remoteLocation = LOCATIONS.find(location => text.includes(lower(location.name)) && location.id !== game.locationId);
  if (remoteLocation && /(бинокл|осмотр|развед)/.test(text)) return { message:scoutLocation(game,remoteLocation.id).message };
  if (/(осмотр|осмотреть|вокруг|что здесь|что вокруг|округа|обстановк)/.test(text)) {
    return { message:describeLocation(game) };
  }
  if (/(карта|куда идти|маршрут|соседн)/.test(text)) return { message:'Открываю карту Кордона. На ней можно выбрать соседнюю локацию.', action:'map' };
  if (/(инвентар|рюкзак|снаряжен)/.test(text)) return { message:'Открываю инвентарь.', action:'inventory' };
  if (/(задани|квест)/.test(text)) return { message:'Открываю список заданий.', action:'quests' };
  if (/(статистик|характеристик)/.test(text)) return { message:'Открываю личную статистику.', action:'stats' };
  if (/(сон|спать|поспать|отдохн)/.test(text)) return { message:'Можно выбрать продолжительность сна в панели отдыха.', action:'sleep' };
  if (/(артефакт|детектор|отклик|сигнал)/.test(text)) {
    const result = startArtifactHunt(game);
    return { message:result.message, action:result.ok ? 'artifact' : null };
  }
  if (/(болт|отключить аномали|проверить аномали)/.test(text)) {
    return { message:deactivateAnomaly(game).message };
  }
  if (/(обыск|обыскать|искать|поиск|тайник|труп|обыскать труп)/.test(text)) {
    const corpse = /(труп|тело|погибш)/.test(text);
    const result = searchLocation(game, { corpse });
    return { message:result.message };
  }
  if (/(атак|стреля|выстрел|бей|ударить)/.test(text)) {
    if (game.activeEncounter) return { message:playerAttack(game).message };
    const enemyType = /(бандит|кефир)/.test(text) ? 'bandit' : /(военн|солдат|дзержин)/.test(text) ? 'military' : 'blind-dog';
    beginEncounter(game,enemyType);
    const enemyName = enemyType==='bandit'?'бандит':enemyType==='military'?'военнослужащий':'слепой пёс';
    return { message:`Ты провоцируешь опасность. Перед тобой появляется ${enemyName}. Бой начался.`, action:'combat' };
  }
  if (/(поговор|диалог|сказать|спросить|привет)/.test(text)) {
    const npc = NPCS.find(entry => text.includes(lower(entry.name)) || (entry.location === game.locationId && /(торговец|сидорович|волк|кефир|капитан|воен)/.test(text)));
    if (npc) {
      const result = talkToNpc(game, npc.id);
      return { message:result.ok ? `${npc.name}: «${npc.greeting}»` : result.message, action:result.ok ? 'dialogue' : null, npcId:npc.id };
    }
    return { message:'Поблизости нет подходящего собеседника. Осмотрись или выбери персонажа в списке контактов.' };
  }
  if (/(выпить|попить|вода|жажд)/.test(text)) {
    const id = countItem(game.inventory,'water') ? 'water' : countItem(game.inventory,'energy') ? 'energy' : 'vodka';
    return { message:useItem(game,id).message };
  }
  if (/(поесть|съесть|перекус|голод|хлеб|тушенк|колбас)/.test(text)) {
    const id = ['canned','sausage','bread'].find(itemId => countItem(game.inventory,itemId));
    return { message:id ? useItem(game,id).message : 'В рюкзаке нет еды.' };
  }
  if (/(леч|аптеч|бинт|ран)/.test(text)) {
    const id = ['milmed','ai2','bandage'].find(itemId => countItem(game.inventory,itemId));
    return { message:id ? useItem(game,id).message : 'В рюкзаке нет медицинских средств.' };
  }
  if (/(антирад|радиац)/.test(text)) return { message:useItem(game,'antirad').message };
  if (/(куда|где я|локаци)/.test(text)) return { message:`Ты находишься: ${getLocation(game.locationId)?.name}. ${describeLocation(game)}` };
  if (/(отряд|патрул)/.test(text)) {
    const nearby = game.squads.filter(squad => squad.location === game.locationId);
    return { message:nearby.length ? `Рядом замечены: ${nearby.map(s=>s.name).join(', ')}.` : 'В непосредственной близости патрулей не замечено.' };
  }
  const location = getLocation(game.locationId);
  const replies = [
    `Ты действуешь осторожно. ${random(['В ответ слышен только ветер.','Где-то скрипит металл.','На мгновение кажется, что за тобой наблюдают.'])}`,
    `В текущей обстановке (${location?.name}) это не даёт явного результата. Попробуй уточнить действие: осмотреться, поговорить, обыскать, поспать или проверить аномалию.`,
    'Ты тратишь немного времени, но ничего необычного не происходит. Зона не спешит раскрывать свои секреты.',
    'Поблизости нет очевидной реакции. Возможно, стоит осмотреть местность или поговорить с кем-нибудь из местных.'
  ];
  const message = random(replies);
  addLog(game, message);
  return { message };
}
