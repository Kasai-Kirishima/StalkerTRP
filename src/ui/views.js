import { ASSETS, IMAGE_FALLBACKS, FACTIONS, AVATAR_OPTIONS, RADIO_TRACKS, RADIO_STATIONS, PLAYER_TRACKS, ITEMS, LOCATIONS, NPCS, BLIND_DOG_IMAGES, MAX_CARRY_KG, START_BUDGET, STARTER_ITEM_IDS } from '../data/catalog.js';
import { getWeight, countItem, getItem } from '../systems/inventory.js';
import { getGameDateTime, formatElapsed } from '../systems/game-clock.js';
import { getLocation, getAvailableTraders, getSidorovichJobState, getTravelMinutes } from '../systems/world.js';

export const esc = (value='') => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const money = (value) => `${Number(value || 0).toLocaleString('ru-RU')} RU`;
const avatarMarkup = (src, name, emoji='☢') => {
  if (src && String(src).startsWith('data:image/')) return `<div class="avatar-wrap"><img src="${esc(src)}" alt="${esc(name)}"></div>`;
  return `<div class="avatar-wrap"><span class="avatar-fallback">${emoji}</span></div>`;
};
const itemImage = (item) => {
  const icons = { 'Еда':'🥫', 'Медицина':'✚', 'Добыча':'☣', 'Артефакты':'◆', 'Оружие':'⚒', 'Боеприпасы':'▦', 'Снаряжение':'▣', 'Броня':'▤', 'Защита':'◈' };
  return `<span class="item-emoji">${item.emoji || icons[item.cat] || '▧'}</span>`;
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
  const tabs = [ ['location','◈','Местность'],['map','⌖','Карта'],['inventory','▦','Рюкзак'],['trade','₽','Торговля'],['stats','▤','Статистика'],['radio','♫','Радио'],['player','▶','Плеер'],['messages','✉','Связь'],['quests','☷','Задания'],['contacts','♟','Контакты'] ];
  return tabs.map(([id,ico,label])=>`<button class="nav-tab ${active===id?'active':''}" data-action="tab" data-tab="${id}"><span>${ico}</span><b>${label}</b></button>`).join('');
}

function renderLocation(game, character) {
  const location = getLocation(game.locationId);
  const npcs = NPCS.filter(npc=>npc.location===game.locationId);
  const traders = getAvailableTraders(game,game.locationId);
  const squads = game.squads.filter(squad=>squad.location===game.locationId);
  const description = game.currentDescription || location?.desc || '';
  const hazard = location?.hazards?.length ? `<div class="hazard-row">${location.hazards.map(h=>`<span class="hazard-chip ${h}">${h==='radiation'?'☢ Радиационный очаг':`◉ Гравитационная аномалия${location.anomalyName?`: ${esc(location.anomalyName)}`:''}`}</span>`).join('')}</div>` : '';
  const baseStation = RADIO_STATIONS.find(station=>station.locationId===game.locationId);
  const baseRadio = baseStation ? `<div class="side-panel base-radio-panel"><div class="panel-title"><h3>Базовая радиостанция</h3><span>${esc(baseStation.frequency)}</span></div><p class="environment-copy">${esc(baseStation.name)} · эфир группировки: ${esc(baseStation.faction)}</p>${btn('♫ Включить местное радио','radio-base-open','button primary wide',`data-id="${baseStation.id}"`)}</div>` : '';
  const npcRows = npcs.map(npc=>`<div class="npc-row-wrap"><button class="npc-row" data-action="talk" data-id="${npc.id}">${avatarMarkup(npc.icon,npc.name,'♟')}<span><b>${esc(npc.name)}</b><small>${esc(npc.role)} · ${esc(npc.group)}</small></span><i>→</i></button>${npc.trader?btn('Открыть торговлю','trade-open','button tiny ghost',`data-id="${npc.id}"`):''}</div>`).join('');
  const traderRows = traders.filter(trader=>trader.random).map(trader=>`<div class="npc-row-wrap"><button class="npc-row" data-action="trade-open" data-id="${trader.id}">${avatarMarkup(trader.icon,trader.name,'♟')}<span><b>${esc(trader.name)}</b><small>Бродячий торговец · Путник</small></span><i>₽</i></button></div>`).join('');
  return `<div class="location-view">
    <div class="location-hero"><div class="location-terrain-mark" aria-hidden="true">☢</div><div class="location-overlay"></div><div class="location-title"><div class="eyebrow">КОРДОН · ТЕКУЩАЯ ЛОКАЦИЯ</div><h2>${esc(location?.name||'Неизвестно')}</h2><p>${esc(location?.desc||'')}</p></div><div class="location-weather">${esc(game.weather||'Пасмурно')}</div></div>
    <div class="location-body"><div class="location-actions"><div class="section-caption"><b>ДЕЙСТВИЯ</b><small>Опиши действие в строке снизу или выбери команду</small></div><div class="action-grid">${btn('⌕ Осмотреться','inspect','action-tile')}${btn('▤ Обыскать местность','search','action-tile')}${btn('◉ Искать артефакт','artifact-start','action-tile')}${btn('⌖ Перейти на карте','tab-map','action-tile')}${btn('☾ Отдохнуть','sleep-open','action-tile')}${btn('⚑ Проверить аномалию','anomaly','action-tile')}</div>${hazard}</div>
      <div class="location-side"><div class="side-panel"><div class="panel-title"><h3>Люди рядом</h3><span>${npcs.length+traders.filter(t=>t.random).length+squads.length}</span></div>${npcRows || '<p class="muted small-copy">Знакомых персонажей рядом нет.</p>'}${traderRows}${squads.map(s=>`<div class="squad-row"><span class="squad-mark">⚑</span><span><b>${esc(s.name)}</b><small>${s.members} человек · ${esc(s.faction==='loner'?'Одиночки':s.faction==='bandit'?'Бандиты':'Военные')}</small></span></div>`).join('')}</div>
      <div class="side-panel"><div class="panel-title"><h3>Окружение</h3></div><p class="environment-copy">${esc(description)}</p><div class="mini-readout"><span>Соседние локации</span><b>${location?.neighbors?.length||0}</b></div><button class="text-action" data-action="tab-map">Открыть карту Кордона →</button></div>${baseRadio}</div></div>
    </div>
  </div>`;
}

