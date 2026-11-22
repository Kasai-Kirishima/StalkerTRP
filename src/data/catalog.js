export const ASSETS = {
  menu: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5OXJVGkhNyzTjS2YABky-DUSo45VdfMiDvddnm2NsexQfHmc4giGVzRY&s=10',
  pda: null,
  map: './assets/images/cordon-clean.webp',
  factions: {
    loner: 'builtin:faction:loner',
    bandit: 'builtin:faction:bandit',
    military: 'builtin:faction:military'
  }
};

// Внешние изображения отключены. Для игровых элементов используются локальные
// CSS/emoji-заглушки; единственное внешнее изображение — фон главного меню.
export const IMAGE_FALLBACKS = { general: '', loner: '', bandit: '', military: '', npc: '', dog: '', food: '', medical: '', gear: '', flesh: '', fleshEye: '' };

export const FACTIONS = [
  { id: 'loner', name: 'Одиночки', short: 'Сталкеры', rank: 'Новичок', spawn: 'rookie-village', icon: ASSETS.factions.loner, description: 'Вольные сталкеры, которые пытаются выжить в Зоне и держаться подальше от больших разборок.' },
  { id: 'bandit', name: 'Бандиты', short: 'Шпана', rank: 'Шпана', spawn: 'atp', icon: ASSETS.factions.bandit, description: 'Люди, привыкшие брать своё силой, угрозами или сделками на сомнительных условиях.' },
  { id: 'military', name: 'Военные', short: 'Рядовой', rank: 'Рядовой', spawn: 'south-checkpoint', icon: ASSETS.factions.military, description: 'Военнослужащие, несущие службу на периметре и блокпостах Кордона.' }
];

export const AVATARS = {
  loner: Array.from({length:6}, (_,i)=>`builtin:loner:${i+1}`),
  bandit: Array.from({length:4}, (_,i)=>`builtin:bandit:${i+1}`),
  military: Array.from({length:4}, (_,i)=>`builtin:military:${i+1}`)
};

