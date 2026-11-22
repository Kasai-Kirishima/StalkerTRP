import { ASSETS, IMAGE_FALLBACKS, FACTIONS, AVATAR_OPTIONS, RADIO_TRACKS, RADIO_STATIONS, PLAYER_TRACKS, ITEMS, LOCATIONS, NPCS, BLIND_DOG_IMAGES, MAX_CARRY_KG, START_BUDGET, STARTER_ITEM_IDS } from '../data/catalog.js';
import { getWeight, countItem, getItem } from '../systems/inventory.js';
import { getGameDateTime, formatElapsed } from '../systems/game-clock.js';
import { getLocation, getAvailableTraders, getSidorovichJobState, getTravelMinutes, getExploreSpots } from '../systems/world.js';
import { getBestWeapon } from '../systems/combat.js';

export const esc = (value='') => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const money = (value) => `${Number(value || 0).toLocaleString('ru-RU')} RU`;
const avatarMarkup = (src, name, emoji='☢') => {
  if (src && String(src).startsWith('data:image/')) return `<div class="avatar-wrap"><img src="${esc(src)}" alt="${esc(name)}"></div>`;
  return `<div class="avatar-wrap"><span class="avatar-fallback">${emoji}</span></div>`;
};
const itemImage = (item) => {
  const icons = { 'Еда':'🥫', 'Медицина':'✚', 'Добыча':'☣', 'Артефакты':'◆', 'Оружие':'⚒', 'Боеприпасы':'▦', 'Снаряжение':'▣', 'Броня':'▤', 'Защита':'◈' };
  const image=ASSETS.armor?.[item.id];
  return image ? `<img class="item-art-image" src="${esc(image)}" alt="${esc(item.name)}" loading="lazy">` : `<span class="item-emoji">${item.emoji || icons[item.cat] || '▧'}</span>`;
};
const bar = (label, value, cls='') => `<div class="stat-bar"><div class="stat-bar-label"><span>${label}</span><b>${Math.round(value)}%</b></div><div class="bar-track"><i class="${cls}" style="width:${Math.max(0,Math.min(100,value))}%"></i></div></div>`;
const btn = (label, action, cls='button', data='') => `<button class="${cls}" data-action="${action}" ${data}>${label}</button>`;

export function renderMenu(state) {
  return `<section class="main-menu" style="--menu-bg:url('${ASSETS.menu}')">
    <div class="menu-shade"></div>
    <div class="menu-content">
      <div class="menu-kicker">ЗОНА ОТЧУЖДЕНИЯ · КОРДОН</div>
      <h1>СТАЛКЕР<span> / ПУТЬ ПО КОРДОНУ</span></h1>
      <p class="menu-subtitle">Твоя история начинается с первого шага за периметр.</p>
      <div class="menu-buttons">
        ${btn('▶ Играть','play','menu-button primary')}
        ${btn('▣ Аккаунт','account','menu-button')}
        ${btn('⚙ Настройки','settings','menu-button')}
        ${btn('Выход','exit','menu-button subtle')}
      </div>
      <div class="menu-bottom"><span>БЕТА-ПРОТОТИП</span><span>СОХРАНЕНИЯ ХРАНЯТСЯ НА ЭТОМ УСТРОЙСТВЕ</span></div>
    </div>
    <div class="menu-stamp">ZONE<br>WARNING</div>
  </section>`;
}

export function renderAccount(state) {
  const a = state.account || {};
  const characters = state.characters || [];
  const totalKills = characters.reduce((sum,c)=>sum+(c.stats?.kills||0),0) + (a.enemiesDefeated||0);
  const completed = characters.reduce((sum,c)=>sum+(c.stats?.questsDone||0),0) + (a.questsCompleted||0);
  const artifacts = characters.reduce((sum,c)=>sum+(c.stats?.artifacts||0),0) + (a.artifactsFound||0);
  const distance = characters.reduce((sum,c)=>sum+(c.stats?.distance||0),0) + (a.distanceTravelled||0);
  return `<section class="screen-wrap narrow-screen">
    <header class="screen-heading"><div><div class="eyebrow">ЛИЧНОЕ ДЕЛО</div><h2>Аккаунт игрока</h2><p>Статистика локального профиля и созданных персонажей.</p></div>${btn('← Назад','back-menu','button ghost')}</header>
    <div class="stats-grid account-grid">
      <article class="metric-card"><span>Создано персонажей</span><strong>${characters.length}</strong></article>
      <article class="metric-card"><span>Побеждено противников</span><strong>${totalKills}</strong></article>
      <article class="metric-card"><span>Выполнено заданий</span><strong>${completed}</strong></article>
      <article class="metric-card"><span>Найдено артефактов</span><strong>${artifacts}</strong></article>
      <article class="metric-card"><span>Пройдено локаций</span><strong>${distance}</strong></article>
      <article class="metric-card"><span>Сессий</span><strong>${a.sessions||0}</strong></article>
    </div>
    <div class="panel"><div class="panel-title"><h3>Персонажи</h3><span class="muted">${characters.length} сохранений</span></div>
      ${characters.length ? characters.map(c=>`<div class="record-row">${avatarMarkup(c.avatar,c.name,'☢')}<div class="record-main"><b>${esc(c.name)}</b><small>${esc(FACTIONS.find(f=>f.id===c.faction)?.name||'Неизвестно')} · ${esc(c.rank||'Новичок')}</small></div><span class="record-tag">${c.stats?.kills||0} побед</span></div>`).join('') : '<div class="empty-state">Пока нет созданных персонажей. Начни новую игру, чтобы заполнить личное дело.</div>'}
    </div>
  </section>`;
}

export function renderCharacters(state) {
  const chars = state.characters || [];
  return `<section class="screen-wrap narrow-screen">
    <header class="screen-heading"><div><div class="eyebrow">НОВОЕ ПРИКЛЮЧЕНИЕ</div><h2>Выбор персонажа</h2><p>Создай нового сталкера или продолжи уже начатую историю.</p></div>${btn('← Главное меню','back-menu','button ghost')}</header>
    <div class="character-list">${chars.length ? chars.map(c=>`<article class="character-card">${avatarMarkup(c.avatar,c.name,'☢')}<div class="character-info"><h3>${esc(c.name)}</h3><p>${esc(FACTIONS.find(f=>f.id===c.faction)?.name||'Фракция не указана')} · ${esc(c.rank||'Новичок')}</p><small>${esc(c.spawnName || 'Кордон')} · ${money(c.game?.money ?? c.money ?? 0)}</small></div><div class="character-actions">${btn(c.game?'Продолжить':'Выбрать','select-character','button primary',`data-id="${esc(c.id)}"`)}${btn('Удалить','delete-character','button danger-ghost',`data-id="${esc(c.id)}"`)}</div></article>`).join('') : '<div class="empty-state large">Нет сохранённых персонажей.<br>Создай первого сталкера, чтобы войти в Зону.</div>'}</div>
    <div class="create-strip"><div><b>Новый персонаж</b><small>Имя, внешность, фракция и стартовое снаряжение.</small></div>${btn('+ Создать персонажа','create-character','button primary')}</div>
  </section>`;
}

export function renderCreate(state) {
  const d = state.draft;
  const factionCards = FACTIONS.map(f=>`<label class="faction-choice ${d.faction===f.id?'selected':''}"><input type="radio" name="faction" value="${f.id}" ${d.faction===f.id?'checked':''}><span class="faction-icon"><span class="faction-icon-symbol">${f.id==='military'?'🪖':f.id==='bandit'?'♟':'☢'}</span></span><span><b>${esc(f.name)}</b><small>${esc(f.description)}</small></span><i>${d.faction===f.id?'●':'○'}</i></label>`).join('');
  const previewSrc = (d.avatar || '').startsWith('data:image/') ? d.avatar : '';
  const portraitMark = d.avatar ? (d.faction==='military'?'🪖':d.faction==='bandit'?'♟':'☢') : '☢';
  return `<section class="screen-wrap pda-screen-wrap">
    <header class="screen-heading"><div><div class="eyebrow">КПК · ЛИЧНОЕ ДЕЛО</div><h2>Регистрация сталкера</h2><p>Заполни данные персонажа перед выходом на Кордон.</p></div>${btn('← Назад','back-characters','button ghost')}</header>
    <form id="character-form" class="pda-form" style="--pda-bg:none">
      <div class="pda-topline"><span>НОВОЕ ЛИЧНОЕ ДЕЛО / КОРДОН</span><span class="pda-live-time" data-live-clock>15 апреля · ${new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</span></div>
      <div class="pda-form-layout">
        <div class="pda-photo-column">
          <div class="photo-frame">${previewSrc ? `<img src="${esc(previewSrc)}" alt="Портрет">` : `<span>${portraitMark}</span>`}</div>
          <b>ФОТО / ПОРТРЕТ</b>
          ${btn('Выбрать из списка','open-avatars','button small wide')}
          <label class="button small wide upload-button">Загрузить с устройства<input type="file" id="avatar-upload" accept="image/*" hidden></label>
          ${d.avatar ? btn('Сбросить портрет','reset-avatar','button small ghost wide') : ''}
        </div>
        <div class="pda-fields">
          <label class="field"><span>Имя персонажа *</span><input name="name" data-field="name" value="${esc(d.name)}" maxlength="32" placeholder="Например, Алексей Ветров" required></label>
          <div class="field-row three">
            <label class="field"><span>Дата рождения</span><input type="date" name="birthDate" data-field="birthDate" value="${esc(d.birthDate)}"></label>
            <label class="field"><span>Рост, см</span><input type="number" name="height" data-field="height" value="${esc(d.height)}" min="120" max="230" placeholder="178"></label>
            <label class="field"><span>Вес, кг</span><input type="number" name="weight" data-field="weight" value="${esc(d.weight)}" min="35" max="180" placeholder="75"></label>
          </div>
          <label class="field"><span>Характер</span><textarea name="personality" data-field="personality" rows="2" maxlength="300" placeholder="Спокойный, недоверчивый, вспыльчивый...">${esc(d.personality)}</textarea></label>
          <label class="field"><span>Биография</span><textarea name="biography" data-field="biography" rows="3" maxlength="900" placeholder="Кем был до Зоны и почему пришёл сюда...">${esc(d.biography)}</textarea></label>
          <label class="field"><span>Дополнительные сведения</span><textarea name="notes" data-field="notes" rows="2" maxlength="500" placeholder="Привычки, страхи, цели, приметы...">${esc(d.notes)}</textarea></label>
        </div>
      </div>
      <div class="pda-faction-section"><div class="section-caption"><b>ПРИНАДЛЕЖНОСТЬ К ГРУППИРОВКЕ</b><small>Стартовая репутация: 0 · Рейтинг: 0</small></div><div class="faction-options">${factionCards}</div></div>
      <div class="pda-footer"><span>Дата начала: 15 апреля · Текущее время устройства</span><button class="button primary" type="submit">Подтвердить и выбрать снаряжение →</button></div>
    </form>
  </section>`;
}

