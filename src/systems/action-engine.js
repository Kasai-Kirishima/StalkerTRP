import { LOCATIONS, ITEMS, EXPLORE_SPOTS } from '../data/catalog.js';
import { addLog, describeLocation, searchLocation, talkToNpc, startArtifactHunt, deactivateAnomaly, getLocation, scoutLocation, getAvailableTraders, getAvailableStalkers, travelTo, startAreaSearch, sitAtCampfire, takeShelter, advanceGame } from './world.js';
import { playerAttack, beginEncounter, combatTextAction } from './combat.js';
import { useItem, countItem } from './inventory.js';
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

  // Combat is full-text: resolve the player's narrated move before ordinary RP intents.
  if (game.activeEncounter) {
    const combatResult=combatTextAction(game,rawText);
    return {message:combatResult.message, action:'combat', ok:combatResult.ok};
  }

  if (/(выключ|отключ|глуш).{0,18}радио/.test(text) || /радио.{0,12}(выключ|отключ|глуш)/.test(text)) return {message:'Ты выключаешь местный приёмник.',action:'radio-off'};
  if (/(включ|вруби|запусти|поставь).{0,18}радио/.test(text) || /радио.{0,12}(включ|запуст)/.test(text)) return {message:'Ты включаешь местное радио.',action:'radio-on'};
  if (/(укрыл|пряч|спрят|переждать выброс|в укрыти|зайти внутрь)/.test(text)) {
    const spot=EXPLORE_SPOTS.find(entry=>entry.locationId===game.locationId && entry.shelter && entry.aliases?.some(alias=>wordFamily(text,[alias]))) || null;
    const result=takeShelter(game,spot?.id||game.currentAreaId||null);
    return {message:result.message,action:null};
  }

  // Free-text eating and drinking are ordinary RP actions outside combat.
  if (/(выпил|выпью|выпей|попил|попью|попей|попить|пью воду|сделал глоток|напился|напейся)/.test(text)) {
    const id=countItem(game.inventory,'water')?'water':countItem(game.inventory,'energy')?'energy':countItem(game.inventory,'vodka')?'vodka':null;
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
    const result=travelTo(game,targetLocation.id);
    return {message:result.message,action:result.encounter?'combat':null};
  }
  if (mapIntent || (!targetLocation && movementIntent && /^(?:иду|пойду|пошел|пошла|двигаюсь|направляюсь|отправляюсь|перехожу)\b/.test(text)) || has(text,/(куда идти|куда направ|к соседн)/)) {
    if (reference?.type==='location' && reference.id!==game.locationId && movementIntent) {
      const result=travelTo(game,reference.id);
      return {message:result.message,action:result.encounter?'combat':null};
    }
    return { message:'Открываю карту Кордона. На ней можно выбрать соседнюю локацию.', action:'map' };
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
    const id=countItem(game.inventory,'water')?'water':countItem(game.inventory,'energy')?'energy':countItem(game.inventory,'vodka')?'vodka':null;
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

  const location=getLocation(game.locationId);
  const pronounReply=reference ? `${genderedSubject(reference)} — это ${reference.name}. ${random(['Ты можешь осмотреть объект внимательнее.','Теперь понятно, о ком или о чём речь.','Контекст сохранён, можешь продолжить действие.'])}` : null;
  const replies=[
    `Ты действуешь осторожно. ${random(['В ответ слышен только ветер.','Где-то скрипит металл.','На мгновение кажется, что за тобой наблюдают.'])}`,
    `В текущей обстановке (${location?.name}) это не даёт явного результата. ${random(['Попробуй уточнить, что именно хочешь сделать.','Можешь осмотреться, поговорить, обыскать место или проверить аномалию.','Опиши цель действия чуть конкретнее.'])}`,
    'Ты тратишь немного времени, но ничего необычного не происходит. Зона не спешит раскрывать свои секреты.',
    'Поблизости нет очевидной реакции. Возможно, стоит осмотреть местность или поговорить с кем-нибудь из местных.',
    `Ты прислушиваешься. ${random(['Слева доносится короткий металлический стук.','Ветер несёт запах сырой земли и гари.','Вдалеке раздаётся собачий лай.','Под ногами хрустит стекло.','За укрытием мелькает чья-то тень.'])}`,
    `Обстановка не меняется. ${random(['Патруль пока не показывается.','Старые следы уходят к дороге.','В траве шевелится мусор от порыва ветра.','Где-то неподалёку хлопает незакреплённая дверь.'])}`,
    `Ты не получаешь ясного результата. ${random(['Попробуй сформулировать короче.','Можешь указать человека, предмет или место.','В Зоне лучше действовать точнее.'])}`
  ];
  const message=pronounReply || random(replies);
  addLog(game,message);
  return {message};
}