export const ITEMS = [
  { id:'bread', name:'Хлеб', price:35, weight:.45, w:1,h:1, cat:'Еда', desc:'Простой хлеб. Не роскошь, но в дороге пригодится.', image:'', use:'food', restore:14 },
  { id:'water', name:'Минеральная вода', price:40, weight:.55, w:1,h:2, cat:'Еда', desc:'Бутылка питьевой воды.', image:'', use:'water', restore:25 },
  { id:'sausage', name:'Колбаса диетическая', price:65, weight:.35, w:2,h:1, cat:'Еда', desc:'Небольшая палка колбасы.', image:'', use:'food', restore:22 },
  { id:'vodka', name:'Водка «Казаки»', price:70, weight:.5, w:1,h:2, cat:'Еда', desc:'Крепкий напиток. Снижает стресс, но ухудшает самочувствие.', image:'', use:'vodka', restore:15 },
  { id:'shells', name:'Пачка патронов 12 калибра', price:80, weight:.6, w:2,h:1, cat:'Боеприпасы', desc:'Пачка дробовых патронов.', image:'' },
  { id:'energy', name:'Энергетик', price:80, weight:.45, w:1,h:2, cat:'Еда', desc:'Помогает взбодриться и немного восстановить силы.', image:'', use:'energy', restore:18 },
  { id:'canned', name:'Тушёнка', price:90, weight:.45, w:1,h:1, cat:'Еда', desc:'Банка тушёнки.', image:'', use:'food', restore:30 },
  { id:'knife', name:'Нож', price:100, weight:.35, w:1,h:2, cat:'Оружие', desc:'Надёжный нож для бытовых задач и самообороны.', image:'', damage:12, weapon:'melee' },
  { id:'ammo9x18', name:'Пачка патронов 9×18', price:110, weight:.35, w:2,h:1, cat:'Боеприпасы', desc:'Пачка патронов 9×18 мм.', image:'' },
  { id:'ammo9x19', name:'Пачка патронов 9×19', price:130, weight:.4, w:2,h:1, cat:'Боеприпасы', desc:'Пачка патронов 9×19 мм.', image:'' },
  { id:'ammo545', name:'Пачка патронов 5.45×39', price:180, weight:.48, w:2,h:1, cat:'Боеприпасы', desc:'Пачка патронов 5.45×39 мм для АКСУ.', image:'' },
  { id:'bandage', name:'Бинт', price:140, weight:.12, w:1,h:1, cat:'Медицина', desc:'Останавливает небольшое кровотечение и восстанавливает здоровье.', image:'', use:'heal', restore:18 },
  { id:'boltpack', name:'Болты (10 шт.)', price:160, weight:.5, w:2,h:1, cat:'Снаряжение', desc:'Пачка из десяти болтов. Используются для проверки и отключения некоторых аномалий.', image:'', restore:10 },
  { id:'rgd5', name:'РГД-5', price:220, weight:.4, w:1,h:2, cat:'Оружие', desc:'Осколочная граната. В прототипе используется как редкий боевой расходник.', image:'', damage:35, weapon:'grenade' },
  { id:'antirad', name:'Антирад', price:240, weight:.15, w:1,h:1, cat:'Медицина', desc:'Снижает накопленную радиацию.', image:'', use:'antirad', restore:35 },
  { id:'ai2', name:'АИ-2', price:260, weight:.25, w:1,h:1, cat:'Медицина', desc:'Аптечка первой помощи.', image:'', use:'heal', restore:38 },
  { id:'binoculars', name:'Бинокль', price:320, weight:.6, w:2,h:2, cat:'Снаряжение', desc:'Позволяет осмотреть соседнюю локацию, не заходя на неё.', image:'', emoji:'🔭' },
  { id:'flash', name:'Флешка', price:350, weight:.05, w:1,h:1, cat:'Снаряжение', desc:'Может содержать данные о задании или координаты тайника.', image:'' },
  { id:'tail', name:'Хвост слепого пса', price:400, weight:.4, w:2,h:1, cat:'Добыча', desc:'Мутантный трофей, который можно продать торговцу.', image:'', emoji:'🐕' },
  { id:'flesh-eye', name:'Глаз плоти', price:650, weight:.2, w:1,h:1, cat:'Добыча', desc:'Редкий мутантный трофей. Торговцы платят за него заметно больше, чем за обычные части мутантов.', image:'', emoji:'👁' },
  { id:'medusa', name:'Артефакт «Медуза»', price:650, weight:.3, w:2,h:2, cat:'Артефакты', desc:'Небольшой артефакт. Может быть продан или изучен.', image:'' },
  { id:'meat_chunk', name:'Артефакт «Ломоть мяса»', price:900, weight:.35, w:2,h:2, cat:'Артефакты', desc:'Органический артефакт, образующийся в биологических аномалиях. Слабо восстанавливает здоровье, но повышает радиационный фон.', image:'' },
  { id:'gravi', name:'Артефакт «Грави»', price:1100, weight:.4, w:2,h:2, cat:'Артефакты', desc:'Гравитационный артефакт, образующийся в полях аномалий типа Воронка и Трамплин.', image:'' },
  { id:'milmed', name:'Военная аптечка', price:700, weight:.45, w:2,h:1, cat:'Медицина', desc:'Улучшенная аптечка.', image:'', use:'heal', restore:60 },
  { id:'aurora', name:'Противогаз «Аврора»', price:800, weight:1.2, w:2,h:2, cat:'Защита', desc:'Базовая защита органов дыхания.', image:'' },
  { id:'leather', name:'Кожанка', price:900, weight:2.8, w:2,h:2, cat:'Броня', desc:'Лёгкая куртка с минимальной защитой.', image:'', armor:8 },
  { id:'sawedoff', name:'Обрез', price:950, weight:2.2, w:2,h:2, cat:'Оружие', desc:'Двуствольное ружьё укороченного типа.', image:'', damage:28, weapon:'shotgun', ammo:'shells' },
  { id:'biker', name:'Косуха', price:1100, weight:2.4, w:2,h:2, cat:'Броня', desc:'Кожаная куртка, узнаваемая среди бандитов.', image:'', armor:10 },
  { id:'pm', name:'ПМм', price:1250, weight:.9, w:2,h:2, cat:'Оружие', desc:'Пистолет под патрон 9×18 мм.', image:'', damage:21, weapon:'pistol', ammo:'ammo9x18' },
  { id:'otklik', name:'Детектор «Отклик»', price:1450, weight:.7, w:2,h:2, cat:'Снаряжение', desc:'Простейший детектор аномальных сигналов. Нужен для поиска артефактов.', image:'' },
  { id:'vm17', name:'ВМ-17', price:1800, weight:3.4, w:3,h:2, cat:'Оружие', desc:'Двуствольное охотничье ружьё.', image:'', damage:34, weapon:'shotgun', ammo:'shells' },
  { id:'psz5', name:'Бронежилет ПСЗ-5', price:2600, weight:5.8, w:3,h:2, cat:'Броня', desc:'Армейский бронежилет.', image:'', armor:24 },
  { id:'gaduka', name:'Гадюка-5', price:3400, weight:3.1, w:3,h:2, cat:'Оружие', desc:'Пистолет-пулемёт под патрон 9×19 мм.', image:'', damage:26, weapon:'smg', ammo:'ammo9x19' },
  { id:'aksu', name:'АКСУ', price:4800, weight:2.7, w:3,h:2, cat:'Оружие', desc:'Компактный автомат под патрон 5.45×39 мм. Удобен в тесных помещениях, но уступает полноразмерным автоматам в точности на дальних дистанциях.', image:'', damage:31, weapon:'rifle', ammo:'ammo545' },
  { id:'optik', name:'Противогаз «Оптик»', price:3900, weight:1.4, w:2,h:2, cat:'Защита', desc:'Продвинутая маска с улучшенным обзором.', image:'' },
  { id:'zarya', name:'Заря', price:5200, weight:6.5, w:3,h:3, cat:'Броня', desc:'Защитный костюм для опасных вылазок.', image:'', armor:30 }
];

