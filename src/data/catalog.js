export const ASSETS = {
  menu: 'https://images.steamusercontent.com/ugc/1741177851166993275/EE9297093345B30952B41B3E8E0EA266CF657758/?imw=637&imh=358&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=true',
  pda: 'https://static.wikia.nocookie.net/stalker/images/1/12/Ui_pda_back_big.png/revision/latest?cb=20171210181108&path-prefix=ru',
  map: 'https://static.wikia.nocookie.net/stalker/images/a/a5/Escape_2.jpg/revision/latest?cb=20120227174726&path-prefix=ru',
  factions: {
    loner: 'https://static.wikia.nocookie.net/stalker/images/1/17/%D0%9B%D0%BE%D0%B3%D0%BE_%D1%81%D1%82%D0%B0%D0%BB%D0%BA%D0%B5%D1%80%D0%BE%D0%B2.png/revision/latest/scale-to-width-down/20?cb=20160804135224&path-prefix=ru',
    bandit: 'https://static.wikia.nocookie.net/stalker/images/0/06/%D0%9B%D0%BE%D0%B3%D0%BE_%D0%B1%D0%B0%D0%BD%D0%B4%D0%B8%D1%82%D0%BE%D0%B2.png/revision/latest/scale-to-width-down/20?cb=20160804132919&path-prefix=ru',
    military: 'https://static.wikia.nocookie.net/stalker/images/d/d8/%D0%9B%D0%BE%D0%B3%D0%BE_%D0%B2%D0%BE%D0%B5%D0%BD%D0%BD%D1%8B%D1%85.png/revision/latest/scale-to-width-down/20?cb=20160804135736&path-prefix=ru'
  }
};

export const FACTIONS = [
  { id: 'loner', name: 'Одиночки', short: 'Сталкеры', rank: 'Новичок', spawn: 'rookie-village', icon: ASSETS.factions.loner, description: 'Вольные сталкеры, которые пытаются выжить в Зоне и держаться подальше от больших разборок.' },
  { id: 'bandit', name: 'Бандиты', short: 'Шпана', rank: 'Шпана', spawn: 'atp', icon: ASSETS.factions.bandit, description: 'Люди, привыкшие брать своё силой, угрозами или сделками на сомнительных условиях.' },
  { id: 'military', name: 'Военные', short: 'Рядовой', rank: 'Рядовой', spawn: 'south-checkpoint', icon: ASSETS.factions.military, description: 'Военнослужащие, несущие службу на периметре и блокпостах Кордона.' }
];

export const AVATARS = {
  loner: [
    'https://static.wikia.nocookie.net/stalker/images/0/00/Icon_SoC_character_green_stalker_10.png/revision/latest?cb=20210221111323&path-prefix=ru',
    'https://static.wikia.nocookie.net/stalker/images/1/1e/Icon_SoC_character_green_stalker_2.png/revision/latest?cb=20210221111322&path-prefix=ru',
    'https://static.wikia.nocookie.net/stalker/images/9/96/Icon_SoC_character_stalker_neytral_hood_9.png/revision/latest?cb=20210221111323&path-prefix=ru',
    'https://static.wikia.nocookie.net/stalker/images/5/50/Icon_SoC_character_stalker_neytral_hood_uzor.png/revision/latest?cb=20210221111322&path-prefix=ru',
    'https://static.wikia.nocookie.net/stalker/images/4/49/Icon_SoC_character_green_stalker_8.png/revision/latest?cb=20210221111322&path-prefix=ru',
    'https://static.wikia.nocookie.net/stalker/images/6/60/Icon_SoC_character_stalker_neytral_balon_4.png/revision/latest?cb=20210221111322&path-prefix=ru'
  ],
  bandit: [
    'https://static.wikia.nocookie.net/stalker/images/d/d5/Icon_SoC_character_stalker_bandit_master.png/revision/latest?cb=20210626095103&path-prefix=ru',
    'https://static.wikia.nocookie.net/stalker/images/c/c4/Icon_SoC_character_stalker_bandit_8.png/revision/latest?cb=20210626095101&path-prefix=ru',
    'https://static.wikia.nocookie.net/stalker/images/0/05/Icon_SoC_character_stalker_bandit_5.png/revision/latest?cb=20210626095101&path-prefix=ru',
    'https://static.wikia.nocookie.net/stalker/images/d/dc/Icon_SoC_character_stalker_bandit_3.png/revision/latest?cb=20210626095101&path-prefix=ru'
  ],
  military: [
    'https://static.wikia.nocookie.net/stalker/images/0/0a/Icon_SoC_character_soldier_mask.png/revision/latest?cb=20210626063312&path-prefix=ru',
    'https://static.wikia.nocookie.net/stalker/images/4/48/Icon_SoC_character_soldier_bandana_4.png/revision/latest?cb=20250923093014&path-prefix=ru',
    'https://static.wikia.nocookie.net/stalker/images/e/e0/Icon_SoC_character_soldier_bandana_3.png/revision/latest?cb=20250923092915&path-prefix=ru',
    'https://static.wikia.nocookie.net/stalker/images/8/80/Icon_SoC_character_soldier_bandana_6.png/revision/latest?cb=20210626063309&path-prefix=ru'
  ]
};

