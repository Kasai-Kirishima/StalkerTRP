import { LOCATIONS, ITEMS, EXPLORE_SPOTS } from '../data/catalog.js';
import { addLog, describeLocation, searchLocation, talkToNpc, replyNpcFreeText, startArtifactHunt, deactivateAnomaly, getLocation, scoutLocation, getAvailableTraders, getAvailableStalkers, startAreaSearch, sitAtCampfire, takeShelter, advanceGame, nameSecretAnomaly, beginAtpRescue, toggleCurrentLocationLight, useVortex, escapeVortex, useCarousel, escapeCarousel, useTrampoline } from './world.js';
import { playerAttack, beginEncounter, combatTextAction, getBestWeapon } from './combat.js';
import { useItem, countItem, removeItem, addItem, getWeight } from './inventory.js';
import { getItemCondition } from './equipment-condition.js';
import { containsReferencePronoun, getRememberedEntity, rememberEntity, grammaticalGender, genderedSubject, pronounInDative, tokenizeRussian, stemRussianWord } from './russian-language.js';

const random = (items) => items[Math.floor(Math.random()*items.length)];
const normalize = (value) => String(value || '').toLowerCase().replaceAll('ё','е').replace(/[«»„“”"'`]/g,' ').replace(/[^а-яa-z0-9-]+/g,' ').trim().replace(/\s+/g,' ');
const has = (text, pattern) => pattern.test(text);

function wordFamily(text, roots) {
  const tokens=tokenizeRussian(text);
  const stems=tokens.map(stemRussianWord);
  return roots.some(root=>{
    const normalized=normalize(root);
    const rootStem=stemRussianWord(normalized);
    return tokens.some(token=>token===normalized || token.startsWith(normalized)) || stems.some(stem=>stem===rootStem || stem.startsWith(rootStem));
  });
}

function hasPronounReference(text) {
  return containsReferencePronoun(text) || /\b(там|туда|тут|это место|эта штука|тот|та|то)\b/.test(text);
}

function entityMentioned(text, entity) {
  const name=normalize(entity?.name || '');
  if (!name) return false;
  if (text.includes(name)) return true;
  const tokens=tokenizeRussian(text);
  if (name.length>=3 && tokens.includes(name)) return true;
  const parts=name.split(' ').filter(part=>part.length>=4);
  const stems=tokens.map(stemRussianWord);
  return parts.some(part=>{
    const root=stemRussianWord(part);
    return tokens.some(token=>token.startsWith(part)) || stems.some(stem=>stem.startsWith(root));
  });
}

function findNamedEntity(game,text) {
  const people=getAvailableStalkers(game,null);
  const npc=people.find(person=>entityMentioned(text,person));
  if (npc) return {entity:npc,type:'npc'};
  const location=LOCATIONS.find(place=>entityMentioned(text,place));
  if (location) return {entity:location,type:'location'};
  const creatureAliases=[
    {rx:/(слеп(ой|ого|ому|ым|ом) пес|собак(а|и|у|ой|е)|псевдособак)/,entity:{id:'blind-dog',name:'Слепой пёс',type:'blind-dog',gender:'m'},type:'creature'},
    {rx:/(плот(ь|и|ью)|мутантн(ая|ой) плот)/,entity:{id:'flesh',name:'Плоть',type:'flesh',gender:'f'},type:'creature'},
    {rx:/(бандит(а|у|ом|е)?|кефир)/,entity:{id:'bandit',name:'Бандит',type:'bandit',gender:'m'},type:'creature'},
    {rx:/(военн(ый|ого|ому|ым|ом)|солдат(а|у|ом|е)?)/,entity:{id:'military',name:'Военнослужащий',type:'military',gender:'m'},type:'creature'}
  ];
  const creature=creatureAliases.find(entry=>entry.rx.test(text));
  if (creature) return creature;
  const item=ITEMS.find(entry=>entityMentioned(text,entry));
  if (item) return {entity:item,type:'item'};
  return null;
}

function rememberMention(game,text) {
  const named=findNamedEntity(game,text);
  if (named) {
    if (named.type==='item') { game.lastMentionedItemId=named.entity.id; rememberEntity(game,named.entity,'item'); }
    else rememberEntity(game,named.entity,named.type);
    return named;
  }
  return null;
}

function resolveReference(game,text) {
  if (!hasPronounReference(text)) return null;
  return getRememberedEntity(game,text);
}

function allPeople(game) {
  return getAvailableStalkers(game,null);
}

function getNpcFromReference(game,reference) {
  if (!reference || reference.type!=='npc') return null;
  return allPeople(game).find(person=>person.id===reference.id) || null;
}

function getCreatureType(reference, text) {
  if (reference?.type==='creature') return reference.id;
  if (reference?.type==='npc') {
    if (reference.faction==='military') return 'military';
    if (reference.faction==='bandit') return 'bandit';
    return 'stalker';
  }
  if (/(плоть|плотью|плоти)/.test(text)) return 'flesh';
  if (/(военн|солдат|дзержин)/.test(text)) return 'military';
  if (/(бандит|кефир)/.test(text)) return 'bandit';
  return 'blind-dog';
}

// Context-aware local Game Master. It never invents outcomes: it narrates only
// observations backed by the current location, visible contacts and carried gear.
function buildGameMasterFallback(game, rawText) {
  const text=normalize(rawText);
  const location=getLocation(game.locationId);
  const people=getAvailableStalkers(game,game.locationId);
  const squads=(game.squads||[]).filter(squad=>squad.location===game.locationId);
  const placeName=location?.name||'текущем участке';
  const currentArea=EXPLORE_SPOTS.find(spot=>spot.id===game.currentAreaId&&spot.locationId===game.locationId);
  const hour=Math.floor((((Number(game.clock?.worldMinutes)||0)%1440)+1440)%1440/60);
  const timeOfDay=hour<5?'ночью':hour<8?'на рассвете':hour<12?'утром':hour<17?'днём':hour<21?'вечером':'поздним вечером';

  if (/(жду|ожидаю|выжидаю|подожду|немного подожду)/.test(text)) {
    advanceGame(game,2);
    const nextHour=Math.floor((((Number(game.clock?.worldMinutes)||0)%1440)+1440)%1440/60);
    const phase=nextHour<5?'ночь':nextHour<8?'рассвет':nextHour<12?'утро':nextHour<17?'день':nextHour<21?'вечер':'поздний вечер';
    return `Ты остаёшься на месте и выжидаешь пару минут. На «${placeName}» пока ничего не меняется; сейчас ${phase}.`;
  }

  if (/(прислуш|вслуш|слушаю|слушаешься|прислушиваюсь)/.test(text)) {
    const sound=game.emission?.active?'Низкий гул выброса заглушает дальние звуки.':/дожд|гроза|ветер/i.test(game.weather||'')?'Шум погоды перебивает мелкие звуки; иногда слышно, как скрипит металл.':'Слышны ветер, шорох травы и отдельные звуки со стороны построек.';
    const company=people.length?` Поблизости замечены: ${people.slice(0,3).map(person=>person.name).join(', ')}.`:squads.length?` В районе замечены отряды: ${squads.map(squad=>squad.name).join(', ')}.`:'Рядом не видно людей.';
    return `Ты замираешь и прислушиваешься на «${placeName}». ${sound}${company}`;
  }

  if (/(проверяю|проверить|осматриваю|осмотреть).{0,32}(оруж|ствол|снаряж|экипиров)|(?:оруж|ствол|снаряж|экипиров).{0,24}(проверить|осмотреть|состояни)/.test(text)) {
    const weapon=getBestWeapon(game.inventory,game);
    const armorId=game.player?.armorId||game.equipmentSlots?.armor;
    const maskId=game.player?.maskId||game.equipmentSlots?.mask;
    const parts=[];
    if (weapon) parts.push(`${weapon.name} — ${Math.round(getItemCondition(game,weapon.id))}%`);
    else parts.push('исправного огнестрельного оружия не найдено');
    if (armorId) parts.push(`${ITEMS.find(item=>item.id===armorId)?.name||armorId} — ${Math.round(getItemCondition(game,armorId))}%`);
    if (maskId) parts.push(`${ITEMS.find(item=>item.id===maskId)?.name||maskId} — ${Math.round(getItemCondition(game,maskId))}%`);
    return `Ты проверяешь снаряжение на «${placeName}»: ${parts.join('; ')}. Для ремонта обратись к технику, если состояние просело.`;
  }

  if (/(проверяю|пересчитываю|что у меня|покажи).{0,24}(рюкзак|вещи|припасы|запасы)|(?:рюкзак|припасы).{0,24}(проверить|пересчитать|что есть)/.test(text)) {
    const entries=(game.inventory||[]).filter(stack=>stack.qty>0).slice(0,7).map(stack=>`${ITEMS.find(item=>item.id===stack.id)?.name||stack.id} ×${stack.qty}`);
    const total=(game.inventory||[]).reduce((sum,stack)=>sum+(Number(stack.qty)||0),0);
    return `Ты пересчитываешь припасы: ${total} предметов, вес ${getWeight(game.inventory).toFixed(1)} кг. ${entries.length?`Под рукой: ${entries.join(', ')}.`:'Рюкзак пуст.'}`;
  }

  if (/(кто|кого|люди|сталкер|народ).{0,24}(рядом|поблизости|здесь)|(?:рядом|поблизости).{0,20}(кто|люди|сталкер)/.test(text)) {
    return people.length?`На «${placeName}» поблизости: ${people.slice(0,6).map(person=>`${person.name} (${person.role||'сталкер'})`).join(', ')}. Можешь назвать конкретного человека, чтобы заговорить с ним.`:'Ты осматриваешься, но поблизости никого не замечаешь.';
  }

  const detail=currentArea?.description||location?.desc||'Местность просматривается плохо.';
  const contactLine=people.length?` Здесь неподалёку ${people.length} человек.`:' Поблизости никого не видно.';
  const mood=game.emission?.active?'Сейчас лучше не задерживаться снаружи.':(location?.hazards?.length?'На участке отмечены опасные зоны.':'Явной опасности прямо перед тобой не видно.');
  const replies=[
    `Ты пробуешь выполнить действие на «${placeName}». ${detail}${contactLine} ${mood} Уточни, что именно хочешь сделать.`,
    `На «${placeName}» ${timeOfDay}. ${detail}${contactLine} ${random(['Пока никаких новых событий не происходит.','Ты не замечаешь явных изменений.','Для конкретного результата назови предмет, человека или место.'])}`,
    `Ты осматриваешь обстановку на «${placeName}». ${mood}${contactLine} ${random(['Можно осмотреться подробнее, поговорить с местными или выбрать переход на карте.','Не буду считать действие выполненным без понятной цели.','Уточни, с чем именно взаимодействовать.'])}`
  ];
  return random(replies);
}

function inspectReference(game, reference) {
  if (!reference) return null;
  if (reference.type==='location') {
    const place=getLocation(reference.id);
    if (place) return describeLocation(game,place.id);
  }
  if (reference.type==='npc') {
    const npc=getNpcFromReference(game,reference);
    if (npc) return `${genderedSubject(npc)} — ${npc.name}, ${npc.role||'сталкер'}. Сейчас находится: ${getLocation(npc.location)?.name||'местоположение неизвестно'}. ${npc.greeting||'Пока ничем не занят.'}`;
  }
  if (reference.type==='item') return `${genderedSubject(reference)} — ${reference.name}. ${reference.desc||'Предмет находится в твоём распоряжении.'}`;
  if (reference.type==='creature') {
    const active=game.activeEncounter;
    if (active && (active.type===reference.id || active.id===reference.id || active.name===reference.name)) {
      const gender=grammaticalGender(active);
      const danger=gender==='f'?'Она ещё опасна.':gender==='n'?'Оно ещё опасно.':'Он ещё опасен.';
      return `${genderedSubject(active)} — ${active.name}. Состояние: ${active.hp}/${active.maxHp} здоровья. ${active.hp>0?danger:'Противник уже повержен.'}`;
    }
    return `${genderedSubject(reference)} — ${reference.name}. Следы ведут в сторону ближайших укрытий.`;
  }
  return null;
}

export function processPlayerAction(game, rawText) {
  const text=normalize(rawText);
  if (!text) return { message:'Напиши действие или вопрос.' };

  const named=rememberMention(game,text);
  const reference=resolveReference(game,text);

  // Generic approach: show nearby people so the player can choose a specific contact.
  const approachVerb=/(подош(е|ё)л|подхожу|подойти|приблизил(ся|ась)|подбежал|направил(ся|ась) к|окликнул|поздороват(ься|ся)|обратил(ся|ась)|заговорить|поговорить|хочу поговорить|ищу собеседник|хочу найти собеседник|к кому обратиться|подойду)/.test(text);
  const approachPerson=/(сталкер|нпс|человек|люд|персонаж|мужик|парень|девуш|кто рядом|с кем|рядом|кого-нибудь|кого нибудь)/.test(text);
  const approachIntent=approachVerb&&(approachPerson||named?.type==='npc');
  if (approachIntent && named?.type!=='npc') {
    const nearby=getAvailableStalkers(game,game.locationId);
    if (!nearby.length) return {message:'Поблизости никого нет. Можно осмотреться или пройти к костру.'};
    return {message:`Ты осматриваешься рядом. Поблизости ${nearby.length} ${nearby.length===1?'человек':nearby.length<5?'человека':'человек'}. Выбери, к кому обратиться.`,action:'nearby-people'};
  }
  if (approachIntent && named?.type==='npc' && named.entity?.location===game.locationId) {
    const person=getAvailableStalkers(game,game.locationId).find(entry=>entry.id===named.entity.id);
    if (person) return {message:`Ты подходишь к ${person.name}.`,action:'dialogue',npcId:person.id};
  }

  // Торговлю можно открыть прямо из общего поля действий: укажи NPC по имени
  // или просто напиши «торговать», чтобы выбрать ближайшего собеседника.
  const tradeIntent=/(торг|обмен|сделк|купить|покуп|продать|продаж|покажи товар|открой торгов)/.test(text);
  if (tradeIntent) {
    const rememberedNpc=getNpcFromReference(game,reference);
    const currentPeople=getAvailableStalkers(game,game.locationId);
    const explicitNpc=named?.type==='npc'?named.entity:rememberedNpc;
    const rememberedDialogue=currentPeople.find(person=>person.id===game.dialogueNpcId);
    const target=explicitNpc?.location===game.locationId?explicitNpc:
      rememberedDialogue || currentPeople.find(person=>person.id==='sidorovich') ||
      currentPeople.find(person=>person.trader) || currentPeople.find(person=>person.faction===game.player.faction) || currentPeople[0];
    if (!target) return {message:'Поблизости нет сталкера, с которым можно открыть обмен.'};
    return {message:`Открываю торговлю с ${target.name}.`,action:'trade',npcId:target.id};
  }
  const pronoun=hasPronounReference(text);

  // Investigation, anomaly naming and rescue actions.
  const anomalyName=text.match(/(?:назвать|назови|обозначить|дать название)\s+(?:аномалию\s+)?(.{3,32})$/i);
  if (anomalyName) return {message:nameSecretAnomaly(game,anomalyName[1]).message};
  if (/(освободить пленник|спасти пленник|начать освобождение|отвлечь бандит)/.test(text)) {
    const result=beginAtpRescue(game); return {message:result.message,action:result.encounter?'combat':null,encounter:result.encounter};
  }
  if (/(вырваться|выбраться|сопротивляться|оттолкнуться)/.test(text) && game.vortexCaught) return {message:escapeVortex(game).message,action:'anomaly'};
  if (/(вырваться|выбраться|сопротивляться|оттолкнуться)/.test(text) && game.carouselCaught) return {message:escapeCarousel(game).message,action:'anomaly'};
  if (/(подойти|войти|проверить|наступить|попасть).{0,30}трамплин/.test(text)) return {message:useTrampoline(game).message,action:'anomaly'};
  if (/(подойти|войти|проверить|коснуться|попасть).{0,30}(воронк|вихр)/.test(text)) return {message:useVortex(game).message,action:'anomaly'};
  if (/(подойти|войти|проверить|коснуться|попасть).{0,30}карусел/.test(text)) return {message:useCarousel(game).message,action:'anomaly'};
  if (/(включить|включи|зажечь|зажги).{0,20}(свет|ламп)|(?:свет|ламп).{0,20}(включить|включи|зажечь|зажги)/.test(text)) {
    if (!/(подвал|бункер|погреб|тоннель|кабина|склад)/.test(`${text} ${game.currentAreaId||''} ${getLocation(game.locationId)?.name||''}`) && game.locationId!=='sidorovich-bunker') return {message:'Выключатель света есть только в некоторых тёмных помещениях.'};
    return {message:toggleCurrentLocationLight(game).message};
  }
  if (/(пожарить|поджарить|приготовить|жарить).{0,28}(еду|колбас|сыр|хлеб)|(?:еду|колбас|сыр|хлеб).{0,20}(на костре|поджарить|пожарить)/.test(text)) {
    const campfire=EXPLORE_SPOTS.some(spot=>spot.locationId===game.locationId&&spot.kind==='campfire');
    if (!campfire) return {message:'Готовить можно у костра. Найди ближайшее место отдыха.'};
    const food=['sausage','bread'].find(id=>countItem(game.inventory,id)>0);
    if (!food) return {message:'Для готовки нужна диетическая колбаса или хлеб.'};
    const result=useItem(game,food); advanceGame(game,5);
    return {message:`Ты поджарил ${food==='sausage'?'диетическую колбасу':'хлеб'} на костре. ${result.message} Несколько минут прошли в спокойной обстановке.`};
  }
  if (/(лечь|ляг|прилечь|откинуться).{0,24}(трав|земл)|(?:на траву|на земле).{0,20}(отдох|полежать)/.test(text)) {
    if (game.activeEncounter) return {message:'Во время опасности отдыхать нельзя.'};
    advanceGame(game,10); game.player.stress=Math.max(0,(game.player.stress||0)-6); game.player.stamina=Math.min(100,(game.player.stamina||0)+5);
    return {message:'Ты лёг на траву, смотришь на небо и немного отдыхаешь. Выносливость восстановлена, напряжение спало.'};
  }
  if (/(анекдот|шутк|байк)/.test(text)) {
    const jokes=['Сталкер спрашивает у торговца: «А скидка будет?» — «Будет. Но сначала найди товар по полной цене».','На Кордоне даже компас иногда показывает на Сидоровича. Видимо, у него магнит для Купонов.','Новичок спрашивает: «Где тут безопасно?» Ему отвечают: «В меню сохранения».','Сталкер говорит: «Я только посмотрю». Через час он уже считает найденные болты и спорит с детектором.'];
    return {message:`Ты просишь рассказать анекдот. ${random(jokes)}`};
  }
  if (/(побухать|выпить водки|напиться)/.test(text)) return {message:'У костра можно спокойно посидеть с горячим чаем, перекусить и послушать истории местных.'};
  if (/(украсть|стащить|своровать|обчистить)/.test(text)) {
    const people=getAvailableStalkers(game,game.locationId).filter(person=>person.id!==game.dialogueNpcId);
    const target=people.find(person=>person.trader||person.faction!==game.player.faction)||people[0];
    if (!target) return {message:'Рядом никого нет, у кого можно попытаться что-то стащить.'};
    const trader=getAvailableTraders(game).find(entry=>entry.id===target.id);
    const stock=trader?.stock?.filter(entry=>entry.qty>0)||[];
    if (!stock.length) return {message:`У ${target.name} нечего незаметно забрать.`};
    const item=stock[Math.floor(Math.random()*stock.length)];
    if (Math.random()<.38) {
      const taken=addItem(game.inventory,item.id,1);
      if (!taken.ok) return {message:`Ты почти стащил вещь, но рюкзак перегружен: ${taken.reason}`};
      item.qty-=1; if(item.qty<=0) { const index=trader.stock.indexOf(item); if(index>=0) trader.stock.splice(index,1); }
      game.player.reputation=Math.max(0,(game.player.reputation||0)-3);
      return {message:`Ты незаметно забрал у ${target.name}: ${ITEMS.find(entry=>entry.id===item.id)?.name||item.id}. Репутация немного снизилась.`};
    }
    game.player.reputation=Math.max(0,(game.player.reputation||0)-8);
    return {message:`${target.name} замечает подозрительное движение и отдёргивает рюкзак. «Руки держи при себе». Репутация снизилась.`};
  }
  if (/(подразнить|подколоть|дразнить|пригрозить|угрожать|наехать)/.test(text)) {
    const current=getAvailableStalkers(game,game.locationId);
    const target=current.find(person=>person.id===game.dialogueNpcId)||current.find(person=>person.id===named?.entity?.id)||current[0];
    if (!target) return {message:'Рядом нет собеседника, который услышал бы тебя.'};
    if (game.dialogueNpcId!==target.id) talkToNpc(game,target.id);
    const reply=replyNpcFreeText(game,target.id,rawText);
    return {message:reply.message,action:reply.action||'dialogue',npcId:target.id};
  }
  if (/(бартер|предложить обмен|поменяться|обменяться)/.test(text)) {
    const current=getAvailableStalkers(game,game.locationId);
    const target=current.find(person=>person.id===game.dialogueNpcId)||current.find(person=>person.id===named?.entity?.id)||current.find(person=>person.trader)||current[0];
    return target?{message:`Предлагаешь обмен ${target.name}. Открываю торговое окно.`,action:'trade',npcId:target.id}:{message:'Поблизости нет никого для обмена.'};
  }

  // Combat is full-text: resolve the player's narrated move before ordinary RP intents.
  if (game.activeEncounter) {
    const combatResult=combatTextAction(game,rawText);
    return {message:combatResult.message, action:'combat', ok:combatResult.ok};
  }

  if (/(укрыл|пряч|спрят|переждать выброс|в укрыти|зайти внутрь)/.test(text)) {
    const spot=EXPLORE_SPOTS.find(entry=>entry.locationId===game.locationId && entry.shelter && entry.aliases?.some(alias=>wordFamily(text,[alias]))) || null;
    const result=takeShelter(game,spot?.id||game.currentAreaId||null);
    return {message:result.message,action:null};
  }

  // Free-text eating and drinking are ordinary RP actions outside combat.
  if (/(выпил|выпью|выпей|попил|попью|попей|попить|пью воду|сделал глоток|напился|напейся)/.test(text)) {
    const id=countItem(game.inventory,'water')?'water':countItem(game.inventory,'energy')?'energy':null;
    if (!id) return {message:'В рюкзаке нет подходящего напитка.'};
    const result=useItem(game,id); advanceGame(game,1); return {message:`${result.message} Ты потратил минуту на передышку.`};
  }
  if (/(поел|поешь|съел|съешь|перекусил|перекусить|перекуси|ем |кушаю|пообедал|позавтракал|поужинал)/.test(text)) {
    const id=['canned','sausage','bread'].find(itemId=>countItem(game.inventory,itemId));
    if (!id) return {message:'В рюкзаке нет еды.'};
    const result=useItem(game,id); advanceGame(game,2); return {message:`${result.message} Ты потратил пару минут на еду.`};
  }

  // RP-жесты у костра: это отдельное действие с расходом игрового времени.
  if (/(костер|костра|костру|костре|у огня|возле огня)/.test(text) && /(сел|села|сажусь|присел|присела|присяд|посид|гре|отдых|погреться|разговор)/.test(text)) {
    return sitAtCampfire(game);
  }

  // Точечное исследование интерьеров и укрытий вместо случайного обыска всей локации.
  const exploreIntent=/(обыск|обыщ|изуч|исслед|осмотр|проверь|заглян|порыться|поищи|посмотр)/.test(text);
  const actionTokens=tokenizeRussian(text);
  const matchedSpot=EXPLORE_SPOTS.find(spot =>
    spot.locationId===game.locationId && spot.kind==='search' && spot.aliases.some(alias => {
      const aliasTokens=tokenizeRussian(normalize(alias));
      return aliasTokens.some(part => part.length>=3 && actionTokens.some(token =>
        token===part || stemRussianWord(token)===stemRussianWord(part) ||
        (part.length>=5 && token.startsWith(part.slice(0,-1)))
      ));
    })
  );
  if (matchedSpot && (exploreIntent || /(дом|подвал|погреб|сарай|гараж|контор|кабинет|палатк|казарм|склад|ниша|вагончик|стеллаж)/.test(text))) {
    const result=startAreaSearch(game,matchedSpot.id);
    return {...result,action:result.ok&&result.options?'explore-find':null};
  }
  const remoteLocation=named?.type==='location' && named.entity.id!==game.locationId ? named.entity :
    LOCATIONS.find(location=>entityMentioned(text,location) && location.id!==game.locationId);

  // Looking through binoculars at a named or previously referenced neighbouring location.
  if (remoteLocation && has(text,/(бинокл|осмотр|развед|посмотр|глян|проверь)/)) {
    return {message:scoutLocation(game,remoteLocation.id).message};
  }

  if (wordFamily(text,['осмотр','огляд','посмотр','изуч','разгляд','оцен','осмотрет','обслед','глян','ослуш']) || has(text,/(что здесь|что вокруг|что видн|что заметн|опиши мест)/)) {
    const result=pronoun ? inspectReference(game,reference) : null;
    return {message:result || describeLocation(game)};
  }

  const movementIntent=wordFamily(text,['идт','иди','пойд','подойд','подош','пош','отправ','добер','двин','направ','пробер','направл','переход']) || /(перейти|перейди|перейдем|перейдешь|перешел|перешла|перешли)/.test(text);
  const mapIntent=has(text,/(?:открой|покажи|вызови|посмотреть|открыть)\s+(?:кпк\s*)?карту|(?:открой|покажи)\s+кпк.*карт/);
  const approachNpc=named?.type==='npc'?named.entity:getNpcFromReference(game,reference);
  if (approachNpc && wordFamily(text,['подойд','подош','иди','пойд','обрат','поговор','спрос','попрос','найд','встрет','позов'])) {
    const result=talkToNpc(game,approachNpc.id);
    return {message:result.ok?`${approachNpc.name}: «${approachNpc.greeting}»`:result.message,action:result.ok?'dialogue':null,npcId:approachNpc.id};
  }
  const targetLocation=named?.type==='location'?named.entity:reference?.type==='location'?getLocation(reference.id):null;
  if (targetLocation && movementIntent && targetLocation.id!==game.locationId) {
    if (game.player?.faction==='bandit' && ['rookie-village','sidorovich-bunker'].includes(targetLocation.id)) return {message:'Деревня новичков закрыта для твоей группировки. На единой карте путь туда физически перекрыт местной охраной.'};
    return {message:`Отметил «${targetLocation.name}» как цель. Перехода или телепортации нет: иди туда пешком по общей карте с помощью WASD, а метка цели появится на мини-карте.`,action:'navigate',targetLocationId:targetLocation.id};
  }
  if (mapIntent || (!targetLocation && movementIntent && /^(?:иду|пойду|пошел|пошла|двигаюсь|направляюсь|отправляюсь|перехожу)\b/.test(text)) || has(text,/(куда идти|куда направ|к соседн)/)) {
    return { message:'Кордон — единая непрерывная карта. Открой КПК, выбери ориентир и двигайся к нему пешком; экранов перехода между районами нет.', action:'map' };
  }
  if (wordFamily(text,['инвентар','рюкзак','снаряж','вещ']) || has(text,/(что у меня с собой|мои вещи)/)) return { message:'Открываю инвентарь.', action:'inventory' };
  if (wordFamily(text,['задан','квест','поруч','работ']) && !/(работать|поработ)/.test(text)) return { message:'Открываю список заданий.', action:'quests' };
  if (wordFamily(text,['статистик','характеристик','профил','досье'])) return { message:'Открываю личную статистику.', action:'stats' };

  if (wordFamily(text,['сон','посп','спат','отдох','вздрем','переноч','прилечь','снуть']) || has(text,/(лечь поспать|завалиться спать)/)) return { message:'Можно выбрать продолжительность сна в панели отдыха.', action:'sleep' };

  if (wordFamily(text,['артефакт','детектор','отклик','сигнал','медуз','выверт','грав','ломотмяс']) || has(text,/(начать поиск|искать артефакт|поиск артефакта)/)) {
    const result=startArtifactHunt(game);
    return {message:result.message, action:result.ok?'artifact':null};
  }
  if (wordFamily(text,['болт','отключ','провер','обезвред','обой','аномал']) && has(text,/(болт|отключ|провер|обезвред|обой|аномал)/)) {
    if (wordFamily(text,['аномал','болт','отключ','обезвред','обой'])) return {message:deactivateAnomaly(game).message};
  }

  if (pronoun && has(text,/(кто|что|где|как|расскаж|информац|состояни|опиши|покажи)/)) {
    const info=inspectReference(game,reference);
    if (info) return {message:info};
  }

  const talkIntent=wordFamily(text,['поговор','пообщ','обща','общ','обрат','спрос','диалог','привет','поздоров','свяж','бесед','побесед','напомн','встрет','позов','попрос']) || has(text,/(скажи ему|скажи ей|узнай у|передай ему|передай ей|поговори с ним|поговори с ней)/) || (named?.type==='npc' && /(?:^|\s)(у|к|с)(?:\s|$)/.test(text));
  if (talkIntent) {
    if (pronoun && reference && reference.type!=='npc') return {message:`${reference.name} — не собеседник. Выбери человека поблизости или назови его.`};
    const refNpc=getNpcFromReference(game,reference);
    const npc=named?.type==='npc' ? named.entity : refNpc || allPeople(game).find(person=>person.location===game.locationId);
    if (npc) {
      const result=talkToNpc(game,npc.id);
      return {message:result.ok?`${npc.name}: «${npc.greeting}»`:result.message,action:result.ok?'dialogue':null,npcId:npc.id};
    }
    return {message:'Поблизости нет подходящего собеседника. Осмотрись или проверь контакты.'};
  }

  const attackIntent=wordFamily(text,['атак','напад','напал','напала','напали','стрел','выстрел','бей','удар','застрел','расстрел','огон','пнул','драл']) || has(text,/(открой огонь|дай очередь|пальнуть|вмазать)/);
  if (attackIntent) {
    if (reference?.type==='item' || reference?.type==='location') return {message:`${reference.name} нельзя атаковать как противника.`};
    if (game.activeEncounter) return {message:playerAttack(game).message};
    const attackTarget=reference || (named && named.type!=='item'?{...named.entity,type:named.type}:null);
    const type=getCreatureType(attackTarget,text);
    beginEncounter(game,type);
    if (attackTarget?.type==='npc' && game.activeEncounter) {
      game.activeEncounter.id=attackTarget.id;
      game.activeEncounter.name=attackTarget.name;
      game.activeEncounter.gender=grammaticalGender(attackTarget);
      game.activeEncounter.faction=attackTarget.faction||game.activeEncounter.faction;
      game.activeEncounter.icon=attackTarget.icon||game.activeEncounter.icon;
      game.activeEncounter.appearance=attackTarget.appearance||game.activeEncounter.appearance;
      game.activeEncounter.insignia=attackTarget.insignia||game.activeEncounter.insignia;
      rememberEntity(game,{...game.activeEncounter,id:attackTarget.id,gender:game.activeEncounter.gender},'creature');
    }
    const enemy=game.activeEncounter;
    return {message:`Ты провоцируешь конфликт. Перед тобой ${enemy.name.toLowerCase()}. ${genderedSubject(enemy)} замечает тебя. Бой начался.`,action:'combat'};
  }

  if (wordFamily(text,['обыск','обыщ','иск','поиск','поищ','найд','тайник','труп','тел','поры','проверьящ','заглян'])) {
    if (pronoun && reference?.type==='creature' && game.activeEncounter) {
      return {message:`${reference.name} ещё жив. Сначала нужно закончить бой.`};
    }
    const corpse=/(труп|тел|погибш|павш)/.test(text) || (pronoun && reference?.type==='creature' && reference.alive===false);
    const result=searchLocation(game,{corpse});
    return {message:result.message};
  }

  const referencedItem = pronoun && game.lastMentionedItemId ? ITEMS.find(item=>item.id===game.lastMentionedItemId) : null;
  if (referencedItem && wordFamily(text,['использ','примен','съеш','вып','поп','прин','надень','надет'])) {
    return {message:useItem(game,referencedItem.id).message};
  }
  if (wordFamily(text,['вып','поп','нап','жажд','глот','вод'])) {
    const id=countItem(game.inventory,'water')?'water':countItem(game.inventory,'energy')?'energy':null;
    return {message:id?useItem(game,id).message:'В рюкзаке нет подходящего напитка.'};
  }
  if (wordFamily(text,['поеш','съеш','перекус','голод','хлеб','тушен','колбас','жрат','пожрат','пищ'])) {
    const id=['canned','sausage','bread'].find(itemId=>countItem(game.inventory,itemId));
    return {message:id?useItem(game,id).message:'В рюкзаке нет еды.'};
  }
  if (wordFamily(text,['леч','аптеч','бинт','ран','перевяз','обработ']) || has(text,/(подлечиться|оказать себе помощь)/)) {
    const id=['milmed','ai2','bandage'].find(itemId=>countItem(game.inventory,itemId));
    return {message:id?useItem(game,id).message:'В рюкзаке нет медицинских средств.'};
  }
  if (wordFamily(text,['антирад','радиац','дозиметр'])) return {message:useItem(game,'antirad').message};

  if (wordFamily(text,['локац','местонахожд','наход','позици']) || has(text,/(где я|что за место|где сейчас нахожусь)/)) {
    return {message:`Ты находишься: ${getLocation(game.locationId)?.name}. ${describeLocation(game)}`};
  }
  if (wordFamily(text,['отряд','патрул','военн','сталкер','люд','групп']) && has(text,/(рядом|поблиз|здесь|окрест|находится|есть)/)) {
    const nearby=game.squads.filter(squad=>squad.location===game.locationId);
    return {message:nearby.length?`Рядом замечены: ${nearby.map(s=>s.name).join(', ')}.`:'В непосредственной близости патрулей не замечено.'};
  }

  const pronounReply=reference ? `${genderedSubject(reference)} — это ${reference.name}. ${random(['Ты можешь осмотреть объект внимательнее.','Теперь понятно, о ком или о чём речь.','Контекст сохранён, можешь продолжить действие.'])}` : null;
  const message=pronounReply || buildGameMasterFallback(game,rawText);
  addLog(game,message);
  return {message};
}
