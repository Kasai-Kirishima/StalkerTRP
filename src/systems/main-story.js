import { addItem, removeItem } from './inventory.js';

const STAGES = {
  'meet-wolf': { title:'Первый день на Кордоне', objective:'Прочитай записку и поговори с Волком в Деревне новичков.', location:'rookie-village', giver:'Записка' },
  'go-to-sidorovich': { title:'Совет Волка', objective:'Найди Сидоровича в бункере под деревней и поговори с ним.', location:'sidorovich-bunker', giver:'Волк' },
  'find-first-flash': { title:'Потерянная флешка', objective:'Осмотри заднюю сторону вагончика и найди флешку посыльного.', location:'trailer', giver:'Сидорович' },
  'return-first-flash': { title:'Данные для торговца', objective:'Вернись к Сидоровичу и передай найденную флешку.', location:'sidorovich-bunker', giver:'Сидорович' },
  'deliver-supplies': { title:'Доставка в лесной лагерь', objective:'Отнеси припасы в лесной лагерь. Не задерживайся: у задания есть срок.', location:'forest-camp', giver:'Сидорович' },
  'deliver-supplies-failed': { title:'Долг за сорванную доставку', objective:'Вернись к Сидоровичу и выплати 5 000 Купонов.', location:'sidorovich-bunker', giver:'Сидорович' },
  'return-supplies': { title:'Отчёт о доставке', objective:'Вернись к Сидоровичу и доложи о доставке припасов.', location:'sidorovich-bunker', giver:'Сидорович' },
  'fetch-meat': { title:'Артефакт из Тайного лагеря', objective:'Доберись до Тайного лагеря и забери артефакт «Ломоть мяса».', location:'anomaly-dump', giver:'Сидорович' },
  'return-meat': { title:'Ценный груз', objective:'Отнеси артефакт «Ломоть мяса» Сидоровичу.', location:'sidorovich-bunker', giver:'Сидорович' },
  'deliver-present': { title:'Подарок для блокпоста', objective:'Доставь подарок Дзержинскому на южный блокпост. Не открывай упаковку.', location:'south-checkpoint', giver:'Сидорович' },
  'return-present': { title:'Ответный визит', objective:'Вернись к Сидоровичу после разговора с Дзержинским.', location:'sidorovich-bunker', giver:'Сидорович' },
  'clear-underpass': { title:'Шум под переходом', objective:'Разберись с мутантами в подземном переходе.', location:'underpass', giver:'Сидорович' },
  'return-underpass': { title:'Чистый проход', objective:'Доложи Сидоровичу, что подземный переход больше не беспокоит деревню.', location:'sidorovich-bunker', giver:'Сидорович' },
  'find-courier': { title:'Курьер из лощины', objective:'Найди раненого посыльного у тоннеля в лощине и поговори с ним.', location:'ravine-tunnel', giver:'Сидорович' },
  'recover-courier-flash': { title:'Флешка у локомотива', objective:'Доберись до локомотива. Попробуй договориться с тремя бандитами или вступи в стычку.', location:'locomotive', giver:'Раненый курьер' },
  'return-courier': { title:'Возвращение данных', objective:'Отнеси флешку Сидоровичу.', location:'sidorovich-bunker', giver:'Сидорович' },
  'clear-elevator': { title:'Шорох у элеватора', objective:'Проверь элеватор и разберись с мутантами.', location:'elevator', giver:'Сидорович' },
  'return-elevator': { title:'Доклад об элеваторе', objective:'Вернись к Сидоровичу и расскажи, что произошло на элеваторе.', location:'sidorovich-bunker', giver:'Сидорович' },
  'scout-farm': { title:'Доклад разведчика', objective:'Найди разведчика у развалин хутора и узнай, что происходит на ферме.', location:'farmstead', giver:'Сидорович' },
  'clear-farm': { title:'Бандиты на ферме', objective:'После разговора с разведчиком доберись до свинофермы и зачисти территорию от бандитского отряда.', location:'pig-farm', giver:'Разведчик' },
  'fight-underpass': { title:'Шум под переходом', objective:'Идёт бой с мутантами в подземном переходе. Разберись с угрозой.', location:'underpass', giver:'Сидорович' },
  'fight-courier-bandits': { title:'Флешка у локомотива', objective:'Трое бандитов пытаются удержать флешку курьера. Договорись или отбей её.', location:'locomotive', giver:'Раненый курьер' },
  'fight-elevator': { title:'Шорох у элеватора', objective:'Идёт бой с мутантами у элеватора. Зачисти территорию.', location:'elevator', giver:'Сидорович' },
  'fight-farm': { title:'Бандиты на ферме', objective:'Идёт бой с бандитским отрядом на свиноферме.', location:'pig-farm', giver:'Разведчик' },
  'return-farm': { title:'Герой Кордона', objective:'Вернись к Сидоровичу и доложи о выполнении задания на ферме.', location:'sidorovich-bunker', giver:'Сидорович' },
  'beyond-cordon': { title:'Дорога на Свалку', objective:'Кордоном дело не заканчивается. Следующая часть истории продолжится за северным переходом, когда будет добавлена локация Свалка.', location:'north-checkpoint', giver:'Сидорович' }
};