const icon = (name) => `https://static.wikia.nocookie.net/stalker/images/${name}`;
export const ITEMS = [
  { id:'bread', name:'Хлеб', price:35, weight:.45, w:1,h:1, cat:'Еда', desc:'Простой хлеб. Не роскошь, но в дороге пригодится.', image:'https://static.wikia.nocookie.net/stalker/images/2/29/Render_dev_bred.png/revision/latest?cb=20220312112050&path-prefix=ru', use:'food', restore:14 },
  { id:'water', name:'Минеральная вода', price:40, weight:.55, w:1,h:2, cat:'Еда', desc:'Бутылка питьевой воды.', image:'https://static.wikia.nocookie.net/stalker_ru_gamepedia/images/e/e4/Mineralka.png/revision/latest?cb=20170724201237', use:'water', restore:25 },
  { id:'sausage', name:'Колбаса диетическая', price:65, weight:.35, w:2,h:1, cat:'Еда', desc:'Небольшая палка колбасы.', image:'https://static.wikia.nocookie.net/stalker/images/b/b7/Render_dev_kolbasa.png/revision/latest?cb=20220312112145&path-prefix=ru', use:'food', restore:22 },
  { id:'vodka', name:'Водка «Казаки»', price:70, weight:.5, w:1,h:2, cat:'Еда', desc:'Крепкий напиток. Снижает стресс, но ухудшает самочувствие.', image:'https://static.wikia.nocookie.net/stalker/images/9/95/Vodka_render.png/revision/latest?cb=20220121115720&path-prefix=ru', use:'vodka', restore:15 },
  { id:'shells', name:'Пачка патронов 12 калибра', price:80, weight:.6, w:2,h:1, cat:'Боеприпасы', desc:'Пачка дробовых патронов.', image:'https://static.wikia.nocookie.net/stalker/images/2/2a/Icon_SoC_ammo_12x70_buck.png/revision/latest/thumbnail-down/width/40/height/20?cb=20221005142500&path-prefix=ru' },
  { id:'energy', name:'Энергетик', price:80, weight:.45, w:1,h:2, cat:'Еда', desc:'Помогает взбодриться и немного восстановить силы.', image:'https://static.wikia.nocookie.net/stalker/images/8/8b/Stalker-drink.png/revision/latest?cb=20210623020432&path-prefix=ru', use:'energy', restore:18 },
  { id:'canned', name:'Тушёнка', price:90, weight:.45, w:1,h:1, cat:'Еда', desc:'Банка тушёнки.', image:'https://static.wikia.nocookie.net/stalker/images/d/d0/Render_dev_conserv.png/revision/latest?cb=20220312112232&path-prefix=ru', use:'food', restore:30 },
  { id:'knife', name:'Нож', price:100, weight:.35, w:1,h:2, cat:'Оружие', desc:'Надёжный нож для бытовых задач и самообороны.', image:'https://static.wikia.nocookie.net/stalker/images/7/7f/Render_weapon_knife_main_soc.png/revision/latest?cb=20221025164505&path-prefix=ru', damage:12, weapon:'melee' },
  { id:'ammo9x18', name:'Пачка патронов 9×18', price:110, weight:.35, w:2,h:1, cat:'Боеприпасы', desc:'Пачка патронов 9×18 мм.', image:'https://static.wikia.nocookie.net/stalker/images/c/c2/Render_ammo_9x18_fmj.png/revision/latest?cb=20211210132845&path-prefix=ru' },
  { id:'ammo9x19', name:'Пачка патронов 9×19', price:130, weight:.4, w:2,h:1, cat:'Боеприпасы', desc:'Пачка патронов 9×19 мм.', image:'https://static.wikia.nocookie.net/stalker/images/5/55/Render_ammo_9x19_fmj.png/revision/latest?cb=20211210132849&path-prefix=ru' },
  { id:'bandage', name:'Бинт', price:140, weight:.12, w:1,h:1, cat:'Медицина', desc:'Останавливает небольшое кровотечение и восстанавливает здоровье.', image:'https://static.wikia.nocookie.net/stalker/images/9/94/Icon_SoC_item_bandage.png/revision/latest/thumbnail-down/width/20/height/20?cb=20180320192715&path-prefix=ru', use:'heal', restore:18 },
  { id:'boltpack', name:'Болты (10 шт.)', price:160, weight:.5, w:2,h:1, cat:'Снаряжение', desc:'Пачка из десяти болтов. Используются для проверки и отключения некоторых аномалий.', image:'https://static.wikia.nocookie.net/stalker/images/9/92/Render_weapon_bolt_main.png/revision/latest?cb=20221025161521&path-prefix=ru', restore:10 },
  { id:'rgd5', name:'РГД-5', price:220, weight:.4, w:1,h:2, cat:'Оружие', desc:'Осколочная граната. В прототипе используется как редкий боевой расходник.', image:'https://static.wikia.nocookie.net/stalker/images/3/3d/Render_grenade_rgd5_main.png/revision/latest?cb=20221025160627&path-prefix=ru', damage:35, weapon:'grenade' },
  { id:'antirad', name:'Антирад', price:240, weight:.15, w:1,h:1, cat:'Медицина', desc:'Снижает накопленную радиацию.', image:'https://static.wikia.nocookie.net/stalker/images/c/c5/Render_aptechka_low.png/revision/latest?cb=20220312111741&path-prefix=ru', use:'antirad', restore:35 },
  { id:'ai2', name:'АИ-2', price:260, weight:.25, w:1,h:1, cat:'Медицина', desc:'Аптечка первой помощи.', image:'https://static.wikia.nocookie.net/stalker/images/c/c5/Render_aptechka_low.png/revision/latest?cb=20220312111741&path-prefix=ru', use:'heal', restore:38 },
  { id:'binoculars', name:'Бинокль', price:320, weight:.6, w:2,h:2, cat:'Снаряжение', desc:'Позволяет осмотреть соседнюю локацию, не заходя на неё.', image:null, emoji:'🔭' },
  { id:'flash', name:'Флешка', price:350, weight:.05, w:1,h:1, cat:'Снаряжение', desc:'Может содержать данные о задании или координаты тайника.', image:'https://static.wikia.nocookie.net/stalker/images/5/5d/Mini-pda.png/revision/latest?cb=20210622183057&path-prefix=ru' },
  { id:'tail', name:'Хвост слепого пса', price:400, weight:.4, w:2,h:1, cat:'Добыча', desc:'Мутантный трофей, который можно продать торговцу.', image:null, emoji:'🐕' },
  { id:'medusa', name:'Артефакт «Медуза»', price:650, weight:.3, w:2,h:2, cat:'Артефакты', desc:'Небольшой артефакт. Может быть продан или изучен.', image:'https://static.wikia.nocookie.net/stalker/images/2/2e/Icon_SoC_artefact_medusa.png/revision/latest/thumbnail-down/width/20/height/20?cb=20230723224834&path-prefix=ru' },
  { id:'milmed', name:'Военная аптечка', price:700, weight:.45, w:2,h:1, cat:'Медицина', desc:'Улучшенная аптечка.', image:'https://static.wikia.nocookie.net/stalker/images/3/34/Army_medkit_render.png/revision/latest?cb=20211202083942&path-prefix=ru', use:'heal', restore:60 },
  { id:'aurora', name:'Противогаз «Аврора»', price:800, weight:1.2, w:2,h:2, cat:'Защита', desc:'Базовая защита органов дыхания.', image:'https://static.wikia.nocookie.net/stalker/images/b/bf/Icon_HoC_item_T_IFI_FOL_FAC_20_00_MAS_01.png/revision/latest?cb=20241124222238&path-prefix=ru' },
  { id:'leather', name:'Кожанка', price:900, weight:2.8, w:2,h:2, cat:'Броня', desc:'Лёгкая куртка с минимальной защитой.', image:'https://static.wikia.nocookie.net/stalker/images/7/74/Icon_HoC_item_Jemmy_Neutral_Armor.png/revision/latest?cb=20241124222222&path-prefix=ru', armor:8 },
  { id:'sawedoff', name:'Обрез', price:950, weight:2.2, w:2,h:2, cat:'Оружие', desc:'Двуствольное ружьё укороченного типа.', image:'https://static.wikia.nocookie.net/stalker/images/4/45/Render_weapon_bm16_main_cs.png/revision/latest?cb=20221025161449&path-prefix=ru', damage:28, weapon:'shotgun', ammo:'shells' },
  { id:'biker', name:'Косуха', price:1100, weight:2.4, w:2,h:2, cat:'Броня', desc:'Кожаная куртка, узнаваемая среди бандитов.', image:'https://static.wikia.nocookie.net/stalker/images/0/02/Icon_HoC_item_T_IFI_FOL_BAN_01.png/revision/latest?cb=20241124222233&path-prefix=ru', armor:10 },
  { id:'pm', name:'ПМм', price:1250, weight:.9, w:2,h:2, cat:'Оружие', desc:'Пистолет под патрон 9×18 мм.', image:'https://static.wikia.nocookie.net/stalker/images/8/8d/Render_weapon_pm_main_soc.png/revision/latest?cb=20221025171424&path-prefix=ru', damage:21, weapon:'pistol', ammo:'ammo9x18' },
  { id:'otklik', name:'Детектор «Отклик»', price:1450, weight:.7, w:2,h:2, cat:'Снаряжение', desc:'Простейший детектор аномальных сигналов. Нужен для поиска артефактов.', image:'https://static.wikia.nocookie.net/stalker/images/e/e6/Det-otklik.png/revision/latest?cb=20210622143859&path-prefix=ru' },
  { id:'vm17', name:'ВМ-17', price:1800, weight:3.4, w:3,h:2, cat:'Оружие', desc:'Двуствольное охотничье ружьё.', image:'https://static.wikia.nocookie.net/stalker/images/d/d3/Render_weapon_bm16_main_old.png/revision/latest?cb=20221025161505&path-prefix=ru', damage:34, weapon:'shotgun', ammo:'shells' },
  { id:'psz5', name:'Бронежилет ПСЗ-5', price:2600, weight:5.8, w:3,h:2, cat:'Броня', desc:'Армейский бронежилет.', image:'https://static.wikia.nocookie.net/stalker/images/c/c4/Icon_HoC_item_T_IFI_FOL_MIL_03.png/revision/latest?cb=20241124222246&path-prefix=ru', armor:24 },
  { id:'gaduka', name:'Гадюка-5', price:3400, weight:3.1, w:3,h:2, cat:'Оружие', desc:'Пистолет-пулемёт под патрон 9×19 мм.', image:'https://static.wikia.nocookie.net/stalker/images/4/4b/Render_weapon_mp5_main_soc.png/revision/latest?cb=20221025170919&path-prefix=ru', damage:26, weapon:'smg', ammo:'ammo9x19' },
  { id:'optik', name:'Противогаз «Оптик»', price:3900, weight:1.4, w:2,h:2, cat:'Защита', desc:'Продвинутая маска с улучшенным обзором.', image:'https://static.wikia.nocookie.net/stalker/images/6/60/Icon_HoC_item_T_IFI_FOL_HEA_STA_03_d_FAC_30_04.png/revision/latest?cb=20241124222244&path-prefix=ru' },
  { id:'zarya', name:'Заря', price:5200, weight:6.5, w:3,h:3, cat:'Броня', desc:'Защитный костюм для опасных вылазок.', image:'https://static.wikia.nocookie.net/stalker/images/0/0b/Icon_HoC_item_Zorya_Neutral_Armor.png/revision/latest?cb=20241124222221&path-prefix=ru', armor:30 }
];