function renderMap(game) {
  const location = getLocation(game.locationId);
  const mapLocations=LOCATIONS.filter(loc=>loc.mapVisible!==false);
  return `<div class="tab-page map-page"><div class="tab-heading"><div><div class="eyebrow">КПК · НАВИГАЦИЯ</div><h2>Карта Кордона</h2><p>Чистая карта Кордона с точками подлокаций. Нажми на круг, чтобы открыть описание и узнать время перехода.</p></div><span class="legend"><i></i> Ты сейчас здесь</span></div>
    <div class="map-frame"><img src="${ASSETS.map}" alt="Чистая карта Кордона" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="map-fallback" hidden>КАРТА КОРДОНА<br><small>Изображение карты недоступно</small></div><div class="map-pins">${mapLocations.map(loc=>`<button class="map-pin ${loc.id===game.locationId?'current':''} ${(location?.neighbors||[]).includes(loc.id)?'reachable':''}" style="left:${loc.x}%;top:${loc.y}%" data-action="location-open" data-id="${loc.id}" aria-label="${esc(loc.name)}" title="${esc(loc.name)}"></button>`).join('')}</div></div>
    <div class="map-location-list"><h3>Ближайшие переходы</h3><div class="neighbor-grid">${(location?.neighbors||[]).map(id=>{const loc=getLocation(id);return `<article class="neighbor-card"><button class="neighbor-main" data-action="travel" data-id="${id}"><span>⌖</span><b>${esc(loc?.name||id)}</b><small>Пешком · ${getTravelMinutes(game.locationId,id)} мин</small></button><button class="neighbor-scout" data-action="scout" data-id="${id}">Осмотреть биноклем</button></article>`}).join('')}</div></div>
    <div class="map-legend-row"><span>☢ Радиационные очаги отмечаются в описании локации</span><span>◉ Гравитационные поля требуют проверки болтом</span><span>▧ Тайники и находки появляются после исследования</span></div>
  </div>`;
}