export function renderLoadout(state) {
  const selected = state.loadout.selected || {};
  const spent = Object.entries(selected).reduce((sum,[id,qty])=>sum+(getItem(id)?.price||0)*qty,0);
  const weight = Object.entries(selected).reduce((sum,[id,qty])=>sum+(getItem(id)?.weight||0)*qty,0);
  const remain = START_BUDGET - spent;
  const orderedItems = ITEMS.filter(item=>STARTER_ITEM_IDS.includes(item.id)).sort((a,b)=>a.price-b.price);
  return `<section class="screen-wrap loadout-screen">
    <header class="screen-heading"><div><div class="eyebrow">ПОДГОТОВКА К ВЫХОДУ</div><h2>Стартовое снаряжение</h2><p>Покупай предметы в пределах бюджета. Остаток денег останется у персонажа.</p></div>${btn('← К персонажу','back-create','button ghost')}</header>
    <div class="loadout-summary"><div><small>БЮДЖЕТ</small><b>${money(START_BUDGET)}</b></div><div><small>ПОТРАЧЕНО</small><b>${money(spent)}</b></div><div><small>ОСТАЛОСЬ</small><b class="good-text">${money(remain)}</b></div><div><small>ВЕС</small><b class="${weight>MAX_CARRY_KG?'bad-text':''}">${weight.toFixed(1)} / ${MAX_CARRY_KG} кг</b></div></div>
    <div class="loadout-note">Здесь только обычные вещи и доступное новичку снаряжение. Защитные костюмы, продвинутое оружие и детекторы продают торговцы; редкие находки и трофеи добываются в Зоне. Предметы расположены по возрастанию стоимости.</div>
    <section class="shop-group"><h3>СТАРТОВАЯ ПОДБОРКА · ОТ ДЕШЁВЫХ К ДОРОГИМ</h3><div class="shop-grid">${orderedItems.map(item=>`<article class="shop-item"><div class="shop-image">${itemImage(item)}</div><div class="shop-info"><b>${esc(item.name)}</b><small>${esc(item.cat)} · ${item.weight} кг · ${item.w}×${item.h} яч.</small><strong>${money(item.price)}</strong></div><div class="shop-controls">${btn('−','loadout-remove','button square',`data-id="${item.id}" ${!selected[item.id]?'disabled':''}`)}<b>${selected[item.id]||0}</b>${btn('+','loadout-add','button square',`data-id="${item.id}"`)}</div></article>`).join('')}</div></section>
    <div class="loadout-bottom"><div><span>${Object.values(selected).reduce((a,b)=>a+b,0)} предметов в выборе</span><small>Лимит рюкзака: ${MAX_CARRY_KG} кг</small></div>${btn('Завершить подготовку →','finish-loadout','button primary')}</div>
  </section>`;
}

function gameNav(active) {
  const tabs = [ ['location','◈','Местность'],['map','⌖','Карта'],['stats','▤','Статистика'],['player','▶','Плеер'],['messages','✉','Связь'],['quests','☷','Задания'],['contacts','♟','Контакты'] ];
  return tabs.map(([id,ico,label])=>`<button class="nav-tab ${active===id?'active':''}" data-action="tab" data-tab="${id}"><span>${ico}</span><b>${label}</b></button>`).join('');
}

