import { ASSETS, IMAGE_FALLBACKS, FACTIONS, AVATAR_OPTIONS, ITEMS, LOCATIONS, NPCS, MAX_CARRY_KG, START_BUDGET, STARTER_ITEM_IDS, STARTER_LOADOUT_BY_FACTION } from '../data/catalog.js';
import { getWeight, countItem, getItem } from '../systems/inventory.js';
import { getGameDateTime, formatElapsed } from '../systems/game-clock.js';
import { getLocation, getAvailableTraders, getAvailableStalkers, getStalkerById, getSidorovichJobState, getTravelMinutes, getExploreSpots, getTradeBuyPrice } from '../systems/world.js';
import { getBestWeapon } from '../systems/combat.js';
import { getMainStoryQuest } from '../systems/main-story.js';
import { getItemCondition, getRepairCost } from '../systems/equipment-condition.js';
import { getRadioStationForLocation } from '../data/radio-stations.js';

export const esc = (value='') => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const money = (value) => `${Number(value || 0).toLocaleString('ru-RU')} Купонов`;
const isImageSource = src => typeof src === 'string' && /^(?:data:image\/|blob:|https?:\/\/|file:\/\/|\/|\.\.?\/|[\w%.-]+\/)/i.test(src);
const avatarMarkup = (src, name) => {
  const initials=String(name||'').trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase()||'—';
  const fallback=`<span class="avatar-fallback"${isImageSource(src)?' hidden':''}>${esc(initials)}</span>`;
  return `<div class="avatar-wrap">${isImageSource(src)?`<img src="${esc(src)}" alt="${esc(name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false">`:''}${fallback}</div>`;
};
const factionInsignia = (faction, extraClass='') => ASSETS.factionInsignias?.[faction] ? `<img class="faction-insignia ${extraClass}" src="${esc(ASSETS.factionInsignias[faction])}" alt="${esc(faction)}" loading="lazy" onerror="this.hidden=true">` : '';
const iconSvg = (name) => {
  const paths = {
    location:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5M9 21v-7h6v7"/>',
    map:'<path d="M3 6.5 8 4l8 3 5-2.5v13L16 20l-8-3-5 2.5z"/><path d="M8 4v13M16 7v13"/>',
    stats:'<path d="M4 20V11M10 20V4M16 20v-7M22 20H2"/>',
    player:'<path d="m9 6 10 6-10 6z"/>',
    messages:'<path d="M3 5h18v13H8l-5 3z"/><path d="m4 7 8 6 8-6"/>',
    quests:'<path d="M7 3h10v3h3v15H4V6h3z"/><path d="M8 11h8M8 15h8"/>',
    contacts:'<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.4 2.4-5.5 6-5.5s6 2.1 6 5.5M16 5.5a3 3 0 0 1 0 5.8M18 15c2 .6 3 2.2 3 5"/>',
    book:'<path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v18H7.5A3.5 3.5 0 0 0 4 23z"/><path d="M4 5.5V23M8 6h8M8 10h8"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 4.7 1.5c-1.1 1.2-2.2 1.4-2.2 3M12 17.5h.01"/>',
    trade:'<path d="M4 7h14M14 3l4 4-4 4M20 17H6m4-4-4 4 4 4"/>',
    talk:'<path d="M4 5h16v12H9l-5 4z"/><path d="M8 9h8M8 13h5"/>',
    bookOpen:'<path d="M12 6v15M12 8C9 5 5 5 3 6v13c3-1 6-1 9 2M12 8c3-3 7-3 9-2v13c-3-1-6-1-9 2"/>',
    compass:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z"/>',
    bag:'<path d="M5 8h14l1 13H4z"/><path d="M9 8V6a3 3 0 0 1 6 0v2M9 13h6"/>',
    coins:'<circle cx="8" cy="8" r="5"/><path d="M8 5v6m-2-4h4M16 13a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM16 15v6m-2-4h4"/>',
    heart:'<path d="M20.8 8.8c0 5-8.8 11-8.8 11S3.2 13.8 3.2 8.8A4.7 4.7 0 0 1 12 6a4.7 4.7 0 0 1 8.8 2.8z"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19 13.5a7.5 7.5 0 0 0 0-3l2-1.2-2-3.4-2.2 1a7.5 7.5 0 0 0-2.6-1.5L14 3h-4l-.2 2.4a7.5 7.5 0 0 0-2.6 1.5L5 5.9 3 9.3 5 10.5a7.5 7.5 0 0 0 0 3l-2 1.2 2 3.4 2.2-1a7.5 7.5 0 0 0 2.6 1.5L10 21h4l.2-2.4a7.5 7.5 0 0 0 2.6-1.5l2.2 1 2-3.4z"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 20h16"/>',
    anomaly:'<circle cx="12" cy="12" r="9"/><path d="M12 4v5m0 6v5M4 12h5m6 0h5m-11-5 3 3m4 4 3 3m0-10-3 3m-4 4-3 3"/>',
    mutant:'<path d="M12 3 4 7v6c0 5 8 8 8 8s8-3 8-8V7z"/><path d="M8 11l2 2 4-4m-4 7h4"/>',
    artifact:'<path d="m12 2 2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5z"/>',
    gear:'<path d="m4 7 8-4 8 4v10l-8 4-8-4z"/><path d="M12 3v18M4 7l8 5 8-5"/>'
  };
  return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.help}</svg>`;
};
const itemImage = (item) => {
  const image=item.image || ASSETS.itemImages?.[item.id] || ASSETS.armor?.[item.id];
  const armorClass=item.cat==='Броня'?' armor-art-image':'';
  return image && isImageSource(image)
    ? `<img class="item-art-image${armorClass}" src="${esc(image)}" alt="${esc(item.name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="item-image-missing" hidden aria-hidden="true"></span>`
    : `<span class="item-image-missing" role="img" aria-label="Изображение ${esc(item.name)} недоступно"></span>`;
};
const avatarOptionMarkup = (option, mode='portrait') => mode==='appearance' ? `<span class="avatar-option-single appearance-only"><img class="avatar-option-body" src="${esc(option.appearance)}" alt="Внешность: ${esc(option.name)}" loading="lazy" onerror="this.hidden=true"></span>` : `<span class="avatar-option-single portrait-only">${avatarMarkup(option.src,option.name,'♟')}</span>`;
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
  const factionCards = FACTIONS.map(f=>`<label class="faction-choice ${d.faction===f.id?'selected':''}"><input type="radio" name="faction" value="${f.id}" ${d.faction===f.id?'checked':''}><span><b>${esc(f.name)}</b><small>${esc(f.description)}</small></span></label>`).join('');
  const portraitMark = 'ПОРТРЕТ';
  return `<section class="screen-wrap pda-screen-wrap" style="--pda-shell:url('${ASSETS.pda}')">
    <header class="screen-heading pda-create-heading"><div><div class="eyebrow">КПК · ЛИЧНОЕ ДЕЛО</div><h2>Регистрация сталкера</h2><p>Заполни данные персонажа перед выходом на Кордон.</p></div>${btn('← Назад','back-characters','button ghost')}</header>
    <form id="character-form" class="pda-form">
      <div class="pda-topline"><span>НОВОЕ ЛИЧНОЕ ДЕЛО / КОРДОН</span><span class="pda-live-time" data-live-clock>15 апреля · ${new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</span></div>
      <div class="pda-form-layout">
        <aside class="pda-photo-column">
          <div class="photo-frame">${d.avatar?avatarMarkup(d.avatar,'Портрет персонажа'):`<span class="portrait-placeholder">${portraitMark}</span>`}</div>
          <b>ПОРТРЕТ</b>
          ${btn('Выбрать портрет','open-avatars','button small wide')}
          <label class="button small wide upload-button">Загрузить иконку<input type="file" id="avatar-upload" accept="image/*" hidden></label>
          ${d.avatar?btn('Сбросить портрет','reset-avatar','button small ghost wide'):''}
          <b class="appearance-selection-label">ВНЕШНОСТЬ · ${d.appearance?'ВЫБРАНА':'НЕ ВЫБРАНА'}</b>
          ${btn('Выбрать внешность','open-appearances','button small wide')}
          <label class="button small wide upload-button">Загрузить внешность<input type="file" id="appearance-upload" accept="image/*" hidden></label>
          ${d.appearance?btn('Сбросить внешность','reset-appearance','button small ghost wide'):''}
        </aside>
        <div class="pda-fields">
          <div class="field field-name"><label for="character-name">Имя персонажа *</label><div class="name-generator-row"><input id="character-name" name="name" data-field="name" value="${esc(d.name)}" maxlength="32" placeholder="Например, Алексей Ветров" required>${btn('Случайное имя','generate-stalker-name','button small ghost')}</div><small class="name-generator-hint">Имя и позывной из базы сталкеров.</small></div>
          <div class="field-row three pda-profile-fields">
            <label class="field"><span>Дата рождения</span><input type="date" name="birthDate" data-field="birthDate" value="${esc(d.birthDate)}"></label>
            <label class="field"><span>Рост, см</span><input type="number" name="height" data-field="height" value="${esc(d.height)}" min="120" max="230" placeholder="178"></label>
            <label class="field"><span>Вес, кг</span><input type="number" name="weight" data-field="weight" value="${esc(d.weight)}" min="35" max="180" placeholder="75"></label>
          </div>
          <label class="field"><span>Характер</span><textarea name="personality" data-field="personality" rows="2" maxlength="300" placeholder="Спокойный, недоверчивый, вспыльчивый...">${esc(d.personality)}</textarea></label>
          <label class="field"><span>Биография</span><textarea name="biography" data-field="biography" rows="2" maxlength="900" placeholder="Кем был до Зоны и почему пришёл сюда...">${esc(d.biography)}</textarea></label>
          <label class="field field-notes"><span>Дополнительные сведения</span><textarea name="notes" data-field="notes" rows="2" maxlength="500" placeholder="Привычки, страхи, цели, приметы...">${esc(d.notes)}</textarea></label>
        </div>
      </div>
      <div class="pda-faction-section"><div class="section-caption"><b>ПРИНАДЛЕЖНОСТЬ К ГРУППИРОВКЕ</b><small>Определяет стартовую локацию, отношения и доступное снаряжение.</small></div><div class="faction-options">${factionCards}</div></div>
      <div class="pda-footer"><span>Дата начала: 15 апреля · Текущее время устройства</span><button class="button primary" type="submit">Подтвердить и выбрать снаряжение →</button></div>
    </form>
  </section>`;
}

export function renderLoadout(state) {
  const selected = state.loadout.selected || {};
  const factionId=state.pendingCharacter?.faction || state.draft?.faction || 'loner';
  const factionGear=STARTER_LOADOUT_BY_FACTION[factionId] || STARTER_LOADOUT_BY_FACTION.loner;
  const genericIds=STARTER_ITEM_IDS.filter(id=>{const item=getItem(id);return item && item.cat!=='Броня' && item.cat!=='Защита';});
  const eligibleIds=new Set([...genericIds,...factionGear.armor,...factionGear.mask]);
  const spent = Object.entries(selected).reduce((sum,[id,qty])=>sum+(getItem(id)?.price||0)*qty,0);
  const weight = Object.entries(selected).reduce((sum,[id,qty])=>sum+(getItem(id)?.weight||0)*qty,0);
  const remain = START_BUDGET - spent;
  const maxFor = item => item.cat==='Броня'||item.cat==='Защита'||item.weapon ? 1 : ['Боеприпасы','Медицина'].includes(item.cat) ? 2 : item.cat==='Еда' ? 3 : 2;
  const firearmTypes=['pistol','rifle','shotgun','smg'];
  const firearmSelected=Object.entries(selected).some(([id,qty])=>qty>0&&firearmTypes.includes(getItem(id)?.weapon));
  const orderedItems = ITEMS.filter(item=>eligibleIds.has(item.id)).sort((a,b)=>a.price-b.price);
  return `<section class="screen-wrap loadout-screen">
    <header class="screen-heading"><div><div class="eyebrow">ПОДГОТОВКА К ВЫХОДУ</div><h2>Стартовое снаряжение</h2><p>Собери разумный комплект новичка: несколько припасов, амуницию и подходящую фракции защиту.</p></div>${btn('← К персонажу','back-create','button ghost')}</header>
    <div class="loadout-summary"><div><small>БЮДЖЕТ</small><b>${money(START_BUDGET)}</b></div><div><small>ПОТРАЧЕНО</small><b>${money(spent)}</b></div><div><small>ОСТАЛОСЬ</small><b class="good-text">${money(remain)}</b></div><div><small>ВЕС</small><b class="${weight>MAX_CARRY_KG?'bad-text':''}">${weight.toFixed(1)} / ${MAX_CARRY_KG} кг</b></div></div>
    <div class="loadout-note">Для группировки «${esc(FACTIONS.find(f=>f.id===factionId)?.name||'Одиночки')}» доступны лёгкие стартовые комплекты. Можно выбрать один комплект брони, один противогаз и только один огнестрельный ствол. Еду можно взять до трёх порций, медикаменты и боеприпасы — до двух пачек. Оставшиеся Купоны сохраняются у персонажа.</div>
    <section class="shop-group"><h3>СТАРТОВАЯ ПОДБОРКА · СНАРЯЖЕНИЕ НОВИЧКА</h3><div class="shop-grid">${orderedItems.map(item=>{const isArmor=item.cat==='Броня';const isMask=item.cat==='Защита';const alreadyEquipped=selected[item.id]||0;const occupied=isArmor?Object.entries(selected).some(([other,qty])=>qty>0&&other!==item.id&&getItem(other)?.cat==='Броня'):isMask?Object.entries(selected).some(([other,qty])=>qty>0&&other!==item.id&&getItem(other)?.cat==='Защита'):false;return `<article class="shop-item"><div class="shop-image">${itemImage(item)}</div><div class="shop-info"><b>${esc(item.name)}</b><small>${esc(item.cat)} · ${item.weight} кг · ${item.w}×${item.h} яч. · до ${maxFor(item)} шт.</small><strong>${money(item.price)}</strong>${isArmor||isMask?`<small class="good-text">${isArmor?'Стартовая броня фракции':'Стартовый противогаз'}</small>`:''}</div><div class="shop-controls">${btn('−','loadout-remove','button square',`data-id="${item.id}" ${!alreadyEquipped?'disabled':''}`)}<b>${alreadyEquipped}</b>${btn('+','loadout-add','button square',`data-id="${item.id}" ${occupied||alreadyEquipped>=maxFor(item)||(firearmTypes.includes(item.weapon)&&firearmSelected&&!alreadyEquipped)?'disabled':''}`)}</div></article>`}).join('')}</div></section>
    <div class="loadout-bottom"><div><span>${Object.values(selected).reduce((a,b)=>a+b,0)} предметов в выборе</span><small>Лимит рюкзака: ${MAX_CARRY_KG} кг</small></div>${btn('Завершить подготовку →','finish-loadout','button primary')}</div>
  </section>`;
}