export const LOCATIONS = [
  { id:'north-checkpoint', name:'Северный блокпост', image:'', x:48,y:8, desc:'Старый контрольный пункт на северном въезде. За бетонными блоками видны следы недавнего патруля.', neighbors:['farmstead','locomotive'], loot:['bread','ammo9x18','bandage','flash'], hazards:['radiation'] },
  { id:'farmstead', name:'Развалины хутора', image:'', x:63,y:33, desc:'Разрушенные хозяйственные постройки и заросший двор. Ветер гоняет по земле куски жести.', neighbors:['north-checkpoint','pig-farm','elevator','forest-camp'], loot:['canned','water','bandage'], hazards:[] },
  { id:'pig-farm', name:'Свиноферма', image:'', x:47,y:37, desc:'Заброшенная ферма с пустыми загонами. В грязи попадаются тяжёлые копыта и следы мутировавших кабанов.', neighbors:['farmstead','elevator','locomotive'], loot:['canned','water','bandage'], hazards:[] },
  { id:'locomotive', name:'Локомотив', image:'', x:85,y:41, desc:'Ржавый локомотив застыл у насыпи. Между колёсами можно заметить старые следы.', neighbors:['north-checkpoint','pig-farm','rail-tunnel','underpass'], loot:['boltpack','ammo9x19','canned'], hazards:[] },
  { id:'rail-tunnel', name:'Восточный туннель ЖД', image:'', x:93,y:37, desc:'Восточный железнодорожный туннель расположен чуть выше и правее локомотива. Внутри слышны капли и далёкий металлический звон.', neighbors:['locomotive','underpass'], loot:['ammo9x18','flash'], hazards:['gravity'] },
  { id:'under-embankment', name:'Тоннель под ЖД насыпью', image:'', x:33,y:46, desc:'Низкий проход под железнодорожной насыпью. Местами осыпался потолок.', neighbors:['bridge-checkpoint','underpass','elevator'], loot:['ammo9x18','ai2','flash'], hazards:['gravity'] },
  { id:'bridge-checkpoint', name:'Блокпост под мостом', image:'', x:50,y:47, desc:'Под мостом устроили временный пост. С бетонных опор хорошо просматривается дорога.', neighbors:['under-embankment','elevator','atp','ravine-tunnel'], loot:['ammo9x19','bandage','water'], hazards:[] },
  { id:'elevator', name:'Элеватор', image:'', x:44,y:51, desc:'Промышленное здание с пустыми силосами. Внутри эхом отзывается каждый шаг. На одной из стен висит старая картина с фотографией Чернобыльской АЭС — выцветший снимок станции, оставленный здесь ещё до появления Зоны.', neighbors:['farmstead','pig-farm','under-embankment','bridge-checkpoint','stop'], loot:['canned','flash','ai2'], hazards:['radiation'] },
  { id:'stop', name:'Остановка', image:'', x:47,y:55, desc:'Покосившаяся остановка у дороги. На стене сохранились обрывки старых объявлений.', neighbors:['elevator','atp','rookie-village','trailer'], loot:['bread','water','energy'], hazards:[] },
  { id:'atp', name:'АТП', image:'', x:60,y:58, desc:'Территория автотранспортного предприятия занята бандитами. Между корпусами стоят брошенные машины.', neighbors:['stop','bridge-checkpoint','anomaly-dump','ravine-tunnel'], loot:['vodka','ammo9x18','flash'], hazards:['gravity'] },
  { id:'ravine-tunnel', name:'Тоннель в лощину', image:'', x:86,y:57, desc:'Проход в низину зарос кустарником. Слышно, как где-то рядом скребутся мутанты.', neighbors:['forest-camp','atp','underpass','bridge-checkpoint'], loot:['bandage','ammo9x18'], hazards:['radiation'] },
  { id:'anomaly-dump', name:'Тайный лагерь', image:'', x:11,y:58, anomalyName:'Воронка', desc:'Скрытая стоянка в стороне от дороги. В центре лагеря находится гравитационная аномалия «Воронка»: мусор и обломки медленно стягиваются к одной точке.', neighbors:['forest-camp','atp','south-checkpoint'], loot:['otklik','boltpack','flash'], hazards:['gravity'] },
  { id:'trailer', name:'Вагончик', image:'', x:31,y:61, desc:'Старый рабочий вагончик у дороги. Дверь закрыта неплотно, внутри давно никто не жил.', neighbors:['rookie-village','stop','underpass','forest-camp'], loot:['bread','canned','bandage','flash'], hazards:[] },
  { id:'underpass', name:'Подземный переход', image:'', x:39,y:59, desc:'Подземный переход находится правее и немного выше вагончика. Под дорогой сыро, вода доходит до щиколоток, а в углах лежит мусор.', neighbors:['rail-tunnel','under-embankment','ravine-tunnel','trailer','locomotive'], loot:['ammo9x18','ai2','water'], hazards:['radiation'] },
  { id:'rookie-village', name:'Деревня новичков', image:'', x:18,y:66, desc:'Небольшая деревня, где новички получают первые советы и пытаются освоиться в Зоне.', neighbors:['stop','trailer','forest-camp','sidorovich-bunker'], loot:['bread','water','canned','bandage'], hazards:[] },
  { id:'forest-camp', name:'Лагерь в лесу', image:'', x:17,y:74, desc:'Небольшая стоянка среди деревьев. Здесь иногда останавливаются одиночки и проводники.', neighbors:['farmstead','ravine-tunnel','anomaly-dump','rookie-village','trailer'], loot:['bread','water','bandage'], hazards:['radiation'] },
  { id:'south-checkpoint', name:'Южный блокпост', image:'', x:23,y:82, desc:'Военный блокпост на южном подходе к Кордону. Дежурные внимательно следят за дорогой.', neighbors:['atp','trailer','anomaly-dump'], loot:['ammo9x19','bandage','water','milmed'], hazards:[] },
  { id:'sidorovich-bunker', name:'Подвал Сидоровича', image:'', x:20,y:68, mapVisible:false, desc:'Подвал торговца заставлен ящиками и старой аппаратурой. Здесь всегда пахнет табаком и консервами.', neighbors:['rookie-village'], loot:['ammo9x18','ai2','flash'], hazards:[] }
];