function renderLocation(game, character, state) {
  const location=getLocation(game.locationId);
  const npcs=NPCS.filter(npc=>npc.location===game.locationId);
  const traders=getAvailableTraders(game,game.locationId);
  const squads=game.squads.filter(squad=>squad.location===game.locationId);
  const time=getGameDateTime(game.clock);
  const spots=getExploreSpots(game.locationId);
  const selectedSpot=spots.find(spot=>spot.id===game.player?.shelterSpotId);
  const currentArea=spots.find(spot=>spot.id===game.currentAreaId) || selectedSpot || null;
  const scene=ASSETS.areaBackgrounds?.[currentArea?.id] || ASSETS.locationBackgrounds?.[game.locationId] || '';
  const emission=game.emission||{};
  const nextEmission=Number(emission.nextAt||0);
  const untilEmission=Math.max(0,nextEmission-(game.clock.worldMinutes||0));
  const emissionBanner=emission.active
    ? `<div class="emission-banner ${game.player.sheltered?'safe':'danger'}"><b>☢ ВЫБРОС ${game.player.sheltered?'· ТЫ В УКРЫТИИ':'· НЕМЕДЛЕННО ИЩИ УКРЫТИЕ'}</b><span>${game.player.sheltered?`Ты пережидаешь в месте «${esc(selectedSpot?.name||'укрытие')}».`:'Снаружи опасно находиться. Напиши «прячусь в караулке» или нажми кнопку укрытия.'}</span>${!game.player.sheltered?btn('Найти укрытие','shelter','button danger small'):''}</div>`
    : nextEmission && untilEmission<=60
      ? `<div class="emission-banner warning"><b>☢ ПРЕДУПРЕЖДЕНИЕ О ВЫБРОСЕ</b><span>Ожидается примерно через ${formatElapsed(untilEmission)}. Найди помещение, запасись водой и не задерживайся снаружи.</span>${!game.player.sheltered?btn('Укрыться сейчас','shelter','button danger small'):''}</div>`
      : '';
  const emissionCountdown=!emission.active&&nextEmission?`<span class="emission-countdown">☢ Выброс ориентировочно через ${formatElapsed(untilEmission)}</span>`:'';
  const isMask=game.player?.maskId;
  const maskClass=isMask==='optik'?'mask-optik':isMask==='aurora'?'mask-aurora':'';
  const areaName=currentArea?.name||'';
  const locationLight=/подвал|тоннель|переход|кабина|ниша|склад|казарма|контора|укрытие|сарай|погреб/i.test(areaName);
  const hour=Number(String(time.time||'12:00').split(':')[0]);
  const daylight=(hour<5 || hour>=22) ? .58 : (hour<7 || hour>=20) ? .76 : (hour<9 || hour>=18) ? .9 : 1;
  const weatherDim=/дожд|гроза|туман|низкая облачность/i.test(game.weather||'') ? .88 : 1;
  const interiorDim=locationLight ? .74 : 1;
  const brightnessValue=Math.max(.42,daylight*weatherDim*interiorDim*(state?.ui?.flashlight?1.25:1));
  const brightness=`brightness(${brightnessValue.toFixed(2)})`;
  const gmText=game.activeEncounter
    ? `${game.activeEncounter.name} перед тобой. Состояние: ${game.activeEncounter.hp}/${game.activeEncounter.maxHp}. Не теряй времени — опиши, что делаешь.`
    : (currentArea?.description || game.currentDescription||location?.desc||'Оглядись. Кордон редко бывает по-настоящему тихим.');
  const enemy=game.activeEncounter;
  const enemyEmoji=enemy?.type==='blind-dog'?'🐕':enemy?.type==='flesh'?'🐖':enemy?.type==='military'||enemy?.type==='bandit'||enemy?.type==='stalker'?'🕴️':'☢';
  const enemyStage=enemy?`<div class="enemy-stage ${enemy.type}"><div class="enemy-avatar">${enemyEmoji}</div><div class="enemy-stage-info"><b>${esc(enemy.name)}</b><span>${enemy.hp}/${enemy.maxHp} здоровья</span><div class="bar-track"><i class="danger" style="width:${Math.max(0,enemy.hp/enemy.maxHp*100)}%"></i></div></div></div>`:'';
  const effect=game.combatEffect && Number(game.combatEffect.until||0)>=Number(game.clock.worldMinutes||0)?game.combatEffect.type:null;
  const combatEffect=effect?`<div class="combat-scene-effect ${esc(effect)}" aria-hidden="true">${effect==='bolt'?'🔩':effect==='grenade'?'💣':effect==='reload'?'↻':effect==='med'?'✚':effect==='aim'?'⌖':effect==='dodge'?'↝':'✦'}</div>`:'';
  const baseStation=RADIO_STATIONS.find(station=>station.locationId===game.locationId);
  const radio=baseStation?`<div class="location-radio"><div><small>${esc(baseStation.frequency)} · ${esc(baseStation.faction)}</small><b>${esc(baseStation.name)}</b></div>${state?.ui?.music?.mode==='radio'&&state.ui.music.stationId===baseStation.id&&state.ui.music.playing?`<div class="radio-current"><b>${esc(RADIO_TRACKS.find(t=>t.id===state.ui.music.trackId)?.title||'Эфир')}</b><small>${esc(RADIO_TRACKS.find(t=>t.id===state.ui.music.trackId)?.artist||'')}</small></div>${btn('Ⅱ Выключить радио','radio-stop','button small ghost')}`:`<span class="radio-off-label">ПРИЁМНИК ВЫКЛЮЧЕН</span>${btn('♫ Включить радио','radio-base-open','button small primary',`data-id="${baseStation.id}"`)}`}</div>`:'';
  const weapon=getBestWeapon(game.inventory,game);
  const magazine=weapon?.ammo?(game.weaponMagazines?.[weapon.id]??'—'):null;
  const reserve=weapon?.ammo?(game.ammoRounds?.[weapon.ammo]??0):null;
  const weaponEmoji=weapon?.weapon==='melee'?'🔪':'🔫';
  const weaponSide=state.settings?.weaponHudSide==='left'?'left':'right';
  const weaponHud=`<aside class="weapon-hud ${weaponSide}"><div class="weapon-hud-top"><small>В РУКАХ</small>${btn('⇄','toggle-weapon-side','icon-button small',`title="Переместить панель оружия"`)}</div><div class="weapon-hud-icon">${weaponEmoji}</div><b>${esc(weapon?.name||'Без оружия')}</b>${weapon?.ammo?`<div class="ammo-readout"><strong>${magazine}</strong><span>в магазине</span><strong>${reserve}</strong><span>в запасе</span></div>`:`<small>${weapon?'Ближний бой':'Выбери оружие в рюкзаке'}</small>`}<div class="weapon-quick-actions">${weapon?.ammo?btn('↻ Зарядить','combat-reload','button tiny ghost'):''}${btn('🔫 Атака','combat-attack','button tiny danger',`${enemy?'':'disabled'}`)}${btn('▣ Рюкзак','inventory-open','button tiny ghost')}</div><div class="hand-tools"><span>🔩 Болт: ${game.boltsRemaining??0}</span>${btn('Бросить болт','combat-bolt','button tiny ghost',`${enemy?'':'disabled'}`)}</div></aside>`;
  const quickCombat=enemy?`<div class="combat-quickbar"><b>БОЕВЫЕ ДЕЙСТВИЯ</b>${btn('Прицелиться','combat-aim','button small')}${btn('Уклониться','combat-dodge','button small')}${btn('Защищаться','combat-defend','button small')}${btn('Граната','combat-grenade','button small danger',`${countItem(game.inventory,'rgd5')?'':'disabled'}`)}${btn('Отступить','combat-flee','button small ghost')}</div>`:'';
  const areaPanel=currentArea?`<div class="current-area-panel"><div><small>ТЕКУЩЕЕ МЕСТО</small><b>${esc(currentArea.name)}</b><p>${esc(currentArea.description)}</p></div><div class="current-area-actions">${currentArea.kind==='breakable'?btn('Сломать ящик','break-crate','button tiny primary',`data-id="${currentArea.id}"`):btn('Обыскать','scene-search','button tiny primary',`data-id="${currentArea.id}"`)}${currentArea.shelter&&!game.player.sheltered?btn('Укрыться','scene-shelter','button tiny ghost',`data-id="${currentArea.id}"`):''}${game.player.sheltered?btn('Выйти из укрытия','leave-shelter','button tiny ghost'):''}${btn('Вернуться наружу','scene-back','button tiny ghost')}${btn(state?.ui?.flashlight?'Выключить фонарик':'Фонарик','flashlight-toggle','button tiny ghost')}</div></div>`:'';
  const npcRows=npcs.map(npc=>`<button class="npc-chip" data-action="talk" data-id="${npc.id}">${avatarMarkup(npc.icon,npc.name,'♟')}<span><b>${esc(npc.name)}</b><small>${esc(npc.role||'Сталкер')}</small></span></button>`).join('');
  const traderRows=traders.filter(t=>t.random).map(trader=>`<button class="npc-chip" data-action="talk" data-id="${trader.id}">${avatarMarkup(trader.icon,trader.name,'♟')}<span><b>${esc(trader.name)}</b><small>${esc(trader.role||'Путник')}</small></span></button>`).join('');
  const vignette=maskClass?`<div class="mask-vignette ${maskClass}"></div>`:'';
  const hazards=location?.hazards?.length?`<div class="scene-hazards">${location.hazards.map(h=>`<span>${h==='radiation'?'☢ Радиационный очаг':'◉ Гравитационная аномалия'}</span>`).join('')}</div>`:'';
  const anomaly=location?.hazards?.includes('gravity')?`<div class="anomaly-scene" aria-hidden="true"><i></i><i></i><i></i></div>`:'';
  return `<section class="location-scene ${enemy?'in-combat':''} ${maskClass}" style="--scene-image:url('${scene}');--scene-brightness:${brightness}">
    <div class="scene-background" style="background-image:linear-gradient(90deg,rgba(7,11,7,.75),rgba(7,11,7,.08) 55%,rgba(7,11,7,.55)),url('${scene}');filter:${brightness}"></div>${vignette}${anomaly}
    <div class="scene-topline"><div class="scene-gm"><small>GAME MASTER · ${esc(location?.name||'КОРДОН')}</small><p>${esc(gmText)}</p></div><div class="scene-clock"><b>${time.time}</b><span>${esc(time.date)}</span><small>${esc(game.weather||'Пасмурно')}</small></div></div>
    ${emissionBanner}<div class="scene-vitals"><span>♥ ${game.player.hp}/${game.player.maxHp}</span><span>⚡ ${Math.round(game.player.stamina)}%</span><span class="${game.player.hunger>=75?'vital-warning':''}">🍞 Голод ${Math.round(game.player.hunger)}%</span><span class="${game.player.thirst>=75?'vital-warning':''}">💧 Жажда ${Math.round(game.player.thirst)}%</span><span>☢ ${Math.round(game.player.radiation)}%</span>${emissionCountdown}</div>
    ${hazards}${enemyStage}${combatEffect}${quickCombat}
    <div class="scene-footer"><div class="scene-places"><div class="scene-entry-actions">${btn("Места и обыск", "explore-open", "button small ghost")}${btn("Напольный фонарик", "flashlight-toggle", "button small ghost", `aria-pressed="${!!state?.ui?.flashlight}"`)}</div>${areaPanel}<div class="scene-interactions">${npcRows}${traderRows}</div></div>${weaponHud}</div>
    ${radio}
  </section>`;
}

function renderMap(game,state) {
  const location = getLocation(game.locationId);
  const mapLocations=LOCATIONS.filter(loc=>loc.mapVisible!==false);
  const activeQuests=(game.quests||[]).filter(q=>['active','ready'].includes(q.status));
  const questTarget = (quest) => quest.id==='wolf-dog-pack' ? 'trailer' : quest.condition?.startsWith('visit:') ? quest.condition.slice(6) : quest.condition==='search:stop' ? 'stop' : quest.condition==='artifact:anomaly-dump' ? 'anomaly-dump' : null;
  const targets=new Set(activeQuests.map(questTarget).filter(Boolean));
  const near=(location?.neighbors||[]).map(getLocation).filter(Boolean);
  const mapView=`<div class="map-workspace">
    <section class="map-map-column"><div class="map-frame map-frame-large"><img src="${ASSETS.map}" alt="Чистая карта Кордона" loading="eager" decoding="async" fetchpriority="high" onerror="this.classList.add('map-image-error');this.nextElementSibling.hidden=false"><div class="map-fallback" hidden>КАРТА КОРДОНА<br><small>Изображение карты недоступно</small></div><div class="map-pins">${mapLocations.map(loc=>`<button class="map-pin ${loc.id===game.locationId?'current':''} ${(location?.neighbors||[]).includes(loc.id)?'reachable':''} ${targets.has(loc.id)?'quest-target':''}" style="left:${loc.x}%;top:${loc.y}%" data-action="location-open" data-id="${loc.id}" aria-label="${esc(loc.name)}" title="${esc(loc.name)}"><span class="map-pin-title">${esc(loc.name)}</span></button>`).join('')}</div></div><div class="map-key"><span><i class="map-key-dot current"></i> Текущее место</span><span><i class="map-key-dot reachable"></i> Можно перейти</span><span><i class="map-key-dot quest"></i> Цель задания</span></div></section>
    <aside class="map-side-rail">
      <section class="map-rail-card map-current-card"><div class="eyebrow">ТВОЯ ПОЗИЦИЯ</div><h3>${esc(location?.name||'Неизвестно')}</h3><p>${esc((location?.desc||'').slice(0,150))}${(location?.desc||'').length>150?'…':''}</p><div class="map-current-stats"><span>Соседних путей <b>${near.length}</b></span><span>Время в Зоне <b>${esc(getGameDateTime(game.clock).time)}</b></span></div></section>
      <section class="map-rail-card"><div class="map-rail-heading"><h3>Быстрый переход</h3><span>${near.length}</span></div><div class="map-route-list">${near.map(loc=>`<article class="map-route-row"><button class="map-route-info" data-action="location-open" data-id="${loc.id}"><b>${esc(loc.name)}</b><small>Пешком · ${getTravelMinutes(game.locationId,loc.id)} мин</small></button><button class="map-route-go" data-action="travel" data-id="${loc.id}" aria-label="Перейти: ${esc(loc.name)}">→</button></article>`).join('')||'<p class="muted small-copy">Рядом нет отмеченных переходов.</p>'}</div></section>
    </aside>
  </div>`;
  const viewContent=mapView;
  return `<div class="tab-page map-page">
    <div class="map-toolbar"><div><div class="eyebrow">КПК · НАВИГАЦИЯ</div><h2>Карта Кордона</h2><p>Нажми на точку, чтобы увидеть места и цели заданий в этой локации.</p></div><div class="map-toolbar-status"><span class="map-legend-dot current"></span><b>${esc(location?.name||'Неизвестно')}</b><small>${esc(getGameDateTime(game.clock).date)} · ${esc(getGameDateTime(game.clock).time)}</small></div></div>
    ${viewContent}
  </div>`;
}