function gameNav(active) {
  const tabs = [ ['map','map','Карта'],['stats','stats','Статистика'],['player','player','Плеер'],['messages','messages','Связь'],['quests','quests','Задания'],['contacts','contacts','Контакты'],['encyclopedia','book','Энциклопедия'],['help','help','Помощь'] ];
  return tabs.map(([id,ico,label])=>`<button class="nav-tab ${active===id?'active':''}" data-action="tab" data-tab="${id}"><span>${iconSvg(ico)}</span><b>${label}</b></button>`).join('');
}

function renderLocation(game, character, state) {
  const location=getLocation(game.locationId);
  const radioStation=getRadioStationForLocation(game.locationId);
  const musicState=state.ui.music||{};
  const radioTracks=(state.ui.localMusicTracks||[]).filter(track=>radioStation && (track.source==='local' || (track.source==='bundled' && (!track.stations?.length || track.stations.includes(radioStation.id)))));
  const radioSelected=!!(radioStation && musicState.mode==='radio' && musicState.stationId===radioStation.id && musicState.trackId);
  const radioIsActive=!!(radioSelected && musicState.playing);
  const radioTrack=(state.ui.localMusicTracks||[]).find(track=>track.id===musicState.trackId);
  const radioPanel=radioStation?`<section class="base-radio-panel ${radioIsActive?'playing':''}"><div class="base-radio-heading"><div><div class="eyebrow">РАДИОБАЗА · ЛОКАЛЬНЫЙ ЭФИР</div><h3>${esc(radioStation.name)}</h3><p>${esc(radioStation.description)}</p></div><span class="base-radio-indicator"><i></i>${radioIsActive?'В ЭФИРЕ':radioSelected?'ПАУЗА':'ГОТОВО'}</span></div><div class="base-radio-controls"><div class="base-radio-track"><b>${radioSelected?esc(radioTrack?.title||'Композиция'):radioTracks.length?`${radioTracks.length} композиций в библиотеке`:'Нет встроенных треков'}</b><small>${radioTracks.length?'Встроенные и импортированные локальные треки':'Добавь музыку через КПК → Плеер'}</small></div>${btn(radioIsActive?'Ⅱ Пауза':radioSelected?'▶ Продолжить эфир':'▶ Включить эфир','radio-toggle','button primary',radioTracks.length?'':'disabled')}${btn('Следующая ▸','radio-next','button ghost',radioTracks.length>1?'':'disabled')}${btn('■ Выключить','radio-stop','button ghost',radioSelected?'':'disabled')}</div></section>`:'';
  const npcs=getAvailableStalkers(game,game.locationId);
  const squads=game.squads.filter(squad=>squad.location===game.locationId);
  const time=getGameDateTime(game.clock);
  const spots=getExploreSpots(game.locationId);
  const hiddenLocationAction=game.locationId==='rookie-village'
    ? btn('В подвал к Сидоровичу','travel','button small primary',`data-id="sidorovich-bunker"`)
    : game.locationId==='sidorovich-bunker'
      ? btn('Выйти в деревню','travel','button small ghost',`data-id="rookie-village"`)
      : '';
  const selectedSpot=spots.find(spot=>spot.id===game.player?.shelterSpotId);
  const currentArea=spots.find(spot=>spot.id===game.currentAreaId) || selectedSpot || null;
  const mainStory=getMainStoryQuest(game);
  const storyButtons=(!game.activeEncounter && mainStory)?({
    'find-first-flash':game.locationId==='trailer'?btn('Осмотреть кусты и найти флешку','story-action','button small primary','data-id="story-flash-search"'): '',
    'deliver-supplies':game.locationId==='forest-camp'?`${btn('Передать припасы','story-action','button small primary','data-id="story-supplies-deliver"')}${btn('Отказаться от поручения','story-action','button small ghost','data-id="story-supplies-fail"')}`:'',
    'fetch-meat':game.locationId==='anomaly-dump'?btn('Забрать «Ломоть мяса»','story-action','button small primary','data-id="story-meat-pickup"'):'',
    'deliver-present':game.locationId==='south-checkpoint'?btn('Передать подарок Дзержинскому','story-action','button small primary','data-id="story-present-deliver"'):'',
    'clear-underpass':game.locationId==='underpass'?btn('Проверить переход','story-action','button small danger','data-id="story-underpass-start"'):'',
    'fight-underpass':game.locationId==='underpass'?btn('Повторить столкновение','story-action','button small danger','data-id="story-underpass-start"'):'',
    'find-courier':'',
    'recover-courier-flash':game.locationId==='locomotive'?`${btn('Попробовать договориться','story-action','button small primary','data-id="story-bandit-negotiate"')}${btn('Вступить в стычку','story-action','button small danger','data-id="story-bandit-fight"')}`:'',
    'fight-courier-bandits':game.locationId==='locomotive'?`${btn('Обыскать вещи у локомотива','story-action','button small primary','data-id="story-courier-flash-search"')}${btn('Повторить столкновение','story-action','button small danger','data-id="story-bandit-fight"')}`:'',
    'clear-elevator':game.locationId==='elevator'?btn('Проверить элеватор','story-action','button small danger','data-id="story-elevator-start"'):'',
    'fight-elevator':game.locationId==='elevator'?btn('Повторить проверку','story-action','button small danger','data-id="story-elevator-start"'):'',
    'scout-farm':'',
    'clear-farm':game.locationId==='pig-farm'?btn('Начать зачистку фермы','story-action','button small danger','data-id="story-farm-start"'):'',
    'fight-farm':game.locationId==='pig-farm'?btn('Повторить зачистку','story-action','button small danger','data-id="story-farm-start"'):'',
  })[mainStory.stage]||'' : '';
  const storyPanel=mainStory?`<section class="main-story-panel"><div><small>ОСНОВНАЯ ЛИНИЯ · ${esc(mainStory.giver)}</small><b>${esc(mainStory.title)}</b><p>${esc(mainStory.objective)}</p></div>${storyButtons?`<div class="main-story-actions">${storyButtons}</div>`:''}</section>`:'';
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
  const maskClass=isMask==='optik'?'mask-optik':isMask?'mask-aurora':'';
  const areaName=currentArea?.name||'';
  const locationLight=/подвал|тоннель|переход|кабина|ниша|склад|казарма|контора|укрытие|сарай|погреб/i.test(areaName);
  const hour=Number(String(time.time||'12:00').split(':')[0]);
  const daylight=(hour<5 || hour>=22) ? .58 : (hour<7 || hour>=20) ? .76 : (hour<9 || hour>=18) ? .9 : 1;
  const weatherDim=/дожд|гроза|туман|низкая облачность/i.test(game.weather||'') ? .88 : 1;
  const interiorDim=locationLight ? .74 : 1;
  const roomLight=game.locationLights?.[game.locationId]?1.22:1;
  const brightnessValue=Math.max(.42,daylight*weatherDim*interiorDim*roomLight*(state?.ui?.flashlight?1.25:1));
  const brightness=`brightness(${brightnessValue.toFixed(2)})`;
  const gmText=game.activeEncounter
    ? `${game.activeEncounter.name} перед тобой. Состояние: ${game.activeEncounter.hp}/${game.activeEncounter.maxHp}. Не теряй времени — опиши, что делаешь.`
    : (currentArea?.description || game.currentDescription||location?.desc||'Оглядись. Кордон редко бывает по-настоящему тихим.');
  const enemy=game.activeEncounter;
  const enemyEmoji=enemy?.type==='blind-dog'?'🐕':enemy?.type==='flesh'?'🐖':enemy?.type==='military'||enemy?.type==='bandit'||enemy?.type==='stalker'?'🕴️':'☢';
  const enemyPortrait=enemy?.icon && ['military','bandit','stalker'].includes(enemy.type)?`<div class="enemy-portrait-frame"><small>ПОРТРЕТ</small><img class="enemy-portrait-art" src="${esc(enemy.icon)}" alt="Портрет: ${esc(enemy.name)}" loading="lazy"></div>`:'';
  const enemyBody=enemy?.appearance?`<div class="enemy-body-frame"><small>ВНЕШНОСТЬ</small><img class="enemy-body-art" src="${esc(enemy.appearance)}" alt="Полная внешность: ${esc(enemy.name)}" loading="lazy"></div>`:`<div class="enemy-body-frame enemy-fallback">${enemyEmoji}</div>`;
  const enemyStage=enemy?`<div class="enemy-stage ${enemy.type}"><div class="enemy-art-pair">${enemyPortrait}${enemyBody}</div><div class="enemy-stage-info"><b>${esc(enemy.name)}</b>${enemy.faction?`<div class="enemy-faction-row">${factionInsignia(enemy.faction)}<span>${esc(FACTIONS.find(f=>f.id===enemy.faction)?.name||enemy.faction)}</span></div>`:''}<span>${enemy.hp}/${enemy.maxHp} здоровья</span><div class="bar-track"><i class="danger" style="width:${Math.max(0,enemy.hp/enemy.maxHp*100)}%"></i></div></div></div>`:'';
  const effect=game.combatEffect && Number(game.combatEffect.until||0)>=Number(game.clock.worldMinutes||0)?game.combatEffect.type:null;
  const combatEffect=effect?`<div class="combat-scene-effect ${esc(effect)}" aria-hidden="true">${effect==='bolt'?'🔩':effect==='grenade'?'💣':effect==='reload'?'↻':effect==='med'?'✚':effect==='aim'?'⌖':effect==='dodge'?'↝':'✦'}</div>`:'';
  const weapon=getBestWeapon(game.inventory,game);
  const magazine=weapon?.ammo?(game.weaponMagazines?.[weapon.id]??'—'):null;
  const reserve=weapon?.ammo?(game.ammoRounds?.[weapon.ammo]??0):null;
  const weaponEmoji=weapon?.weapon==='melee'?'🔪':'🔫';
  const weaponSide=state.settings?.weaponHudSide==='left'?'left':'right';
  const heldWeaponImage=weapon?.weapon&&ASSETS.weaponImages?.[weapon.id]?`<div class="first-person-weapon ${weaponSide}" aria-hidden="true"><img src="${esc(ASSETS.weaponImages[weapon.id])}" alt=""></div>`:'';
  const weaponHud=enemy
    ? `<aside class="weapon-hud ${weaponSide} combat"><div class="weapon-hud-top"><small>В РУКАХ</small>${btn('⇄','toggle-weapon-side','icon-button small',`title="Переместить панель оружия"`)}</div><div class="weapon-hud-icon">${weaponEmoji}</div><b>${esc(weapon?.name||'Без оружия')}</b>${weapon?.ammo?`<div class="ammo-readout"><strong>${magazine}</strong><span>в магазине</span><strong>${reserve}</strong><span>в запасе</span></div>`:`<small>${weapon?'Ближний бой':'Выбери оружие в рюкзаке'}</small>`}<div class="weapon-quick-actions">${weapon?.ammo?btn('↻ Зарядить','combat-reload','button tiny ghost'):''}${btn('🔫 Атака','combat-attack','button tiny danger')}${btn('▣ Рюкзак','inventory-open','button tiny ghost')}</div><div class="hand-tools"><span>🔩 Болт: ${game.boltsRemaining??0}</span>${btn('Бросить болт','combat-bolt','button tiny ghost')}</div></aside>`
    : `<aside class="weapon-hud ${weaponSide} idle"><div class="weapon-hud-top"><small>СНАРЯЖЕНИЕ</small>${btn('⇄','toggle-weapon-side','icon-button small',`title="Переместить панель снаряжения"`)}</div><div class="weapon-idle-body"><span class="weapon-hud-icon">${weaponEmoji}</span><div><small>В РУКАХ</small><b>${esc(weapon?.name||'Без оружия')}</b>${btn('Открыть рюкзак','inventory-open','button tiny ghost')}</div></div></aside>`;
  const quickCombat=enemy?`<div class="combat-quickbar"><b>БОЕВЫЕ ДЕЙСТВИЯ</b>${btn('Прицелиться','combat-aim','button small')}${btn('Уклониться','combat-dodge','button small')}${btn('Защищаться','combat-defend','button small')}${btn('Граната','combat-grenade','button small danger',`${countItem(game.inventory,'rgd5')?'':'disabled'}`)}${btn('Отступить','combat-flee','button small ghost')}</div>`:'';
  const rescueButton=game.locationId==='atp'&&!game.atpRescue?.cleared?btn('Освободить пленников','atp-rescue-start','button tiny danger'):'';
  const areaPanel=currentArea?`<div class="current-area-panel"><div><small>ТЕКУЩЕЕ МЕСТО</small><b>${esc(currentArea.name)}</b><p>${esc(currentArea.description)}</p></div><div class="current-area-actions">${currentArea.kind==='breakable'?btn('Сломать ящик','break-crate','button tiny primary',`data-id="${currentArea.id}"`):btn('Обыскать','scene-search','button tiny primary',`data-id="${currentArea.id}"`)}${currentArea.shelter&&!game.player.sheltered?btn('Укрыться','scene-shelter','button tiny ghost',`data-id="${currentArea.id}"`):''}${game.player.sheltered?btn('Выйти из укрытия','leave-shelter','button tiny ghost'):''}${btn('Вернуться наружу','scene-back','button tiny ghost')}${btn(state?.ui?.flashlight?'Выключить фонарик':'Фонарик','flashlight-toggle','button tiny ghost')}</div></div>`:'';
  const nearbyNpcs=npcs.slice(0,2);
  const npcRows=nearbyNpcs.map(npc=>`<div class="npc-interaction"><button class="npc-chip" data-action="talk" data-id="${npc.id}" title="${esc(npc.activity||npc.personalTask||npc.role||'Сталкер')}"><span class="npc-scene-portrait">${avatarMarkup(npc.icon,npc.name,npc.faction==='military'?'🪖':npc.faction==='bandit'?'♟':'☢')}</span>${isImageSource(npc.appearance)?`<span class="npc-scene-body"><img src="${esc(npc.appearance)}" alt="Внешность ${esc(npc.name)}" loading="lazy"></span>`:''}<span class="npc-chip-label"><b>${esc(npc.name)}</b><small>${esc(npc.role||'Сталкер')}</small></span><span class="npc-talk-icon">${iconSvg('talk')}</span></button><button class="npc-trade-button" data-action="trade-open" data-id="${npc.id}" title="Предложить обмен" aria-label="Торговать с ${esc(npc.name)}">${iconSvg('trade')}</button></div>`).join('');
  const vignette=maskClass?`<div class="mask-vignette ${maskClass}"></div>`:'';
  const anomalyNames={trampoline:'Трамплин',carousel:'Карусель',vortex:'Воронка'};
  const hazardLabels=[...(location?.hazards||[]).map(h=>h==='radiation'?'☢ Радиационный очаг':'◉ Гравитационная аномалия'),...(location?.anomalies||[]).map(id=>`◉ ${anomalyNames[id]||id}`)];
  const hazards=hazardLabels.length?`<div class="scene-hazards">${hazardLabels.map(label=>`<span>${esc(label)}</span>`).join('')}</div>`:'';
  const anomaly=location?.hazards?.includes('gravity')?`<div class="anomaly-scene" aria-hidden="true"><i></i><i></i><i></i></div>`:'';
  return `<section class="location-scene ${enemy?'in-combat':''} ${maskClass}" style="--scene-image:url('${scene}');--scene-brightness:${brightness}">
    <div class="scene-background" style="background-image:linear-gradient(90deg,rgba(7,11,7,.75),rgba(7,11,7,.08) 55%,rgba(7,11,7,.55)),url('${scene}');filter:${brightness}"></div>${vignette}${anomaly}${heldWeaponImage}
    <div class="scene-topline"><div class="scene-gm"><small>GAME MASTER · ${esc(location?.name||'КОРДОН')}</small><p>${esc(gmText)}</p></div><div class="scene-clock"><b>${time.time}</b><span>${esc(time.date)}</span><small>${esc(game.weather||'Пасмурно')}</small></div></div>
    ${emissionBanner}<div class="scene-vitals"><span>♥ ${game.player.hp}/${game.player.maxHp}</span><span>⚡ ${Math.round(game.player.stamina)}%</span><span class="${game.player.hunger>=75?'vital-warning':''}">🍞 Голод ${Math.round(game.player.hunger)}%</span><span class="${game.player.thirst>=75?'vital-warning':''}">💧 Жажда ${Math.round(game.player.thirst)}%</span><span>☢ ${countItem(game.inventory,'pripyat-dosimeter')?`Припять: ${Math.round(game.player.radiation)}%`:`${Math.round(game.player.radiation)}%`}</span>${countItem(game.inventory,'medved')?`<span>📡 Медведь: ${location?.anomalies?.length?'есть отклик':'тихо'}</span>`:''}${emissionCountdown}</div>
    ${hazards}${enemyStage}${combatEffect}${quickCombat}
    ${radioPanel}
    <div class="scene-footer"><div class="scene-places"><div class="scene-entry-actions">${btn("Места и обыск", "explore-open", "button small ghost")}${btn("Напольный фонарик", "flashlight-toggle", "button small ghost", `aria-pressed="${!!state?.ui?.flashlight}"`)}${hiddenLocationAction}${rescueButton}</div>${areaPanel}${storyPanel}<div class="scene-interactions">${npcRows||'<span class="scene-no-contacts">Поблизости никого не видно.</span>'}${npcs.length>2?btn(`Контакты · ещё ${npcs.length-2}`,'contacts-open','button tiny ghost'):npcs.length?btn('Все контакты','contacts-open','button tiny ghost'):''}</div></div>${weaponHud}</div>
  </section>`;
}