export const NPCS = [
  { id:'sidorovich', name:'Сидорович', role:'Торговец', group:'Одиночки', faction:'loner', location:'sidorovich-bunker', icon:'', trader:true, stockIds:['bread','water','canned','sausage','bandage','ai2','antirad','ammo9x18','ammo9x19','ammo545','shells','knife','pm','binoculars','boltpack','otklik','aksu','leather','aurora'], priceMultiplier:1.08, buyMultiplier:.48, greeting:'Ну, заходи, сталкер. Есть дело или просто погреться пришёл?', topics:['работа','задания','квесты','поручения','торговля','слухи'], lines:{ work:'Есть пара мелких поручений. Для начала осмотрись на Кордоне, не лезь куда не просят.', trade:'Открывай торговую вкладку КПК. Покупай мой товар или продавай найденное — только не жди, что я дам за хлам большие деньги.', rumors:'Говорят, у старой насыпи снова что-то притягивает железо. Я бы туда без болтов не совался.' } },
  { id:'wolf', name:'Волк', role:'Вожатый', group:'Одиночки', faction:'loner', location:'rookie-village', icon:'', greeting:'Новенький? Тогда запоминай: в Зоне сначала смотри под ноги, потом по сторонам.', topics:['совет','работа','деревня'], lines:{ advice:'Не отходи далеко от деревни, пока не поймёшь, где здесь безопасно. И всегда держи путь назад.', work:'Сходи к остановке и проверь, не остались ли там припасы. Только не задерживайся.', village:'Здесь собираются одиночки. Если не нарываться на неприятности, можно спокойно начать.' } },
  { id:'kefir', name:'Кефир', role:'Пахан', group:'Бандиты', faction:'bandit', location:'atp', icon:'', greeting:'Чего надо? Говори быстро, у меня тут люди заняты.', topics:['дело','правила','слухи'], lines:{ work:'Есть работа для тех, кто умеет держать язык за зубами. Сначала покажи, что не пустышка.', rules:'На АТП чужое добро без спроса не трогают. Особенно если оно моё.', rumors:'У мусорки замечали странные вспышки. Парни туда пока не суются.' } },
  { id:'shnurok', name:'Шнурок', role:'Торговец АТП', group:'Бандиты', faction:'bandit', location:'atp', icon:'', trader:true, stockIds:['vodka','bread','canned','sausage','knife','rgd5','shells','ammo9x18','ammo9x19','sawedoff','vm17','pm','biker','leather'], priceMultiplier:1.04, buyMultiplier:.42, greeting:'Чё надо? У Шнурка товар не залеживается. Есть деньги — найдём общий язык.', topics:['торговля','слухи','дела'], lines:{ trade:'Смотри товар в КПК. Могу продать ствол или патроны, а могу принять добычу. Только без мутантских соплей на прилавок.', rumors:'На свиноферме что-то копается. Парни говорят, там уже не обычные свиньи.', дела:'Сначала разберись с Кефиром. Не люблю, когда чужие решают вопросы без пахана.' } },
  { id:'dzerzhinsky', name:'Дмитрий Дзержинский', role:'Капитан блокпоста', group:'Военные', faction:'military', location:'south-checkpoint', icon:'', greeting:'Документы и цель прибытия. На блокпосту без самодеятельности.', topics:['служба','пропуск','обстановка'], lines:{ service:'Я отвечаю за порядок на южном блокпосту. Любые подозрительные перемещения докладываются.', pass:'Порядок прохода зависит от обстановки и твоей репутации. Пока у тебя нулевой рейтинг.', situation:'Патрули проверяют дорогу и ближайшие строения. В последнее время в районе свалки участились странные сигналы.' } },
  { id:'kapterka', name:'Каптёрка', role:'Квартирмейстер / снабженец', group:'Военные', faction:'military', location:'south-checkpoint', icon:'', trader:true, stockIds:['ammo9x18','ammo9x19','ammo545','shells','bandage','ai2','antirad','milmed','aurora','optik','psz5','vm17','pm','gaduka','aksu','ammo545','boltpack'], priceMultiplier:1.18, buyMultiplier:.5, greeting:'Снабжение выдаётся по ведомости. Лишних вопросов не задавай — лучше скажи, что нужно.', topics:['торговля','снабжение','служба'], lines:{ trade:'В КПК открыт мой склад. Снаряжение выдаю по цене, трофеи принимаю по оценке.', supply:'Боеприпасы и аптечки есть не всегда. Запасы пополняются после поставок.', service:'Список имущества ведётся строго. За потерю армейского снаряжения придётся отвечать.' } }
];