function renderInventory(game, options={}) {
  const inCombat=!!options.combat;
  const weight=getWeight(game.inventory);
  const stacks=game.inventory;
  const slots=game.equipmentSlots||{primary1:null,primary2:null,pistol:null,knife:null,quick:[null,null,null,null]};
  const slotCard=(slot,label)=>{
    const id=slots[slot], item=id?getItem(id):null;
    return `<button class="equipment-slot ${item?'filled':''}" data-action="slot-select" data-slot="${slot}" title="${item?esc(item.name):'Пустой слот'}"><small>${label}</small><span>${item?itemImage(item):'＋'}</span><b>${item?esc(item.name):'Пусто'}</b></button>`;
  };
  const quickSlots=(slots.quick||[null,null,null,null]).map((id,index)=>{
    const item=id?getItem(id):null;
    return `<button class="quick-slot ${item?'filled':''}" data-action="slot-select" data-slot="quick${index}" title="${item?esc(item.name):'Пустой быстрый слот'}"><small>${index+1}</small><span>${item?itemImage(item):'＋'}</span><b>${item?esc(item.name):'Пусто'}</b></button>`;
  }).join('');
  return `<div class="tab-page inventory-page"><div class="tab-heading"><div><div class="eyebrow">СНАРЯЖЕНИЕ · РЮКЗАК</div><h2>Инвентарь</h2><p>Сетка 8×6 · предметы можно перемещать в ящики и из них.</p></div><div class="weight-box"><b>${weight.toFixed(1)} кг</b><small>из ${MAX_CARRY_KG} кг</small><div class="bar-track"><i style="width:${Math.min(100,weight/MAX_CARRY_KG*100)}%"></i></div></div></div>
    <section class="equipment-loadout"><div class="equipment-strip-heading"><b>Слоты экипировки</b><small>2 основных · пистолет · нож</small></div><div class="equipment-slots">${slotCard('primary1','ОСНОВНОЙ 1')}${slotCard('primary2','ОСНОВНОЙ 2')}${slotCard('pistol','ПИСТОЛЕТ')}${slotCard('knife','НОЖ')}</div><div class="quick-slots-heading"><b>Быстрый доступ</b><small>Нажми на предмет в рюкзаке, чтобы назначить слот</small></div><div class="quick-slots">${quickSlots}</div></section>
    <div class="inventory-guide"><span><i class="guide-square one"></i> 1×1</span><span><i class="guide-square two"></i> 2×1 / 1×2</span><span><i class="guide-square four"></i> 2×2 и больше</span><small>${stacks.reduce((sum,item)=>sum+item.qty,0)} предметов · ${stacks.length} типов</small></div>
    ${stacks.length ? `<div class="inventory-grid inventory-grid-clear" data-drop-zone="source">${stacks.map(stack=>{const item=getItem(stack.id);if(!item)return '';const quantity=stack.id==='boltpack'?`Болтов: ${game.boltsRemaining??stack.qty*10}`:['ammo9x18','ammo9x19','ammo545','shells'].includes(stack.id)?`Патронов: ${game.ammoRounds?.[stack.id]??stack.qty*(stack.id==='shells'?8:stack.id==='ammo545'?30:12)}`:`Вес: ${(item.weight*stack.qty).toFixed(2)} кг`;return `<article draggable="true" data-drag-side="player" data-drag-id="${item.id}" class="inventory-item inventory-item-clear" style="--item-w:${item.w};--item-h:${item.h};grid-column:span ${item.w};grid-row:span ${item.h}" title="${esc(item.desc||item.name)}"><div class="inventory-item-top"><span>${esc(item.cat)}</span><b>${stack.qty>1?`×${stack.qty}`:'1 шт.'}</b></div><div class="inventory-item-image">${itemImage(item)}</div><b class="inventory-item-name">${esc(item.name)}</b><small>${esc(quantity)}</small><div class="inventory-item-actions">${item.use?btn(inCombat?'Использовать в бою':'Использовать',inCombat?'combat-use-item':'use-item','button tiny primary',`data-id="${item.id}"`):''}${item.weapon&&item.weapon!=='grenade'?btn('В слот','slot-assign','button tiny ghost',`data-id="${item.id}"`):''}${item.armor?btn(game.player.armorId===item.id?'Снять броню':'Надеть броню','equip-armor','button tiny ghost',`data-id="${item.id}"`):''}${item.cat==='Защита'?btn(game.player.maskId===item.id?'Снять':'Надеть','equip-mask','button tiny ghost',`data-id="${item.id}"`):''}${item.use?btn('Быстрый доступ','slot-assign','button tiny ghost',`data-id="${item.id}"`):''}${btn('Выбросить','drop-item','button tiny ghost',`data-id="${item.id}"`)}</div></article>`}).join('')}</div>` : '<div class="empty-state large">Рюкзак пуст. Найди припасы в Зоне или купи их у торговца.</div>'}
    <div class="inventory-footer"><span>Перетащи предмет на контейнер, чтобы сложить его туда.</span>${btn('Закрыть рюкзак','close-modal','button ghost')}</div>
  </div>`;
}

function renderLootPanel(game) {
  const active=game?.activeLoot;
  if(!active) return '';
  const sourceItems=active.kind==='storage'?(game.stashes?.[active.sourceId]||[]):(game.lootContainers?.[active.sourceId]?.items||[]);
  const playerItems=game.inventory||[];
  const itemRow=(stack,direction)=>{
    const item=getItem(stack.id); if(!item) return '';
    const action=direction==='take'?'Забрать':'Сложить';
    return `<article class="loot-item" draggable="true" data-drag-side="${direction==='take'?'source':'player'}" data-drag-id="${item.id}"><span class="loot-item-image">${itemImage(item)}</span><span class="loot-item-info"><b>${esc(item.name)}</b><small>${item.weight} кг · ${stack.qty} шт.</small></span>${btn(action,'loot-transfer','button tiny '+(direction==='take'?'primary':'ghost'),`data-item-id="${item.id}" data-direction="${direction}" data-qty="1"`)}</article>`;
  };
  const sourceLabel=active.kind==='storage'?'Хранилище':game.lootContainers?.[active.sourceId]?.corpse?'Вещи погибшего':'Найденные вещи';
  return `<section class="loot-panel"><header class="loot-panel-head"><div><div class="eyebrow">КОРДОН · ОБЫСК</div><h2>${esc(active.title||'Контейнер')}</h2><p>Перетаскивай вещи между окнами или используй кнопки. Предметы сохраняются в контейнере.</p></div><button class="modal-close" data-action="loot-close">×</button></header><div class="loot-toolbar">${btn('Забрать всё','loot-take-all','button primary')}${btn('Сложить всё','loot-store-all','button ghost')}<span>Рюкзак: ${getWeight(playerItems).toFixed(1)} / ${MAX_CARRY_KG} кг</span></div><div class="loot-columns"><section class="loot-column" data-drop-zone="player"><div class="loot-column-head"><h3>${sourceLabel}</h3><small>${sourceItems.reduce((sum,item)=>sum+item.qty,0)} шт.</small></div><div class="loot-item-list">${sourceItems.length?sourceItems.map(entry=>itemRow(entry,'take')).join(''):'<div class="empty-state">Здесь больше ничего нет.</div>'}</div></section><section class="loot-column" data-drop-zone="source"><div class="loot-column-head"><h3>Рюкзак игрока</h3><small>${playerItems.reduce((sum,item)=>sum+item.qty,0)} шт.</small></div><div class="loot-item-list">${playerItems.length?playerItems.map(entry=>itemRow(entry,'store')).join(''):'<div class="empty-state">Рюкзак пуст.</div>'}</div></section></div><footer class="loot-panel-foot"><small>Перенос предметов учитывает вес рюкзака. Хранилища не имеют ограничения по весу.</small>${btn('Закрыть обыск','loot-close','button ghost')}</footer></section>`;
}