function renderMap(game,state) {
  const location = getLocation(game.locationId);
  const mapLocations=LOCATIONS.filter(loc=>loc.mapVisible!==false);
  const activeQuests=(game.quests||[]).filter(q=>['active','ready'].includes(q.status));
  const questTarget = (quest) => quest.id==='wolf-dog-pack' ? 'trailer' : quest.condition?.startsWith('visit:') ? quest.condition.slice(6) : quest.condition==='search:stop' ? 'stop' : quest.condition==='artifact:anomaly-dump' ? 'anomaly-dump' : null;
  const targets=new Set(activeQuests.map(questTarget).filter(Boolean));
  const mainStoryTarget=getMainStoryQuest(game);
  if (mainStoryTarget?.location) targets.add(mainStoryTarget.location);
  const near=(location?.neighbors||[]).map(getLocation).filter(Boolean);
  const edgeSet=new Set();
  const routeLines=mapLocations.flatMap(loc=>(loc.neighbors||[]).map(id=>{
    const next=mapLocations.find(entry=>entry.id===id);
    if(!next) return '';
    const key=[loc.id,next.id].sort().join('|');
    if(edgeSet.has(key)) return '';
    edgeSet.add(key);
    return `<line x1="${loc.x}" y1="${loc.y}" x2="${next.x}" y2="${next.y}" />`;
  })).filter(Boolean).join('');
  const mapView=`<div class="map-workspace">
    <section class="map-map-column"><div class="map-frame map-frame-large"><img src="${ASSETS.map}" alt="Карта Кордона с дорогами и переходами" loading="eager" decoding="async" fetchpriority="high" onerror="this.classList.add('map-image-error');this.nextElementSibling.hidden=false"><div class="map-fallback" hidden>КАРТА КОРДОНА<br><small>Изображение карты недоступно</small></div><div class="map-pins"><svg class="map-route-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${routeLines}</svg>${mapLocations.map((loc,index)=>{const labelSide=loc.x<24?'right':loc.x>76?'left':(index%2===0?'below':'above');return `<button class="map-pin ${loc.id===game.locationId?'current':''} ${(location?.neighbors||[]).includes(loc.id)?'reachable':''} ${targets.has(loc.id)?'quest-target':''} label-${labelSide}" style="left:${loc.x}%;top:${loc.y}%" data-action="location-open" data-id="${loc.id}" aria-label="${esc(loc.name)}" title="${esc(loc.name)}"><span class="map-pin-title">${esc(loc.name)}</span></button>`}).join('')}</div></div><div class="map-key"><span><i class="map-key-dot current"></i> Текущее место</span><span><i class="map-key-dot reachable"></i> Можно перейти</span><span><i class="map-key-dot quest"></i> Цель задания</span></div></section>
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
  const slots=game.equipmentSlots||{primary1:null,primary2:null,pistol:null,knife:null,armor:game.player?.armorId||null,mask:game.player?.maskId||null,quick:[null,null,null,null]};
  game.artifactBelt ||= [null,null,null,null,null];
  const slotCard=(slot,label,fallbackId=null)=>{
    const id=slots[slot]??fallbackId, item=id?getItem(id):null;
    const equipped=slot==='armor'?game.player?.armorId===id:slot==='mask'?game.player?.maskId===id:false;
    return `<button class="equipment-slot ${item?'filled':''} ${equipped?'equipped':''}" data-action="slot-select" data-slot="${slot}" title="${item?esc(item.name):'Пустой слот'}" aria-label="${label}: ${item?esc(item.name):'пусто'}"><small>${label}</small><span>${item?itemImage(item):'＋'}</span><b>${item?esc(item.name):'Пусто'}</b>${equipped?'<i>НАДЕТО</i>':''}</button>`;
  };
  const quickSlots=(slots.quick||[null,null,null,null]).map((id,index)=>{
    const item=id?getItem(id):null;
    return `<button class="quick-slot ${item?'filled':''}" data-action="slot-select" data-slot="quick${index}" title="${item?esc(item.name):'Пустой быстрый слот'}"><small>${index+1}</small><span>${item?itemImage(item):'＋'}</span><b>${item?esc(item.name):'Пусто'}</b></button>`;
  }).join('');
  return `<div class="tab-page inventory-page"><div class="tab-heading"><div><div class="eyebrow">СНАРЯЖЕНИЕ · РЮКЗАК</div><h2>Инвентарь</h2><p>Предметы показаны отдельными карточками с изображениями.</p></div><div class="weight-box"><b>${weight.toFixed(1)} кг</b><small>из ${MAX_CARRY_KG} кг</small><div class="bar-track"><i style="width:${Math.min(100,weight/MAX_CARRY_KG*100)}%"></i></div></div></div>
    <section class="equipment-loadout"><div class="equipment-strip-heading"><b>Экипировка</b><small>Оружие · броня · защита</small></div><div class="equipment-slots">${slotCard('primary1','ОСНОВНОЙ 1')}${slotCard('primary2','ОСНОВНОЙ 2')}${slotCard('pistol','ПИСТОЛЕТ')}${slotCard('knife','НОЖ')}${slotCard('armor','БРОНЯ',game.player?.armorId||null)}${slotCard('mask','ПРОТИВОГАЗ',game.player?.maskId||null)}</div><div class="quick-slots-heading"><b>Быстрый доступ</b><small>Назначай расходники из рюкзака</small></div><div class="quick-slots">${quickSlots}</div><div class="artifact-belt"><div class="quick-slots-heading"><b>Пояс артефактов</b><small>До пяти артефактов</small></div><div class="artifact-belt-slots">${Array.from({length:5},(_,index)=>{const id=game.artifactBelt[index];const item=id?getItem(id):null;return `<button class="artifact-belt-slot ${item?'filled':''}" data-action="artifact-belt-remove" data-index="${index}" ${item?'':'disabled'} title="${item?`Снять: ${esc(item.name)}`:'Свободное место'}"><span>${item?itemImage(item):'＋'}</span><small>${index+1}</small></button>`}).join('')}${btn('Пояснить правила','belt-info','button tiny ghost')}</div></div></section>
    <div class="inventory-guide"><span><i class="guide-square one"></i> 1×1</span><span><i class="guide-square two"></i> 2×1 / 1×2</span><span><i class="guide-square four"></i> 2×2 и больше</span><small>${stacks.reduce((sum,item)=>sum+item.qty,0)} предметов · ${stacks.length} типов</small></div>
    ${stacks.length ? `<div class="inventory-grid inventory-grid-clear" data-drop-zone="source">${stacks.map(stack=>{const item=getItem(stack.id);if(!item)return '';const quantity=stack.id==='boltpack'?`Болтов: ${game.boltsRemaining??stack.qty*10}`:['ammo9x18','ammo9x19','ammo545','shells'].includes(stack.id)?`Патронов: ${game.ammoRounds?.[stack.id]??stack.qty*(stack.id==='shells'?8:stack.id==='ammo545'?30:12)}`:`Вес: ${(item.weight*stack.qty).toFixed(2)} кг`;return `<article draggable="true" data-drag-side="player" data-drag-id="${item.id}" class="inventory-item inventory-item-clear ${item.cat==='Броня'?'armor-inventory-item':''}"  title="${esc(item.desc||item.name)}"><div class="inventory-item-top"><span>${esc(item.cat)}</span><b>${stack.qty>1?`×${stack.qty}`:'1 шт.'}</b></div><div class="inventory-item-image">${itemImage(item)}</div><b class="inventory-item-name">${esc(item.name)}</b><small>${esc(quantity)}</small><div class="inventory-item-actions">${item.weapon||item.armor||item.cat==='Защита'?`<small class="item-condition-label">Состояние: ${Math.round(getItemCondition(game,item.id))}%</small>`:''}${btn('Описание','item-details','button tiny ghost',`data-id="${item.id}"`)}${item.cat==='Артефакты'?btn(game.artifactBelt.filter(value=>value===item.id).length<stack.qty&&game.artifactBelt.some(value=>!value)?'На пояс':game.artifactBelt.includes(item.id)?'Снять с пояса':'Пояс занят','artifact-belt-toggle','button tiny ghost',`data-id="${item.id}"`):''}${item.use?btn(inCombat?'Использовать в бою':'Использовать',inCombat?'combat-use-item':'use-item','button tiny primary',`data-id="${item.id}"`):''}${item.weapon&&item.weapon!=='grenade'?btn('В слот оружия','slot-assign','button tiny ghost',`data-id="${item.id}"`):''}${item.armor?btn('В слот брони','slot-assign','button tiny ghost',`data-id="${item.id}" data-slot="armor"`):''}${item.cat==='Защита'?btn('В слот противогаза','slot-assign','button tiny ghost',`data-id="${item.id}" data-slot="mask"`):''}${item.use?btn('Быстрый доступ','slot-assign','button tiny ghost',`data-id="${item.id}"`):''}${btn('Выбросить','drop-item','button tiny ghost',`data-id="${item.id}"`)}</div></article>`}).join('')}</div>` : '<div class="empty-state large">Рюкзак пуст. Найди припасы в Зоне или купи их у торговца.</div>'}
    <div class="inventory-footer"><span>Нажми «В слот» у предмета или выбери слот экипировки.</span>${btn('Закрыть рюкзак','close-modal','button ghost')}</div>
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
  return `<div class="tab-page"><div class="tab-heading"><div><div class="eyebrow">КПК · ЛИЧНОЕ ДЕЛО</div><h2>Статистика персонажа</h2><p>${esc(character.name)} · ${esc(FACTIONS.find(f=>f.id===p.faction)?.name||'Фракция')}</p></div><div class="profile-heading-art">${factionInsignia(p.faction)}${avatarMarkup(character.avatar,character.name,'☢')}</div></div>
    <div class="stats-grid"><article class="metric-card"><span>Здоровье</span><strong>${p.hp}<small> / ${p.maxHp}</small></strong></article><article class="metric-card"><span>Репутация</span><strong>${p.reputation}</strong></article><article class="metric-card"><span>Рейтинг</span><strong>${p.rating}</strong></article><article class="metric-card"><span>Звание</span><strong class="rank-text">${esc(p.rank)}</strong>${p.faction==='military'?`<small>Позывной: «${esc(p.callsign||'Не назначен')}»</small>`:''}</article><article class="metric-card"><span>Убеждено противников</span><strong>${p.kills}</strong></article><article class="metric-card"><span>Артефактов найдено</span><strong>${p.artifacts}</strong></article></div>
    <div class="panel bars-panel">${bar('Выносливость',p.stamina,'stamina')}${bar('Голод',p.hunger,'warning')}${bar('Жажда',p.thirst,'warning')}${bar('Радиация',p.radiation,'danger')}${bar('Стресс',p.stress||0,'warning')}</div>
    <div class="panel bio-panel"><h3>Досье</h3><div class="bio-grid"><span>Дата рождения</span><b>${esc(character.birthDate||'Не указана')}</b><span>Рост / вес</span><b>${character.height?`${esc(character.height)} см`: '—'} / ${character.weight?`${esc(character.weight)} кг`:'—'}</b><span>Характер</span><b>${esc(character.personality||'Не указан')}</b></div><p>${esc(character.biography||'Биография не заполнена.')}</p>${character.notes?`<p class="muted">${esc(character.notes)}</p>`:''}</div>
    <form id="profile-edit-form" class="panel profile-edit-form"><div class="panel-title"><h3>Редактировать личное дело</h3><span>Изменения сохраняются в персонаже</span></div><div class="form-grid"><label>Имя<input name="name" maxlength="32" required value="${esc(character.name)}"></label><label>Рост, см<input name="height" type="number" min="80" max="230" value="${esc(character.height||'')}"></label><label>Вес, кг<input name="weight" type="number" min="25" max="250" value="${esc(character.weight||'')}"></label><label>Характер<textarea name="personality" rows="2">${esc(character.personality||'')}</textarea></label><label>Биография<textarea name="biography" rows="3">${esc(character.biography||'')}</textarea></label><label>Другое<textarea name="notes" rows="2">${esc(character.notes||'')}</textarea></label></div><div class="profile-avatar-edit profile-visual-edit"><div><small>ПОРТРЕТ</small>${avatarMarkup(character.avatar,character.name,'☢')}${btn('Выбрать портрет','profile-choose-avatar','button ghost')}<label class="button ghost" for="profile-avatar-upload">Загрузить портрет</label><input id="profile-avatar-upload" type="file" accept="image/*" hidden></div><div><small>ВНЕШНОСТЬ</small>${isImageSource(character.appearance)?`<img class="profile-appearance-thumb" src="${esc(character.appearance)}" alt="Внешность">`:'<span class="profile-appearance-thumb profile-appearance-empty">—</span>'}${btn('Выбрать внешность','profile-choose-appearance','button ghost')}<label class="button ghost" for="profile-appearance-upload">Загрузить внешность</label><input id="profile-appearance-upload" type="file" accept="image/*" hidden></div></div><div class="form-actions">${btn('Сохранить изменения','profile-save','button primary')}</div></form>
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
  const mainStory=getMainStoryQuest(game);
  const localJobs=(game.ambientNpcs||[]).filter(npc=>npc.smallQuest?.status==='active');
  const completed=quests.filter(q=>q.status==='completed').length;
  const questProgress=q=>q.id==='wolf-dog-pack'?`${game.wolfDogQuest?.killed||0}/5 собак`:q.id==='pudel-sausage'?`${countItem(game.inventory,'sausage')? 'Колбаса в рюкзаке':'Найти диетическую колбасу'}`:q.id==='signal-dump'?(game.secretAnomaly?.name?`Названа: ${game.secretAnomaly.name} · вернись к Сидоровичу`:game.secretAnomaly?.observed?'Аномалия обнаружена · придумай название':'Добраться до Тайного лагеря'):q.status==='ready'?'Цель выполнена':q.status==='completed'?'Задание сдано':'Выполни указанное поручение';
  return `<div class="tab-page"><div class="tab-heading"><div><div class="eyebrow">КПК · ЖУРНАЛ ЗАДАНИЙ</div><h2>Задания</h2><p>В журнал попадают только принятые поручения и завершённые дела.</p></div><span class="quest-count">${completed}/${quests.length} выполнено</span></div>
    ${mainStory?`<article class="quest-card active main-story-quest"><div class="quest-symbol"><span>✦</span></div><div class="quest-main"><div class="quest-title-row"><h3>${esc(mainStory.title)}</h3><span>ОСНОВНАЯ ЛИНИЯ</span></div><p>${esc(mainStory.objective)}</p><small>Заказчик: ${esc(mainStory.giver)} · Цель: ${esc(getLocation(mainStory.location)?.name||'Кордона')}</small></div></article>`:''}
    ${localJobs.length?`<section class="personal-quest-list"><div class="eyebrow">МЕЛКИЕ ПРОСЬБЫ СТАЛКЕРОВ</div>${localJobs.map(npc=>`<article class="quest-card active"><div class="quest-symbol">⌁</div><div class="quest-main"><div class="quest-title-row"><h3>Просьба: ${esc(getItem(npc.smallQuest.itemId)?.name||npc.smallQuest.itemId)}</h3><span>ЛИЧНОЕ</span></div><p>${esc(npc.name)} ждёт один предмет. Принеси его обратно и поговори со сталкером.</p><small>Награда: ${money(npc.smallQuest.reward)}</small></div></article>`).join('')}</section>`:''}
    ${repeat?`<article class="quest-card active"><div class="quest-symbol"><img src="${esc(ASSETS.questIcons?.search||ASSETS.questIcons.default)}" alt="" loading="lazy"></div><div class="quest-main"><div class="quest-title-row"><h3>${esc(repeat.title)}</h3><span>ЦИКЛИЧЕСКОЕ</span></div><p>${esc(repeat.description)}</p><div class="quest-progress"><span>${repeat.type==='tails'?'Хвосты':repeat.type==='medusa'?'Артефакт':'Контакт с должником'}</span><b>${repeat.type==='tails'?`${countItem(game.inventory,'tail')}/5`:repeat.type==='medusa'?`${countItem(game.inventory,'medusa')}/1`:repeat.contacted?'1/1':'0/1'}</b></div><small>Заказчик: Сидорович · Награда: ${money(repeat.reward)}</small></div></article>`:''}
    <div class="quest-list">${quests.map(q=>{const npc=NPCS.find(n=>n.id===q.giver);const value=questProgress(q);return `<article class="quest-card ${q.status}"><div class="quest-symbol"><img src="${esc(ASSETS.questIcons?.[q.id]||ASSETS.questIcons.default)}" alt="" loading="lazy"><i>${q.status==='completed'?'✓':q.status==='ready'?'✓':'!'}</i></div><div class="quest-main"><div class="quest-title-row"><h3>${esc(q.title)}</h3><span>${q.status==='completed'?'ВЫПОЛНЕНО':q.status==='ready'?'ОЖИДАЕТ СДАЧИ':'В ПРОЦЕССЕ'}</span></div><p>${esc(q.text)}</p><div class="quest-progress"><span>Текущий этап</span><b>${esc(value)}</b></div><small>Заказчик: ${esc(npc?.name||'Неизвестно')} · Награда: ${money(q.reward)}</small></div>${npc?avatarMarkup(npc.icon,npc.name,'♟'):''}</article>`}).join('') || '<div class="empty-state large">Пока нет активных заданий. Поговори с местными и узнай, кому нужна помощь.</div>'}</div>
  </div>`;
}


function renderPlayer(state) {
  const music=state.ui.music||{};
  const tracks=state.ui.localMusicTracks||[];
  const current=tracks.find(track=>track.id===music.trackId);
  const active=!!music.trackId;
  const bundledCount=tracks.filter(track=>track.source==='bundled').length;
  const personalCount=tracks.filter(track=>track.source!=='bundled').length;
  const modeLabel=music.mode==='radio'?'Радио базы':'Плеер КПК';
  const trackRows=tracks.map((track,index)=>`<article class="player-track ${track.id===music.trackId?'selected':''}"><span class="player-track-number">${String(index+1).padStart(2,'0')}</span><div class="player-track-meta"><b>${esc(track.title)}</b><small>${esc(track.source==='bundled'?'Встроено в игру':track.fileName||track.label||'Локальный файл')} · ${track.source==='bundled'?'аудиотека игры':`${(track.size/1048576).toFixed(1)} МБ`}</small></div>${btn(track.id===music.trackId&&music.playing?'Ⅱ':'▶','player-play-track','button tiny '+(track.id===music.trackId?'primary':'ghost'),`data-id="${track.id}"`)}</article>`).join('');
  const folderPicker='<label class="button primary" for="local-music-files">＋ Выбрать папку Music</label><input id="local-music-files" type="file" accept="audio/*,.mp3,.m4a,.ogg,.wav,.flac,.aac" multiple webkitdirectory directory hidden><label class="button ghost" for="local-music-archive">＋ Импортировать ZIP</label><input id="local-music-archive" type="file" accept=".zip,application/zip" hidden>';
  const nowPlayingSub=music.mode==='radio'?'Эфир базовой радиостанции':current?.source==='bundled'?'Встроенная композиция игры':current?.fileName||'Локальный файл';
  return `<div class="tab-page player-page"><div class="tab-heading"><div><div class="eyebrow">КПК · МУЗЫКАЛЬНЫЙ ПЛЕЕР</div><h2>Музыка</h2><p>Встроенные композиции игры и музыка из твоей папки или ZIP-архива. Импортированные треки доступны и радиостанциям на базах.</p></div><span class="player-status ${active&&music.playing?'live':''}"><i></i>${active&&music.playing?'ВОСПРОИЗВЕДЕНИЕ':active?'ПАУЗА':'ОЖИДАНИЕ'}</span></div>
    <section class="player-now panel"><div class="eyebrow">${modeLabel.toUpperCase()} · СЕЙЧАС ИГРАЕТ</div><h3>${esc(current?.title||'Ничего не выбрано')}</h3><p>${esc(nowPlayingSub)}</p><div class="player-controls">${btn('◂ Предыдущая','player-prev','button ghost',active?'':'disabled')}${btn(active?(music.playing?'Ⅱ Пауза':'▶ Продолжить'):'▶ Выбери композицию','player-toggle','button primary',active?'':'disabled')}${btn('Следующая ▸','player-next','button ghost',active?'':'disabled')}${btn('■ Стоп','player-stop','button ghost',active?'':'disabled')}</div><small>Встроено в игру: ${bundledCount} · добавлено с устройства: ${personalCount}</small></section>
    <section class="player-library panel"><div class="panel-title"><h3>Музыкальная библиотека</h3><span>${tracks.length} треков</span></div><div class="local-music-actions">${folderPicker}<small>Поддерживаются MP3, M4A, OGG, WAV, FLAC и AAC. Можно выбрать папку Music или ZIP-архив: распаковка происходит прямо в браузере, файлы никуда не загружаются. Импортированные треки работают в плеере и на радио баз до закрытия/перезагрузки игры.</small></div><div class="player-track-list">${trackRows||'<div class="empty-state">Библиотека пуста. Выбери папку Music или импортируй ZIP-архив с компьютера.</div>'}</div></section>
    <p class="player-disclaimer">Встроенная музыка остаётся частью игры и работает офлайн. Личные файлы не загружаются на сервер и не копируются в сборку; после перезапуска страницы их потребуется импортировать снова.</p>
  </div>`;
}

function renderTrade(game,state) {
  const traders=getAvailableTraders(game,game.locationId);
  const trader=traders.find(entry=>entry.id===state.ui.tradeNpcId);
  if (!trader) {
    return `<div class="tab-page trade-page"><div class="tab-heading"><div><div class="eyebrow">ОБМЕН · КОРДОН</div><h2>Сталкеры поблизости</h2><p>Предложить сделку можно любому человеку рядом. У каждого свой небольшой запас вещей и своя цена.</p></div><div class="money-readout">▣ ${money(game.money)}</div></div>
      ${traders.length?`<div class="trade-merchant-grid">${traders.map(entry=>`<button class="trade-merchant panel" data-action="trade-open" data-id="${entry.id}">${avatarMarkup(entry.icon,entry.name,'♟')}<span><b>${esc(entry.name)}</b><small>${esc(entry.role||'Бродячий торговец')} · ${esc(entry.group||'Путники')}</small><em>${entry.random?'Путник, может уйти с Кордона':'Постоянный торговец'}</em></span><i>Открыть →</i></button>`).join('')}</div>`:'<div class="empty-state large">В этой локации торговцев нет. Проверь КПК позже: бродячие торговцы перемещаются между подлокациями.</div>'}
    </div>`;
  }
  const stock=(trader.stock||[]).filter(entry=>entry.qty>0);
  const inv=game.inventory||[];
  const repDiscount=Math.min(20,Math.floor(Math.max(0,game.player?.reputation||0)/10)*2);
  return `<div class="tab-page trade-page"><div class="tab-heading"><div><div class="eyebrow">ОБМЕН · СДЕЛКА</div><h2>${esc(trader.name)}</h2><p>${esc(trader.role||'Торговец')} · ${esc(getLocation(trader.location)?.name||'Кордон')} ${repDiscount?`· скидка ${repDiscount}% за репутацию`:''}</p></div><div class="money-readout">▣ ${money(game.money)}</div></div>
    <div class="trade-topline">${avatarMarkup(trader.icon,trader.name,'♟')}<div><b>${esc(trader.name)}</b><small>${trader.trader?'Торговец':'Сталкер · личные припасы'}</small></div><span>Рюкзак: ${getWeight(inv).toFixed(1)} / ${MAX_CARRY_KG} кг</span>${btn('← К торговцам','trade-back','button ghost small')}</div>
    <div class="trade-columns"><section class="panel trade-stock"><div class="panel-title"><h3>Что предлагает</h3><span>${stock.length} позиций</span></div>${stock.length?stock.map(entry=>{const item=getItem(entry.id);if(!item)return '';return `<article class="trade-row"><div class="trade-image">${itemImage(item)}</div><div class="trade-info"><b>${esc(item.name)}</b><small>${item.weight} кг · в наличии: ${entry.qty}</small><strong>${money(getTradeBuyPrice(game,trader,entry))}</strong>${getTradeBuyPrice(game,trader,entry)<entry.price?`<small class="discount-note">Скидка за репутацию</small>`:''}</div>${btn('Купить','trade-buy','button small primary',`data-trader-id="${trader.id}" data-item-id="${item.id}"`)}</article>`}).join(''):'<div class="empty-state">Товар закончился. Запасы пополняются не сразу.</div>'}</section>
    <section class="panel trade-sell"><div class="panel-title"><h3>Что предлагаешь ты</h3><span>${inv.length} видов</span></div>${inv.length?inv.map(stack=>{const item=getItem(stack.id);if(!item)return '';const sellPrice=Math.max(1,Math.floor(item.price*(trader.buyMultiplier||.4)));return `<article class="trade-row"><div class="trade-image">${itemImage(item)}</div><div class="trade-info"><b>${esc(item.name)} ×${stack.qty}</b><small>${item.weight} кг за штуку · цена выкупа</small><strong>${money(sellPrice)}</strong></div>${btn('Продать 1','trade-sell','button small ghost',`data-trader-id="${trader.id}" data-item-id="${item.id}"`)}</article>`}).join(''):'<div class="empty-state">В рюкзаке пока нечего продавать.</div>'}</section></div>
  </div>`;
}

function renderContacts(game,state) {
  const people=getAvailableStalkers(game,game.locationId);
  const traderIds=new Set(getAvailableTraders(game,game.locationId).map(entry=>entry.id));
  const current=getLocation(game.locationId);
  const cards=people.map(n=>{
    const factionName=FACTIONS.find(f=>f.id===n.faction)?.name||n.group||'Неизвестная группировка';
    const role=n.role||'Сталкер';
    const activity=n.activity||n.personalTask||'Занят своими делами';
    const trader=traderIds.has(n.id);
    return `<article class="contact-card-clean">
      <div class="contact-clean-art"><div class="contact-clean-portrait">${avatarMarkup(n.icon,n.name)}</div></div>
      <div class="contact-clean-info"><b>${esc(n.name)}</b><span>${esc(role)}</span>${n.faction==='military'?`<small class="military-ident">${esc(n.militaryRank||'Рядовой')} · «${esc(n.callsign||'Без позывного')}»</small>`:''}<small>${esc(activity)}</small><div class="contact-clean-faction"><span>${esc(factionName)}</span></div></div>
      <div class="contact-clean-actions"><button class="contact-action-button talk-action" data-action="talk" data-id="${n.id}" title="Поговорить с ${esc(n.name)}">${iconSvg('talk')}<span>Диалог</span></button>${trader?`<button class="contact-action-button trade-action" data-action="trade-open" data-id="${n.id}" title="Торговать с ${esc(n.name)}">${iconSvg('trade')}<span>Обмен</span></button>`:''}</div>
    </article>`;
  }).join('');
  return `<div class="tab-page contacts-page"><div class="tab-heading"><div><div class="eyebrow">КПК · КОНТАКТЫ</div><h2>Люди поблизости</h2><p>${esc(current?.name||'Кордон')} · показаны только те, кто находится в этой локации.</p></div><span class="quest-count">${people.length} рядом</span></div><div class="contacts-list-clean">${cards||'<div class="empty-state">Рядом никого нет. Перейди в другую часть Кордона или загляни в лагерь.</div>'}</div></div>`;
}

const ENCYCLOPEDIA_DETAILS = {
  trampoline:['Гравитационная аномалия с коротким импульсом вверх. Высота подброса непостоянна и может оказаться почти незаметной или достигать примерно пятнадцати метров.','Перед проходом проверяй участок болтами и не беги вслепую. Даже если поле не нанесло вреда при первом срабатывании, место может оставаться опасным.'],
  vortex:['Поле постепенно притягивает предметы и человека к центру, затем сжимается и выпускает разряд. После разряда аномалия на короткое время затихает.','В момент ослабления поля появляется короткое окно для отхода. Не пытайся пересекать неизвестную воронку без проверки болтами и свободного пути назад.'],
  carousel:['Гравитационное поле поднимает объект над землёй и раскручивает его. В начале воздействие нарастает постепенно, затем вращение ускоряется.','Наблюдай за границей поля с безопасного расстояния. Не считай короткое затишье признаком того, что аномалия исчезла навсегда.'],
  'secret-unknown':['Неизвестное поле обнаружено в Тайном лагере. Наблюдалась последовательность из подъёма, вращения и последующего выброса объекта в сторону соседней аномалии.','Название и окончательная классификация оставлены на усмотрение исследователя. Неизвестные свойства не следует считать подтверждёнными до повторных наблюдений.'],
  'blind-dog':['Слепые псы ориентируются на звук и обычно держатся небольшими группами. На открытом месте они быстро сокращают дистанцию, поэтому важно заранее заметить движение и иметь путь отхода.','После встречи осмотри останки: иногда удаётся найти хвост. Трофей можно сдать торговцу или оставить как образец для записей.'],
  flesh:['Плоть — тяжёлый мутант, встречающийся возле старых построек и заброшенных хозяйственных участков. Она медленнее мелких зверей, но опасна на короткой дистанции.','После столкновения можно обнаружить глаз плоти. Не подходи к туше, пока поблизости остаются другие мутанты.'],
  boar:['Кабан — крупный и выносливый мутант. Его присутствие часто выдают тяжёлые следы и повреждённая растительность.','Избегай прямой линии движения зверя и используй укрытия. Сведения о конкретной особи пополняются после наблюдений.'],
  medusa:['Артефакт, формирующийся в опасных аномальных зонах. Несмотря на возможную ценность, находка не гарантирует безопасности при извлечении.','Перед поиском проверь уровень радиации, включи подходящий детектор и оставь запас места в рюкзаке.'],
  'stone-flower':['Каменный цветок — редкий артефакт с необычной минеральной структурой. Его происхождение связывают с продолжительным воздействием аномального поля.','Неизвестные свойства не стоит проверять на себе. Сначала оцени находку детектором и уточни условия хранения у торговца.'],
  meat_chunk:['Ломоть мяса — плотный артефакт органического вида. Его внешний вид не означает, что предмет безопасен или пригоден в пищу.','Храни находку отдельно от еды и не используй без подтверждённой информации о свойствах.'],
  gravi:['Грави — артефакт, связанный с гравитационными полями. Такие находки ценятся торговцами, но часто обнаруживаются в местах с нестабильным воздействием.','При поиске используй детектор, проверяй путь болтами и не заходи глубоко в аномалию ради одной находки.'],
  medved:['«Медведь» — детектор аномальных сигналов. Он помогает замечать активность поблизости и ориентироваться при поиске артефактов.','Детектор не заменяет проверку пути болтами: сигнал может быть слабым, а опасное поле — скрытым за препятствием.'],
  otklik:['«Отклик» — базовый прибор для поиска аномальных сигналов. Он помогает обнаружить подозрительный участок до того, как сталкер подойдёт слишком близко.','Используй его вместе с болтами и дозиметром: разные приборы показывают разные типы угроз.'],
  'pripyat-dosimeter':['Счётчик «Припять» показывает уровень радиации, которому подвергается сталкер. Показания помогают понять, когда стоит сменить маршрут или принять антирад.','Следи не только за текущим числом, но и за ростом показаний во время перехода. После выхода из опасной зоны проверь состояние повторно.'],
  'rookie-village':['Деревня новичков — место, где можно передохнуть, познакомиться с местными и получить первые поручения. Здесь работают торговец Сидорович и сталкер Волк.','Перед выходом проверь стартовый комплект, пополни запас еды и воды и поговори с людьми у костра. Деревня служит удобной точкой возвращения после коротких вылазок.'],
  atp:['АТП занято бандитами. Здесь можно встретить торговца Шнурка, узнать местные порядки и найти пленённых сталкеров в двухэтажном здании.','Не заходи на территорию без подготовки: проход может потребовать оплату, а конфликт с местной группой быстро перерастает в перестрелку.'],
  'anomaly-dump':['Тайный лагерь — скрытая точка Кордона, куда ведёт маршрут через лесной лагерь. Здесь обнаружено неизвестное аномальное поле.','Сначала осмотри местность, затем наблюдай за поведением поля. Запиши увиденное и сообщи Сидоровичу, придумав аномалии собственное название.']
};

function encyclopediaExtra(entry,category) {
  const direct=ENCYCLOPEDIA_DETAILS[entry.id];
  if (direct) return direct;
  const fallback={
    locations:['Участок отмечен на карте КПК. При перемещении учитывай соседние переходы, примерное время в пути, состояние погоды и известные угрозы.','Исследованные места постепенно открывают дополнительные точки осмотра, тайники и цели заданий. Перед переходом проверь снаряжение и оставь свободное место в рюкзаке.'],
    people:['Сведения о человеке собираются из встреч, разговоров и наблюдений. Отношение к персонажу может зависеть от фракции, репутации и предыдущих поступков.','Проверяй, где находится собеседник, и учитывай его занятие: торговец, патрульный и обычный сталкер по-разному реагируют на просьбы.'],
    anomalies:['Аномальные поля могут наносить урон, менять положение предметов или влиять на состояние сталкера. Неизвестный участок сначала изучают с безопасной дистанции.','Используй детектор и болты, следи за показаниями дозиметра и не пересекай поле, пока не понятен безопасный маршрут.'],
    mutants:['Мутанты чаще встречаются возле заброшенных построек и на окраинах локаций. После столкновения можно осмотреть место и иногда получить трофей.','Не расходуй весь боезапас на мелкие угрозы: оцени дистанцию, здоровье и возможность отступления.'],
    artifacts:['Артефакты ищут в аномальных зонах при помощи детектора. Ценность находки зависит от редкости и состояния рынка.','Перед извлечением убедись, что путь проверен, а в рюкзаке достаточно свободных клеток.'],
    equipment:['Снаряжение помогает выживать, но каждый предмет занимает место и имеет вес. Сравнивай защиту, массу и цену перед покупкой.','Не забывай проверять совместимость боеприпасов с оружием и состояние запасов перед выходом из безопасной зоны.']
  };
  return fallback[category]||[];
}

function renderEncyclopedia(game,state={}) {
  const book=game.encyclopedia||{};
  const sections=[['locations','Локации',iconSvg('map')],['people','Люди Кордона',iconSvg('contacts')],['anomalies','Аномалии',iconSvg('anomaly')],['mutants','Мутанты',iconSvg('mutant')],['artifacts','Артефакты',iconSvg('artifact')],['equipment','Снаряжение',iconSvg('gear')]];
  const active=sections.some(([key])=>key===state.ui?.encyclopediaCategory)?state.ui.encyclopediaCategory:'locations';
  const total=sections.reduce((n,[key])=>n+(book[key]?.length||0),0);
  const entries=book[active]||[];
  const rows=entries.map(entry=>{
    let image=entry.image||'';
    if(!image&&active==='locations') image=ASSETS.areaBackgrounds?.[entry.id]||ASSETS.locationBackgrounds?.[entry.id]||'';
    if(!image&&active==='people') { const person=getStalkerById(game,entry.id); image=person?.icon||''; }
    if(!image&&active==='mutants') image=ASSETS.mutants?.[entry.id==='blind-dog'?'blindDog':entry.id]?.[0]||'';
    if(!image&&active==='artifacts') image=ASSETS.itemImages?.[entry.id]||'';
    if(!image&&active==='equipment') image=ASSETS.itemImages?.[entry.id]||ASSETS.armor?.[entry.id]||'';
    const imageMarkup=image&&isImageSource(image)?`<img src="${esc(image)}" alt="${esc(entry.title)}" loading="lazy">`:`<span class="encyclopedia-art-fallback">${active==='anomalies'?iconSvg('anomaly'):active==='artifacts'?iconSvg('artifact'):active==='mutants'?iconSvg('mutant'):iconSvg('gear')}</span>`;
    const extra=encyclopediaExtra(entry,active);
    const description=entry.description||'Запись добавлена в КПК.';
    return `<article class="encyclopedia-entry-card"><div class="encyclopedia-entry-art">${imageMarkup}</div><div class="encyclopedia-entry-copy"><b>${esc(entry.title)}</b><p>${esc(description)}</p>${extra.map(text=>`<p>${esc(text)}</p>`).join('')}<small>Открыто: ${Math.floor((entry.discoveredAt||0)/60)} ч игрового времени</small></div></article>`;
  }).join('');
  return `<div class="tab-page split-guide-page encyclopedia-page"><div class="tab-heading"><div><div class="eyebrow">КПК · СПРАВОЧНИК</div><h2>Энциклопедия Зоны</h2><p>Полевые заметки, маршруты и наблюдения сталкеров.</p></div><span class="quest-count">${total} записей</span></div><div class="split-guide-layout"><nav class="guide-side-tabs" aria-label="Разделы энциклопедии">${sections.map(([key,title,icon])=>`<button class="guide-tab ${active===key?'active':''}" data-action="encyclopedia-category" data-id="${key}">${icon}<span>${title}</span><small>${book[key]?.length||0}</small></button>`).join('')}</nav><section class="guide-detail"><div class="guide-detail-heading"><div><div class="eyebrow">РАЗДЕЛ КПК</div><h3>${sections.find(([key])=>key===active)?.[1]||'Энциклопедия'}</h3></div><span>${entries.length} открыто</span></div>${rows?`<div class="encyclopedia-entry-list">${rows}</div>`:`<div class="guide-empty"><span>${active==='anomalies'?iconSvg('anomaly'):active==='artifacts'?iconSvg('artifact'):active==='mutants'?iconSvg('mutant'):iconSvg('gear')}</span><b>Записей пока нет</b><p>${active==='locations'?'Посещай новые участки Кордона — их описание появится здесь.':active==='people'?'Знакомься со сталкерами и разговаривай с ними.':active==='anomalies'?'Исследуй аномальные поля и наблюдай за их поведением.':active==='mutants'?'Встречай и изучай мутантов.':active==='artifacts'?'Ищи артефакты с помощью детектора.':'Находи и используй новое снаряжение.'}</p></div>`}</section></div></div>`;
}

function renderHelp(game,state={}) {
  const topics=[
    ['basics','С чего начать','Первые действия','Начни с осмотра местности. Проверь рюкзак и экипировку, поговори с ближайшими сталкерами, затем выбери одно простое поручение. Не уходи далеко без воды, еды, бинта и патронов.'],
    ['commands','Что писать','Поле действий','Вводи действие обычной фразой, как будто описываешь его ведущему RP. Пиши глагол и цель: «осмотреть дом», «подойти к костру», «поговорить с Макаром», «обыскать ящик», «перейти к остановке». Для команды не нужен специальный синтаксис; если система не поняла, попробуй короче и конкретнее.'],
    ['dialogue','Разговоры','Общение с NPC','Нажми на ближайшего сталкера или открой КПК → Контакты → значок диалога. Пиши вопросы целиком: «Что нового слышно?», «Что ты знаешь о Зоне?», «Расскажи про Кордон», «Кто такой Сидорович?». Можно торговаться, просить работу, шутить, благодарить, спорить или угрожать. Бандиты чаще понимают феню и отвечают в своей манере.'],
    ['trade','Торговля','Купоны и обмен','Открой диалог и нажми «Обмен» либо напиши в поле действий «торговать с Сидоровичем». В окне слева товары NPC, справа твои вещи. Кнопка «Купить» списывает Купоны, «Продать» добавляет их. Начни с фраз «покажи товар», «купить бинт», «продать хвост».'],
    ['loot','Обыск и рюкзак','Поиск вещей','Нажми «Места и обыск», выбери труп, тайник, контейнер или помещение. В двух окнах слева лежит найденное, справа твой рюкзак. Перетаскивай предметы или нажимай «Забрать всё» и «Сложить всё». Если ящик закрыт, сначала используй «Сломать ящик».'],
    ['combat','Бой','Оружие и защита','В бою выбери оружие через слоты рюкзака. Пиши «стрелять», «прицелиться», «перезарядить», «уклониться», «бросить гранату», «использовать бинт» или «отступить». На экране боя отдельно показаны портрет противника, его полнофигурная внешность и знак группировки. Во время схватки КПК закрыт.'],
    ['roleplay','RP-действия','Неформальные действия','Можно описывать не только игровые кнопки. Пиши «подразнить сталкера», «пригрозить бандиту», «рассказать анекдот», «послушать музыку», «лечь на траву», «включить свет в подвале», «предложить бартер» или «украсть незаметно». Действия с риском могут вызвать реакцию NPC или охраны.'],
    ['survival','Выживание','Голод, жажда и отдых','Следи за показателями на экране: еда снижает голод, вода — жажду, аптечки лечат, антирад снижает радиацию. Для костра пиши «сесть у костра» или «пожарить колбасу». В темноте включай фонарик, перед выбросом ищи закрытое укрытие.'],
    ['pda','КПК и энциклопедия','Навигация и записи','Нажми «Открыть КПК». Вкладки сверху переключают карту, личное дело, плеер, сообщения, задания, контакты, энциклопедию и помощь. На карте нажми точку, чтобы увидеть местные места и цели заданий. Новые статьи энциклопедии появляются после посещений, разговоров и находок. Сохранение можно экспортировать кнопкой со стрелкой вниз.']
  ];
  const active=topics.some(([key])=>key===state.ui?.helpTopic)?state.ui.helpTopic:'basics';
  const topic=topics.find(([key])=>key===active)||topics[0];
  const examples={
    basics:['осмотреться','поговорить с Волком','проверить рюкзак'],
    commands:['обыскать местность','перейти к остановке','включить фонарик'],
    dialogue:['что нового слышно?','расскажи про Кордон','есть работа?'],
    trade:['торговать','покажи товар','продать бинт'],
    loot:['обыскать тайник','забрать всё','сложить всё'],
    combat:['перезарядить оружие','прицелиться','отступить'],
    roleplay:['подразнить сталкера','рассказать анекдот','предложить бартер','лечь на траву','включить свет в подвале'],
    survival:['выпить воды','съесть хлеб','лечь у костра'],
    pda:['открыть карту','открыть задания','открыть энциклопедию']
  }[active]||[];
  return `<div class="tab-page split-guide-page help-page"><div class="tab-heading"><div><div class="eyebrow">КПК · ИНСТРУКЦИЯ</div><h2>Помощь сталкеру</h2><p>Как играть, какие действия доступны и что можно писать в поле команд.</p></div></div><div class="split-guide-layout"><nav class="guide-side-tabs" aria-label="Разделы помощи">${topics.map(([key,label])=>`<button class="guide-tab ${active===key?'active':''}" data-action="help-topic" data-id="${key}"><span class="guide-tab-icon">${iconSvg(key==='dialogue'?'talk':key==='trade'?'trade':key==='pda'?'book':key==='basics'?'location':key==='loot'?'compass':key==='combat'?'stats':key==='commands'?'messages':'help')}</span><span>${label}</span></button>`).join('')}</nav><section class="guide-detail help-detail"><div class="guide-detail-heading"><div><div class="eyebrow">${topic[2]}</div><h3>${topic[1]}</h3></div></div><p class="help-topic-text">${topic[3]}</p><div class="help-examples"><b>ПРИМЕРЫ ФРАЗ</b>${examples.map(text=>`<span>“${esc(text)}”</span>`).join('')}</div></section></div></div>`;
}

function renderArtifact(game) {
  const hunt=game.artifactHunt;
  if (!hunt) return '';
  return `<div class="modal-shade"><div class="modal-card artifact-modal"><button class="modal-close" data-action="close-artifact">×</button><div class="eyebrow">МИНИ-ИГРА · ПОИСК АРТЕФАКТА</div><h2>Сигнал детектора</h2><p>Выбери сектор, в котором сигнал кажется сильнее. На поиск есть три попытки.</p><div class="detector-face"><span>ОТКЛИК</span><b>${['▂','▅','▃'][hunt.attempts%3]}</b><small>АНОМАЛЬНАЯ АКТИВНОСТЬ</small></div><div class="sector-buttons">${[0,1,2].map(i=>btn(`Сектор ${i+1}`,'artifact-sector','button sector-button',`data-sector="${i}"`)).join('')}</div><small>Попыток использовано: ${hunt.attempts}/3</small></div></div>`;
}

function renderDialogue(game,character={}) {
  if (!game.dialogueNpcId) return '';
  const npc=getStalkerById(game,game.dialogueNpcId);
  if (!npc) return '';
  const jobs=game.sidorovichJobs||{}; const active=jobs.active;
  const workTopic=/работ|задан|квест|поруч|помощ|дело|служб|пропуск/.test(game.dialogueTopic||'');
  const sidorovichActions=npc.id==='sidorovich'&&workTopic?`<div class="dialogue-quest-actions">${active?`<div class="quest-mini"><b>Текущее поручение: ${esc(active.title)}</b><small>${esc(active.description)}</small></div>${btn('Сдать поручение','quest-turnin','button primary')}`:btn('Взять случайное поручение','quest-accept','button primary')}</div>`:'';
  const wolfJob=game.wolfDogQuest;
  const wolfActions=npc.id==='wolf'&&workTopic?`<div class="dialogue-quest-actions">${wolfJob?.status==='active'?`<div class="quest-mini"><b>Собаки у вагончика: ${wolfJob.killed}/5</b><small>Доберись до вагончика и уничтожь оставшихся слепых псов.</small></div>`:wolfJob?.status==='ready'?`<div class="quest-mini"><b>Поручение выполнено: 5/5</b><small>Вернись и доложи.</small></div>${btn('Доложить Волку','wolf-quest-turnin','button primary')}`:wolfJob?.status==='completed'?'<div class="quest-mini"><b>Поручение завершено</b></div>':btn('Согласиться и помочь','wolf-quest-accept','button primary')}</div>`:'';
  const genericOffers=workTopic?(game.quests||[]).filter(q=>q.giver===npc.id&&q.status==='available'&&q.id!=='wolf-dog-pack'):[];
  const offerMarkup=genericOffers.length?`<div class="dialogue-quest-actions">${genericOffers.map(q=>`<div class="quest-mini"><b>${esc(q.title)}</b><small>${esc(q.text)} · Награда: ${money(q.reward)}</small>${btn('Принять задание','quest-accept-generic','button primary',`data-id="${q.id}"`)}</div>`).join('')}</div>`:'';
  const pudelQuest=game.quests?.find(q=>q.id==='pudel-sausage');
  const pudelTurnIn=npc.id==='kostya-pudel'&&pudelQuest?.status==='active'&&countItem(game.inventory,'sausage')?`<div class="dialogue-quest-actions"><div class="quest-mini"><b>Диетическая колбаса найдена</b><small>Передать её Косте у костра.</small>${btn('Отдать колбасу','pudel-quest-turnin','button primary')}</div></div>`:'';
  const anomalyQuest=game.quests?.find(q=>q.id==='signal-dump');
  const anomalyTurnIn=npc.id==='sidorovich'&&anomalyQuest?.status==='ready'?`<div class="dialogue-quest-actions"><div class="quest-mini"><b>Аномалия названа: ${esc(game.secretAnomaly?.name||'неизвестно')}</b><small>Доложи Сидоровичу о наблюдениях.</small>${btn('Сдать сведения','anomaly-quest-turnin','button primary')}</div></div>`:'';
  const atpReward=npc.id==='sidorovich'&&game.atpRescue?.cleared&&!game.atpRescue?.rewardClaimed?`<div class="dialogue-quest-actions"><div class="quest-mini"><b>Пленные на АТП освобождены</b><small>Сидорович обещал отметить твою помощь.</small>${btn('Получить АКСУ и «Дебют»','atp-rescue-reward','button primary')}</div></div>`:'';
  const smallJob=npc.ambient&&npc.smallQuest&&workTopic?`<div class="dialogue-quest-actions"><div class="quest-mini"><b>${npc.smallQuest.status==='completed'?'Просьба выполнена':`Небольшая просьба: ${esc(getItem(npc.smallQuest.itemId)?.name||npc.smallQuest.itemId)}`}</b><small>${npc.smallQuest.status==='completed'?'Ты уже помог этому сталкеру.':`Награда: ${money(npc.smallQuest.reward)}. Принеси одну вещь и вернись.`}</small>${npc.smallQuest.status==='available'?btn('Взять поручение','personal-job-accept','button primary',`data-id="${npc.id}"`):npc.smallQuest.status==='active'&&countItem(game.inventory,npc.smallQuest.itemId)>=1?btn('Передать предмет','personal-job-turnin','button primary',`data-id="${npc.id}"`):''}</div></div>`:'';
  const maslovActions=npc.id==='maslov'?`<div class="dialogue-quest-actions"><div class="quest-mini"><b>Мастерская Маслова</b><small>Чиню оружие, броню и противогазы. При хорошей репутации стоимость ниже.</small>${btn('Открыть список ремонта','repair-open','button primary')}</div></div>`:'';
  const debtAction=npc.id==='sidorovich'&&game.mainStory?.stage==='deliver-supplies-failed'?`<div class="dialogue-quest-actions"><div class="quest-mini"><b>Долг за сорванную доставку: 5 000 Купонов</b><small>После выплаты Сидорович даст следующее поручение.</small>${btn('Погасить долг · 5 000','story-action','button primary',`data-id="story-pay-debt" ${game.money<5000?'disabled':''}`)}</div></div>`:'';
  const lines=game.dialogueHistory||[];
  const history=(lines.length?lines:[{role:'npc',text:npc.greeting||'Чего хотел, сталкер?'}]).map(entry=>`<div class="dialogue-line ${entry.role==='player'?'player-line':'npc-line'}"><b>${entry.role==='player'?esc(character.name||'Ты'):esc(npc.name)}</b><p>${esc(entry.text)}</p></div>`).join('');
  return `<div class="modal-shade dialogue-shade"><main class="dialogue-simple" aria-label="Разговор с ${esc(npc.name)}">
    <header class="dialogue-simple-head"><h2>${npc.faction==='military'?`${esc(npc.militaryRank||'Рядовой')} · «${esc(npc.callsign||'Без позывного')}» · `:''}${esc(npc.name)}</h2><div class="dialogue-head-actions">${btn(`${iconSvg('trade')} Обмен`,'trade-open','button small ghost',`data-id="${npc.id}"`)}<button class="modal-close" data-action="close-dialogue" aria-label="Закрыть диалог">×</button></div></header>
    <div class="dialogue-history dialogue-transcript" id="dialogue-history">${history}</div>
    ${game.dialogueAiPending?'<div class="npc-ai-pending"><span class="ai-pulse"></span>Собеседник подбирает слова…</div>':''}
    ${sidorovichActions}${wolfActions}${offerMarkup}${pudelTurnIn}${anomalyTurnIn}${atpReward}${smallJob}${maslovActions}${debtAction}
    <form class="dialogue-text-form dialogue-simple-form" id="npc-dialogue-form"><textarea id="npc-message" name="message" aria-label="Твоё сообщение" maxlength="700" rows="2" placeholder="Сказать…" required></textarea><div class="dialogue-send-row"><button class="button primary" type="submit">${iconSvg('talk')} Отправить</button></div></form>
  </main></div>`;
}


function renderSleep(game) {
  return `<div class="modal-shade"><div class="modal-card sleep-modal"><button class="modal-close" data-action="close-sleep">×</button><div class="eyebrow">ОТДЫХ</div><h2>Переждать время</h2><p>Во время сна восстанавливаются силы, но растут голод и жажда. Во время боя спать нельзя.</p><div class="sleep-options">${[1,3,6,8,12].map(h=>btn(`${h} ч`,'sleep','button',`data-hours="${h}"`)).join('')}</div><small>Время в игре начинается 15 апреля и постепенно идёт вперёд.</small></div></div>`;
}

export function renderGameSettings(state) {
  return `<section class="screen-wrap settings-screen"><header class="screen-heading"><div><div class="eyebrow">СИСТЕМНЫЕ ПАРАМЕТРЫ</div><h2>Настройки</h2><p>Параметры интерфейса и локального сохранения.</p></div>${btn('← Назад','settings-back','button ghost')}</header>
    <div class="settings-layout"><div class="panel npc-ai-settings"><h3>Общение с NPC · ИИ</h3><p class="muted">По умолчанию работает локальный контекстный движок. Для генеративной модели укажи адрес собственного AI-прокси: он должен принимать JSON от игры и возвращать <code>{reply: \"текст\"}</code>. API-ключ в браузере не хранится — не вставляй секретные ключи сюда.</p><label class="setting-row npc-ai-endpoint-row"><span><b>Адрес AI-прокси</b><small>Оставь пустым, чтобы использовать локальные ответы NPC.</small></span><input type="url" data-setting="npcAiEndpoint" value="${esc(state.settings.npcAiEndpoint||'')}" placeholder="http://127.0.0.1:8787/npc-chat" autocomplete="off" spellcheck="false"></label><small class="muted">Внешний ИИ отправляет текст сообщения и игровой контекст на указанный сервер. Используй только свой доверенный адрес.</small></div><div class="panel"><h3>Музыка с устройства</h3><p class="muted">Добавь папку с композициями или отдельные аудиофайлы. Плеер работает локально и не подключается к музыкальным сайтам.</p>${btn('♫ Открыть плеер','settings-open-player','button primary')}</div>
    <div class="panel"><h3>Звуки</h3><label class="setting-row"><span><b>Звуковые эффекты</b><small>Синтезированные звуки интерфейса, аномалий и событий</small></span><input type="checkbox" data-setting="soundEnabled" ${state.settings.soundEnabled!==false?'checked':''}></label><label class="setting-row"><span><b>Громкость эффектов</b><small>Общая громкость звуковых событий</small></span><input type="range" min="0" max="1" step="0.05" data-setting="soundVolume" value="${Number(state.settings.soundVolume??0.35)}"></label></div>
    <div class="panel"><h3>Интерфейс</h3><label class="setting-row"><span><b>Уменьшить анимацию</b><small>Для слабых устройств</small></span><input type="checkbox" data-setting="reducedMotion" ${state.settings.reducedMotion?'checked':''}></label><div class="setting-row"><span><b>Ориентация</b><small>Лучше всего горизонтально, но портретный режим тоже поддерживается.</small></span><span class="setting-value">LANDSCAPE</span></div><label class="setting-row"><span><b>Разрешение / масштаб интерфейса</b><small>Подстройка размера элементов под экран</small></span><select data-setting="uiScale"><option value="0.9" ${state.settings.uiScale===0.9?'selected':''}>90%</option><option value="1" ${!state.settings.uiScale||state.settings.uiScale===1?'selected':''}>100%</option><option value="1.1" ${state.settings.uiScale===1.1?'selected':''}>110%</option><option value="1.2" ${state.settings.uiScale===1.2?'selected':''}>120%</option></select></label></div>
    <div class="panel"><h3>Сохранения</h3><p class="muted">Данные хранятся в браузере этого устройства. Экспортируй файл, чтобы перенести прогресс на другой телефон или ноутбук.</p><div class="setting-actions">${btn('↓ Скачать сохранение','export-save','button primary')}<label class="button ghost upload-button">Загрузить сохранение<input type="file" id="save-upload" accept="application/json" hidden></label></div><small>Перенос между устройствами: экспорт на первом устройстве → импорт на втором.</small></div></div>
    ${btn('Сбросить весь прогресс','reset-all','button danger-ghost')}
  </section>`;
}

export function renderModal(state) {
  if (state.ui.modal === 'story-note') {
    const note=state.game?.log?.find(entry=>String(entry.text||'').startsWith('Записка:'))?.text || 'Записка: «Вот я и в Зоне. Первым делом следовало бы узнать, что к чему. Я видел здесь сталкера — выглядит опытным. Вроде, его кличут Волком.»';
    return `<div class="modal-shade"><section class="modal-card story-note-modal"><div class="eyebrow">ЛИЧНЫЕ ЗАПИСИ · 15 АПРЕЛЯ</div><h2>Записка новичка</h2><div class="story-note-paper"><p>${esc(note.replace(/^Записка:\s*[«"]?|[»"]$/g,''))}</p><small>— Личный блокнот</small></div>${btn('Свернуть записку','story-note-close','button primary')}</section></div>`;
  }
  if (state.ui.modal === 'map-location') {
    const loc=getLocation(state.ui.mapLocationId);
    if (!loc) return '';
    const current=state.game?.locationId===loc.id;
    const reachable=(getLocation(state.game?.locationId)?.neighbors||[]).includes(loc.id);
    const travelMinutes=reachable ? getTravelMinutes(state.game.locationId,loc.id) : null;
    const anomalyLabels={trampoline:'Трамплин',carousel:'Карусель',vortex:'Воронка'};
    const hazardParts=[...(loc.anomalies||[]).map(id=>anomalyLabels[id]||id),...(loc.hazards||[]).map(h=>h==='radiation'?'☢ Радиационный фон':`◉ ${loc.anomalyName||'Гравитационная аномалия'}`)];
    const hazard=hazardParts.length?[...new Set(hazardParts)].join(' · '):'Явных аномалий не отмечено';
    const questTarget = quest => quest.id==='wolf-dog-pack'?'trailer':quest.condition?.startsWith('visit:')?quest.condition.slice(6):quest.condition==='search:stop'?'stop':quest.condition==='artifact:anomaly-dump'?'anomaly-dump':null;
    const related=(state.game?.quests||[]).filter(q=>['active','ready'].includes(q.status)&&questTarget(q)===loc.id);
    const questMarkup=`<section class="map-related-quests"><div class="eyebrow">ЦЕЛИ ЗАДАНИЙ В ЭТОЙ ЛОКАЦИИ</div>${related.length?related.map(q=>`<article><b>${esc(q.title)}</b><p>${esc(q.text)}</p>${q.id==='wolf-dog-pack'?`<div class="quest-progress"><span>Уничтожено слепых псов</span><b>${state.game.wolfDogQuest?.killed||0}/5</b></div>`:''}<small>${q.status==='ready'?'Цель выполнена — вернись к заказчику':'Поручение активно'}</small></article>`).join(''):'<p class="muted small-copy">В этой локации сейчас нет активных целей.</p>'}</section>`;
    const localSpots=getExploreSpots(loc.id).filter(spot=>spot.id!=='area-outside');
    const spotMarkup=`<section class="map-related-quests map-related-spots"><div class="eyebrow">МЕСТА В ЭТОЙ ЛОКАЦИИ</div>${localSpots.length?`<div class="map-spot-directory">${localSpots.map(spot=>`<article><b>${esc(spot.name)}</b><small>${esc(spot.kind==='storage'?'Личное хранилище':spot.kind==='breakable'?'Разрушаемый ящик':spot.kind==='campfire'?'Место отдыха':'Место для обыска')}</small><p>${esc(spot.description)}</p></article>`).join('')}</div>`:'<p class="muted small-copy">В этой локации нет отдельных мест для осмотра.</p>'}</section>`;
    const sceneIcon=loc.hazards?.includes('gravity')?'◉':loc.id==='trailer'?'▣':loc.id==='atp'?'⚙':loc.id.includes('checkpoint')?'⚑':loc.id==='elevator'?'▥':'⌂';
    return `<div class="modal-shade"><div class="modal-card map-location-modal"><button class="modal-close" data-action="close-modal" aria-label="Закрыть">×</button><div class="map-location-head"><div><div class="eyebrow">КОРДОН · ПОДЛОКАЦИЯ</div><h2>${esc(loc.name)}</h2><small>${current?'Текущее местоположение':reachable?'Соседний участок':'Дальний участок карты'}</small></div><span class="map-location-flag">${current?'ЗДЕСЬ':reachable?`${travelMinutes} МИН ПЕШКОМ`:'РАЗВЕДАНО / НЕ ДОСТУПНО НАПРЯМУЮ'}</span></div><div class="map-location-art scene-${esc(loc.id)}"><span>${sceneIcon}</span><b>${esc(loc.name.toUpperCase())}</b><small>ВИЗУАЛЬНЫЙ ОРИЕНТИР · КОРДОН</small></div><p>${esc(loc.desc)}</p><div class="map-location-meta"><span>${hazard}</span><span>Соседних переходов: ${loc.neighbors?.length||0}</span>${travelMinutes!==null?`<span>Время пешком: ${travelMinutes} мин</span>`:''}</div>${spotMarkup}${questMarkup}<div class="modal-actions">${btn(current?'Ты находишься здесь':reachable?'Проложить путь · '+travelMinutes+' мин':'Нет прямого перехода','map-modal-travel','button primary',`data-id="${loc.id}" ${current||!reachable?'disabled':''}`)}${btn('Закрыть','close-modal','button ghost')}</div></div></div>`;
  }
  if (state.ui.modal === 'item-details') {
    const item=getItem(state.ui.itemDetailsId); if(!item) return '';
    const condition=getItemCondition(state.game,item.id);
    const isDurable=!!(item.weapon||item.armor||item.cat==='Защита');
    const repairable=isDurable && getRepairCost(state.game,item.id)>0;
    const weaponDamage=item.damage?Math.max(1,Math.round(item.damage*(.55+.45*condition/100))):null;
    const armorValue=item.armor?Math.round(item.armor*(.45+.55*condition/100)):null;
    return `<div class="modal-shade management-shade"><section class="modal-card item-details-modal"><button class="modal-close" data-action="close-modal">×</button><div class="item-details-head"><div class="item-details-art">${itemImage(item)}</div><div><div class="eyebrow">${esc(item.cat)}</div><h2>${esc(item.name)}</h2><small>${item.weight} кг · ${money(item.price)}</small></div></div><p>${esc(item.desc||'Описание пока отсутствует.')}</p>${item.weapon?`<div class="item-detail-stat"><span>Урон</span><b>${weaponDamage}</b></div>`:''}${armorValue!=null?`<div class="item-detail-stat"><span>Защита брони</span><b>${armorValue}</b></div>`:''}${item.cat==='Защита'?`<div class="item-detail-stat"><span>Фильтрация радиации</span><b>${condition>=15?'35%':'Не работает'}</b></div>`:''}${item.ammo?`<div class="item-detail-stat"><span>Калибр</span><b>${esc(item.ammo)}</b></div>`:''}${isDurable?`<div class="item-detail-condition"><div class="stat-bar-label"><span>Состояние</span><b>${Math.round(condition)}%</b></div><div class="bar-track"><i class="${condition<30?'danger':condition<65?'warning':''}" style="width:${condition}%"></i></div></div>`:''}<div class="modal-actions">${item.cat==='Артефакты'?btn(state.game.artifactBelt?.includes(item.id)?'Снять с пояса':'Закрепить на поясе','artifact-belt-toggle','button primary',`data-id="${item.id}"`):''}${repairable?btn('К ремонту у Маслова','repair-open','button ghost'):''}${btn('Закрыть','close-modal','button ghost')}</div></section></div>`;
  }
  if (state.ui.modal === 'repair-panel') {
    const repairItems=(state.game.inventory||[]).map(stack=>getItem(stack.id)).filter(item=>item&&(item.weapon||item.armor||item.cat==='Защита')&&getItemCondition(state.game,item.id)<99.9);
    return `<div class="modal-shade management-shade"><section class="modal-card repair-panel-modal"><button class="modal-close" data-action="close-modal">×</button><div class="eyebrow">ДЕРЕВНЯ НОВИЧКОВ · ПОДВАЛ</div><h2>Мастерская Маслова</h2><p>Маслов восстановит оружие, броню и противогазы. Чем лучше репутация, тем дешевле ремонт.</p>${repairItems.length?`<div class="repair-item-list">${repairItems.map(item=>`<article><span class="repair-item-art">${itemImage(item)}</span><div><b>${esc(item.name)}</b><small>Состояние: ${Math.round(getItemCondition(state.game,item.id))}%</small></div><strong>${money(getRepairCost(state.game,item.id))}</strong>${btn('Починить','repair-item','button small primary',`data-id="${item.id}"`)}</article>`).join('')}</div>`:'<div class="empty-state">Все подходящие предметы в хорошем состоянии. Маслову пока нечего чинить.</div>'}${btn('Закрыть мастерскую','close-modal','button ghost')}</section></div>`;
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
    return `<div class="modal-shade"><section class="modal-card explore-find-modal"><button class="modal-close" data-action="close-modal">×</button><div class="eyebrow">ОБЫСК · НАХОДКИ</div><h2>${esc(spot?.name||'Найденные вещи')}</h2><p>Ты осмотрел помещение. Выбери одну вещь, которую заберёшь с собой; остальное останется здесь.</p><div class="explore-find-options">${(pending?.options||[]).map(item=>`<button class="explore-find-choice" data-action="explore-pick" data-id="${item.id}"><span>${itemImage(getItem(item.id)||{id:item.id,name:item.name,cat:'Снаряжение'})}</span><b>${esc(item.name)}</b><small>${esc(item.description)}</small><i>Забрать →</i></button>`).join('')}</div></section></div>`;
  }
  if (state.ui.modal === 'avatars') {
    const currentCharacter=state.ui.editAvatar?state.characters.find(entry=>entry.id===state.activeCharacterId):null;
    const currentFaction=currentCharacter?.faction||state.draft?.faction||'loner';
    const factionTitle=FACTIONS.find(entry=>entry.id===currentFaction)?.name||'Одиночки';
    const mode=state.ui.avatarPickMode==='appearance'?'appearance':'portrait';
    const options=AVATAR_OPTIONS.filter(option=>option.faction===currentFaction);
    const action=mode==='appearance'?'choose-appearance':'choose-avatar';
    const title=mode==='appearance'?'Выбрать внешность':'Выбрать иконку персонажа';
    return `<div class="modal-shade"><div class="modal-card avatar-modal avatar-modal-independent"><button class="modal-close" data-action="close-modal">×</button><div class="eyebrow">ЛИЧНОЕ ДЕЛО · ${esc(factionTitle)}</div><h2>${title}</h2><p>${mode==='appearance'?'Выбери полнофигурную модель. Она не меняет портрет персонажа.':'Выбери портрет. Он не меняет полнофигурную внешность персонажа.'}</p><div class="avatar-choice-grid avatar-choice-grid-independent">${options.map(option=>`<button data-action="${action}" data-src="${esc(mode==='appearance'?option.appearance:option.src)}" title="${esc(option.name)}">${avatarOptionMarkup(option,mode)}<span class="avatar-choice-label">${esc(option.name)}</span></button>`).join('')}</div></div></div>`;
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
  const pdaTabs=['map','stats','player','messages','quests','contacts','encyclopedia','help'];
  if (state.ui.pdaOpen && !pdaTabs.includes(state.ui.tab)) state.ui.tab='map';
  else if (!['location',...pdaTabs].includes(state.ui.tab)) state.ui.tab='location';
  const tabs={
    location:renderLocation(game,character,state), map:renderMap(game,state),
    stats:renderStats(game,character), player:renderPlayer(state), messages:renderMessages(game), quests:renderQuests(game), contacts:renderContacts(game,state), encyclopedia:renderEncyclopedia(game,state), help:renderHelp(game,state)
  };
  const pdaOpen=!!state.ui.pdaOpen;
  if (pdaOpen) {
    return `<section class="pda-fullscreen-page" aria-label="КПК персонажа" style="--pda-texture:url('${ASSETS.pdaTexture||ASSETS.pda}');--pda-shell:url('${ASSETS.pda}')">
      <header class="pda-fullscreen-header"><div class="pda-device-mark">${iconSvg('book')} <span>ZONE LINK</span></div><div class="pda-device-player">${avatarMarkup(character.avatar,character.name,'☢')}<div><b>${esc(character.name)}</b><small>${esc(FACTIONS.find(f=>f.id===game.player.faction)?.name||'')} · ${clock.date} · ${clock.time}</small></div></div><div class="pda-device-status"><span>${money(game.money)}</span><span>♥ ${game.player.hp}/${game.player.maxHp}</span></div>${btn(`${iconSvg('book')} Закрыть КПК`,'pda-toggle','button pda-close-button','aria-label="Закрыть КПК и вернуться в игру"')}</header>
      <div class="pda-fullscreen-tabs"><nav class="game-nav" aria-label="Разделы КПК">${gameNav(state.ui.tab||'map')}</nav></div>
      <main class="pda-fullscreen-content">${tabs[state.ui.tab]||tabs.map}</main>
      ${renderArtifact(game)}${renderDialogue(game,character)}${state.ui.modal==='sleep'?renderSleep(game):''}
    </section>`;
  }
  return `<section class="game-shell"><div class="game-main">
    <header class="game-topbar"><div class="topbar-player">${avatarMarkup(character.avatar,character.name,'☢')}<div><b>${esc(character.name)}</b><small>${esc(FACTIONS.find(f=>f.id===game.player.faction)?.name||'')}</small></div></div><div class="topbar-status"><span class="money-readout">${iconSvg('coins')} ${money(game.money)}</span><span>${iconSvg('heart')} ${game.player.hp}/${game.player.maxHp}</span><span class="clock-readout" data-game-clock>${iconSvg('clock')} ${clock.date} · ${clock.time}</span></div><div class="topbar-buttons">${btn(`${iconSvg('bag')} Рюкзак`,'inventory-open','button ghost')}${btn(`${iconSvg('book')} КПК`,'pda-toggle','button pda-toggle-button','aria-expanded="false"')}${btn(iconSvg('settings'),'settings','icon-button',`title="Настройки" aria-label="Настройки"`)}${btn(iconSvg('download'),'export-save','icon-button',`title="Экспорт сохранения" aria-label="Экспорт сохранения"`)}</div></header>
    <div class="game-content pda-closed-content">${tabs.location}</div>
    <form class="action-composer" id="action-form"><span class="composer-symbol">${iconSvg('talk')}</span><input id="player-action" type="text" maxlength="220" placeholder="Опиши действие… например: осмотреться, поговорить с Волком, обыскать местность" autocomplete="off"><button class="send-action" type="submit">${iconSvg('talk')} Отправить</button></form>
  </div><nav class="mobile-game-nav" aria-label="Быстрые разделы КПК">${[['map','Карта'],['quests','Задания'],['contacts','Люди'],['player','Профиль'],['messages','Журнал']].map(([key,label])=>`<button data-action="tab" data-tab="${key}" class="${state.ui.tab===key?'active':''}">${iconSvg(key)}<span>${label}</span></button>`).join('')}</nav>${renderArtifact(game)}${renderDialogue(game,character)}${state.ui.modal==='sleep'?renderSleep(game):''}</section>`;
}