function renderInventory(game) {
  const weight = getWeight(game.inventory);
  const stacks = game.inventory;
  return `<div class="tab-page"><div class="tab-heading"><div><div class="eyebrow">КПК · СНАРЯЖЕНИЕ</div><h2>Инвентарь</h2><p>Каждый предмет занимает место в сетке. Предельный переносимый вес — ${MAX_CARRY_KG} кг.</p></div><div class="weight-box"><b>${weight.toFixed(1)} кг</b><small>из ${MAX_CARRY_KG} кг</small><div class="bar-track"><i style="width:${Math.min(100,weight/MAX_CARRY_KG*100)}%"></i></div></div></div>
    ${stacks.length ? `<div class="inventory-grid">${stacks.map(stack=>{const item=getItem(stack.id);if(!item)return '';return `<article class="inventory-item" style="grid-column:span ${item.w};grid-row:span ${item.h}"><div class="inventory-item-image">${itemImage(item)}</div><b>${esc(item.name)}</b><small>${stack.qty>1?`×${stack.qty} · `:''}${stack.id==='boltpack'?`болтов: ${game.boltsRemaining??stack.qty*10}`:['ammo9x18','ammo9x19','ammo545','shells'].includes(stack.id)?`патронов: ${game.ammoRounds?.[stack.id]??stack.qty*(stack.id==='shells'?8:stack.id==='ammo545'?30:12)}`:`${(item.weight*stack.qty).toFixed(2)} кг`}</small><div class="inventory-item-actions">${item.use?btn('Использовать','use-item','button tiny primary',`data-id="${item.id}"`):''}${btn('Выбросить','drop-item','button tiny ghost',`data-id="${item.id}"`)}</div></article>`}).join('')}</div>` : '<div class="empty-state large">Рюкзак пуст. Вернись к торговцу или обыщи местность.</div>'}
    <div class="inventory-footer"><span>Слоты отображают размеры предметов × сетки, количество — в подписи.</span>${btn('Осмотреть снаряжение','inspect','button ghost')}</div>
  </div>`;
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
  const quests = game.quests || [];
  const repeat=game.sidorovichJobs?.active;
  return `<div class="tab-page"><div class="tab-heading"><div><div class="eyebrow">КПК · ЖУРНАЛ ЗАДАНИЙ</div><h2>Задания</h2><p>Поручения местных жителей и найденные зацепки.</p></div><span class="quest-count">${quests.filter(q=>q.status==='completed').length}/${quests.length} выполнено</span></div>
    ${repeat?`<article class="quest-card active"><div class="quest-symbol">↻</div><div class="quest-main"><div class="quest-title-row"><h3>${esc(repeat.title)}</h3><span>ЦИКЛИЧЕСКОЕ</span></div><p>${esc(repeat.description)}</p><small>Заказчик: Сидорович · Награда: ${money(repeat.reward)}${repeat.type==='tails'?` · ${countItem(game.inventory,'tail')}/5 хвостов`:repeat.type==='medusa'?` · ${countItem(game.inventory,'medusa')}/1 Медуза`:repeat.contacted?' · Должник найден':' · Нужно поговорить с должником'}</small></div></article>`:''}<div class="quest-list">${quests.map(q=>{const npc=NPCS.find(n=>n.id===q.giver);return `<article class="quest-card ${q.status}"><div class="quest-symbol">${q.status==='completed'?'✓':'!'}</div><div class="quest-main"><div class="quest-title-row"><h3>${esc(q.title)}</h3><span>${q.status==='completed'?'ВЫПОЛНЕНО':'АКТИВНО / ДОСТУПНО'}</span></div><p>${esc(q.text)}</p><small>Заказчик: ${esc(npc?.name||'Неизвестно')} · Награда: ${money(q.reward)}</small></div>${npc?avatarMarkup(npc.icon,npc.name,'♟'):''}</article>`}).join('')}</div>
  </div>`;
}