// Все портреты для выбора персонажа: 14 иконок фракций + 4 портрета ключевых NPC.
// Изображения загружаются напрямую с внешних источников; локальные копии не требуются.
export const AVATAR_OPTIONS = [
  ...AVATARS.loner.map((src, index) => ({ src, name: `Одиночка ${index + 1}`, group: 'loner' })),
  ...AVATARS.bandit.map((src, index) => ({ src, name: `Бандит ${index + 1}`, group: 'bandit' })),
  ...AVATARS.military.map((src, index) => ({ src, name: `Военный ${index + 1}`, group: 'military' })),
  { src:'builtin:npc:sidorovich', name:'Сидорович', group:'npc' },
  { src:'builtin:npc:wolf', name:'Волк', group:'npc' },
  { src:'builtin:npc:kefir', name:'Кефир', group:'npc' },
  { src:'builtin:npc:dzerzhinsky', name:'Дмитрий Дзержинский', group:'npc' }
];

// Музыка для радио и личного плеера. Воспроизведение выполняется встроенным YouTube-плеером,
// поэтому проект хранит только ссылки и не копирует защищённые аудиозаписи.
// Композиции воспроизводятся с YouTube; startSeconds выбирает отдельный трек в длинном саундтреке.
// Полная музыкальная библиотека: никаких композиций из True Stalker.
// Треки из длинных видео выделяются по таймкодам; прямые ролики запускаются с 0.
const song = (id,title,artist,videoId,startSeconds=0,year=null,label='YouTube') => ({
  id,title,artist,videoId,startSeconds,year,label,era:artist
});