function renderStats(game, character) {
  const p=game.player;
  return `<div class="tab-page"><div class="tab-heading"><div><div class="eyebrow">КПК · ЛИЧНОЕ ДЕЛО</div><h2>Статистика персонажа</h2><p>${esc(character.name)} · ${esc(FACTIONS.find(f=>f.id===p.faction)?.name||'Фракция')}</p></div>${avatarMarkup(character.avatar,character.name,'☢')}</div>
    <div class="stats-grid"><article class="metric-card"><span>Здоровье</span><strong>${p.hp}<small> / ${p.maxHp}</small></strong></article><article class="metric-card"><span>Репутация</span><strong>${p.reputation}</strong></article><article class="metric-card"><span>Рейтинг</span><strong>${p.rating}</strong></article><article class="metric-card"><span>Звание</span><strong class="rank-text">${esc(p.rank)}</strong></article><article class="metric-card"><span>Убеждено противников</span><strong>${p.kills}</strong></article><article class="metric-card"><span>Артефактов найдено</span><strong>${p.artifacts}</strong></article></div>
    <div class="panel bars-panel">${bar('Выносливость',p.stamina,'stamina')}${bar('Голод',p.hunger,'warning')}${bar('Жажда',p.thirst,'warning')}${bar('Радиация',p.radiation,'danger')}${bar('Стресс',p.stress||0,'warning')}</div>
    <div class="panel bio-panel"><h3>Досье</h3><div class="bio-grid"><span>Дата рождения</span><b>${esc(character.birthDate||'Не указана')}</b><span>Рост / вес</span><b>${character.height?`${esc(character.height)} см`: '—'} / ${character.weight?`${esc(character.weight)} кг`:'—'}</b><span>Характер</span><b>${esc(character.personality||'Не указан')}</b></div><p>${esc(character.biography||'Биография не заполнена.')}</p>${character.notes?`<p class="muted">${esc(character.notes)}</p>`:''}</div>
    <form id="profile-edit-form" class="panel profile-edit-form"><div class="panel-title"><h3>Редактировать личное дело</h3><span>Изменения сохраняются в персонаже</span></div><div class="form-grid"><label>Имя<input name="name" maxlength="32" required value="${esc(character.name)}"></label><label>Рост, см<input name="height" type="number" min="80" max="230" value="${esc(character.height||'')}"></label><label>Вес, кг<input name="weight" type="number" min="25" max="250" value="${esc(character.weight||'')}"></label><label>Характер<textarea name="personality" rows="2">${esc(character.personality||'')}</textarea></label><label>Биография<textarea name="biography" rows="3">${esc(character.biography||'')}</textarea></label><label>Другое<textarea name="notes" rows="2">${esc(character.notes||'')}</textarea></label></div><div class="profile-avatar-edit">${avatarMarkup(character.avatar,character.name,'☢')}${btn('Выбрать значок','profile-choose-avatar','button ghost')}<label class="button ghost" for="profile-avatar-upload">Загрузить с устройства</label><input id="profile-avatar-upload" type="file" accept="image/*" hidden></div><div class="form-actions">${btn('Сохранить изменения','profile-save','button primary')}</div></form>
    <div class="panel"><div class="panel-title"><h3>Путевой журнал</h3><span>${p.locationsVisited.length} локаций</span></div><div class="visited-chips">${p.locationsVisited.map(id=>`<span>${esc(getLocation(id)?.name||id)}</span>`).join('')}</div><div class="mini-readout"><span>Время активности в игре</span><b>${formatElapsed(game.playMinutes)}</b></div></div>
  </div>`;
}

function renderMessages(game) {
  const messages = game.log || [];
  return `<div class="tab-page"><div class="tab-heading"><div><div class="eyebrow">КПК · ЖУРНАЛ</div><h2>Сообщения</h2><p>Записи действий, найденные сведения и события Зоны.</p></div>${btn('Осмотреться','inspect','button ghost')}</div>
    <div class="message-feed">${messages.length?messages.map(m=>`<article class="message-entry ${m.type||'system'}"><div class="message-meta"><span>${m.type==='player'?'ТЫ':m.type==='danger'?'ОПАСНОСТЬ':'СИСТЕМА'}</span><small>${esc(m.at||'')}</small></div><p>${esc(m.text)}</p></article>`).join(''):'<div class="empty-state">Журнал пока пуст.</div>'}</div>
  </div>`;
}

function renderQuests(game) {
  const quests = (game.quests || []).filter(q=>['active','ready','completed'].includes(q.status));
  const repeat=game.sidorovichJobs?.active;
  const completed=quests.filter(q=>q.status==='completed').length;
  const questProgress=q=>q.id==='wolf-dog-pack'?`${game.wolfDogQuest?.killed||0}/5 собак`:q.status==='ready'?'Цель выполнена':q.status==='completed'?'Задание сдано':'Выполни указанное поручение';
  return `<div class="tab-page"><div class="tab-heading"><div><div class="eyebrow">КПК · ЖУРНАЛ ЗАДАНИЙ</div><h2>Задания</h2><p>В журнал попадают только принятые поручения и завершённые дела.</p></div><span class="quest-count">${completed}/${quests.length} выполнено</span></div>
    ${repeat?`<article class="quest-card active"><div class="quest-symbol">↻</div><div class="quest-main"><div class="quest-title-row"><h3>${esc(repeat.title)}</h3><span>ЦИКЛИЧЕСКОЕ</span></div><p>${esc(repeat.description)}</p><div class="quest-progress"><span>${repeat.type==='tails'?'Хвосты':repeat.type==='medusa'?'Артефакт':'Контакт с должником'}</span><b>${repeat.type==='tails'?`${countItem(game.inventory,'tail')}/5`:repeat.type==='medusa'?`${countItem(game.inventory,'medusa')}/1`:repeat.contacted?'1/1':'0/1'}</b></div><small>Заказчик: Сидорович · Награда: ${money(repeat.reward)}</small></div></article>`:''}
    <div class="quest-list">${quests.map(q=>{const npc=NPCS.find(n=>n.id===q.giver);const value=questProgress(q);return `<article class="quest-card ${q.status}"><div class="quest-symbol">${q.status==='completed'?'✓':q.status==='ready'?'✓':'!'}</div><div class="quest-main"><div class="quest-title-row"><h3>${esc(q.title)}</h3><span>${q.status==='completed'?'ВЫПОЛНЕНО':q.status==='ready'?'ОЖИДАЕТ СДАЧИ':'В ПРОЦЕССЕ'}</span></div><p>${esc(q.text)}</p><div class="quest-progress"><span>Текущий этап</span><b>${esc(value)}</b></div><small>Заказчик: ${esc(npc?.name||'Неизвестно')} · Награда: ${money(q.reward)}</small></div>${npc?avatarMarkup(npc.icon,npc.name,'♟'):''}</article>`}).join('') || '<div class="empty-state large">Пока нет активных заданий. Поговори с местными и узнай, кому нужна помощь.</div>'}</div>
  </div>`;
}


function renderPlayer(state) {
  const music=state.ui.music||{};
  const activePlayer=music.mode==='player';
  const current=activePlayer ? PLAYER_TRACKS.find(track=>track.id===music.trackId) : null;
  const queue=activePlayer ? (music.queue||[]) : [];
  const disabled=activePlayer?'':'disabled';
  const removedIds=new Set(state.settings.removedPlayerTrackIds||[]);
  const availableTracks=PLAYER_TRACKS.filter(track=>!removedIds.has(track.id));
  const removedTracks=PLAYER_TRACKS.filter(track=>removedIds.has(track.id));
  const modeHint=music.mode==='radio'?'Сейчас играет радиостанция. Выбери композицию из личной библиотеки, чтобы переключиться на плеер.':'Выбери песню — далее доступная подборка играет по порядку.';
  const trackRows=availableTracks.map((track,index)=>`<article class="player-track ${track.id===music.trackId&&activePlayer?'selected':''}"><span class="radio-track-number">${String(index+1).padStart(2,'0')}</span><div class="radio-track-meta"><b>${esc(track.title)}</b><small>${esc(track.artist)} · ${esc(track.label)}${track.year?` · ${track.year}`:''}</small></div>${btn(activePlayer&&track.id===music.trackId&&music.playing?'Ⅱ':'▶','player-play-track','button tiny '+(activePlayer&&track.id===music.trackId?'primary':'ghost'),`data-id="${track.id}"`)}${btn('Убрать','player-remove-track','button tiny ghost',`data-id="${track.id}"`)}</article>`).join('');
  const removedRows=removedTracks.map(track=>`<article class="player-track removed"><div class="radio-track-meta"><b>${esc(track.title)}</b><small>${esc(track.artist)} · ${esc(track.year||'')}</small></div>${btn('Вернуть','player-restore-track','button tiny primary',`data-id="${track.id}"`)}</article>`).join('');
  return `<div class="tab-page player-page"><div class="tab-heading"><div><div class="eyebrow">КПК · МЕДИАПЛЕЕР</div><h2>Плеер</h2><p>Вся музыкальная библиотека. Убирай ненужные песни из своей подборки и возвращай их в любое время.</p></div><span class="radio-status ${activePlayer&&music.playing?'live':''}"><i></i>${activePlayer&&music.playing?'ВОСПРОИЗВЕДЕНИЕ':activePlayer?'ПАУЗА':'ОЖИДАНИЕ'}</span></div>
    <section class="player-now panel"><div class="eyebrow">СЕЙЧАС ИГРАЕТ</div><h3>${esc(current?.title||'Ничего не выбрано')}</h3><p>${esc(current?.artist||modeHint)}</p><div class="radio-controls">${btn('◂ Предыдущая','player-prev','button ghost',disabled)}${btn(activePlayer?(music.playing?'Ⅱ Пауза':'▶ Играть / продолжить'):'▶ Выбери композицию','player-toggle','button primary',disabled)}${btn('Следующая ▸','player-next','button ghost',disabled)}${btn('■ Стоп','player-stop','button ghost',disabled)}</div><small>${queue.length?`Очередь: ${music.index+1} из ${queue.length}`:modeHint}</small></section>
    <section class="player-library panel"><div class="panel-title"><h3>Моя подборка</h3><span>${availableTracks.length} из ${PLAYER_TRACKS.length} композиций</span></div><div class="player-track-list">${trackRows||'<div class="empty-state">Подборка пуста. Верни композиции из списка ниже.</div>'}</div></section>
    <section class="player-library panel"><div class="panel-title"><h3>Убранные композиции</h3><span>${removedTracks.length}</span></div><div class="player-track-list">${removedRows||'<div class="empty-state">Ты ещё не убирал композиции из личной подборки.</div>'}</div></section>
    <p class="radio-disclaimer">Плеер использует YouTube IFrame API. Удаление действует только на личную подборку — композиции остаются в библиотеке и на радиостанциях. Нужен интернет.</p>
  </div>`;
}