function renderRadio(state) {
  const music=state.ui.music||{};
  const station = RADIO_STATIONS.find(item=>item.id===(music.mode==='radio'?music.stationId:state.settings.radioStationId))
    || RADIO_STATIONS.find(item=>item.locationId===state.game?.locationId)
    || RADIO_STATIONS[0];
  const stationTracks=RADIO_TRACKS.filter(item=>station.trackIds.includes(item.id));
  const track=RADIO_TRACKS.find(item=>item.id===music.trackId) || stationTracks[0];
  const playing=music.playing && music.mode==='radio' && music.stationId===station.id;
  const queueTracks=(music.mode==='radio' && music.stationId===station.id ? (music.queue||[]) : []).map(id=>RADIO_TRACKS.find(item=>item.id===id)).filter(Boolean);
  const stationButtons=RADIO_STATIONS.map(item=>`<button class="radio-station-choice ${item.id===station.id?'active':''}" data-action="radio-start" data-id="${item.id}"><b>${esc(item.name)}</b><small>${esc(item.frequency)} · ${item.trackIds.length} композиций · случайный порядок</small></button>`).join('');
  return `<div class="tab-page radio-page">
    <div class="tab-heading"><div><div class="eyebrow">КПК · ПРИЁМНИК</div><h2>Радио Кордон</h2><p>Эфир базовых станций. Порядок композиций случайный; выбрать отдельную песню или переключить её нельзя.</p></div><span class="radio-status ${playing?'live':''}"><i></i>${playing?'В ЭФИРЕ':'ОЖИДАНИЕ'}</span></div>
    <div class="radio-stations">${stationButtons}</div>
    <div class="radio-layout"><section class="radio-console panel"><div class="radio-console-top"><span>ZONE RADIO / R-100</span><span>FM · STEREO</span></div>
      <div class="radio-screen"><div class="radio-idle"><span class="radio-frequency">${esc(station.frequency)}</span><b>${esc(station.name.toUpperCase())}</b><small>${playing?'СЕЙЧАС В ЭФИРЕ':'ПРИЁМНИК ГОТОВ'}</small><span class="radio-wave">▂▅▃▇▅▂▆▃▅</span></div></div>
      <div class="radio-now-playing"><div class="eyebrow">${playing?'СЕЙЧАС ИГРАЕТ':'ПОСЛЕДНЯЯ / СЛЕДУЮЩАЯ КОМПОЗИЦИЯ'}</div><h3>${esc(track?.title||'Эфир выключен')}</h3><p>${esc(track?.artist||'Выбери радиостанцию')} ${track?`<span>·</span> ${esc(track.label)}`:''}</p></div>
      <div class="radio-controls">${btn(playing?'Ⅱ Выключить эфир':'▶ Включить случайный эфир',playing?'radio-stop':'radio-start','button primary',`data-id="${station.id}"`)}</div>
      <div class="radio-hint">Радио само перемешивает список, проигрывает все композиции по одной и только после конца очереди создаёт новый случайный порядок. Для выбора песни открой отдельный «Плеер».</div>
    </section>
    <section class="radio-playlist panel"><div class="panel-title"><h3>Очередь станции</h3><span>${queueTracks.length?`${queueTracks.length} в случайной очереди`:`${stationTracks.length} композиций`}</span></div>
      <div class="radio-track-list">${(queueTracks.length?queueTracks:stationTracks).map((item,index)=>`<article class="radio-track ${item.id===track?.id&&playing?'selected':''}"><span class="radio-track-number">${String(index+1).padStart(2,'0')}</span><div class="radio-track-meta"><b>${esc(item.title)}</b><small>${esc(item.artist)} · ${esc(item.era)}</small></div><span class="radio-queue-state">${item.id===track?.id&&playing?'В эфире':'В очереди'}</span></article>`).join('')}</div>
    </section></div>
    <p class="radio-disclaimer">Музыка запускается через YouTube IFrame API и остаётся фоновой при переключении вкладок КПК. Нужен интернет и первоначальное нажатие «Включить эфир».</p>
  </div>`;
}

function renderPlayer(state) {
  const music=state.ui.music||{};
  const activePlayer=music.mode==='player';
  const current=activePlayer ? PLAYER_TRACKS.find(track=>track.id===music.trackId) : null;
  const queue=activePlayer ? (music.queue||[]) : [];
  const disabled=activePlayer?'':'disabled';
  const modeHint=music.mode==='radio'?'Сейчас играет радиостанция. Выбери песню из библиотеки, чтобы переключиться на личный плеер.':'Выбери песню — далее библиотека играет по порядку.';
  return `<div class="tab-page player-page"><div class="tab-heading"><div><div class="eyebrow">КПК · МЕДИАПЛЕЕР</div><h2>Плеер</h2><p>Личная музыкальная коллекция. Музыка продолжает играть при переключении вкладок КПК.</p></div><span class="radio-status ${activePlayer&&music.playing?'live':''}"><i></i>${activePlayer&&music.playing?'ВОСПРОИЗВЕДЕНИЕ':activePlayer?'ПАУЗА':'ОЖИДАНИЕ'}</span></div>
    <section class="player-now panel"><div class="eyebrow">СЕЙЧАС ИГРАЕТ</div><h3>${esc(current?.title||'Ничего не выбрано')}</h3><p>${esc(current?.artist||modeHint)}</p><div class="radio-controls">${btn('◂ Предыдущая','player-prev','button ghost',disabled)}${btn(activePlayer?(music.playing?'Ⅱ Пауза':'▶ Играть / продолжить'):'▶ Выбери композицию','player-toggle','button primary',disabled)}${btn('Следующая ▸','player-next','button ghost',disabled)}${btn('■ Стоп','player-stop','button ghost',disabled)}</div><small>${queue.length?`Очередь: ${music.index+1} из ${queue.length}`:modeHint}</small></section>
    <section class="player-library panel"><div class="panel-title"><h3>Музыкальная библиотека</h3><span>${PLAYER_TRACKS.length} композиций</span></div><div class="player-track-list">${PLAYER_TRACKS.map((track,index)=>`<article class="player-track ${track.id===music.trackId&&activePlayer?'selected':''}"><span class="radio-track-number">${String(index+1).padStart(2,'0')}</span><div class="radio-track-meta"><b>${esc(track.title)}</b><small>${esc(track.artist)} · ${esc(track.label)}${track.year?` · ${track.year}`:''}</small></div>${btn(activePlayer&&track.id===music.trackId&&music.playing?'Ⅱ':'▶','player-play-track','button tiny '+(activePlayer&&track.id===music.trackId?'primary':'ghost'),`data-id="${track.id}"`)}</article>`).join('')}</div></section>
    <p class="radio-disclaimer">Плеер использует внешние ссылки на YouTube. Музыка продолжает звучать при переходе между разделами КПК; браузер может приостанавливать воспроизведение в энергосберегающем режиме.</p>
  </div>`;
}