const STORY_NOTE = 'Вот я и в Зоне. Первым делом следовало бы узнать, что к чему. Я видел здесь сталкера — выглядит опытным. Вроде, его кличут Волком.';

export function ensureMainStory(game) {
  if (!game) return null;
  if (!game.mainStory) {
    game.mainStory = {
      stage: game.player?.faction === 'loner' ? 'meet-wolf' : 'beyond-cordon',
      startedAt: game.clock?.worldMinutes || 0,
      suppliesDeadline: null,
      suppliesDelivered: false,
      flags: {},
      courierName: 'Савелий «Шпала»',
      scoutName: 'Гена «Метр»'
    };
    if (game.player?.faction === 'loner') {
      game.log ||= [];
      if (!game.log.some(entry => entry.text === STORY_NOTE)) game.log.unshift({ type:'system', text:`Записка: «${STORY_NOTE}»`, at:'15 апреля' });
    }
  }
  game.mainStory.flags ||= {};
  return game.mainStory;
}

export function getMainStoryQuest(game) {
  const story = ensureMainStory(game);
  if (!story) return null;
  const stage = STAGES[story.stage];
  if (!stage) return null;
  return { ...stage, stage:story.stage, deadline:story.suppliesDeadline, failed:story.stage==='deliver-supplies-failed' };
}

function addStoryReputation(game, amount=3) {
  game.player.reputation = Math.max(0, (game.player.reputation || 0) + amount);
  game.player.rating = Math.max(0, (game.player.rating || 0) + amount);
  if (game.player.faction === 'military') { game.player.rank = game.player.rating >= 80 ? 'Сержант' : game.player.rating >= 30 ? 'Ефрейтор' : 'Рядовой'; game.player.militaryRank = game.player.rank; }
  else if (game.player.faction === 'bandit') game.player.rank = game.player.rating >= 80 ? 'Авторитет' : game.player.rating >= 30 ? 'Бывалый' : 'Шпана';
  else game.player.rank = game.player.rating >= 80 ? 'Опытный' : game.player.rating >= 30 ? 'Бывалый' : 'Новичок';
}

function log(game, text, type='system') {
  game.log ||= [];
  game.log.unshift({ type, text, at:'15 апреля' });
  game.log = game.log.slice(0, 80);
}

function move(game, stage, message) {
  const story = ensureMainStory(game);
  story.stage = stage;
  story.stageStartedAt = game.clock?.worldMinutes || 0;
  if (message) log(game, message);
  return { ok:true, message:message || 'Журнал заданий обновлён.' };
}