function renderTrade(game,state) {
  const traders=getAvailableTraders(game,game.locationId);
  const trader=traders.find(entry=>entry.id===state.ui.tradeNpcId);
  if (!trader) {
    return `<div class="tab-page trade-page"><div class="tab-heading"><div><div class="eyebrow">ТОРГОВЦЫ КОРДОНА</div><h2>Торговля</h2><p>Торговцы, находящиеся в текущей локации. Бродячие сталкеры меняют место вместе с течением игрового времени.</p></div><div class="money-readout">▣ ${money(game.money)}</div></div>
      ${traders.length?`<div class="trade-merchant-grid">${traders.map(entry=>`<button class="trade-merchant panel" data-action="trade-open" data-id="${entry.id}">${avatarMarkup(entry.icon,entry.name,'♟')}<span><b>${esc(entry.name)}</b><small>${esc(entry.role||'Бродячий торговец')} · ${esc(entry.group||'Путники')}</small><em>${entry.random?'Путник, может уйти с Кордона':'Постоянный торговец'}</em></span><i>Открыть →</i></button>`).join('')}</div>`:'<div class="empty-state large">В этой локации торговцев нет. Проверь КПК позже: бродячие торговцы перемещаются между подлокациями.</div>'}
    </div>`;
  }
  const stock=(trader.stock||[]).filter(entry=>entry.qty>0);
  const inv=game.inventory||[];
  return `<div class="tab-page trade-page"><div class="tab-heading"><div><div class="eyebrow">ТОРГОВЕЦ · СДЕЛКА</div><h2>${esc(trader.name)}</h2><p>${esc(trader.role||'Торговец')} · ${esc(getLocation(trader.location)?.name||'Кордон')}</p></div><div class="money-readout">▣ ${money(game.money)}</div></div>
    <div class="trade-topline">${avatarMarkup(trader.icon,trader.name,'♟')}<div><b>${esc(trader.name)}</b><small>${trader.random?'Бродячий торговец':'Постоянная торговая точка'}</small></div><span>Рюкзак: ${getWeight(inv).toFixed(1)} / ${MAX_CARRY_KG} кг</span>${btn('← К торговцам','trade-back','button ghost small')}</div>
    <div class="trade-columns"><section class="panel trade-stock"><div class="panel-title"><h3>Товар торговца</h3><span>${stock.length} позиций</span></div>${stock.length?stock.map(entry=>{const item=getItem(entry.id);if(!item)return '';return `<article class="trade-row"><div class="trade-image">${itemImage(item)}</div><div class="trade-info"><b>${esc(item.name)}</b><small>${item.weight} кг · в наличии: ${entry.qty}</small><strong>${money(entry.price)}</strong></div>${btn('Купить','trade-buy','button small primary',`data-trader-id="${trader.id}" data-item-id="${item.id}"`)}</article>`}).join(''):'<div class="empty-state">Товар закончился. Запасы пополняются не сразу.</div>'}</section>
    <section class="panel trade-sell"><div class="panel-title"><h3>Продать торговцу</h3><span>${inv.length} видов</span></div>${inv.length?inv.map(stack=>{const item=getItem(stack.id);if(!item)return '';const sellPrice=Math.max(1,Math.floor(item.price*(trader.buyMultiplier||.4)));return `<article class="trade-row"><div class="trade-image">${itemImage(item)}</div><div class="trade-info"><b>${esc(item.name)} ×${stack.qty}</b><small>${item.weight} кг за штуку · цена выкупа</small><strong>${money(sellPrice)}</strong></div>${btn('Продать 1','trade-sell','button small ghost',`data-trader-id="${trader.id}" data-item-id="${item.id}"`)}</article>`}).join(''):'<div class="empty-state">В рюкзаке пока нечего продавать.</div>'}</section></div>
  </div>`;
}

function renderContacts(game,state) {
  const nameGenPanel = `<div class="panel name-generator"><h3>Генератор имён и кличек</h3><p>Случайные сочетания для новых сталкеров.</p>${btn("Сгенерировать имя", "generate-stalker-name", "button primary")}${state?.ui?.generatedName?`<div class="generated-stalker-name"><small>НОВЫЙ СТАЛКЕР</small><b>${esc(state.ui.generatedName)}</b></div>`:''}</div>`;

  const groups = ['Одиночки','Бандиты','Военные'];
  return `<div class="tab-page"><div class="tab-heading"><div><div class="eyebrow">КПК · КОНТАКТЫ</div><h2>Персонажи и группировки</h2><p>Найди персонажа в его текущей локации, чтобы начать диалог.</p></div></div>
    ${nameGenPanel}${groups.map(group=>`<section class="contact-group"><h3>${group}</h3><div class="contact-grid">${NPCS.filter(n=>n.group===group).map(n=>{const here=n.location===game.locationId;return `<article class="contact-card">${avatarMarkup(n.icon,n.name,'♟')}<div><b>${esc(n.name)}</b><small>${esc(n.role)}</small><span>${esc(getLocation(n.location)?.name||'')}</span></div><div class="contact-actions">${btn(here?'Поговорить':'Не здесь','talk','button small '+(here?'primary':'ghost'),`data-id="${n.id}" ${here?'':'disabled'}`)}</div></article>`}).join('')}</div></section>`).join('')}
    <section class="contact-group"><h3>Бродячие торговцы и сталкеры</h3><div class="contact-grid">${(game.randomTraders||[]).map(n=>{const here=n.location===game.locationId;return `<article class="contact-card">${avatarMarkup(n.icon,n.name,'♟')}<div><b>${esc(n.name)}</b><small>${esc(n.role||'Путник / торговец')}</small><span>${esc(getLocation(n.location)?.name||'')}</span></div><div class="contact-actions">${btn(here?'Поговорить':'В пути','talk','button small ghost',`data-id="${n.id}" ${here?'':'disabled'}`)}</div></article>`}).join('')}</div></section>
    <section class="contact-group"><h3>Отряды в движении</h3><div class="squad-list">${game.squads.map(s=>`<div class="squad-row"><span class="squad-mark">⚑</span><span><b>${esc(s.name)}</b><small>${s.members} человек · ${esc(getLocation(s.location)?.name||'')}</small></span></div>`).join('')}</div></section>
  </div>`;
}

function renderCombat(game) { return ''; }

function renderArtifact(game) {
  const hunt=game.artifactHunt;
  if (!hunt) return '';
  return `<div class="modal-shade"><div class="modal-card artifact-modal"><button class="modal-close" data-action="close-artifact">×</button><div class="eyebrow">МИНИ-ИГРА · ПОИСК АРТЕФАКТА</div><h2>Сигнал детектора</h2><p>Выбери сектор, в котором сигнал кажется сильнее. На поиск есть три попытки.</p><div class="detector-face"><span>ОТКЛИК</span><b>${['▂','▅','▃'][hunt.attempts%3]}</b><small>АНОМАЛЬНАЯ АКТИВНОСТЬ</small></div><div class="sector-buttons">${[0,1,2].map(i=>btn(`Сектор ${i+1}`,'artifact-sector','button sector-button',`data-sector="${i}"`)).join('')}</div><small>Попыток использовано: ${hunt.attempts}/3</small></div></div>`;
}