function renderTrade(game,state) {
  const traders=getAvailableTraders(game,game.locationId);
  const trader=traders.find(entry=>entry.id===state.ui.tradeNpcId);
  if (!trader) {
    return `<div class="tab-page trade-page"><div class="tab-heading"><div><div class="eyebrow">КПК · ЭКОНОМИКА</div><h2>Торговля</h2><p>Торговцы, находящиеся в текущей локации. Бродячие сталкеры меняют место вместе с течением игрового времени.</p></div><div class="money-readout">▣ ${money(game.money)}</div></div>
      ${traders.length?`<div class="trade-merchant-grid">${traders.map(entry=>`<button class="trade-merchant panel" data-action="trade-open" data-id="${entry.id}">${avatarMarkup(entry.icon,entry.name,'♟')}<span><b>${esc(entry.name)}</b><small>${esc(entry.role||'Бродячий торговец')} · ${esc(entry.group||'Путники')}</small><em>${entry.random?'Путник, может уйти с Кордона':'Постоянный торговец'}</em></span><i>Открыть →</i></button>`).join('')}</div>`:'<div class="empty-state large">В этой локации торговцев нет. Проверь КПК позже: бродячие торговцы перемещаются между подлокациями.</div>'}
    </div>`;
  }
  const stock=(trader.stock||[]).filter(entry=>entry.qty>0);
  const inv=game.inventory||[];
  return `<div class="tab-page trade-page"><div class="tab-heading"><div><div class="eyebrow">КПК · ТОРГОВЛЯ</div><h2>${esc(trader.name)}</h2><p>${esc(trader.role||'Торговец')} · ${esc(getLocation(trader.location)?.name||'Кордон')}</p></div><div class="money-readout">▣ ${money(game.money)}</div></div>
    <div class="trade-topline">${avatarMarkup(trader.icon,trader.name,'♟')}<div><b>${esc(trader.name)}</b><small>${trader.random?'Бродячий торговец':'Постоянная торговая точка'}</small></div><span>Рюкзак: ${getWeight(inv).toFixed(1)} / ${MAX_CARRY_KG} кг</span>${btn('← К торговцам','trade-back','button ghost small')}</div>
    <div class="trade-columns"><section class="panel trade-stock"><div class="panel-title"><h3>Товар торговца</h3><span>${stock.length} позиций</span></div>${stock.length?stock.map(entry=>{const item=getItem(entry.id);if(!item)return '';return `<article class="trade-row"><div class="trade-image">${itemImage(item)}</div><div class="trade-info"><b>${esc(item.name)}</b><small>${item.weight} кг · в наличии: ${entry.qty}</small><strong>${money(entry.price)}</strong></div>${btn('Купить','trade-buy','button small primary',`data-trader-id="${trader.id}" data-item-id="${item.id}"`)}</article>`}).join(''):'<div class="empty-state">Товар закончился. Запасы пополняются не сразу.</div>'}</section>
    <section class="panel trade-sell"><div class="panel-title"><h3>Продать торговцу</h3><span>${inv.length} видов</span></div>${inv.length?inv.map(stack=>{const item=getItem(stack.id);if(!item)return '';const sellPrice=Math.max(1,Math.floor(item.price*(trader.buyMultiplier||.4)));return `<article class="trade-row"><div class="trade-image">${itemImage(item)}</div><div class="trade-info"><b>${esc(item.name)} ×${stack.qty}</b><small>${item.weight} кг за штуку · цена выкупа</small><strong>${money(sellPrice)}</strong></div>${btn('Продать 1','trade-sell','button small ghost',`data-trader-id="${trader.id}" data-item-id="${item.id}"`)}</article>`}).join(''):'<div class="empty-state">В рюкзаке пока нечего продавать.</div>'}</section></div>
  </div>`;
}