export const LOCATIONS = [
  { id:'north-checkpoint', name:'Северный блокпост', image:'https://static.wikia.nocookie.net/stalker/images/5/54/XR_3DA_2012-03-18_19-06-53-86.png/revision/latest?cb=20120318151521&path-prefix=ru', x:51,y:8, desc:'Старый контрольный пункт на дороге. За бетонными блоками видны следы недавнего патруля.', neighbors:['rookie-village','rail-tunnel'], loot:['bread','ammo9x18','bandage','flash'], hazards:['radiation'] },
  { id:'farmstead', name:'Разрушенный хутор', image:'https://static.wikia.nocookie.net/stalker/images/8/8e/XR_3DA_2012-03-18_19-05-24-52.png/revision/latest?cb=20120318151356&path-prefix=ru', x:39,y:39, desc:'Разбитые хозяйственные постройки и заросший двор. Ветер гоняет по земле куски жести.', neighbors:['rookie-village','forest-camp','elevator'], loot:['canned','water','tail','bandage'], hazards:[] },
  { id:'rail-tunnel', name:'Восточный туннель ЖД', image:'https://static.wikia.nocookie.net/stalker/images/0/0e/XR_3DA_2012-03-18_19-04-39-89.png/revision/latest?cb=20120318151355&path-prefix=ru', x:70,y:18, desc:'Железнодорожный тоннель уходит в темноту. Внутри слышны капли и далёкий металлический звон.', neighbors:['north-checkpoint','locomotive','underpass'], loot:['ammo9x18','flash','medusa'], hazards:['gravity'] },
  { id:'locomotive', name:'Локомотив', image:'https://static.wikia.nocookie.net/stalker/images/2/2d/XR_3DA_2012-03-18_19-05-02-70.png/revision/latest?cb=20120318151356&path-prefix=ru', x:81,y:32, desc:'Ржавый локомотив застыл у насыпи. Между колёсами можно заметить старые следы.', neighbors:['rail-tunnel','underpass'], loot:['boltpack','ammo9x19','canned'], hazards:[] },
  { id:'forest-camp', name:'Лагерь в лесу', image:'https://static.wikia.nocookie.net/stalker/images/2/2e/XR_3DA_2012-03-18_19-04-50-51.png/revision/latest?cb=20120318151356&path-prefix=ru', x:27,y:57, desc:'Небольшая стоянка среди деревьев. Здесь иногда останавливаются одиночки и проводники.', neighbors:['farmstead','ravine-tunnel','anomaly-dump'], loot:['bread','water','medusa','tail'], hazards:['radiation'] },
  { id:'under-embankment', name:'Туннель под ЖД насыпью', image:'https://static.wikia.nocookie.net/stalker/images/8/87/XR_3DA_2012-03-18_19-03-50-86.png/revision/latest?cb=20120318151355&path-prefix=ru', x:66,y:48, desc:'Низкий проход под железнодорожной насыпью. Местами осыпался потолок.', neighbors:['rail-tunnel','underpass','elevator'], loot:['ammo9x18','ai2','flash'], hazards:['gravity'] },
  { id:'bridge-checkpoint', name:'Блокпост под мостом', image:'https://static.wikia.nocookie.net/stalker/images/1/11/XR_3DA_2012-03-18_19-04-08-38.png/revision/latest?cb=20120318151355&path-prefix=ru', x:58,y:62, desc:'Под мостом устроили временный пост. С бетонных опор хорошо просматривается дорога.', neighbors:['elevator','atp','south-checkpoint'], loot:['ammo9x19','bandage','water'], hazards:[] },
  { id:'elevator', name:'Элеватор', image:'https://static.wikia.nocookie.net/stalker/images/1/1f/XR_3DA_2012-03-18_19-03-39-46.png/revision/latest?cb=20120318151218&path-prefix=ru', x:49,y:48, desc:'Промышленное здание с пустыми силосами. Внутри эхом отзывается каждый шаг.', neighbors:['farmstead','under-embankment','bridge-checkpoint','stop'], loot:['canned','flash','tail','ai2'], hazards:['radiation'] },
  { id:'stop', name:'Остановка', image:'https://static.wikia.nocookie.net/stalker/images/7/71/XR_3DA_2012-03-18_19-03-30-20.png/revision/latest?cb=20120318151218&path-prefix=ru', x:46,y:67, desc:'Покосившаяся остановка у дороги. На стене сохранились обрывки старых объявлений.', neighbors:['elevator','atp','rookie-village'], loot:['bread','water','energy'], hazards:[] },
  { id:'atp', name:'АТП', image:'https://static.wikia.nocookie.net/stalker/images/7/75/XR_3DA_2012-03-18_19-02-59-93.png/revision/latest?cb=20120318151217&path-prefix=ru', x:22,y:73, desc:'Территория автотранспортного предприятия занята бандитами. Между корпусами стоят брошенные машины.', neighbors:['stop','bridge-checkpoint','anomaly-dump','ravine-tunnel'], loot:['vodka','ammo9x18','leather','flash'], hazards:[] },
  { id:'ravine-tunnel', name:'Туннель в лощину', image:'https://static.wikia.nocookie.net/stalker/images/0/0e/XR_3DA_2012-03-18_19-04-39-89.png/revision/latest?cb=20120318151355&path-prefix=ru', x:12,y:49, desc:'Проход в низину зарос кустарником. Слышно, как где-то рядом скребутся мутанты.', neighbors:['forest-camp','atp','underpass'], loot:['medusa','tail','bandage'], hazards:['radiation'] },
  { id:'underpass', name:'Подземный переход', image:'https://static.wikia.nocookie.net/stalker/images/7/77/XR_3DA_2012-03-18_19-02-13-34.png/revision/latest?cb=20120318151216&path-prefix=ru', x:79,y:58, desc:'Затопленный переход под дорогой. Вода доходит до щиколоток, а в углах лежит мусор.', neighbors:['rail-tunnel','under-embankment','ravine-tunnel'], loot:['ammo9x18','ai2','water'], hazards:['radiation'] },
  { id:'trailer', name:'Вагончик', image:'https://static.wikia.nocookie.net/stalker/images/3/32/XR_3DA_2012-03-18_19-01-43-00.png/revision/latest?cb=20120318151044&path-prefix=ru', x:36,y:84, desc:'Старый рабочий вагончик у дороги. Дверь закрыта неплотно, внутри давно никто не жил.', neighbors:['rookie-village','south-checkpoint','atp'], loot:['bread','canned','bandage','flash'], hazards:[] },
  { id:'anomaly-dump', name:'Аномальная мусорка', image:'https://static.wikia.nocookie.net/stalker/images/e/e7/XR_3DA_2012-03-18_18-58-37-19.png/revision/latest?cb=20120318150856&path-prefix=ru', x:8,y:82, desc:'Свалка металлолома и разбитой техники. Между грудами мусора мерцает воздух.', neighbors:['forest-camp','atp','south-checkpoint'], loot:['medusa','otklik','boltpack','tail'], hazards:['gravity','radiation'] },
  { id:'rookie-village', name:'Деревня новичков', image:'https://static.wikia.nocookie.net/stalker/images/8/81/XR_3DA_2012-03-18_18-59-25-26.png/revision/latest?cb=20120318151042&path-prefix=ru', x:49,y:87, desc:'Небольшая деревня, где новички получают первые советы и пытаются освоиться в Зоне.', neighbors:['north-checkpoint','farmstead','stop','trailer','sidorovich-bunker'], loot:['bread','water','canned','bandage'], hazards:[] },
  { id:'sidorovich-bunker', name:'Подвал Сидоровича', image:'https://static.wikia.nocookie.net/stalker/images/c/c7/XR_3DA_2012-03-18_18-57-09-34.png/revision/latest?cb=20120318150855&path-prefix=ru', x:61,y:89, desc:'Подвал торговца заставлен ящиками и старой аппаратурой. Здесь всегда пахнет табаком и консервами.', neighbors:['rookie-village'], loot:['ammo9x18','ai2','flash'], hazards:[] },
  { id:'south-checkpoint', name:'Южный блокпост', image:'https://static.wikia.nocookie.net/stalker/images/4/45/XR_3DA_2012-03-18_19-00-28-40.png/revision/latest?cb=20120318151043&path-prefix=ru', x:82,y:86, desc:'Военный блокпост на южном подходе к Кордону. Дежурные внимательно следят за дорогой.', neighbors:['bridge-checkpoint','trailer','anomaly-dump'], loot:['ammo9x19','bandage','water','milmed'], hazards:[] }
];