const lonerStationTracks = [
  song('grob-rodina','Родина','Гражданская Оборона','SwYZQ0zgdsw',0,1989,'Плейлист Гражданской Обороны'),
  song('grob-mertvye','Мёртвые','Гражданская Оборона','SwYZQ0zgdsw',252,1989,'Плейлист Гражданской Обороны'),
  song('grob-uragan','Значит ураган','Гражданская Оборона','SwYZQ0zgdsw',406,1989,'Плейлист Гражданской Обороны'),
  song('grob-durachok','Про дурачка','Гражданская Оборона','SwYZQ0zgdsw',624,1990,'Плейлист Гражданской Обороны'),
  song('grob-dsch','Долгая счастливая жизнь','Гражданская Оборона','SwYZQ0zgdsw',914,2004,'Плейлист Гражданской Обороны'),
  song('grob-esche','Ещё немного','Гражданская Оборона','SwYZQ0zgdsw',1235,1990,'Плейлист Гражданской Обороны'),
  song('grob-dem','Дембельская','Гражданская Оборона','SwYZQ0zgdsw',1627,1990,'Плейлист Гражданской Обороны'),
  song('grob-revolution','Пой, революция!','Гражданская Оборона','SwYZQ0zgdsw',1913,1990,'Плейлист Гражданской Обороны'),
  song('grob-krasnoarm','Песня красноармейца','Гражданская Оборона','SwYZQ0zgdsw',2105,1990,'Плейлист Гражданской Обороны'),
  song('grob-zhit','Жить','Гражданская Оборона','SwYZQ0zgdsw',2538,1990,'Плейлист Гражданской Обороны'),
  song('piknik-siyanie','Сияние','Пикник','Zgd5EX8CB38',0,2014,'Официальный видеоклип'),
  song('piknik-dorian-grey','Дориан (Грей)','Пикник','FSr21xK0GqU',0,2026,'Альбом «Вечное движение»'),
  song('kino-razreshi','Разреши мне','Кино','hr2fP-G5lXs',0,2025,'Официальное видео'),
  song('ddt-gde-letim','Где мы летим','ДДТ','yWr8HQayBUQ',0,2012,'Видеоклип'),
  song('zhadan-rohan','Рогань','Жадан і Собаки','HXNO7Z9D5n0',0,2023,'Официальное видео'),
  song('kukryniksy-nadezhda','Надежда','Кукрыниксы','nI9rCTVFjmA',0,2015,'Видео группы «Горшенёв»'),
  song('kukryniksy-raskrashennaya','По раскрашенной душе','Кукрыниксы','BiY0pvtcs8k',0,2002,'Аудиозапись'),
  song('black-obelisk-ostayus','Я остаюсь','Чёрный Обелиск','PnOHYU4TtE0',0,2014,'Видеозапись'),
  song('splean-moya-lyubov','Моя любовь','Сплин','43ScNT79o50',0,1997,'Официальный канал'),
  song('bi2-varvara','Варвара','Би-2','T18deTeV0RI',0,2000,'Видеоклип')
];

const banditStationTracks = [
  song('kish-vedma','Ведьма и Осёл','Король и Шут','44YS6zEsjQw',0,1998,'Подборка песен Короля и Шута'),
  song('kish-kukla','Кукла Колдуна','Король и Шут','44YS6zEsjQw',177,2001,'Подборка песен Короля и Шута'),
  song('kish-lesnik','Лесник','Король и Шут','44YS6zEsjQw',381,1997,'Подборка песен Короля и Шута'),
  song('kish-durak','Дурак и Молния','Король и Шут','44YS6zEsjQw',573,1996,'Подборка песен Короля и Шута'),
  song('kish-geniy','Танец злобного гения','Король и Шут','44YS6zEsjQw',687,2001,'Подборка песен Короля и Шута'),
  song('kish-gimn','Гимн Шута','Король и Шут','44YS6zEsjQw',923,2002,'Подборка песен Короля и Шута'),
  song('kish-prygnu','Прыгну со скалы','Король и Шут','44YS6zEsjQw',1224,1999,'Подборка песен Короля и Шута'),
  song('kish-kamnem','Камнем по голове','Король и Шут','44YS6zEsjQw',1417,1996,'Подборка песен Короля и Шута'),
  song('kish-vospominaniya','Воспоминания о былой любви','Король и Шут','44YS6zEsjQw',1575,2001,'Подборка песен Короля и Шута'),
  song('kish-dom','Проклятый старый дом','Король и Шут','44YS6zEsjQw',1870,2001,'Подборка песен Короля и Шута'),
  song('sector-demobilizaciya','Демобилизация','Сектор Газа','ILT3n0WMVJY',0,1990,'Видеозапись'),
  song('vladimirsky-central','Владимирский централ','Владимир Круг','GqFQbNn0ZBo',0,1999,'Официальный канал',),
  song('agata-kak-na-voyne','Как на войне','Агата Кристи','1fm1XCJAY0s',0,1989,'Официальный канал'),
  song('agata-opium','Опиум для никого','Агата Кристи','Ty8QVhtdsgI',0,1995,'Видеоклип'),
  song('ipv-nepreryvny','Непрерывный суицид','Инструкция по выживанию','qfuxLKt7IQ0',0,1990,'Альбомная запись'),
  song('ipv-severnaya','Моя северная страна','Инструкция по выживанию','qfuxLKt7IQ0',384,1990,'Альбомная запись'),
  song('ipv-gorbachev','Товарищ Горбачёв','Инструкция по выживанию','qfuxLKt7IQ0',936,1990,'Альбомная запись'),
  song('bi2-polkovniku','Полковнику никто не пишет','Би-2','hl2O9EijZnc',0,2000,'Музыкальная подборка Би-2'),
  song('electro-ischu','Ищу тебя','Приключения Электроников','XBawgi2fQLI',0,2015,'Официальный канал'),
  song('grob-moya-oborona','Моя оборона','Гражданская Оборона','OPTl11RKzXQ',850,1989,'Подборка песен Егора Летова')
];