function renderContacts(game) {
  const groups = ['Одиночки','Бандиты','Военные'];
  return `<div class="tab-page"><div class="tab-heading"><div><div class="eyebrow">КПК · КОНТАКТЫ</div><h2>Персонажи и группировки</h2><p>Найди персонажа в его текущей локации, чтобы начать диалог.</p></div></div>
    ${groups.map(group=>`<section class="contact-group"><h3>${group}</h3><div class="contact-grid">${NPCS.filter(n=>n.group===group).map(n=>{const here=n.location===game.locationId;return `<article class="contact-card">${avatarMarkup(n.icon,n.name,'♟')}<div><b>${esc(n.name)}</b><small>${esc(n.role)}</small><span>${esc(getLocation(n.location)?.name||'')}</span></div><div class="contact-actions">${btn(here?'Поговорить':'Не здесь','talk','button small '+(here?'primary':'ghost'),`data-id="${n.id}" ${here?'':'disabled'}`)}${n.trader?btn('Торговля','trade-open','button small ghost',`data-id="${n.id}" ${here?'':'disabled'}`):''}</div></article>`}).join('')}</div></section>`).join('')}
    <section class="contact-group"><h3>Бродячие торговцы и сталкеры</h3><div class="contact-grid">${(game.randomTraders||[]).map(n=>{const here=n.location===game.locationId;return `<article class="contact-card">${avatarMarkup(n.icon,n.name,'♟')}<div><b>${esc(n.name)}</b><small>${esc(n.role||'Путник / торговец')}</small><span>${esc(getLocation(n.location)?.name||'')}</span></div><div class="contact-actions">${btn(here?'Поговорить':'В пути','talk','button small ghost',`data-id="${n.id}" ${here?'':'disabled'}`)}${n.trader?btn(here?'Торговать':'В пути','trade-open','button small '+(here?'primary':'ghost'),`data-id="${n.id}" ${here?'':'disabled'}`):''}</div></article>`}).join('')}</div></section>
    <section class="contact-group"><h3>Отряды в движении</h3><div class="squad-list">${game.squads.map(s=>`<div class="squad-row"><span class="squad-mark">⚑</span><span><b>${esc(s.name)}</b><small>${s.members} человек · ${esc(getLocation(s.location)?.name||'')}</small></span></div>`).join('')}</div></section>
  </div>`;
}

function renderCombat(game) {
  const enemy=game.activeEncounter;
  if (!enemy) return '';
  const image = '';
  const enemyFallback = enemy.type==='blind-dog' ? '🐕' : enemy.type==='flesh' ? '🐗' : enemy.type==='military' ? '🪖' : '♟';
  return `<div class="combat-overlay"><div class="combat-card"><div class="eyebrow danger-text">ОПАСНОСТЬ · БОЕВОЙ КОНТАКТ</div><h2>${esc(enemy.name)}${enemy.count>1?` ×${enemy.count}`:''}</h2><div class="combat-visual"><span>${enemyFallback}</span></div><div class="combat-health"><span>Состояние противника</span><b>${enemy.hp}/${enemy.maxHp}</b></div><div class="bar-track"><i class="danger" style="width:${enemy.hp/enemy.maxHp*100}%"></i></div><p>Противник находится рядом. Выбери действие; каждый ход занимает немного игрового времени.</p><div class="combat-actions">${btn('⚔ Атаковать','combat-attack','button danger')}${btn('▣ Защищаться','combat-defend','button')}${btn('↗ Отступить','combat-flee','button ghost')}</div></div></div>`;
}