export const NPCS = [
  { id:'sidorovich', name:'Сидорович', role:'Торговец', group:'Одиночки', faction:'loner', location:'sidorovich-bunker', icon:'https://static.wikia.nocookie.net/stalker/images/3/3a/Icon_SoC_character_trader.png/revision/latest?cb=20210313091759&path-prefix=ru', greeting:'Ну, заходи, сталкер. Есть дело или просто погреться пришёл?', topics:['работа','торговля','слухи'], lines:{ work:'Есть пара мелких поручений. Для начала осмотрись на Кордоне, не лезь куда не просят.', trade:'Товар у меня разный. В этом прототипе торговля пока представлена разговором, полный магазин добавим отдельно.', rumors:'Говорят, у старой насыпи снова что-то притягивает железо. Я бы туда без болтов не совался.' } },
  { id:'wolf', name:'Волк', role:'Вожатый', group:'Одиночки', faction:'loner', location:'rookie-village', icon:'https://static.wikia.nocookie.net/stalker/images/0/0e/Icon_SoC_character_stalker_neytral_balon_1.png/revision/latest?cb=20210221111322&path-prefix=ru', greeting:'Новенький? Тогда запоминай: в Зоне сначала смотри под ноги, потом по сторонам.', topics:['совет','работа','деревня'], lines:{ advice:'Не отходи далеко от деревни, пока не поймёшь, где здесь безопасно. И всегда держи путь назад.', work:'Сходи к остановке и проверь, не остались ли там припасы. Только не задерживайся.', village:'Здесь собираются одиночки. Если не нарываться на неприятности, можно спокойно начать.' } },
  { id:'kefir', name:'Кефир', role:'Пахан', group:'Бандиты', faction:'bandit', location:'atp', icon:'https://static.wikia.nocookie.net/stalker/images/5/52/Icon_SoC_character_stalker_bandit_veteran.png/revision/latest?cb=20210626095102&path-prefix=ru', greeting:'Чего надо? Говори быстро, у меня тут люди заняты.', topics:['дело','правила','слухи'], lines:{ work:'Есть работа для тех, кто умеет держать язык за зубами. Сначала покажи, что не пустышка.', rules:'На АТП чужое добро без спроса не трогают. Особенно если оно моё.', rumors:'У мусорки замечали странные вспышки. Парни туда пока не суются.' } },
  { id:'dzerzhinsky', name:'Дмитрий Дзержинский', role:'Капитан блокпоста', group:'Военные', faction:'military', location:'south-checkpoint', icon:'https://static.wikia.nocookie.net/stalker/images/9/96/Icon_SoC_character_soldier_beret.png/revision/latest?cb=20210626063310&path-prefix=ru', greeting:'Документы и цель прибытия. На блокпосту без самодеятельности.', topics:['служба','пропуск','обстановка'], lines:{ service:'Я отвечаю за порядок на южном блокпосту. Любые подозрительные перемещения докладываются.', pass:'Порядок прохода зависит от обстановки и твоей репутации. Пока у тебя нулевой рейтинг.', situation:'Патрули проверяют дорогу и ближайшие строения. В последнее время в районе свалки участились странные сигналы.' } }
];