export function mainStoryTalk(game, npcId) {
  const story = ensureMainStory(game);
  if (!story || game.player?.faction !== 'loner') return null;
  if (npcId === 'wolf' && story.stage === 'meet-wolf') {
    move(game, 'go-to-sidorovich', 'Волк подсказал новичку обратиться к Сидоровичу.');
    return 'Здравствуй, сталкер. Вижу, ты считай только с большой земли пришёл. Много я таких, как ты, видел. Но знаешь, большинство из них уже никто никогда не увидит — Зона их сожрала. Так что по возможности будь осторожнее, лишний раз не лезь на рожон, болты перед собой кидай и мутантов со сталкерами обходи. Порой люди страшнее самой Зоны. Ну и да, советую к Сидоровичу: он по совместительству лидер деревни и торговец.';
  }
  if (npcId === 'sidorovich' && story.stage === 'go-to-sidorovich') {
    move(game, 'find-first-flash', 'Сидорович поручил найти флешку, потерянную посыльным у вагончика.');
    return 'Работёнка для такой зелени, как ты, у меня всегда найдётся. Тут Сидорович не жадный, как злые языки говорят. Один мой посыльный испугался собак из кустов и выронил флешку с данными. Сходи к вагончику, осмотрись и принеси её. А я пока поразмыслю над наградой.';
  }

  if (npcId === 'wounded-courier' && story.stage === 'find-courier') {
    story.flags.courierMet = true;
    move(game, 'recover-courier-flash', `У тоннеля найден раненый курьер ${story.courierName}. Он сообщил, что бандиты забрали флешку и ушли к локомотиву.`);
    return 'Ай, мля… Сталкер, помоги, помираю. Ты, наверное, от Сидора. Флешку мою отжали братки, чтоб им пусто было. Они в сторону локомотива пошли. Мне далеко не уйти. Если поможешь вернуть данные, Сидор тебе спасибо скажет. Только попробуй сначала поговорить — не обязательно сразу лезть в драку.';
  }
  if (npcId === 'cordon-scout' && story.stage === 'scout-farm') {
    story.flags.scoutSpoken = true;
    move(game, 'clear-farm', `Разведчик ${story.scoutName} сообщил: бандитский отряд закрепился на свиноферме за мостом.`);
    return 'Сидор прислал? Слушай тогда. Бандиты засели на ферме за мостом. Подходов несколько: тоннель под насыпью, блокпост под мостом или дыра в заборе возле восточного тоннеля. Я бы не советовал идти напрямик, пока не оценишь посты. Доберёшься до свинофермы — там и решишь вопрос.';
  }

  if (npcId === 'sidorovich' && story.stage === 'return-first-flash') {
    if (!story.flags.firstFlash) return 'Флешку сначала найди у вагончика. Я не могу платить за пустые руки.';
    if (!removeItem(game.inventory, 'flash', 1)) return 'Флешка должна быть у тебя. Проверь рюкзак и возвращайся.';
    const supplies=addItem(game.inventory,'supply-bundle',1);
    if (!supplies.ok) { addItem(game.inventory,'flash',1); return 'Освободи место в рюкзаке — припасы тяжёлые, без них я тебя не отправлю. Флешка пока остаётся у тебя.'; }
    story.flags.firstFlash = false;
    addStoryReputation(game, 2); game.money += 350;
    story.suppliesDeadline = (game.clock?.worldMinutes || 0) + 360;
    move(game, 'deliver-supplies', 'Сидорович рассчитался за флешку и выдал припасы для лесного лагеря.');
    return 'Ну молодец, может, и будет с тебя сталкер. Теперь познакомишься с местным контингентом. Я дам тебе припасы — отнеси их сталкерам в лесной лагерь, я отметил его на карте. Только не продавай и не трать их. Я человек порядочный и не хочу пятна на репутации. На доставку у тебя шесть часов по игровому времени.';
  }
  if (npcId === 'sidorovich' && story.stage === 'deliver-supplies-failed') {
    return 'Доставку сорвал — значит, отвечай за обещание. Должен мне пять тысяч Купонов. Вернёшь долг — поговорим о следующем деле.';
  }
  if (npcId === 'sidorovich' && story.stage === 'return-supplies') {
    story.suppliesDelivered = true; story.suppliesDeadline = null;
    addStoryReputation(game, 4); game.money += 250;
    move(game, 'fetch-meat', 'Припасы доставлены. Сидорович выдал новое поручение: найти артефакт «Ломоть мяса».');
    return 'Порядок. Доставил всё как договаривались — это ценится. Теперь изучи аномальные явления. В Тайном лагере должен лежать артефакт «Ломоть мяса». Маршрут я отметил. Возьми детектор и не суйся в поле без проверки.';
  }
  if (npcId === 'sidorovich' && story.stage === 'return-meat') {
    if (!removeItem(game.inventory, 'meat_chunk', 1)) return 'Артефакт должен быть у тебя. Без «Ломтя мяса» разговор короткий.';
    const gift=addItem(game.inventory,'wrapped-present',1);
    if (!gift.ok) { addItem(game.inventory,'meat_chunk',1); return 'Освободи место в рюкзаке: подарок объёмный. Артефакт пока оставь при себе.'; }
    addStoryReputation(game, 4); game.money += 500;
    move(game, 'deliver-present', 'Сидорович подготовил подарок с красивой ленточкой для командира южного блокпоста.');
    return 'Вот это уже дело. Теперь отнеси подарок командиру южного блокпоста. Я его в красивую ленточку завернул, хе-хе. Не разворачивай. По дороге не сворачивай с тропы и не лезь в аномалии. Дзержинский ждёт.';
  }
  if (npcId === 'sidorovich' && story.stage === 'return-present') {
    addStoryReputation(game, 5); game.money += 700;
    move(game, 'clear-underpass', 'Дзержинский подтвердил доставку подарка. Сидорович поручил проверить подземный переход.');
    return 'Дзержинский мне уже сообщил. Сегодня я добрый, награду дам хорошую. А теперь помоги с подземным переходом: там расплодились мутанты, похожие на кабанов. Разгони их, чтобы не подходили к деревне.';
  }
  if (npcId === 'sidorovich' && story.stage === 'return-underpass') {
    addStoryReputation(game, 3); game.money += 450;
    move(game, 'find-courier', 'Подземный переход очищен. Сидорович ждёт курьера из лощины.');
    return 'Хорошая работа. Скоро должен прийти сталкер из лощины, у него для меня флешка. Найди его у тоннеля и забери данные. По пути есть АТП: там сидят братки. На обратном пути придётся пройти через их территорию. Постарайся решить вопрос без лишней ссоры.';
  }
  if (npcId === 'sidorovich' && story.stage === 'return-courier') {
    if (!story.flags.courierFlash) return 'Без флешки курьера мне пока нечего читать. Вернись к локомотиву и забери данные.';
    removeItem(game.inventory, 'flash', 1); story.flags.courierFlash = false;
    addStoryReputation(game, 5); game.money += 900;
    move(game, 'clear-elevator', 'Флешка курьера передана Сидоровичу. Следующая цель — элеватор.');
    return `Курьер из лощины, ${story.courierName}, передал важные данные. Хорошо сработано. Теперь сходи на элеватор: по моим сведениям, там объявились мутанты. Проверь территорию и возвращайся с докладом.`;
  }
  if (npcId === 'sidorovich' && story.stage === 'return-elevator') {
    addStoryReputation(game, 5); game.money += 800;
    move(game, 'scout-farm', 'Элеватор проверен. Сидорович отправил игрока к разведчику у хутора.');
    return 'Значит так. Разведчик засёк отряд бандитов на ферме за мостом. Сначала найди моего человека у развалин хутора и узнай обстановку. Он покажет, что происходит, а дальше решишь, как поступить.';
  }
  if (npcId === 'sidorovich' && story.stage === 'return-farm') {
    addStoryReputation(game, 10); game.money += 1500;
    move(game, 'beyond-cordon', 'Ферма очищена. Следующее поручение ведёт к северному переходу и продолжению истории за Кордоном.');
    return 'Ну ты молоток. На Кордоне о тебе уже говорят. Следующее дело будет на Свалке: там есть мой человечек, с которым нужно уладить один вопрос. Но это уже за северным переходом. Сначала подготовь снаряжение и проверь маршрут.';
  }
  return null;
}