function renderArtifact(game) {
  const hunt=game.artifactHunt;
  if (!hunt) return '';
  return `<div class="modal-shade"><div class="modal-card artifact-modal"><button class="modal-close" data-action="close-artifact">×</button><div class="eyebrow">МИНИ-ИГРА · ПОИСК АРТЕФАКТА</div><h2>Сигнал детектора</h2><p>Выбери сектор, в котором сигнал кажется сильнее. На поиск есть три попытки.</p><div class="detector-face"><span>ОТКЛИК</span><b>${['▂','▅','▃'][hunt.attempts%3]}</b><small>АНОМАЛЬНАЯ АКТИВНОСТЬ</small></div><div class="sector-buttons">${[0,1,2].map(i=>btn(`Сектор ${i+1}`,'artifact-sector','button sector-button',`data-sector="${i}"`)).join('')}</div><small>Попыток использовано: ${hunt.attempts}/3</small></div></div>`;
}

function renderDialogue(game) {
  const npc=NPCS.find(n=>n.id===game.dialogueNpcId) || (game.randomTraders||[]).find(n=>n.id===game.dialogueNpcId);
  if (!npc) return '';
  const jobs=game.sidorovichJobs||{};
  const active=jobs.active;
  const sidorovichActions=npc.id==='sidorovich' && ['работа','задания','квесты','поручения'].includes(game.dialogueTopic) ? `<div class="dialogue-quest-actions">${active?`<div class="quest-mini"><b>Текущее поручение: ${esc(active.title)}</b><small>${esc(active.description)}</small></div>${btn('Сдать поручение','quest-turnin','button primary')}`:btn('Взять случайное поручение','quest-accept','button primary')}</div>` : '';
  return `<div class="modal-shade"><div class="modal-card dialogue-modal"><button class="modal-close" data-action="close-dialogue">×</button><div class="dialogue-head">${avatarMarkup(npc.icon,npc.name,'♟')}<div><div class="eyebrow">${esc(npc.group||npc.faction||'Путники')} · ${esc(npc.role||'Сталкер')}</div><h2>${esc(npc.name)}</h2><small>${esc(getLocation(npc.location)?.name||'')}</small></div></div><blockquote>«${esc(npc.greeting||'Чего хотел, сталкер?')}»</blockquote><div class="dialogue-topics"><b>О чём поговорить?</b>${(npc.topics||['разговор','слухи']).map(topic=>btn(topic[0].toUpperCase()+topic.slice(1),'dialogue-topic','button topic-button',`data-topic="${esc(topic)}" data-id="${npc.id}"`)).join('')}</div><div class="dialogue-reply" id="dialogue-reply">Выбери тему для разговора.</div>${sidorovichActions}</div></div>`;
}

function renderSleep(game) {
  return `<div class="modal-shade"><div class="modal-card sleep-modal"><button class="modal-close" data-action="close-sleep">×</button><div class="eyebrow">ОТДЫХ</div><h2>Переждать время</h2><p>Во время сна восстанавливаются силы, но растут голод и жажда. Во время боя спать нельзя.</p><div class="sleep-options">${[1,3,6,8,12].map(h=>btn(`${h} ч`,'sleep','button',`data-hours="${h}"`)).join('')}</div><small>Время в игре начинается 15 апреля и постепенно идёт вперёд.</small></div></div>`;
}