function renderDialogue(game,character={}) {
  if (!game.dialogueNpcId) return '';
  const npc=NPCS.find(n=>n.id===game.dialogueNpcId)||(game.randomTraders||[]).find(n=>n.id===game.dialogueNpcId);
  if (!npc) return '';
  const playerFaction=FACTIONS.find(f=>f.id===game.player.faction);
  const npcFaction=FACTIONS.find(f=>f.id===npc.faction);
  const jobs=game.sidorovichJobs||{}; const active=jobs.active;
  const workTopic=/работ|задан|квест|поруч|помощ|дело|служб|пропуск/.test(game.dialogueTopic||'');
  const sidorovichActions=npc.id==='sidorovich'&&workTopic?`<div class="dialogue-quest-actions">${active?`<div class="quest-mini"><b>Текущее поручение: ${esc(active.title)}</b><small>${esc(active.description)}</small></div>${btn('Сдать поручение','quest-turnin','button primary')}`:btn('Взять случайное поручение','quest-accept','button primary')}</div>`:'';
  const wolfJob=game.wolfDogQuest;
  const wolfActions=npc.id==='wolf'&&workTopic?`<div class="dialogue-quest-actions">${wolfJob?.status==='active'?`<div class="quest-mini"><b>Собаки у вагончика: ${wolfJob.killed}/5</b><small>Доберись до вагончика и уничтожь оставшихся слепых псов.</small></div>`:wolfJob?.status==='ready'?`<div class="quest-mini"><b>Поручение выполнено: 5/5</b><small>Вернись и доложи.</small></div>${btn('Доложить Волку','wolf-quest-turnin','button primary')}`:wolfJob?.status==='completed'?'<div class="quest-mini"><b>Поручение завершено</b></div>':btn('Согласиться и помочь','wolf-quest-accept','button primary')}</div>`:'';
  const genericOffers=workTopic?(game.quests||[]).filter(q=>q.giver===npc.id&&q.status==='available'&&q.id!=='wolf-dog-pack'):[];
  const offerMarkup=genericOffers.length?`<div class="dialogue-quest-actions">${genericOffers.map(q=>`<div class="quest-mini"><b>${esc(q.title)}</b><small>${esc(q.text)} · Награда: ${money(q.reward)}</small>${btn('Принять задание','quest-accept-generic','button primary',`data-id="${q.id}"`)}</div>`).join('')}</div>`:'';
  const history=(game.dialogueHistory||[]).map(entry=>`<div class="dialogue-line ${entry.role==='player'?'player-line':'npc-line'}"><small>${entry.role==='player'?esc(character.name||'ТЫ'):esc(npc.name.toUpperCase())}</small><p>${esc(entry.text)}</p></div>`).join('');
  return `<div class="modal-shade dialogue-shade"><section class="dialogue-layout">
    <aside class="dialogue-person player-person">${avatarMarkup(character.avatar,character.name||'Сталкер','☢')}<b>${esc(character.name||'Сталкер')}</b><span>${esc(playerFaction?.name||'Без фракции')}</span><small>${esc(game.player.rank||'Новичок')} · рейтинг ${game.player.rating||0}</small></aside>
    <main class="dialogue-modal dialogue-center"><header class="dialogue-center-head"><div><div class="eyebrow">РАЗГОВОР · ${esc(getLocation(game.locationId)?.name||'КОРДОН')}</div><h2>${esc(npc.name)}</h2><small>${esc(npc.role||'Сталкер')} · ${esc(npc.group||npcFaction?.name||'Путники')}</small></div><button class="modal-close" data-action="close-dialogue">×</button></header>
      <div class="dialogue-history" id="dialogue-history">${history||`<div class="dialogue-line npc-line"><small>${esc(npc.name.toUpperCase())}</small><p>${esc(npc.greeting||'Чего хотел, сталкер?')}</p></div>`}</div>
      ${sidorovichActions}${wolfActions}${offerMarkup}
      <form class="dialogue-text-form" id="npc-dialogue-form"><label for="npc-message">Твоё сообщение</label><textarea id="npc-message" name="message" maxlength="700" rows="3" placeholder="Напиши NPC своими словами…" required></textarea><div class="dialogue-send-row"><small>Свободный текст · контекст разговора сохраняется</small><button class="button primary" type="submit">Отправить ↗</button></div></form>
    </main>
    <aside class="dialogue-person npc-person">${avatarMarkup(npc.icon,npc.name,'♟')}<b>${esc(npc.name)}</b><span>${esc(npcFaction?.name||npc.group||'Путники')}</span><small>${esc(npc.role||'Сталкер')} · рейтинг ${npc.rating??0}</small></aside>
  </section></div>`;
}


function renderSleep(game) {
  return `<div class="modal-shade"><div class="modal-card sleep-modal"><button class="modal-close" data-action="close-sleep">×</button><div class="eyebrow">ОТДЫХ</div><h2>Переждать время</h2><p>Во время сна восстанавливаются силы, но растут голод и жажда. Во время боя спать нельзя.</p><div class="sleep-options">${[1,3,6,8,12].map(h=>btn(`${h} ч`,'sleep','button',`data-hours="${h}"`)).join('')}</div><small>Время в игре начинается 15 апреля и постепенно идёт вперёд.</small></div></div>`;
}

export function renderGameSettings(state) {
  return `<section class="screen-wrap settings-screen"><header class="screen-heading"><div><div class="eyebrow">СИСТЕМНЫЕ ПАРАМЕТРЫ</div><h2>Настройки</h2><p>Параметры интерфейса и локального сохранения.</p></div>${btn('← Назад','settings-back','button ghost')}</header>
    <div class="settings-layout"><div class="panel"><h3>Музыка и радио</h3><p class="muted">Радио баз играет композиции в случайной очереди без ручного выбора. Во вкладке «Плеер» можно выбрать отдельную песню, поставить паузу или переключить композицию. Музыка работает через внешний YouTube-плеер и продолжает играть при смене вкладок.</p>${btn('♫ Открыть радио','settings-open-radio','button primary')}</div>
    <div class="panel"><h3>Интерфейс</h3><label class="setting-row"><span><b>Уменьшить анимацию</b><small>Для слабых устройств</small></span><input type="checkbox" data-setting="reducedMotion" ${state.settings.reducedMotion?'checked':''}></label><div class="setting-row"><span><b>Ориентация</b><small>Лучше всего горизонтально, но портретный режим тоже поддерживается.</small></span><span class="setting-value">LANDSCAPE</span></div><label class="setting-row"><span><b>Разрешение / масштаб интерфейса</b><small>Подстройка размера элементов под экран</small></span><select data-setting="uiScale"><option value="0.9" ${state.settings.uiScale===0.9?'selected':''}>90%</option><option value="1" ${!state.settings.uiScale||state.settings.uiScale===1?'selected':''}>100%</option><option value="1.1" ${state.settings.uiScale===1.1?'selected':''}>110%</option><option value="1.2" ${state.settings.uiScale===1.2?'selected':''}>120%</option></select></label></div>
    <div class="panel"><h3>Сохранения</h3><p class="muted">Данные хранятся в браузере этого устройства. Экспортируй файл, чтобы перенести прогресс на другой телефон или ноутбук.</p><div class="setting-actions">${btn('↓ Скачать сохранение','export-save','button primary')}<label class="button ghost upload-button">Загрузить сохранение<input type="file" id="save-upload" accept="application/json" hidden></label></div><small>Перенос между устройствами: экспорт на первом устройстве → импорт на втором.</small></div></div>
    ${btn('Сбросить весь прогресс','reset-all','button danger-ghost')}
  </section>`;
}