// Все портреты для выбора персонажа: 14 иконок фракций + 4 портрета ключевых NPC.
// Изображения загружаются напрямую с внешних источников; локальные копии не требуются.
export const AVATAR_OPTIONS = [
  ...AVATARS.loner.map((src, index) => ({ src, name: `Одиночка ${index + 1}`, group: 'loner' })),
  ...AVATARS.bandit.map((src, index) => ({ src, name: `Бандит ${index + 1}`, group: 'bandit' })),
  ...AVATARS.military.map((src, index) => ({ src, name: `Военный ${index + 1}`, group: 'military' })),
  { src:'https://static.wikia.nocookie.net/stalker/images/3/3a/Icon_SoC_character_trader.png/revision/latest?cb=20210313091759&path-prefix=ru', name:'Сидорович', group:'npc' },
  { src:'https://static.wikia.nocookie.net/stalker/images/0/0e/Icon_SoC_character_stalker_neytral_balon_1.png/revision/latest?cb=20210221111322&path-prefix=ru', name:'Волк', group:'npc' },
  { src:'https://static.wikia.nocookie.net/stalker/images/5/52/Icon_SoC_character_stalker_bandit_veteran.png/revision/latest?cb=20210626095102&path-prefix=ru', name:'Кефир', group:'npc' },
  { src:'https://static.wikia.nocookie.net/stalker/images/9/96/Icon_SoC_character_soldier_beret.png/revision/latest?cb=20210626063310&path-prefix=ru', name:'Дмитрий Дзержинский', group:'npc' }
];