export function renderGameSettings(state) {
  return `<section class="screen-wrap settings-screen"><header class="screen-heading"><div><div class="eyebrow">СИСТЕМНЫЕ ПАРАМЕТРЫ</div><h2>Настройки</h2><p>Параметры интерфейса и локального сохранения.</p></div>${btn('← Назад','settings-back','button ghost')}</header>
    <div class="settings-layout"><div class="panel"><h3>Музыка и радио</h3><p class="muted">Радио баз играет композиции в случайной очереди без ручного выбора. Во вкладке «Плеер» можно выбрать отдельную песню, поставить паузу или переключить композицию. Музыка работает через внешний YouTube-плеер и продолжает играть при смене вкладок.</p>${btn('♫ Открыть радио','settings-open-radio','button primary')}</div>
    <div class="panel"><h3>Интерфейс</h3><label class="setting-row"><span><b>Уменьшить анимацию</b><small>Для слабых устройств</small></span><input type="checkbox" data-setting="reducedMotion" ${state.settings.reducedMotion?'checked':''}></label><div class="setting-row"><span><b>Ориентация</b><small>Лучше всего горизонтально, но портретный режим тоже поддерживается.</small></span><span class="setting-value">LANDSCAPE</span></div></div>
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
    return `<div class="modal-shade"><div class="modal-card map-location-modal"><button class="modal-close" data-action="close-modal">×</button><div class="eyebrow">КОРДОН · КАРТОЧКА ПОДЛОКАЦИИ</div><h2>${esc(loc.name)}</h2><div class="map-location-image-placeholder"><span>▧</span><b>ФОТОГРАФИЯ ПОДЛОКАЦИИ</b><small>Изображение будет добавлено позже</small></div><p>${esc(loc.desc)}</p><div class="map-location-meta"><span>${hazard}</span><span>Соседних переходов: ${loc.neighbors?.length||0}</span>${travelMinutes!==null?`<span>Пешком отсюда: ${travelMinutes} мин</span>`:''}</div><div class="modal-actions">${btn(current?'Ты находишься здесь':reachable?'Перейти сюда':'Нет прямого перехода','map-modal-travel','button primary',`data-id="${loc.id}" ${current||!reachable?'disabled':''}`)}${btn('Закрыть','close-modal','button ghost')}</div></div></div>`;
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

function renderMusicDock(state) {
  const music=state.ui.music||{};
  const track=RADIO_TRACKS.find(item=>item.id===music.trackId);
  if (!track) return '';
  return `<div class="music-dock"><span class="music-dock-icon">♫</span><div class="music-dock-text"><b>${esc(track.title)}</b><small>${esc(track.artist)} · ${music.playing?'воспроизводится':'на паузе'}</small></div>${btn(music.playing?'Ⅱ':'▶','music-dock-toggle','button tiny ghost')}${btn('⏭','music-dock-next','button tiny ghost',music.mode==='radio'?'disabled':'')}<button class="music-dock-open" data-action="tab" data-tab="player">Плеер</button></div>`;
}

export function renderGame(state) {
  const game=state.game;
  const character=state.characters.find(c=>c.id===state.activeCharacterId) || state.pendingCharacter || {name:'Сталкер',avatar:''};
  if (!game) return `<div class="screen-wrap">${btn('← Назад','back-characters','button ghost')}<div class="empty-state">Сохранение игры не найдено.</div></div>`;
  const clock=getGameDateTime(game.clock);
  const tabs={
    location:renderLocation(game,character), map:renderMap(game), inventory:renderInventory(game),
    stats:renderStats(game,character), radio:renderRadio(state), player:renderPlayer(state), trade:renderTrade(game,state), messages:renderMessages(game), quests:renderQuests(game), contacts:renderContacts(game)
  };
  const pdaOpen=!!state.ui.pdaOpen;
  return `<section class="game-shell">
    <div class="game-main">
      <header class="game-topbar"><div class="topbar-player">${avatarMarkup(character.avatar,character.name,'☢')}<div><b>${esc(character.name)}</b><small>${esc(FACTIONS.find(f=>f.id===game.player.faction)?.name||'')}</small></div></div><div class="topbar-status"><span class="money-readout">▣ ${money(game.money)}</span><span>♥ ${game.player.hp}/${game.player.maxHp}</span><span class="clock-readout" data-game-clock>◷ ${clock.date} · ${clock.time}</span></div><div class="topbar-buttons">${btn(pdaOpen?'Закрыть КПК':'Открыть КПК', 'pda-toggle', 'button pda-toggle-button', `aria-expanded="${pdaOpen}"`)}${btn('⚙','settings','icon-button',`title="Настройки"`)}${btn('⇩','export-save','icon-button',`title="Экспорт сохранения"`)}</div></header>
      ${pdaOpen?`<div class="pda-top-tabs-wrap"><div class="pda-tabs-heading"><span>☷ КПК · ZONE LINK</span><small>ВЫБЕРИ РАЗДЕЛ</small></div><nav class="game-nav" aria-label="Разделы КПК">${gameNav(state.ui.tab||'location')}</nav></div>`:''}
      <div class="game-content ${pdaOpen?'pda-open-content':'pda-closed-content'}">${pdaOpen?(tabs[state.ui.tab]||tabs.location):tabs.location}</div>
      ${renderMusicDock(state)}
      <form class="action-composer" id="action-form"><span class="composer-symbol">⌁</span><input id="player-action" type="text" maxlength="220" placeholder="Опиши действие… например: осмотреться, поговорить с Волком, обыскать местность" autocomplete="off"><button class="send-action" type="submit">Отправить ↗</button></form>
    </div>
    ${renderCombat(game)}${renderArtifact(game)}${renderDialogue(game)}${state.ui.modal==='sleep'?renderSleep(game):''}
  </section>`;
}