const militaryStationTracks = [
  song('bonjovi-always','Always','Bon Jovi','yV-GX00-UPw',0,1994,'Подборка Bon Jovi'),
  song('bonjovi-prayer','Livin’ on a Prayer','Bon Jovi','yV-GX00-UPw',347,1986,'Подборка Bon Jovi'),
  song('bonjovi-itsmy','It’s My Life','Bon Jovi','yV-GX00-UPw',582,2000,'Подборка Bon Jovi'),
  song('bonjovi-badname','You Give Love a Bad Name','Bon Jovi','yV-GX00-UPw',806,1986,'Подборка Bon Jovi'),
  song('bonjovi-bedroses','Bed of Roses','Bon Jovi','yV-GX00-UPw',1022,1992,'Подборка Bon Jovi'),
  song('bonjovi-illbe','I’ll Be There for You','Bon Jovi','yV-GX00-UPw',1411,1988,'Подборка Bon Jovi'),
  song('bonjovi-miracle','Miracle','Bon Jovi','yV-GX00-UPw',1749,1990,'Подборка Bon Jovi'),
  song('bonjovi-blaze','Blaze of Glory','Bon Jovi','yV-GX00-UPw',2050,1990,'Подборка Bon Jovi'),
  song('bonjovi-love-song','This Ain’t a Love Song','Bon Jovi','yV-GX00-UPw',2382,1995,'Подборка Bon Jovi'),
  song('bonjovi-neversay','Never Say Goodbye','Bon Jovi','yV-GX00-UPw',2676,1986,'Подборка Bon Jovi'),
  song('bonjovi-baby','Born to Be My Baby','Bon Jovi','yV-GX00-UPw',2962,1988,'Подборка Bon Jovi'),
  song('bonjovi-thesedays','These Days','Bon Jovi','yV-GX00-UPw',3235,1995,'Подборка Bon Jovi'),
  song('bonjovi-misunderstood','Misunderstood','Bon Jovi','yV-GX00-UPw',3504,2002,'Подборка Bon Jovi'),
  song('bonjovi-arms','In These Arms','Bon Jovi','yV-GX00-UPw',3725,1992,'Подборка Bon Jovi'),
  song('bonjovi-badmedicine','Bad Medicine','Bon Jovi','yV-GX00-UPw',4036,1988,'Подборка Bon Jovi'),
  song('ratt-bestofme','Best of Me','Ratt','DCEjiMO0tW4',0,2010,'Официальный клип'),
  song('survivor-cant-hold','I Can’t Hold Back','Survivor','GaMcsKtBDwE',0,1984,'Официальный клип'),
  song('zztop-gotsta','I Gotsta Get Paid','ZZ Top','kaIZWjItReI',0,2012,'Официальный канал'),
  song('dokken-fugitive','Fugitive','Dokken','XZ0CocSSpzw',0,2023,'Официальный клип'),
  song('stones-doom','Doom and Gloom','The Rolling Stones','1DWiB7ZuLvI',0,2012,'Официальный канал')
];

// Дополнительные композиции доступны в личном КПК-плеере, но не повторяются в эфире баз.
const personalOnlyTracks = [
  song('grob-svoi-sredi','Свой среди чужих','Гражданская Оборона','SwYZQ0zgdsw',7998,1990,'Плейлист Гражданской Обороны'),
  song('grob-nechego','Нечего терять','Гражданская Оборона','SwYZQ0zgdsw',3660,1990,'Плейлист Гражданской Обороны'),
  song('kish-myaso','Ели мясо мужики','Король и Шут','44YS6zEsjQw',2127,1999,'Подборка песен Короля и Шута'),
  song('kish-rom','Ром','Король и Шут','44YS6zEsjQw',2261,2000,'Подборка песен Короля и Шута'),
  song('bonjovi-because','Because We Can','Bon Jovi','chXJFjrl-Q4',0,2013,'Официальный канал')
];