// Музыка для радио. Воспроизведение выполняется встроенным YouTube-плеером,
// поэтому проект хранит только ссылки и не копирует защищённые аудиозаписи.
export const RADIO_TRACKS = [
  { id:'firelake-dirge', title:'Dirge for the Planet', artist:'FireLake', videoId:'Yth_jZcZrtA', label:'S.T.A.L.K.E.R. OST', era:'Гимн Зоны' },
  { id:'mooze-radwind-1', title:'Radwind Pt.1', artist:'MoozE', videoId:'lq9qNdutbBk', label:'Shadow of Chernobyl OST', era:'Эмбиент Зоны' },
  { id:'mooze-dead-cities-2', title:'Dead Cities Pt.2', artist:'MoozE', videoId:'RBnjguppfaA', label:'Shadow of Chernobyl OST', era:'Эмбиент Зоны' },
  { id:'mooze-radwind-2', title:'Radwind Pt.2', artist:'MoozE', videoId:'7hLV-hVKuhM', label:'Shadow of Chernobyl OST', era:'Эмбиент Зоны' },
  { id:'agata-kak-na-voine', title:'Как на войне', artist:'Агата Кристи', videoId:'e4q35OeSpEU', label:'Позорная звезда', era:'Старая волна' },
  { id:'agata-opium', title:'Опиум для никого', artist:'Агата Кристи', videoId:'Ty8QVhtdsgI', label:'Опиум', era:'Старая волна' },
  { id:'ddt-autumn', title:'Что такое осень', artist:'ДДТ', videoId:'LvaYk-phy14', label:'Актриса весна', era:'Старая волна' },
  { id:'bi2-varvara', title:'Варвара', artist:'Би-2', videoId:'T18deTeV0RI', label:'Би-2', era:'Старая волна' },
  { id:'pink-floyd-wish', title:'Wish You Were Here', artist:'Pink Floyd', videoId:'K6qj09OHvjw', label:'Wish You Were Here', era:'Дальняя волна' },
  { id:'cash-hurt', title:'Hurt', artist:'Johnny Cash', videoId:'8AHCfZTRGiI', label:'American IV: The Man Comes Around', era:'Дальняя волна' }
];

