export const ASSETS = {
  menu: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5OXJVGkhNyzTjS2YABky-DUSo45VdfMiDvddnm2NsexQfHmc4giGVzRY&s=10',
  pda: new URL('../../assets/images/location-backgrounds/kpkfon.webp', import.meta.url).href,
  locationBackgrounds: {
    'north-checkpoint': new URL('../../assets/images/location-backgrounds/severblokpostfon.webp', import.meta.url).href,
    farmstead: new URL('../../assets/images/location-backgrounds/fonryinhytor.webp', import.meta.url).href,
    'pig-farm': new URL('../../assets/images/location-backgrounds/fonferma.webp', import.meta.url).href,
    locomotive: new URL('../../assets/images/location-backgrounds/fonlokomotiv.webp', import.meta.url).href,
    'rail-tunnel': new URL('../../assets/images/location-backgrounds/fonvosttyneljd.webp', import.meta.url).href,
    'under-embankment': new URL('../../assets/images/location-backgrounds/tynelpodjdfon.webp', import.meta.url).href,
    'bridge-checkpoint': new URL('../../assets/images/location-backgrounds/blokpostpodmostomfon.webp', import.meta.url).href,
    elevator: new URL('../../assets/images/location-backgrounds/fonelevator.webp', import.meta.url).href,
    stop: new URL('../../assets/images/location-backgrounds/ostanovkafon.webp', import.meta.url).href,
    atp: new URL('../../assets/images/location-backgrounds/fonatp.webp', import.meta.url).href,
    'ravine-tunnel': new URL('../../assets/images/location-backgrounds/tynelloshinafon.webp', import.meta.url).href,
    underpass: new URL('../../assets/images/location-backgrounds/podxemperehodfon.webp', import.meta.url).href,
    trailer: new URL('../../assets/images/location-backgrounds/fonvagoncik.webp', import.meta.url).href,
    'anomaly-dump': new URL('../../assets/images/location-backgrounds/fontainlager.webp', import.meta.url).href,
    'rookie-village': new URL('../../assets/images/location-backgrounds/fonderevnanovickov%20vhod.webp', import.meta.url).href,
    'sidorovich-bunker': new URL('../../assets/images/location-backgrounds/fonpodvalsidorovic.webp', import.meta.url).href,
    'forest-camp': new URL('../../assets/images/location-backgrounds/fonlagervlesy.webp', import.meta.url).href,
    'south-checkpoint': new URL('../../assets/images/location-backgrounds/fonygblokpost.webp', import.meta.url).href
  },
  areaBackgrounds: {
    'north-guardhouse': new URL('../../assets/images/location-backgrounds/severblokpostfon.webp', import.meta.url).href,
    'north-checkpoint-store': new URL('../../assets/images/location-backgrounds/severblokpostfon.webp', import.meta.url).href,
    'farm-house': new URL('../../assets/images/location-backgrounds/fonryinhytor.webp', import.meta.url).href,
    'farm-cellar': new URL('../../assets/images/location-backgrounds/fonryinhytor.webp', import.meta.url).href,
    'pig-sty': new URL('../../assets/images/location-backgrounds/fonferma.webp', import.meta.url).href,
    'pig-shed': new URL('../../assets/images/location-backgrounds/fonferma.webp', import.meta.url).href,
    'locomotive-cabin': new URL('../../assets/images/location-backgrounds/fonlokomotiv.webp', import.meta.url).href,
    'locomotive-carriage': new URL('../../assets/images/location-backgrounds/fonlokomotiv.webp', import.meta.url).href,
    'village-house': new URL('../../assets/images/location-backgrounds/fonderevnanovickov%20vhod.webp', import.meta.url).href,
    'village-shed': new URL('../../assets/images/location-backgrounds/fonderevnanovickov%20vhod.webp', import.meta.url).href,
    'village-basement': new URL('../../assets/images/location-backgrounds/fonpodvalderevnanovickov.webp', import.meta.url).href,
    'bunker-basement': new URL('../../assets/images/location-backgrounds/fonpodvalsidorovic.webp', import.meta.url).href,
    'elevator-office': new URL('../../assets/images/location-backgrounds/fonelevator.webp', import.meta.url).href,
    'forest-tent': new URL('../../assets/images/location-backgrounds/fonlagervlesy.webp', import.meta.url).href,
    'atp-office': new URL('../../assets/images/location-backgrounds/fonatp.webp', import.meta.url).href,
    'atp-garage': new URL('../../assets/images/location-backgrounds/fonatp.webp', import.meta.url).href,
    'south-barracks': new URL('../../assets/images/location-backgrounds/fonygblokpost.webp', import.meta.url).href,
    'trailer-inside': new URL('../../assets/images/location-backgrounds/fonvagoncik.webp', import.meta.url).href
  },
  map: new URL('../../assets/images/cordon-clean.webp', import.meta.url).href,
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


// Исследуемые места внутри подлокаций. Поиск здесь отдельный от общего обыска локации.
export const EXPLORE_SPOTS = [
  {id:'north-guardhouse',locationId:'north-checkpoint',name:'Караульное помещение',aliases:['караулка','караульное помещение','будка','пост'],kind:'search',description:'Тесная караулка у шлагбаума. На столе лежат старые журналы, жестяная кружка и брошенные мелочи.',shelter:true,loot:['water','bread','bandage','ammo9x18','flash']},
  {id:'north-barrier',locationId:'north-checkpoint',name:'Площадка у шлагбаума',aliases:['шлагбаум','площадка','барьер'],kind:'search',description:'У бетонных блоков и дорожного заграждения остались следы прежних остановок и забытые вещи.',loot:['boltpack','water','ammo9x18','canned']},
  {id:'pig-sty',locationId:'pig-farm',name:'Свинарник',aliases:['свинарник','стойло','загон','хлев'],kind:'search',description:'Внутри сыро и пахнет старой соломой. Между кормушками и досками можно заметить оставленные припасы.',shelter:true,loot:['canned','bread','water','bandage','knife']},
  {id:'pig-shed',locationId:'pig-farm',name:'Хозяйственный сарай фермы',aliases:['сарай','сарай фермы','хозблок','кладовая'],kind:'search',description:'Сарай завален ржавыми инструментами и пустыми ящиками. Часть вещей ещё может пригодиться.',shelter:true,loot:['boltpack','flash','water','ammo9x18']},
  {id:'locomotive-cabin',locationId:'locomotive',name:'Кабина локомотива',aliases:['кабина','кабина локомотива','машинист','тепловоз'],kind:'search',description:'В кабине пыльные приборы, разбитое стекло и узкий ящик под пультом. Внутри могут остаться забытые вещи.',shelter:true,loot:['flash','water','bandage','ammo9x19']},
  {id:'locomotive-carriage',locationId:'locomotive',name:'Грузовой вагон',aliases:['грузовой вагон','вагон','вагоне','платформа'],kind:'search',description:'В пустом грузовом вагоне пахнет ржавчиной и машинным маслом. Между креплениями видны старые свёртки.',loot:['canned','boltpack','knife','ammo9x18','water']},
  {id:'rail-tunnel-niche',locationId:'rail-tunnel',name:'Служебная ниша тоннеля',aliases:['ниша','служебная ниша','техническая ниша'],kind:'search',description:'У стены тоннеля есть узкая ниша для обслуживания путей. Внутри темно, но на полу заметны брошенные вещи.',shelter:true,loot:['bandage','flash','water','ammo9x18']},
  {id:'embankment-maintenance',locationId:'under-embankment',name:'Технический карман насыпи',aliases:['технический карман','карман','ниша насыпи','под насыпью'],kind:'search',description:'За бетонной опорой насыпи скрывается небольшой технический карман. Здесь можно укрыться от ветра и проверить старые ящики.',loot:['boltpack','water','bread','bandage','ammo9x18']},
  {id:'stop-shelter',locationId:'stop',name:'Навес остановки',aliases:['навес','остановка','павильон'],kind:'search',description:'Под навесом сохранились обрывки объявлений и мусор, занесённый ветром. Между досками иногда остаются мелкие вещи.',loot:['bread','water','canned','bandage','flash']},
  {id:'stop-bus',locationId:'stop',name:'Салон старого автобуса',aliases:['автобус','салон автобуса','старый автобус'],kind:'search',description:'В салоне автобуса выбиты окна, сиденья порваны. Стоит проверить пространство под креслами и возле кабины.',loot:['water','ammo9x18','flash','bandage','sausage']},
  {id:'ravine-tunnel-pocket',locationId:'ravine-tunnel',name:'Боковой карман тоннеля',aliases:['карман тоннеля','боковой карман','служебная ниша'],kind:'search',description:'В боковом кармане тоннеля скопились сухая грязь, камни и старые упаковки. Следы говорят, что здесь кто-то прятался.',loot:['water','bandage','ammo9x18','flash']},
  {id:'secret-camp-shelter',locationId:'anomaly-dump',name:'Укрытие тайного лагеря',aliases:['укрытие','тайный лагерь','палатка лагеря','лагерь'],kind:'search',description:'В укрытии тайного лагеря остались остатки стоянки. Рядом опасная гравитационная воронка — не подходи к ней во время обыска.',shelter:true,loot:['bread','water','bandage','flash','ammo9x18']},
  {id:'village-fire',locationId:'rookie-village',name:'Костёр у деревни',aliases:['костер','костра','огонь','у костра'],kind:'campfire',description:'Общий костёр, вокруг которого собираются новички и бывалые сталкеры.',loot:[]},
  {id:'village-house',locationId:'rookie-village',name:'Заброшенный домик',aliases:['дом','домик','изба','комната'],kind:'search',description:'Небольшой покосившийся дом. Внутри пыль, остатки мебели и следы прежних жильцов.',shelter:true,loot:['bread','water','flash','bandage','ammo9x18','canned']},
  {id:'village-shed',locationId:'rookie-village',name:'Хозяйственный сарай',aliases:['сарай','хозпостройка','кладовка'],kind:'search',description:'В сарае валяются инструменты, пустые ящики и старые хозяйственные вещи.',shelter:true,loot:['boltpack','knife','water','flash','bandage']},
  {id:'bunker-basement',locationId:'sidorovich-bunker',name:'Подвал и дальний угол',aliases:['подвал','дальний угол','угол','закуток'],kind:'search',description:'За складскими ящиками и стеллажами остаются места, куда редко заглядывают.',shelter:true,loot:['ammo9x18','ai2','flash','water','boltpack','bandage']},
  {id:'bunker-shelves',locationId:'sidorovich-bunker',name:'Стеллажи Сидоровича',aliases:['стеллаж','полка','полки','ящик','ящики'],kind:'search',description:'Старые стеллажи с коробками, инструментами и товаром торговца.',shelter:true,loot:['flash','boltpack','bandage','ammo9x18']},
  {id:'trailer-inside',locationId:'trailer',name:'Внутри вагончика',aliases:['вагончик','вагончике','вагона','внутри'],kind:'search',description:'Внутри тесно, пахнет сыростью. Под скамьёй и у шкафчика могут остаться старые вещи.',shelter:true,loot:['canned','flash','bandage','ammo9x18','water','knife']},
  {id:'trailer-yard',locationId:'trailer',name:'Задняя сторона вагончика',aliases:['за вагончиком','задняя сторона','под вагончиком'],kind:'search',description:'За вагончиком валяются обломки дерева, ржавая канистра и следы собачьей стаи.',loot:['water','ammo9x18','bandage','flash']},
  {id:'elevator-office',locationId:'elevator',name:'Контора элеватора',aliases:['контора','офис','кабинет'],kind:'search',description:'Пустая контора с перевёрнутым столом, выцветшими бумагами и старой картиной с фотографией ЧАЭС.',shelter:true,loot:['flash','canned','ammo9x18','ai2','water']},
  {id:'elevator-silo',locationId:'elevator',name:'Нижний ярус силосов',aliases:['силос','силосы','нижний ярус','склад'],kind:'search',description:'Внизу темно и гулко. Между бетонными опорами застряли остатки старого оборудования.',shelter:true,loot:['boltpack','ammo9x19','bandage','flash']},
  {id:'farm-house',locationId:'farmstead',name:'Дом на хуторе',aliases:['дом','дом на хуторе','жилье','жилище'],kind:'search',description:'В доме выбиты окна, но часть шкафов и ящиков уцелела.',shelter:true,loot:['canned','water','sausage','flash','bandage']},
  {id:'farm-cellar',locationId:'farmstead',name:'Погреб хутора',aliases:['подвал','погреб','подполье'],kind:'search',description:'Сырой погреб с полками для запасов. В темноте легко пропустить мелкие предметы.',shelter:true,loot:['canned','water','antirad','bandage','ammo9x18']},
  {id:'forest-fire',locationId:'forest-camp',name:'Костёр в лесном лагере',aliases:['костер','костра','огонь','у костра'],kind:'campfire',description:'Небольшой костёр на поляне, где путники останавливаются переждать ночь.',loot:[]},
  {id:'forest-tent',locationId:'forest-camp',name:'Палатка проводников',aliases:['палатка','тент','лежанка'],kind:'search',description:'В палатке остались следы недавней стоянки и несколько забытых вещей.',shelter:true,loot:['bread','water','bandage','flash','energy']},
  {id:'atp-garage',locationId:'atp',name:'Гараж АТП',aliases:['гараж','бокс','ремонтный бокс','мастерская'],kind:'search',description:'Между подъёмником и верстаками лежат детали и брошенный инструмент.',shelter:true,loot:['boltpack','ammo9x19','flash','knife','water']},
  {id:'atp-office',locationId:'atp',name:'Контора АТП',aliases:['контора','офис','диспетчерская'],kind:'search',description:'В помещении старые бумаги, металлический шкаф и несколько выдвинутых ящиков.',shelter:true,loot:['flash','vodka','ammo9x18','bandage','canned']},
  {id:'south-barracks',locationId:'south-checkpoint',name:'Казарма блокпоста',aliases:['казарма','казармы','комната солдат'],kind:'search',description:'В казарме стоят койки и личные шкафчики. Без разрешения военных лучше не задерживаться.',shelter:true,loot:['ammo545','bandage','water','canned','flash']},
  {id:'south-storage',locationId:'south-checkpoint',name:'Склад снабжения',aliases:['склад','каптерка','каптёрка','кладовая'],kind:'search',description:'Закрытая кладовая с ящиками снабжения. Часть запасов может быть забыта или списана.',shelter:true,loot:['ammo545','ammo9x19','milmed','antirad','boltpack']},
  {id:'bridge-post',locationId:'bridge-checkpoint',name:'Пост под мостом',aliases:['пост','караулка','укрытие'],kind:'search',description:'Под бетонной опорой устроено небольшое укрытие. В щелях и ящиках можно найти оставленные вещи.',shelter:true,loot:['ammo9x19','bandage','water','flash']},
  {id:'underpass-niche',locationId:'underpass',name:'Боковая ниша перехода',aliases:['ниша','закуток','углубление'],kind:'search',description:'В боковой нише скопились мусор и принесённые водой предметы.',shelter:true,loot:['ammo9x18','ai2','water','flash']},
  {id:'north-checkpoint-store',locationId:'north-checkpoint',name:'Служебный сарай блокпоста',aliases:['сарай блокпоста','служебный сарай','хозблок'],kind:'search',description:'Низкая пристройка за бетонными блоками. Внутри пахнет машинным маслом, на полках стоят пустые канистры.',shelter:true,loot:['water','boltpack','ammo9x18','bandage']},
  {id:'rail-tunnel-entrance',locationId:'rail-tunnel',name:'Площадка у восточного входа',aliases:['восточный вход','вход тоннеля','площадка у тоннеля'],kind:'search',description:'У восточного входа в тоннель лежат обломки шпал и старые сумки. Из глубины тянет холодом.',shelter:false,loot:['flash','water','ammo9x18','bread']},
  {id:'embankment-underpass',locationId:'under-embankment',name:'Под бетонной опорой',aliases:['опора','бетонная опора','под опорой','под мостиком'],kind:'search',description:'Под насыпью есть сухой карман между бетонными опорами. Здесь можно переждать непогоду и осмотреть чужие следы.',shelter:true,loot:['bandage','water','boltpack','flash']},
  {id:'bridge-guardroom',locationId:'bridge-checkpoint',name:'Дежурная будка',aliases:['будка','дежурная будка','будка поста'],kind:'search',description:'Старая будка у опоры моста. Стекло выбито, на стене осталась схема поста.',shelter:true,loot:['ammo9x19','bandage','canned','flash']},
  {id:'ravine-tunnel-mouth',locationId:'ravine-tunnel',name:'Выход в лощину',aliases:['выход в лощину','у выхода','у входа в лощину'],kind:'search',description:'У выхода тоннеля накапливается мусор и сухая листва. Отсюда просматривается часть лощины.',shelter:false,loot:['water','bread','ammo9x18','flash']},
  {id:'secret-camp-perimeter',locationId:'anomaly-dump',name:'Край тайного лагеря',aliases:['край лагеря','край свалки','периметр лагеря'],kind:'search',description:'С внешнего края тайного лагеря видны обломки палатки и следы недавней стоянки. Рядом ощущается гравитационная аномалия.',shelter:false,loot:['flash','water','bandage','boltpack']},
  {id:'underpass-stairs',locationId:'underpass',name:'Лестничный спуск',aliases:['лестница','лестничный спуск','ступени'],kind:'search',description:'По ступеням стекает вода. В углах задержались бумага, пустые упаковки и мелкие вещи.',shelter:true,loot:['ammo9x18','water','bandage','flash']},
  {id:'village-basement',locationId:'rookie-village',name:'Подвал старого дома',aliases:['подвал','погреб деревни','подвал старого дома','в подвале'],kind:'search',description:'Низкий подвал старого домика. На стенах выступила сырость, у дальней стены остались деревянные ящики.',shelter:true,loot:['canned','water','bandage','flash','ammo9x18']}
];

export const NPCS = [
  { id:'sidorovich', name:'Сидорович', role:'Торговец', group:'Одиночки', faction:'loner', location:'sidorovich-bunker', icon:'', trader:true, stockIds:['bread','water','canned','sausage','bandage','ai2','antirad','ammo9x18','ammo9x19','ammo545','shells','knife','pm','binoculars','boltpack','otklik','aksu','leather','aurora'], priceMultiplier:1.08, buyMultiplier:.48, greeting:'Ну, заходи, сталкер. Есть дело или просто погреться пришёл?', topics:['работа','задания','квесты','поручения','торговля','слухи'], lines:{ work:'Есть пара мелких поручений. Для начала осмотрись на Кордоне, не лезь куда не просят.', trade:'Открывай торговую вкладку КПК. Покупай мой товар или продавай найденное — только не жди, что я дам за хлам большие деньги.', rumors:'Говорят, у старой насыпи снова что-то притягивает железо. Я бы туда без болтов не совался.' } },
  { id:'wolf', name:'Волк', role:'Вожатый', group:'Одиночки', faction:'loner', location:'rookie-village', icon:'', greeting:'Здравствуй, сталкер. Не желаешь помочь таким как ты?', topics:['совет','работа','деревня'], lines:{ advice:'Не отходи далеко от деревни, пока не поймёшь, где здесь безопасно. И всегда держи путь назад.', work:'Тут собаки обжились возле вагончика, что севернее от деревни. Новички идут — они на них гавкнут, и те бегут куда глаза глядят. А бывает, что собаки и нападают. Убей пятерых, а там уже сочтёмся.', village:'Здесь собираются одиночки. Если не нарываться на неприятности, можно спокойно начать.' } },
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

// Каталог музыкальных композиций. Все песни выпущены до апреля 2012 года.
const song = (id,title,artist,videoId,startSeconds=0,year=null,label='YouTube') => ({ id,title,artist,videoId,startSeconds,year,label,era:year ? String(year) : '' });
const trackCatalog = [
  song('track-001','Группа крови','Кино','EtTkBaBnpR0',0,1988,'Релиз 1988'),
  song('track-002','Хочу перемен','Кино','EtTkBaBnpR0',632,1986,'Релиз 1986'),
  song('track-003','Звезда по имени Солнце','Кино','EtTkBaBnpR0',924,1989,'Релиз 1989'),
  song('track-004','Видели ночь','Кино','EtTkBaBnpR0',1145,1986,'Релиз 1986'),
  song('track-005','Троллейбус','Кино','EtTkBaBnpR0',1331,1984,'Релиз 1984'),
  song('track-006','Пачка сигарет','Кино','EtTkBaBnpR0',1503,1989,'Релиз 1989'),
  song('track-007','Нам с тобой','Кино','EtTkBaBnpR0',2640,1990,'Релиз 1990'),
  song('track-008','Закрой за мной дверь','Кино','EtTkBaBnpR0',2925,1988,'Релиз 1988'),
  song('track-009','Последний герой','Кино','EtTkBaBnpR0',5322,1989,'Релиз 1989'),
  song('track-010','Спокойная ночь','Кино','EtTkBaBnpR0',7678,1988,'Релиз 1988'),
  song('track-011','Песня идущего домой (Я шёл домой)','Вячеслав Бутусов','gAKASfiPds8',0,2004,'Альбом «Биографика»'),
  song('track-012','Электричка','Кино','0n5AesusgDU',0,1982,'Альбом «45»'),
  song('track-013','Алюминиевые огурцы','Кино','TMZM-NxeXxM',0,1982,'Альбом «45»'),
  song('track-014','Когда твоя девушка больна','Кино','X1TyisQ1bNk',0,1990,'«Чёрный альбом»'),
  song('track-015','Мама, мы все тяжело больны','Кино','5ilpyUFll6A',0,1988,'Альбом «Группа крови»'),
  song('track-016','Бери шинель','Гражданская Оборона','BbW1RIR6R3k',181,1989,'Альбом «Русское поле экспериментов»'),
  song('track-017','Новогодняя песенка','Гражданская Оборона','BbW1RIR6R3k',312,1989,'Альбом «Русское поле экспериментов»'),
  song('track-018','Непонятная песенка','Гражданская Оборона','BbW1RIR6R3k',392,1989,'Альбом «Русское поле экспериментов»'),
  song('track-019','Лоботомия','Гражданская Оборона','BbW1RIR6R3k',569,1989,'Альбом «Русское поле экспериментов»'),
  song('track-020','Зомби','Гражданская Оборона','BbW1RIR6R3k',746,1989,'Альбом «Русское поле экспериментов»'),
  song('track-021','Что такое осень','ДДТ','MP0IEfWcQFQ',3,1992,'Релиз 1992'),
  song('track-022','Капитан Колесников','ДДТ','MP0IEfWcQFQ',302,2005,'Релиз 2005'),
  song('track-023','Песня о свободе','ДДТ','MP0IEfWcQFQ',548,1994,'Релиз 1994'),
  song('track-024','Просвистела','ДДТ','MP0IEfWcQFQ',805,1997,'Релиз 1997'),
  song('track-025','Родина','ДДТ','MP0IEfWcQFQ',1027,1995,'Релиз 1995'),
  song('track-026','Дождь','ДДТ','MP0IEfWcQFQ',1304,1992,'Релиз 1992'),
  song('track-027','Вороны','ДДТ','MP0IEfWcQFQ',1900,2000,'Релиз 2000'),
  song('track-028','Я получил эту роль','ДДТ','MP0IEfWcQFQ',3997,1988,'Релиз 1988'),
  song('track-029','Это всё','ДДТ','MP0IEfWcQFQ',4337,1994,'Релиз 1994'),
  song('track-030','Не стреляй','ДДТ','MP0IEfWcQFQ',5878,1980,'Релиз 1980'),
  song('track-031','Как на войне','Агата Кристи','3eHO4UcohHI',0,1993,'Релиз 1993'),
  song('track-032','Сказочная тайга','Агата Кристи','3eHO4UcohHI',243,1994,'Релиз 1994'),
  song('track-033','Опиум для никого','Агата Кристи','3eHO4UcohHI',415,1994,'Релиз 1994'),
  song('track-034','Ковёр-вертолёт','Агата Кристи','3eHO4UcohHI',652,1994,'Релиз 1994'),
  song('track-035','Чёрная луна','Агата Кристи','3eHO4UcohHI',851,1996,'Релиз 1996'),
  song('track-036','Моряк','Агата Кристи','3eHO4UcohHI',1088,1994,'Релиз 1994'),
  song('track-037','Два корабля','Агата Кристи','3eHO4UcohHI',1303,1994,'Релиз 1994'),
  song('track-038','Viva Kalman','Агата Кристи','3eHO4UcohHI',2206,1994,'Релиз 1994'),
  song('track-039','Лесник','Король и Шут','A1qRZ3mEQVM',3,1997,'Релиз 1997'),
  song('track-040','Проклятый старый дом','Король и Шут','A1qRZ3mEQVM',194,2001,'Релиз 2001'),
  song('track-041','Дурак и молния','Король и Шут','A1qRZ3mEQVM',451,1996,'Релиз 1996'),
  song('track-042','Ели мясо мужики','Король и Шут','A1qRZ3mEQVM',566,1999,'Релиз 1999'),
  song('track-043','Воспоминания о былой любви','Король и Шут','A1qRZ3mEQVM',1021,2001,'Релиз 2001'),
  song('track-044','Прыгну со скалы','Король и Шут','A1qRZ3mEQVM',1315,1999,'Релиз 1999'),
  song('track-045','Смельчак и ветер','Король и Шут','A1qRZ3mEQVM',3746,2001,'Релиз 2001'),
  song('track-046','Мёртвый анархист','Король и Шут','A1qRZ3mEQVM',6302,2002,'Релиз 2002'),
  song('track-047','У шамана три руки','Пикник','lDtELO_VzCQ',0,1994,'Релиз 1994'),
  song('track-048','Из мышеловки','Пикник','lDtELO_VzCQ',206,1991,'Релиз 1991'),
  song('track-049','Египтянин','Пикник','lDtELO_VzCQ',760,2001,'Релиз 2001'),
  song('track-050','Игла','Пикник','lDtELO_VzCQ',1048,1994,'Релиз 1994'),
  song('track-051','Сияние','Пикник','lDtELO_VzCQ',1349,2001,'Релиз 2001'),
  song('track-052','Там, на самом краю земли','Пикник','lDtELO_VzCQ',1923,1990,'Релиз 1990'),
  song('track-053','Фиолетово-чёрный','Пикник','lDtELO_VzCQ',2055,1994,'Релиз 1994'),
  song('track-054','Остров','Пикник','lDtELO_VzCQ',2792,1996,'Релиз 1996'),
  song('track-055','Полковнику никто не пишет','Би-2','hl2O9EijZnc',0,2000,'Релиз 2000'),
  song('track-056','Варвара','Би-2','hl2O9EijZnc',291,2000,'Релиз 2000'),
  song('track-057','Серебро','Би-2','hl2O9EijZnc',591,2000,'Релиз 2000'),
  song('track-058','Компромисс','Би-2','hl2O9EijZnc',868,2000,'Релиз 2000'),
  song('track-059','Революция','Би-2','hl2O9EijZnc',1136,2006,'Релиз 2006'),
  song('track-060','Вечная призрачная встречная','Би-2','hl2O9EijZnc',1353,2006,'Релиз 2006'),
  song('track-061','Молитва','Би-2','hl2O9EijZnc',1665,2003,'Релиз 2003'),
  song('track-062','Мой рок-н-ролл','Би-2','hl2O9EijZnc',2003,2002,'Релиз 2002'),
  song('track-063','Какое небо','Гражданская Оборона','MEaCWDqxoCY',53,1988,'Релиз 1988'),
  song('track-064','Система','Гражданская Оборона','MEaCWDqxoCY',104,1987,'Релиз 1987'),
  song('track-065','Иуда будет со мной','Гражданская Оборона','MEaCWDqxoCY',251,1987,'Релиз 1987'),
  song('track-066','Харакири','Гражданская Оборона','MEaCWDqxoCY',366,1987,'Релиз 1987'),
  song('track-067','Продолжая продолжать','Гражданская Оборона','MEaCWDqxoCY',588,1987,'Релиз 1987'),
  song('track-068','Общество «Память»','Гражданская Оборона','MEaCWDqxoCY',780,1988,'Релиз 1988'),
  song('track-069','Всё идёт по плану','Гражданская Оборона','MEaCWDqxoCY',2092,1988,'Релиз 1988'),
  song('track-070','Туман','Сектор Газа','31PkjC-Fjz0',214,1996,'Релиз 1996'),
  song('track-071','Демобилизация','Сектор Газа','31PkjC-Fjz0',694,1991,'Релиз 1991'),
  song('track-072','Пора домой','Сектор Газа','31PkjC-Fjz0',1955,1996,'Релиз 1996'),
  song('track-073','Лирика','Сектор Газа','kkcQ3Utrxmo',0,1993,'Релиз 1993'),
  song('track-074','Колхозный панк','Сектор Газа','boQPg3Wkwuc',129,1991,'Релиз 1991'),
  song('track-075','Там, де нас нема','Океан Ельзи','Ax3v_cSSvMw',1588,1998,'Релиз 1998'),
  song('track-076','Квітка','Океан Ельзи','Ax3v_cSSvMw',3670,2001,'Релиз 2001'),
  song('track-077','Відпусти','Океан Ельзи','Ax3v_cSSvMw',4571,2000,'Релиз 2000'),
  song('track-078','Без бою','Океан Ельзи','Ax3v_cSSvMw',5516,2005,'Релиз 2005'),
  song('track-079','Вище неба','Океан Ельзи','Ax3v_cSSvMw',5040,2005,'Релиз 2005'),
  song('track-080','Владивосток 2000','Мумий Тролль','nj5nuYYrZvg',0,1998,'Релиз 1998'),
  song('track-081','Утекай','Мумий Тролль','Ok1-XYV3k60',0,1997,'Релиз 1997'),
  song('track-082','Орбит без сахара','Сплин','t-OvHZbID5s',0,1998,'Релиз 1998'),
  song('track-083','Государство','Lumen','J9fAvi1T-e4',0,2008,'Релиз 2008'),
  song('track-084','Не надо снов','Lumen','uFyc3orK6cs',0,2011,'Релиз 2011'),
  song('track-085','Владимирский централ','Владимир Круг','GqFQbNn0ZBo',0,1999,'Релиз 1999'),
  song('track-086','Штиль','Ария','GvBHagY7eok',0,2001,'Релиз 2001'),
  song('track-087','Звонімір Бобан','Жадан і Собаки','OOQi9BLbQUw',0,2008,'Релиз 2008'),
  song('track-088','Трава у дома','Приключения Электроников','Ue9lV5wfP00',0,2003,'Релиз 2003'),
  song('track-089','Моя северная страна','Инструкция по выживанию','qfuxLKt7IQ0',384,1990,'Релиз 1990'),
  song('track-090','Непрерывный суицид','Инструкция по выживанию','qfuxLKt7IQ0',0,1990,'Релиз 1990'),
  song('track-091','Я остаюсь','Чёрный Обелиск','PnOHYU4TtE0',0,1994,'Релиз 1994'),
  song('track-092','По раскрашенной душе','Кукрыниксы','BiY0pvtcs8k',0,2002,'Релиз 2002'),
  song('track-093','Paint It, Black','The Rolling Stones','O4irXQhgMqg',0,1966,'Релиз 1966'),
  song('track-094','Gimme Shelter','The Rolling Stones','EJRdDhnTRoo',0,1969,'Релиз 1969'),
  song('track-095','Sympathy for the Devil','The Rolling Stones','GgnClrx8N2k',0,1968,'Релиз 1968'),
  song('track-096','Eye of the Tiger','Survivor','btPJPFnesV4',0,1982,'Релиз 1982'),
  song('track-097','Legs','ZZ Top','eUDcTLaWJuo',0,1983,'Релиз 1983'),
  song('track-098','Round and Round','Ratt','0u8teXR8VE4',0,1984,'Релиз 1984'),
  song('track-099','Livin’ on a Prayer','Bon Jovi','lDK9QqIzhwk',0,1986,'Релиз 1986'),
  song('track-100','Alone Again','Dokken','evqe3VJ9qDQ',0,1984,'Релиз 1984'),
];
const trackById = new Map(trackCatalog.map(track=>[track.id,track]));
const tracks = ids => ids.map(id=>trackById.get(id)).filter(Boolean);
const lonerStationTracks = tracks([
  'track-001', 'track-003', 'track-006', 'track-007', 'track-008', 'track-011', 'track-017', 'track-018',
  'track-021', 'track-025', 'track-026', 'track-028', 'track-029', 'track-032', 'track-036', 'track-037',
  'track-047', 'track-048', 'track-049', 'track-051', 'track-052', 'track-056', 'track-057', 'track-058',
  'track-075', 'track-076', 'track-077', 'track-078', 'track-079', 'track-082', 'track-083', 'track-084',
  'track-093', 'track-097', 'track-100',
]);
const banditStationTracks = tracks([
  'track-002', 'track-004', 'track-005', 'track-013', 'track-031', 'track-033', 'track-034', 'track-035',
  'track-038', 'track-039', 'track-040', 'track-041', 'track-042', 'track-046', 'track-063', 'track-064',
  'track-065', 'track-066', 'track-067', 'track-070', 'track-071', 'track-072', 'track-073', 'track-074',
  'track-080', 'track-081', 'track-085', 'track-087', 'track-089', 'track-090', 'track-092', 'track-095',
  'track-098',
]);
const militaryStationTracks = tracks([
  'track-009', 'track-010', 'track-011', 'track-012', 'track-014', 'track-015', 'track-016', 'track-019',
  'track-020', 'track-022', 'track-023', 'track-024', 'track-027', 'track-030', 'track-043', 'track-044',
  'track-045', 'track-050', 'track-053', 'track-054', 'track-055', 'track-059', 'track-060', 'track-061',
  'track-062', 'track-068', 'track-069', 'track-086', 'track-088', 'track-091', 'track-094', 'track-096',
  'track-099',
]);
export const RADIO_TRACKS = trackCatalog;
const preciseSegmentEnds = { 'track-020':850 };
for (const track of RADIO_TRACKS) {
  const next = RADIO_TRACKS.filter(other=>other.videoId===track.videoId && other.startSeconds>track.startSeconds).sort((a,b)=>a.startSeconds-b.startSeconds)[0];
  if (next) track.endSeconds=next.startSeconds;
  if (preciseSegmentEnds[track.id]) track.endSeconds=preciseSegmentEnds[track.id];
}
export const PLAYER_TRACKS = RADIO_TRACKS;
export const RADIO_STATIONS = [
  { id:'loner-village-radio', name:'Радио Деревни новичков', faction:'Одиночки', locationId:'rookie-village', frequency:'100.7 FM', trackIds:lonerStationTracks.map(track=>track.id) },
  { id:'bandit-atp-radio', name:'Радио АТП', faction:'Бандиты', locationId:'atp', frequency:'101.3 FM', trackIds:banditStationTracks.map(track=>track.id) },
  { id:'military-checkpoint-radio', name:'Радио Южного блокпоста', faction:'Военные', locationId:'south-checkpoint', frequency:'103.1 FM', trackIds:militaryStationTracks.map(track=>track.id) }
];
export const BLIND_DOG_IMAGES = [];


export const QUESTS = [
  { id:'first-steps', title:'Первые шаги', giver:'wolf', text:'Осмотрись в деревне новичков и загляни к Волку за советом.', reward:150, condition:'talk:wolf', status:'available' },
  { id:'wolf-dog-pack', title:'Собаки у вагончика', giver:'wolf', text:'Уничтожь пять слепых собак, которые обосновались у вагончика севернее деревни новичков, затем вернись к Волку.', reward:450, condition:'wolf-dog-pack', status:'available' },
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