export function mainStoryAction(game, action) {
  const story = ensureMainStory(game);
  if (!story) return {ok:false,message:'Сюжетная линия недоступна.'};
  const at = game.locationId;
  const requireAt = (location, message='Ты находишься не в том месте.') => at === location ? null : {ok:false,message};
  if (action === 'story-flash-search') {
    const err=requireAt('trailer'); if(err) return err;
    if (story.stage!=='find-first-flash') return {ok:false,message:'Сейчас здесь нет сюжетной цели.'};
    if (!addItem(game.inventory,'flash',1).ok) return {ok:false,message:'В рюкзаке нет места для флешки.'};
    story.flags.firstFlash=true;
    return move(game,'return-first-flash','За вагончиком среди травы и старых досок найдена флешка посыльного.');
  }
  if (action === 'story-supplies-deliver') {
    const err=requireAt('forest-camp'); if(err) return err;
    if (story.stage!=='deliver-supplies') return {ok:false,message:'Сейчас припасы не требуется передавать.'};
    if (!removeItem(game.inventory,'supply-bundle',1)) return {ok:false,message:'Припасы Сидоровича отсутствуют. Возможно, ты продал или потерял их — поговори с ним.'};
    story.suppliesDeadline=null; story.suppliesDelivered=true;
    return move(game,'return-supplies','Припасы переданы сталкерам лесного лагеря.');
  }
  if (action === 'story-supplies-fail') {
    if (story.stage!=='deliver-supplies') return {ok:false,message:'Это поручение уже не активно.'};
    story.suppliesDeadline=null;
    removeItem(game.inventory,'supply-bundle',1);
    return move(game,'deliver-supplies-failed','Ты отказался от доставки. Сидорович выставил долг 5 000 Купонов.');
  }
  if (action === 'story-pay-debt') {
    const err=requireAt('sidorovich-bunker'); if(err) return err;
    if (story.stage!=='deliver-supplies-failed') return {ok:false,message:'Сейчас долга за доставку нет.'};
    if ((game.money||0)<5000) return {ok:false,message:'Нужно 5 000 Купонов, чтобы закрыть долг.'};
    game.money-=5000; addStoryReputation(game,1);
    return move(game,'fetch-meat','Долг Сидоровичу погашен. Он выдал новое поручение по артефакту.');
  }
  if (action === 'story-meat-pickup') {
    const err=requireAt('anomaly-dump'); if(err) return err;
    if (story.stage!=='fetch-meat') return {ok:false,message:'Сейчас артефакт не является целью задания.'};
    if (!addItem(game.inventory,'meat_chunk',1).ok) return {ok:false,message:'В рюкзаке нет места для артефакта.'};
    return move(game,'return-meat','В Тайном лагере найден артефакт «Ломоть мяса».');
  }
  if (action === 'story-present-deliver') {
    const err=requireAt('south-checkpoint'); if(err) return err;
    if (story.stage!=='deliver-present' || !removeItem(game.inventory,'wrapped-present',1)) return {ok:false,message:'Подарок не найден или задание уже завершено.'};
    story.flags.presentDelivered=true; addStoryReputation(game,2);
    return move(game,'return-present','Дзержинский принял свёрток с красивой ленточкой и подтвердил доставку.');
  }
  if (action === 'story-underpass-start') {
    const err=requireAt('underpass'); if(err) return err;
    if (!['clear-underpass','fight-underpass'].includes(story.stage)) return {ok:false,message:'Сейчас в переходе нет сюжетной цели.'};
    game.activeEncounter={type:'flesh',name:'Стая кабанов у подземного перехода',hp:210,maxHp:210,damage:13,count:3,storyTag:'underpass-mutants'};
    story.stage='fight-underpass';
    return {ok:true,message:'В подземном переходе замечена группа мутантов. Будь осторожен.'};
  }
  if (action === 'story-courier-talk') {
    const err=requireAt('ravine-tunnel'); if(err) return err;
    if (story.stage!=='find-courier') return {ok:false,message:'Раненого курьера здесь сейчас нет.'};
    story.flags.courierMet=true;
    return move(game,'recover-courier-flash',`У тоннеля найден раненый курьер. Он сообщил, что бандиты отняли флешку и пошли к локомотиву. Его зовут ${story.courierName}.`);
  }
  if (action === 'story-bandit-negotiate') {
    const err=requireAt('locomotive'); if(err) return err;
    if (story.stage!=='recover-courier-flash') return {ok:false,message:'Бандиты здесь не ждут тебя с этим разговором.'};
    const discount = (game.player.reputation||0)>=20;
    const price = discount ? 0 : 800;
    if ((game.money||0)<price) return {ok:false,message:'Бандиты требуют 800 Купонов. Денег не хватает; можно попробовать силой.'};
    const recovered=addItem(game.inventory,'flash',1);
    if (!recovered.ok) return {ok:false,message:'Освободи место в рюкзаке для флешки. Бандиты пока не получили деньги.'};
    game.money-=price;
    story.flags.courierFlash=true;
    addStoryReputation(game,3);
    return move(game,'return-courier',discount?'Благодаря хорошей репутации бандиты согласились отдать флешку без платы.':'Бандиты согласились вернуть флешку за 800 Купонов.');
  }
  if (action === 'story-bandit-fight') {
    const err=requireAt('locomotive'); if(err) return err;
    if (!['recover-courier-flash','fight-courier-bandits'].includes(story.stage)) return {ok:false,message:'Сейчас это столкновение не предусмотрено.'};
    game.activeEncounter={type:'bandit',name:'Трое бандитов у локомотива',hp:225,maxHp:225,damage:16,count:3,storyTag:'courier-bandits'};
    story.stage='fight-courier-bandits';
    return {ok:true,message:'Трое бандитов заметили тебя. Один из них держит флешку курьера.'};
  }
  if (action === 'story-courier-flash-search') {
    const err=requireAt('locomotive'); if(err) return err;
    if (story.stage!=='fight-courier-bandits') return {ok:false,message:'Здесь сейчас нечего искать по этому заданию.'};
    if (!addItem(game.inventory,'flash',1).ok) return {ok:false,message:'Освободи место в рюкзаке, затем осмотри вещи у локомотива ещё раз.'};
    story.flags.courierFlash=true;
    return move(game,'return-courier','После столкновения у локомотива найдена флешка курьера.');
  }
  if (action === 'story-elevator-start') {
    const err=requireAt('elevator'); if(err) return err;
    if (!['clear-elevator','fight-elevator'].includes(story.stage)) return {ok:false,message:'Сейчас на элеваторе нет сюжетной цели.'};
    game.activeEncounter={type:'flesh',name:'Мутанты у элеватора',hp:185,maxHp:185,damage:14,count:2,storyTag:'elevator-mutants'};
    story.stage='fight-elevator';
    return {ok:true,message:'У элеватора обнаружена группа мутантов. Проверь территорию после столкновения.'};
  }
  if (action === 'story-scout-talk') {
    const err=requireAt('farmstead'); if(err) return err;
    if (story.stage!=='scout-farm') return {ok:false,message:'Разведчик сейчас не ожидает тебя здесь.'};
    story.flags.scoutSpoken=true;
    return move(game,'clear-farm',`Разведчик ${story.scoutName} сообщил: бандитский отряд закрепился на ферме за мостом. Есть несколько подходов; выбери безопасный маршрут по карте.`);
  }
  if (action === 'story-farm-start') {
    const err=requireAt('pig-farm'); if(err) return err;
    if (!['clear-farm','fight-farm'].includes(story.stage) || !story.flags.scoutSpoken) return {ok:false,message:'Сначала поговори с разведчиком.'};
    game.activeEncounter={type:'bandit',name:'Бандитский отряд на ферме',hp:255,maxHp:255,damage:17,count:3,storyTag:'farm-bandits'};
    story.stage='fight-farm';
    return {ok:true,message:'Разведчик подтвердил присутствие бандитского отряда на ферме.'};
  }
  return {ok:false,message:'Действие сюжетного задания не найдено.'};
}