export const RADIO_TRACKS = [...lonerStationTracks,...banditStationTracks,...militaryStationTracks];
// Автоматически выставляем конец каждого фрагмента следующей отметкой из той же записи.
for (const track of RADIO_TRACKS) {
  const next = RADIO_TRACKS.filter(other=>other.videoId===track.videoId && other.startSeconds>track.startSeconds)
    .sort((a,b)=>a.startSeconds-b.startSeconds)[0];
  if (next) track.endSeconds=next.startSeconds;
}
for (const track of personalOnlyTracks) {
  const next=personalOnlyTracks.filter(other=>other.videoId===track.videoId && other.startSeconds>track.startSeconds)
    .sort((a,b)=>a.startSeconds-b.startSeconds)[0];
  if (next && next.startSeconds>track.startSeconds) track.endSeconds=next.startSeconds;
}
// Пропущенные композиции между выбранными фрагментами не должны попадать в эфир.
const preciseSegmentEnds = {
  'grob-esche':1479, 'grob-krasnoarm':2259, 'grob-zhit':2730,
  'kish-dom':2127, 'bonjovi-badmedicine':4358,
  'grob-svoi-sredi':8303, 'grob-nechego':3885,
  'grob-moya-oborona':1008, 'kish-rom':2423
};
for (const track of [...RADIO_TRACKS,...personalOnlyTracks]) {
  if (preciseSegmentEnds[track.id]) track.endSeconds=preciseSegmentEnds[track.id];
}

export const PLAYER_TRACKS = [...RADIO_TRACKS,...personalOnlyTracks];
export const RADIO_STATIONS = [
  { id:'loner-village-radio', name:'Радио Деревни новичков', faction:'Одиночки', locationId:'rookie-village', frequency:'100.7 FM', trackIds:lonerStationTracks.map(track=>track.id) },
  { id:'bandit-atp-radio', name:'Радио АТП', faction:'Бандиты', locationId:'atp', frequency:'101.3 FM', trackIds:banditStationTracks.map(track=>track.id) },
  { id:'military-checkpoint-radio', name:'Радио Южного блокпоста', faction:'Военные', locationId:'south-checkpoint', frequency:'103.1 FM', trackIds:militaryStationTracks.map(track=>track.id) }
];

export const BLIND_DOG_IMAGES = [];


export const QUESTS = [
  { id:'first-steps', title:'Первые шаги', giver:'wolf', text:'Осмотрись в деревне новичков и загляни к Волку за советом.', reward:150, condition:'talk:wolf', status:'available' },
  { id:'old-supplies', title:'Старые припасы', giver:'wolf', text:'Проверь остановку и найди что-нибудь полезное.', reward:220, condition:'search:stop', status:'available' },
  { id:'signal-dump', title:'Странный сигнал', giver:'sidorovich', text:'Найди источник сигнала в Тайном лагере, проверь гравитационную аномалию «Воронка» и вернись с находкой.', reward:450, condition:'artifact:anomaly-dump', status:'available' },
  { id:'atp-test', title:'Проверка на прочность', giver:'kefir', text:'Доберись до туннеля в лощину и проверь, не появились ли там чужаки.', reward:300, condition:'visit:ravine-tunnel', status:'available' },
  { id:'patrol-report', title:'Доклад патруля', giver:'dzerzhinsky', text:'Осмотри блокпост под мостом и сообщи, что происходит на дороге.', reward:180, condition:'visit:bridge-checkpoint', status:'available' }
];

export const SQUADS = [
  { id:'squad-loners', name:'Патруль одиночек', faction:'loner', location:'rookie-village', members:3, destination:null },
  { id:'squad-bandits', name:'Группа Кефира', faction:'bandit', location:'atp', members:4, destination:null },
  { id:'squad-military', name:'Военный патруль', faction:'military', location:'south-checkpoint', members:3, destination:null }
];

// Only common, low-tier equipment can be selected before the first outing.
// Rare protection, advanced weapons, detectors, mutant trophies and artifacts are excluded.
export const STARTER_ITEM_IDS = [
  'bread','water','sausage','vodka','shells','energy','canned',
  'knife','ammo9x18','ammo9x19','bandage','boltpack','rgd5','ai2',
  'sawedoff','pm','binoculars'
];
export const ITEM_ACQUISITION = {
  traderOnly: ['aksu','ammo545','vm17','gaduka','psz5','aurora','optik','zarya','biker','leather'],
  searchOnly: ['flash'],
  traderOrSearch: ['otklik','milmed'],
  mutantDrops: ['tail','flesh-eye'],
  artifactHunt: ['medusa','meat_chunk','gravi']
};
export const START_BUDGET = 2500;
export const MAX_CARRY_KG = 50;