export const BLIND_DOG_IMAGES = [
  'https://static.wikia.nocookie.net/stalker/images/d/de/%D0%A1%D0%BB%D0%B5%D0%BF%D0%BE%D0%B9_%D0%BF%D1%91%D81.png/revision/latest?cb=20180712114910',
  'https://static.wikia.nocookie.net/stalker/images/5/5a/%D0%A1%D0%BB%D0%B5%D0%BF%D0%BE%D0%B9_%D0%BF%D1%91%D82.png/revision/latest?cb=20180712114910'
];


export const QUESTS = [
  { id:'first-steps', title:'Первые шаги', giver:'wolf', text:'Осмотрись в деревне новичков и загляни к Волку за советом.', reward:150, condition:'talk:wolf', status:'available' },
  { id:'old-supplies', title:'Старые припасы', giver:'wolf', text:'Проверь остановку и найди что-нибудь полезное.', reward:220, condition:'search:stop', status:'available' },
  { id:'signal-dump', title:'Странный сигнал', giver:'sidorovich', text:'Найди источник сигнала на аномальной мусорке и вернись с находкой.', reward:450, condition:'artifact:anomaly-dump', status:'available' },
  { id:'atp-test', title:'Проверка на прочность', giver:'kefir', text:'Доберись до туннеля в лощину и проверь, не появились ли там чужаки.', reward:300, condition:'visit:ravine-tunnel', status:'available' },
  { id:'patrol-report', title:'Доклад патруля', giver:'dzerzhinsky', text:'Осмотри блокпост под мостом и сообщи, что происходит на дороге.', reward:180, condition:'visit:bridge-checkpoint', status:'available' }
];

export const SQUADS = [
  { id:'squad-loners', name:'Патруль одиночек', faction:'loner', location:'rookie-village', members:3, destination:null },
  { id:'squad-bandits', name:'Группа Кефира', faction:'bandit', location:'atp', members:4, destination:null },
  { id:'squad-military', name:'Военный патруль', faction:'military', location:'south-checkpoint', members:3, destination:null }
];

export const START_BUDGET = 2500;
export const MAX_CARRY_KG = 50;