export function resolveMainStoryEncounter(game, enemy) {
  const story=ensureMainStory(game);
  if (!story || !enemy?.storyTag) return null;
  if (enemy.storyTag==='underpass-mutants' && story.stage==='fight-underpass') return move(game,'return-underpass','Подземный переход очищен от мутантов. Вернись к Сидоровичу.');
  if (enemy.storyTag==='courier-bandits' && story.stage==='fight-courier-bandits') {
    if (!addItem(game.inventory,'flash',1).ok) log(game,'Флешка осталась у локомотива: освободи место в рюкзаке и осмотри место столкновения.','warning');
    else { story.flags.courierFlash=true; move(game,'return-courier','Флешка курьера найдена среди вещей бандитов.'); }
    return 'Бандиты больше не мешают. Проверь, удалось ли забрать флешку.';
  }
  if (enemy.storyTag==='elevator-mutants' && story.stage==='fight-elevator') return move(game,'return-elevator','Угроза у элеватора устранена. Вернись к Сидоровичу с докладом.');
  if (enemy.storyTag==='farm-bandits' && story.stage==='fight-farm') return move(game,'return-farm','Отряд на ферме больше не удерживает территорию. Возвращайся к Сидоровичу.');
  return null;
}

export function tickMainStory(game) {
  const story=ensureMainStory(game);
  if (story?.stage==='deliver-supplies' && story.suppliesDeadline!=null && (game.clock?.worldMinutes||0)>story.suppliesDeadline) {
    story.stage='deliver-supplies-failed'; story.suppliesDeadline=null;
    removeItem(game.inventory,'supply-bundle',1);
    log(game,'Срок доставки истёк. Сидорович выставил долг в 5 000 Купонов.','warning');
  }
}

export function isMainStoryPass(game, destinationId) {
  const story=ensureMainStory(game);
  return story?.stage==='deliver-present' && destinationId==='south-checkpoint';
}