export function renderModal(state) {
  if (state.ui.modal === 'map-location') {
    const loc=getLocation(state.ui.mapLocationId);
    if (!loc) return '';
    const current=state.game?.locationId===loc.id;
    const reachable=(getLocation(state.game?.locationId)?.neighbors||[]).includes(loc.id);
    const travelMinutes=reachable ? getTravelMinutes(state.game.locationId,loc.id) : null;
    const hazard=loc.hazards?.length?loc.hazards.map(h=>h==='radiation'?'☢ Радиационный фон':`◉ ${loc.anomalyName||'Гравитационная аномалия'}`).join(' · '):'Явных аномалий не отмечено';
    const questTarget = quest => quest.id==='wolf-dog-pack'?'trailer':quest.condition?.startsWith('visit:')?quest.condition.slice(6):quest.condition==='search:stop'?'stop':quest.condition==='artifact:anomaly-dump'?'anomaly-dump':null;
    const related=(state.game?.quests||[]).filter(q=>['active','ready'].includes(q.status)&&questTarget(q)===loc.id);
    const questMarkup=`<section class="map-related-quests"><div class="eyebrow">ЦЕЛИ ЗАДАНИЙ В ЭТОЙ ЛОКАЦИИ</div>${related.length?related.map(q=>`<article><b>${esc(q.title)}</b><p>${esc(q.text)}</p>${q.id==='wolf-dog-pack'?`<div class="quest-progress"><span>Уничтожено слепых псов</span><b>${state.game.wolfDogQuest?.killed||0}/5</b></div>`:''}<small>${q.status==='ready'?'Цель выполнена — вернись к заказчику':'Поручение активно'}</small></article>`).join(''):'<p class="muted small-copy">В этой локации сейчас нет активных целей.</p>'}</section>`;
    const localSpots=getExploreSpots(loc.id).filter(spot=>spot.id!=='area-outside');
    const spotMarkup=`<section class="map-related-quests map-related-spots"><div class="eyebrow">МЕСТА В ЭТОЙ ЛОКАЦИИ</div>${localSpots.length?`<div class="map-spot-directory">${localSpots.map(spot=>`<article><b>${esc(spot.name)}</b><small>${esc(spot.kind==='storage'?'Личное хранилище':spot.kind==='breakable'?'Разрушаемый ящик':spot.kind==='campfire'?'Место отдыха':'Место для обыска')}</small><p>${esc(spot.description)}</p></article>`).join('')}</div>`:'<p class="muted small-copy">В этой локации нет отдельных мест для осмотра.</p>'}</section>`;
    const sceneIcon=loc.hazards?.includes('gravity')?'◉':loc.id==='trailer'?'▣':loc.id==='atp'?'⚙':loc.id.includes('checkpoint')?'⚑':loc.id==='elevator'?'▥':'⌂';
    return `<div class="modal-shade"><div class="modal-card map-location-modal"><button class="modal-close" data-action="close-modal" aria-label="Закрыть">×</button><div class="map-location-head"><div><div class="eyebrow">КОРДОН · ПОДЛОКАЦИЯ</div><h2>${esc(loc.name)}</h2><small>${current?'Текущее местоположение':reachable?'Соседний участок':'Дальний участок карты'}</small></div><span class="map-location-flag">${current?'ЗДЕСЬ':reachable?`${travelMinutes} МИН ПЕШКОМ`:'РАЗВЕДАНО / НЕ ДОСТУПНО НАПРЯМУЮ'}</span></div><div class="map-location-art scene-${esc(loc.id)}"><span>${sceneIcon}</span><b>${esc(loc.name.toUpperCase())}</b><small>ВИЗУАЛЬНЫЙ ОРИЕНТИР · КОРДОН</small></div><p>${esc(loc.desc)}</p><div class="map-location-meta"><span>${hazard}</span><span>Соседних переходов: ${loc.neighbors?.length||0}</span>${travelMinutes!==null?`<span>Время пешком: ${travelMinutes} мин</span>`:''}</div>${spotMarkup}${questMarkup}<div class="modal-actions">${btn(current?'Ты находишься здесь':reachable?'Проложить путь · '+travelMinutes+' мин':'Нет прямого перехода','map-modal-travel','button primary',`data-id="${loc.id}" ${current||!reachable?'disabled':''}`)}${btn('Закрыть','close-modal','button ghost')}</div></div></div>`;
  }
  if (state.ui.modal === 'loot-panel') {
    return `<div class=\"modal-shade management-shade\"><div class=\"modal-card loot-management-modal\">${renderLootPanel(state.game)}</div></div>`;
  }
  if (state.ui.modal === 'inventory-panel') {
    return `<div class="modal-shade management-shade"><section class="modal-card management-modal"><button class="modal-close" data-action="close-modal">×</button>${renderInventory(state.game,{combat:!!state.game?.activeEncounter})}</section></div>`;
  }
  if (state.ui.modal === 'trade-panel') {
    return `<div class="modal-shade management-shade"><section class="modal-card management-modal"><button class="modal-close" data-action="close-modal">×</button>${renderTrade(state.game,state)}</section></div>`;
  }
  if (state.ui.modal === 'explore-spots') {
    const spots=getExploreSpots(state.game?.locationId);
    return `<div class="modal-shade"><section class="modal-card explore-spots-modal"><button class="modal-close" data-action="close-modal">×</button><div class="eyebrow">КОРДОН · ИССЛЕДОВАНИЕ</div><h2>Что осмотреть?</h2><p>Выбери место для осмотра или открой личное хранилище.</p><div class="explore-spot-list">${spots.map(spot=>`<button class="explore-spot-choice" data-action="explore-spot" data-id="${spot.id}"><span>${spot.kind==='campfire'?'♨':spot.kind==='storage'?'▣':spot.kind==='breakable'?'▤':'⌕'}</span><b>${esc(spot.name)}</b><small>${esc(spot.description)}</small><i>${spot.kind==='storage'?'Открыть хранилище →':spot.kind==='breakable'?'Сломать и обыскать →':'Осмотреть →'}</i></button>`).join('')||'<div class="empty-state">Здесь пока нет отдельных помещений для осмотра.</div>'}</div></section></div>`;
  }
  if (state.ui.modal === 'explore-find') {
    const pending=state.game?.pendingDiscovery;
    const spot=pending?getExploreSpots(state.game.locationId).find(entry=>entry.id===pending.spotId):null;
    return `<div class="modal-shade"><section class="modal-card explore-find-modal"><button class="modal-close" data-action="close-modal">×</button><div class="eyebrow">ОБЫСК · НАХОДКИ</div><h2>${esc(spot?.name||'Найденные вещи')}</h2><p>Ты осмотрел помещение. Выбери одну вещь, которую заберёшь с собой; остальное останется здесь.</p><div class="explore-find-options">${(pending?.options||[]).map(item=>`<button class="explore-find-choice" data-action="explore-pick" data-id="${item.id}"><span>${esc(getItem(item.id)?.emoji||'▧')}</span><b>${esc(item.name)}</b><small>${esc(item.description)}</small><i>Забрать →</i></button>`).join('')}</div></section></div>`;
  }
  if (state.ui.modal === 'avatars') {
    const groups = [
      { id:'loner', title:'Одиночки', note:'6 портретов' },
      { id:'bandit', title:'Бандиты', note:'4 портрета' },
      { id:'military', title:'Военные', note:'4 портрета' },
      { id:'npc', title:'Ключевые NPC', note:'4 портрета' }
    ];
    return `<div class="modal-shade"><div class="modal-card avatar-modal"><button class="modal-close" data-action="close-modal">×</button><div class="eyebrow">ВНЕШНОСТЬ · НАБОР ПОРТРЕТНЫХ ЗНАЧКОВ</div><h2>Выбрать портрет</h2><p>Все 18 встроенных вариантов обозначений. Можно выбрать символ своей группировки или ключевого NPC.</p>${groups.map(group=>`<section class="avatar-group"><div class="avatar-group-heading"><b>${group.title}</b><small>${group.note}</small></div><div class="avatar-choice-grid">${AVATAR_OPTIONS.filter(option=>option.group===group.id).map(option=>`<button data-action="choose-avatar" data-src="${esc(option.src)}" title="${esc(option.name)}">${avatarMarkup(option.src,option.name,group.id==='military'?'🪖':group.id==='bandit'?'♟':'☢')}<span class="avatar-choice-label">${esc(option.name)}</span></button>`).join('')}</div></section>`).join('')}</div></div>`;
  }
  if (state.ui.modal === 'exit') return `<div class="modal-shade"><div class="modal-card"><div class="eyebrow">ВЫХОД</div><h2>Закрыть игру?</h2><p>Браузер не может закрыть вкладку, открытую пользователем. Сохранение уже хранится на устройстве.</p>${btn('Понятно','close-modal','button primary')}</div></div>`;
  if (state.ui.modal === 'reset') return `<div class="modal-shade"><div class="modal-card"><div class="eyebrow danger-text">ВНИМАНИЕ</div><h2>Сбросить прогресс?</h2><p>Будут удалены все персонажи, достижения и настройки, хранящиеся в этом браузере.</p><div class="modal-actions">${btn('Отмена','close-modal','button ghost')}${btn('Удалить всё','confirm-reset','button danger')}</div></div></div>`;
  return '';
}

export function renderGame(state) {
  const game=state.game;
  const character=state.characters.find(c=>c.id===state.activeCharacterId) || state.pendingCharacter || {name:'Сталкер',avatar:''};
  if (!game) return `<div class="screen-wrap">${btn('← Назад','back-characters','button ghost')}<div class="empty-state">Сохранение игры не найдено.</div></div>`;
  const clock=getGameDateTime(game.clock);
  const allowedTabs=['location','map','stats','player','messages','quests','contacts'];
  if (!allowedTabs.includes(state.ui.tab)) state.ui.tab='location';
  const tabs={
    location:renderLocation(game,character,state), map:renderMap(game,state),
    stats:renderStats(game,character), player:renderPlayer(state), messages:renderMessages(game), quests:renderQuests(game), contacts:renderContacts(game,state)
  };
  const pdaOpen=!!state.ui.pdaOpen;
  if (pdaOpen) {
    return `<section class="pda-fullscreen-page" aria-label="КПК персонажа" style="--pda-texture:url('${ASSETS.pda}')">
      <header class="pda-fullscreen-header"><div class="pda-device-mark">☷ <span>ZONE LINK</span></div><div class="pda-device-player">${avatarMarkup(character.avatar,character.name,'☢')}<div><b>${esc(character.name)}</b><small>${esc(FACTIONS.find(f=>f.id===game.player.faction)?.name||'')} · ${clock.date} · ${clock.time}</small></div></div><div class="pda-device-status"><span>${money(game.money)}</span><span>♥ ${game.player.hp}/${game.player.maxHp}</span></div>${btn('Закрыть КПК ×','pda-toggle','button pda-close-button','aria-label="Закрыть КПК и вернуться в игру"')}</header>
      <div class="pda-fullscreen-tabs"><nav class="game-nav" aria-label="Разделы КПК">${gameNav(state.ui.tab||'location')}</nav></div>
      <main class="pda-fullscreen-content">${tabs[state.ui.tab]||tabs.location}</main>
      ${renderCombat(game)}${renderArtifact(game)}${renderDialogue(game,character)}${state.ui.modal==='sleep'?renderSleep(game):''}
    </section>`;
  }
  return `<section class="game-shell"><div class="game-main">
    <header class="game-topbar"><div class="topbar-player">${avatarMarkup(character.avatar,character.name,'☢')}<div><b>${esc(character.name)}</b><small>${esc(FACTIONS.find(f=>f.id===game.player.faction)?.name||'')}</small></div></div><div class="topbar-status"><span class="money-readout">▣ ${money(game.money)}</span><span>♥ ${game.player.hp}/${game.player.maxHp}</span><span>🍞 ${Math.round(game.player.hunger)}%</span><span>💧 ${Math.round(game.player.thirst)}%</span><span class="clock-readout" data-game-clock>◷ ${clock.date} · ${clock.time}</span></div><div class="topbar-buttons">${btn('▦ Рюкзак','inventory-open','button ghost')}${btn('Открыть КПК','pda-toggle','button pda-toggle-button','aria-expanded="false"')}${btn('⚙','settings','icon-button',`title="Настройки"`)}${btn('⇩','export-save','icon-button',`title="Экспорт сохранения"`)}</div></header>
    <div class="game-content pda-closed-content">${tabs.location}</div>
    <form class="action-composer" id="action-form"><span class="composer-symbol">⌁</span><input id="player-action" type="text" maxlength="220" placeholder="Опиши действие… например: осмотреться, поговорить с Волком, обыскать местность" autocomplete="off"><button class="send-action" type="submit">Отправить ↗</button></form>
  </div>${renderCombat(game)}${renderArtifact(game)}${renderDialogue(game,character)}${state.ui.modal==='sleep'?renderSleep(game):''}</section>`;
}
