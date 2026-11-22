import { ASSETS, IMAGE_FALLBACKS, FACTIONS, AVATAR_OPTIONS, ITEMS, LOCATIONS, NPCS, MAX_CARRY_KG, START_BUDGET, STARTER_ITEM_IDS, STARTER_LOADOUT_BY_FACTION } from '../data/catalog.js';
import { getWeight, countItem, getItem } from '../systems/inventory.js';
import { getGameDateTime, formatElapsed } from '../systems/game-clock.js';
import { getLocation, getAvailableTraders, getAvailableStalkers, getStalkerById, getSidorovichJobState, getTravelMinutes, getExploreSpots } from '../systems/world.js';
import { getBestWeapon } from '../systems/combat.js';

export const esc = (value='') => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const money = (value) => `${Number(value || 0).toLocaleString('ru-RU')} Купонов`;
const isImageSource = src => typeof src === 'string' && /^(?:data:image\/|blob:|https?:\/\/|file:\/\/|\/|\.\.?\/|[\w%.-]+\/)/i.test(src);
const avatarMarkup = (src, name, emoji='☢') => {
  const fallback=`<span class="avatar-fallback"${isImageSource(src)?' hidden':''}>${emoji}</span>`;
  return `<div class="avatar-wrap">${isImageSource(src)?`<img src="${esc(src)}" alt="${esc(name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false">`:''}${fallback}</div>`;
};
const factionInsignia = (faction, extraClass='') => ASSETS.factionInsignias?.[faction] ? `<img class="faction-insignia ${extraClass}" src="${esc(ASSETS.factionInsignias[faction])}" alt="${esc(faction)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="faction-insignia-fallback ${extraClass}" hidden>⚑</span>` : '';
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
const ITEM_ICONS = {
  bread:'🍞', water:'💧', sausage:'🌭', vodka:'🧴', shells:'▤', energy:'⚡', canned:'🥫', 'yantar-cheese':'🧀',
  knife:'🔪', ammo9x18:'▥', ammo9x19:'▧', ammo545:'▦', bandage:'🩹', boltpack:'🔩', rgd5:'◉', antirad:'☣', ai2:'✚',
  binoculars:'🔭', flash:'▣', tail:'🐕', 'flesh-eye':'👁', medusa:'✹', 'stone-flower':'✿', meat_chunk:'◆', gravi:'⬢',
  milmed:'✚', aurora:'◉', leather:'🧥', sawedoff:'⌁', biker:'🧥', pm:'◌', otklik:'📡', medved:'📡', 'pripyat-dosimeter':'☢',
  vm17:'⌁', psz5:'🦺', gaduka:'▰', aksu:'▰', optik:'◉', zarya:'🦺', berill:'🦺', debyt:'🦺', kosyha:'🧥', kozanka:'🧥',
  kozanplash:'🧥', stalnoishlem:'⛑', pa8:'◉', 'mask-loner-basic':'◉', 'mask-bandit-basic':'◉', 'mask-military-basic':'◉', pa10:'◉', pg4:'◉'
};
const itemImage = (item) => {
  const icons = { 'Еда':'🍴', 'Медицина':'✚', 'Добыча':'◆', 'Артефакты':'✦', 'Оружие':'▰', 'Боеприпасы':'▦', 'Снаряжение':'▣', 'Броня':'🦺', 'Защита':'◉' };
  const image=item.image || ASSETS.armor?.[item.id];
  const armorClass=item.cat==='Броня'?' armor-art-image':'';
  return image && isImageSource(image) ? `<img class="item-art-image${armorClass}" src="${esc(image)}" alt="${esc(item.name)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="item-emoji" hidden>${ITEM_ICONS[item.id]||icons[item.cat]||'▧'}</span>` : `<span class="item-emoji">${item.emoji || ITEM_ICONS[item.id] || icons[item.cat] || '▧'}</span>`;
};
const avatarOptionMarkup = option => `<span class="avatar-option-visual"><span class="avatar-option-portrait"><small>ПОРТРЕТ</small>${avatarMarkup(option.src,option.name,'♟')}</span><span class="avatar-option-appearance"><small>ВНЕШНОСТЬ</small>${isImageSource(option.appearance)?`<img class="avatar-option-body" src="${esc(option.appearance)}" alt="Полная внешность: ${esc(option.name)}" loading="lazy" onerror="this.hidden=true">`:'<span class="avatar-option-body-placeholder">—</span>'}</span></span>`;
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
  const previewSrc = d.avatar || '';
  const portraitMark = d.faction==='military'?'🪖':d.faction==='bandit'?'♟':'☢';
  return `<section class="screen-wrap pda-screen-wrap" style="--pda-shell:url('${ASSETS.pda}')">
    <header class="screen-heading pda-create-heading"><div><div class="eyebrow">КПК · ЛИЧНОЕ ДЕЛО</div><h2>Регистрация сталкера</h2><p>Заполни данные персонажа перед выходом на Кордон.</p></div>${btn('← Назад','back-characters','button ghost')}</header>
    <form id="character-form" class="pda-form">
      <div class="pda-topline"><span>НОВОЕ ЛИЧНОЕ ДЕЛО / КОРДОН</span><span class="pda-live-time" data-live-clock>15 апреля · ${new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</span></div>
      <div class="pda-form-layout">
        <aside class="pda-photo-column">
          <div class="photo-frame">${previewSrc?avatarMarkup(previewSrc,'Портрет персонажа',portraitMark):`<span>${portraitMark}</span>`}</div>
          <b>ПОРТРЕТ</b>
          ${btn('Выбрать портрет','open-avatars','button small wide')}
          <label class="button small wide upload-button">Загрузить фото<input type="file" id="avatar-upload" accept="image/*" hidden></label>
          ${d.avatar?btn('Сбросить портрет','reset-avatar','button small ghost wide'):''}
          ${isImageSource(d.appearance)?`<div class="create-appearance-preview"><small>ВНЕШНОСТЬ · ОТДЕЛЬНО</small><img src="${esc(d.appearance)}" alt="Полная внешность персонажа" loading="lazy" onerror="this.hidden=true"></div>`:`<div class="create-appearance-empty">Полная внешность<br>появится после выбора</div>`}
        </aside>
        <div class="pda-fields">
          <label class="field field-name"><span>Имя персонажа *</span><input name="name" data-field="name" value="${esc(d.name)}" maxlength="32" placeholder="Например, Алексей Ветров" required></label>
          <div class="field-row three pda-profile-fields">
            <label class="field"><span>Дата рождения</span><input type="date" name="birthDate" data-field="birthDate" value="${esc(d.birthDate)}"></label>
            <label class="field"><span>Рост, см</span><input type="number" name="height" data-field="height" value="${esc(d.height)}" min="120" max="230" placeholder="178"></label>
            <label class="field"><span>Вес, кг</span><input type="number" name="weight" data-field="weight" value="${esc(d.weight)}" min="35" max="180" placeholder="75"></label>
          </div>
          <label class="field"><span>Характер</span><textarea name="personality" data-field="personality" rows="2" maxlength="300" placeholder="Спокойный, недоверчивый, вспыльчивый...">${esc(d.personality)}</textarea></label>
          <label class="field"><span>Биография</span><textarea name="biography" data-field="biography" rows="3" maxlength="900" placeholder="Кем был до Зоны и почему пришёл сюда...">${esc(d.biography)}</textarea></label>
          <label class="field"><span>Дополнительные сведения</span><textarea name="notes" data-field="notes" rows="2" maxlength="500" placeholder="Привычки, страхи, цели, приметы...">${esc(d.notes)}</textarea></label>
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
  const maxFor = item => item.cat==='Броня'||item.cat==='Защита'||item.weapon ? 1 : ['Боеприпасы','Медицина'].includes(item.cat) ? 3 : item.cat==='Еда' ? 3 : 2;
  const orderedItems = ITEMS.filter(item=>eligibleIds.has(item.id)).sort((a,b)=>a.price-b.price);
  return `<section class="screen-wrap loadout-screen">
    <header class="screen-heading"><div><div class="eyebrow">ПОДГОТОВКА К ВЫХОДУ</div><h2>Стартовое снаряжение</h2><p>Собери разумный комплект новичка: несколько припасов, амуницию и подходящую фракции защиту.</p></div>${btn('← К персонажу','back-create','button ghost')}</header>
    <div class="loadout-summary"><div><small>БЮДЖЕТ</small><b>${money(START_BUDGET)}</b></div><div><small>ПОТРАЧЕНО</small><b>${money(spent)}</b></div><div><small>ОСТАЛОСЬ</small><b class="good-text">${money(remain)}</b></div><div><small>ВЕС</small><b class="${weight>MAX_CARRY_KG?'bad-text':''}">${weight.toFixed(1)} / ${MAX_CARRY_KG} кг</b></div></div>
    <div class="loadout-note">Для группировки «${esc(FACTIONS.find(f=>f.id===factionId)?.name||'Одиночки')}» доступны лёгкие стартовые комплекты. Можно взять один комплект брони и один противогаз, но несколько порций еды, аптечек и пачек патронов. Остаток ${money(START_BUDGET)} останется у персонажа.</div>
    <section class="shop-group"><h3>СТАРТОВАЯ ПОДБОРКА · СНАРЯЖЕНИЕ НОВИЧКА</h3><div class="shop-grid">${orderedItems.map(item=>{const isArmor=item.cat==='Броня';const isMask=item.cat==='Защита';const alreadyEquipped=selected[item.id]||0;const occupied=isArmor?Object.entries(selected).some(([other,qty])=>qty>0&&other!==item.id&&getItem(other)?.cat==='Броня'):isMask?Object.entries(selected).some(([other,qty])=>qty>0&&other!==item.id&&getItem(other)?.cat==='Защита'):false;return `<article class="shop-item"><div class="shop-image">${itemImage(item)}</div><div class="shop-info"><b>${esc(item.name)}</b><small>${esc(item.cat)} · ${item.weight} кг · ${item.w}×${item.h} яч. · до ${maxFor(item)} шт.</small><strong>${money(item.price)}</strong>${isArmor||isMask?`<small class="good-text">${isArmor?'Стартовая броня фракции':'Стартовый противогаз'}</small>`:''}</div><div class="shop-controls">${btn('−','loadout-remove','button square',`data-id="${item.id}" ${!alreadyEquipped?'disabled':''}`)}<b>${alreadyEquipped}</b>${btn('+','loadout-add','button square',`data-id="${item.id}" ${occupied||alreadyEquipped>=maxFor(item)?'disabled':''}`)}</div></article>`}).join('')}</div></section>
    <div class="loadout-bottom"><div><span>${Object.values(selected).reduce((a,b)=>a+b,0)} предметов в выборе</span><small>Лимит рюкзака: ${MAX_CARRY_KG} кг</small></div>${btn('Завершить подготовку →','finish-loadout','button primary')}</div>
  </section>`;
}

function gameNav(active) {
  const tabs = [ ['location','location','Местность'],['map','map','Карта'],['stats','stats','Статистика'],['player','player','Плеер'],['messages','messages','Связь'],['quests','quests','Задания'],['contacts','contacts','Контакты'],['encyclopedia','book','Энциклопедия'],['help','help','Помощь'] ];
  return tabs.map(([id,ico,label])=>`<button class="nav-tab ${active===id?'active':''}" data-action="tab" data-tab="${id}"><span>${iconSvg(ico)}</span><b>${label}</b></button>`).join('');
}

function renderLocation(game, character, state) {
  const location=getLocation(game.locationId);
  const npcs=getAvailableStalkers(game,game.locationId);
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
  const enemyPortrait=enemy?.icon?`<div class="enemy-portrait-frame"><small>ПОРТРЕТ</small><img class="enemy-portrait-art" src="${esc(enemy.icon)}" alt="Портрет: ${esc(enemy.name)}" loading="lazy"></div>`:'';
  const enemyBody=enemy?.appearance?`<div class="enemy-body-frame"><small>ВНЕШНОСТЬ</small><img class="enemy-body-art" src="${esc(enemy.appearance)}" alt="Полная внешность: ${esc(enemy.name)}" loading="lazy"></div>`:`<div class="enemy-body-frame enemy-fallback">${enemyEmoji}</div>`;
  const enemyStage=enemy?`<div class="enemy-stage ${enemy.type}"><div class="enemy-art-pair">${enemyPortrait}${enemyBody}</div><div class="enemy-stage-info"><b>${esc(enemy.name)}</b>${enemy.faction?`<div class="enemy-faction-row">${factionInsignia(enemy.faction)}<span>${esc(FACTIONS.find(f=>f.id===enemy.faction)?.name||enemy.faction)}</span></div>`:''}<span>${enemy.hp}/${enemy.maxHp} здоровья</span><div class="bar-track"><i class="danger" style="width:${Math.max(0,enemy.hp/enemy.maxHp*100)}%"></i></div></div></div>`:'';
  const effect=game.combatEffect && Number(game.combatEffect.until||0)>=Number(game.clock.worldMinutes||0)?game.combatEffect.type:null;
  const combatEffect=effect?`<div class="combat-scene-effect ${esc(effect)}" aria-hidden="true">${effect==='bolt'?'🔩':effect==='grenade'?'💣':effect==='reload'?'↻':effect==='med'?'✚':effect==='aim'?'⌖':effect==='dodge'?'↝':'✦'}</div>`:'';
  const weapon=getBestWeapon(game.inventory,game);
  const magazine=weapon?.ammo?(game.weaponMagazines?.[weapon.id]??'—'):null;
  const reserve=weapon?.ammo?(game.ammoRounds?.[weapon.ammo]??0):null;
  const weaponEmoji=weapon?.weapon==='melee'?'🔪':'🔫';
  const weaponSide=state.settings?.weaponHudSide==='left'?'left':'right';
  const weaponHud=`<aside class="weapon-hud ${weaponSide}"><div class="weapon-hud-top"><small>В РУКАХ</small>${btn('⇄','toggle-weapon-side','icon-button small',`title="Переместить панель оружия"`)}</div><div class="weapon-hud-icon">${weaponEmoji}</div><b>${esc(weapon?.name||'Без оружия')}</b>${weapon?.ammo?`<div class="ammo-readout"><strong>${magazine}</strong><span>в магазине</span><strong>${reserve}</strong><span>в запасе</span></div>`:`<small>${weapon?'Ближний бой':'Выбери оружие в рюкзаке'}</small>`}<div class="weapon-quick-actions">${weapon?.ammo?btn('↻ Зарядить','combat-reload','button tiny ghost'):''}${btn('🔫 Атака','combat-attack','button tiny danger',`${enemy?'':'disabled'}`)}${btn('▣ Рюкзак','inventory-open','button tiny ghost')}</div><div class="hand-tools"><span>🔩 Болт: ${game.boltsRemaining??0}</span>${btn('Бросить болт','combat-bolt','button tiny ghost',`${enemy?'':'disabled'}`)}</div></aside>`;
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
    <div class="scene-background" style="background-image:linear-gradient(90deg,rgba(7,11,7,.75),rgba(7,11,7,.08) 55%,rgba(7,11,7,.55)),url('${scene}');filter:${brightness}"></div>${vignette}${anomaly}
    <div class="scene-topline"><div class="scene-gm"><small>GAME MASTER · ${esc(location?.name||'КОРДОН')}</small><p>${esc(gmText)}</p></div><div class="scene-clock"><b>${time.time}</b><span>${esc(time.date)}</span><small>${esc(game.weather||'Пасмурно')}</small></div></div>
    ${emissionBanner}<div class="scene-vitals"><span>♥ ${game.player.hp}/${game.player.maxHp}</span><span>⚡ ${Math.round(game.player.stamina)}%</span><span class="${game.player.hunger>=75?'vital-warning':''}">🍞 Голод ${Math.round(game.player.hunger)}%</span><span class="${game.player.thirst>=75?'vital-warning':''}">💧 Жажда ${Math.round(game.player.thirst)}%</span><span>☢ ${countItem(game.inventory,'pripyat-dosimeter')?`Припять: ${Math.round(game.player.radiation)}%`:`${Math.round(game.player.radiation)}%`}</span>${countItem(game.inventory,'medved')?`<span>📡 Медведь: ${location?.anomalies?.length?'есть отклик':'тихо'}</span>`:''}${emissionCountdown}</div>
    ${hazards}${enemyStage}${combatEffect}${quickCombat}
    <div class="scene-footer"><div class="scene-places"><div class="scene-entry-actions">${btn("Места и обыск", "explore-open", "button small ghost")}${btn("Напольный фонарик", "flashlight-toggle", "button small ghost", `aria-pressed="${!!state?.ui?.flashlight}"`)}${rescueButton}</div>${areaPanel}<div class="scene-interactions">${npcRows||'<span class="scene-no-contacts">Поблизости никого не видно.</span>'}${npcs.length>2?btn(`Контакты · ещё ${npcs.length-2}`,'contacts-open','button tiny ghost'):npcs.length?btn('Все контакты','contacts-open','button tiny ghost'):''}</div></div>${weaponHud}</div>
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
  const slots=game.equipmentSlots||{primary1:null,primary2:null,pistol:null,knife:null,armor:game.player?.armorId||null,mask:game.player?.maskId||null,quick:[null,null,null,null]};
  const slotCard=(slot,label,fallbackId=null)=>{
    const id=slots[slot]??fallbackId, item=id?getItem(id):null;
    const equipped=slot==='armor'?game.player?.armorId===id:slot==='mask'?game.player?.maskId===id:false;
    return `<button class="equipment-slot ${item?'filled':''} ${equipped?'equipped':''}" data-action="slot-select" data-slot="${slot}" title="${item?esc(item.name):'Пустой слот'}" aria-label="${label}: ${item?esc(item.name):'пусто'}"><small>${label}</small><span>${item?itemImage(item):'＋'}</span><b>${item?esc(item.name):'Пусто'}</b>${equipped?'<i>НАДЕТО</i>':''}</button>`;
  };
  const quickSlots=(slots.quick||[null,null,null,null]).map((id,index)=>{
    const item=id?getItem(id):null;
    return `<button class="quick-slot ${item?'filled':''}" data-action="slot-select" data-slot="quick${index}" title="${item?esc(item.name):'Пустой быстрый слот'}"><small>${index+1}</small><span>${item?itemImage(item):'＋'}</span><b>${item?esc(item.name):'Пусто'}</b></button>`;
  }).join('');
  return `<div class="tab-page inventory-page"><div class="tab-heading"><div><div class="eyebrow">СНАРЯЖЕНИЕ · РЮКЗАК</div><h2>Инвентарь</h2><p>Сетка 8×6 · оружие, броня и противогаз назначаются в слоты.</p></div><div class="weight-box"><b>${weight.toFixed(1)} кг</b><small>из ${MAX_CARRY_KG} кг</small><div class="bar-track"><i style="width:${Math.min(100,weight/MAX_CARRY_KG*100)}%"></i></div></div></div>
    <section class="equipment-loadout"><div class="equipment-strip-heading"><b>Экипировка</b><small>Оружие · броня · защита</small></div><div class="equipment-slots">${slotCard('primary1','ОСНОВНОЙ 1')}${slotCard('primary2','ОСНОВНОЙ 2')}${slotCard('pistol','ПИСТОЛЕТ')}${slotCard('knife','НОЖ')}${slotCard('armor','БРОНЯ',game.player?.armorId||null)}${slotCard('mask','ПРОТИВОГАЗ',game.player?.maskId||null)}</div><div class="quick-slots-heading"><b>Быстрый доступ</b><small>Назначай расходники из рюкзака</small></div><div class="quick-slots">${quickSlots}</div></section>
    <div class="inventory-guide"><span><i class="guide-square one"></i> 1×1</span><span><i class="guide-square two"></i> 2×1 / 1×2</span><span><i class="guide-square four"></i> 2×2 и больше</span><small>${stacks.reduce((sum,item)=>sum+item.qty,0)} предметов · ${stacks.length} типов</small></div>
    ${stacks.length ? `<div class="inventory-grid inventory-grid-clear" data-drop-zone="source">${stacks.map(stack=>{const item=getItem(stack.id);if(!item)return '';const quantity=stack.id==='boltpack'?`Болтов: ${game.boltsRemaining??stack.qty*10}`:['ammo9x18','ammo9x19','ammo545','shells'].includes(stack.id)?`Патронов: ${game.ammoRounds?.[stack.id]??stack.qty*(stack.id==='shells'?8:stack.id==='ammo545'?30:12)}`:`Вес: ${(item.weight*stack.qty).toFixed(2)} кг`;return `<article draggable="true" data-drag-side="player" data-drag-id="${item.id}" class="inventory-item inventory-item-clear ${item.cat==='Броня'?'armor-inventory-item':''}" style="--item-w:${item.w};--item-h:${item.h};grid-column:span ${item.w};grid-row:span ${item.h}" title="${esc(item.desc||item.name)}"><div class="inventory-item-top"><span>${esc(item.cat)}</span><b>${stack.qty>1?`×${stack.qty}`:'1 шт.'}</b></div><div class="inventory-item-image">${itemImage(item)}</div><b class="inventory-item-name">${esc(item.name)}</b><small>${esc(quantity)}</small><div class="inventory-item-actions">${item.use?btn(inCombat?'Использовать в бою':'Использовать',inCombat?'combat-use-item':'use-item','button tiny primary',`data-id="${item.id}"`):''}${item.weapon&&item.weapon!=='grenade'?btn('В слот оружия','slot-assign','button tiny ghost',`data-id="${item.id}"`):''}${item.armor?btn('В слот брони','slot-assign','button tiny ghost',`data-id="${item.id}" data-slot="armor"`):''}${item.cat==='Защита'?btn('В слот противогаза','slot-assign','button tiny ghost',`data-id="${item.id}" data-slot="mask"`):''}${item.use?btn('Быстрый доступ','slot-assign','button tiny ghost',`data-id="${item.id}"`):''}${btn('Выбросить','drop-item','button tiny ghost',`data-id="${item.id}"`)}</div></article>`}).join('')}</div>` : '<div class="empty-state large">Рюкзак пуст. Найди припасы в Зоне или купи их у торговца.</div>'}
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
    <div class="stats-grid"><article class="metric-card"><span>Здоровье</span><strong>${p.hp}<small> / ${p.maxHp}</small></strong></article><article class="metric-card"><span>Репутация</span><strong>${p.reputation}</strong></article><article class="metric-card"><span>Рейтинг</span><strong>${p.rating}</strong></article><article class="metric-card"><span>Звание</span><strong class="rank-text">${esc(p.rank)}</strong></article><article class="metric-card"><span>Убеждено противников</span><strong>${p.kills}</strong></article><article class="metric-card"><span>Артефактов найдено</span><strong>${p.artifacts}</strong></article></div>
    <div class="panel bars-panel">${bar('Выносливость',p.stamina,'stamina')}${bar('Голод',p.hunger,'warning')}${bar('Жажда',p.thirst,'warning')}${bar('Радиация',p.radiation,'danger')}${bar('Стресс',p.stress||0,'warning')}</div>
    <div class="panel bio-panel"><h3>Досье</h3><div class="bio-grid"><span>Дата рождения</span><b>${esc(character.birthDate||'Не указана')}</b><span>Рост / вес</span><b>${character.height?`${esc(character.height)} см`: '—'} / ${character.weight?`${esc(character.weight)} кг`:'—'}</b><span>Характер</span><b>${esc(character.personality||'Не указан')}</b></div><p>${esc(character.biography||'Биография не заполнена.')}</p>${character.notes?`<p class="muted">${esc(character.notes)}</p>`:''}</div>
    <form id="profile-edit-form" class="panel profile-edit-form"><div class="panel-title"><h3>Редактировать личное дело</h3><span>Изменения сохраняются в персонаже</span></div><div class="form-grid"><label>Имя<input name="name" maxlength="32" required value="${esc(character.name)}"></label><label>Рост, см<input name="height" type="number" min="80" max="230" value="${esc(character.height||'')}"></label><label>Вес, кг<input name="weight" type="number" min="25" max="250" value="${esc(character.weight||'')}"></label><label>Характер<textarea name="personality" rows="2">${esc(character.personality||'')}</textarea></label><label>Биография<textarea name="biography" rows="3">${esc(character.biography||'')}</textarea></label><label>Другое<textarea name="notes" rows="2">${esc(character.notes||'')}</textarea></label></div><div class="profile-avatar-edit">${avatarMarkup(character.avatar,character.name,'☢')}${btn('Выбрать портрет','profile-choose-avatar','button ghost')}<label class="button ghost" for="profile-avatar-upload">Загрузить с устройства</label><input id="profile-avatar-upload" type="file" accept="image/*" hidden></div><div class="form-actions">${btn('Сохранить изменения','profile-save','button primary')}</div></form>
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
  const questProgress=q=>q.id==='wolf-dog-pack'?`${game.wolfDogQuest?.killed||0}/5 собак`:q.id==='pudel-sausage'?`${countItem(game.inventory,'sausage')? 'Колбаса в рюкзаке':'Найти диетическую колбасу'}`:q.id==='signal-dump'?(game.secretAnomaly?.name?`Названа: ${game.secretAnomaly.name} · вернись к Сидоровичу`:game.secretAnomaly?.observed?'Аномалия обнаружена · придумай название':'Добраться до Тайного лагеря'):q.status==='ready'?'Цель выполнена':q.status==='completed'?'Задание сдано':'Выполни указанное поручение';
  return `<div class="tab-page"><div class="tab-heading"><div><div class="eyebrow">КПК · ЖУРНАЛ ЗАДАНИЙ</div><h2>Задания</h2><p>В журнал попадают только принятые поручения и завершённые дела.</p></div><span class="quest-count">${completed}/${quests.length} выполнено</span></div>
    ${repeat?`<article class="quest-card active"><div class="quest-symbol"><img src="${esc(ASSETS.questIcons?.search||ASSETS.questIcons.default)}" alt="" loading="lazy"></div><div class="quest-main"><div class="quest-title-row"><h3>${esc(repeat.title)}</h3><span>ЦИКЛИЧЕСКОЕ</span></div><p>${esc(repeat.description)}</p><div class="quest-progress"><span>${repeat.type==='tails'?'Хвосты':repeat.type==='medusa'?'Артефакт':'Контакт с должником'}</span><b>${repeat.type==='tails'?`${countItem(game.inventory,'tail')}/5`:repeat.type==='medusa'?`${countItem(game.inventory,'medusa')}/1`:repeat.contacted?'1/1':'0/1'}</b></div><small>Заказчик: Сидорович · Награда: ${money(repeat.reward)}</small></div></article>`:''}
    <div class="quest-list">${quests.map(q=>{const npc=NPCS.find(n=>n.id===q.giver);const value=questProgress(q);return `<article class="quest-card ${q.status}"><div class="quest-symbol"><img src="${esc(ASSETS.questIcons?.[q.id]||ASSETS.questIcons.default)}" alt="" loading="lazy"><i>${q.status==='completed'?'✓':q.status==='ready'?'✓':'!'}</i></div><div class="quest-main"><div class="quest-title-row"><h3>${esc(q.title)}</h3><span>${q.status==='completed'?'ВЫПОЛНЕНО':q.status==='ready'?'ОЖИДАЕТ СДАЧИ':'В ПРОЦЕССЕ'}</span></div><p>${esc(q.text)}</p><div class="quest-progress"><span>Текущий этап</span><b>${esc(value)}</b></div><small>Заказчик: ${esc(npc?.name||'Неизвестно')} · Награда: ${money(q.reward)}</small></div>${npc?avatarMarkup(npc.icon,npc.name,'♟'):''}</article>`}).join('') || '<div class="empty-state large">Пока нет активных заданий. Поговори с местными и узнай, кому нужна помощь.</div>'}</div>
  </div>`;
}


function renderPlayer(state) {
  const music=state.ui.music||{};
  const tracks=state.ui.localMusicTracks||[];
  const current=tracks.find(track=>track.id===music.trackId);
  const active=!!music.trackId;
  const trackRows=tracks.map((track,index)=>`<article class="player-track ${track.id===music.trackId?'selected':''}"><span class="player-track-number">${String(index+1).padStart(2,'0')}</span><div class="player-track-meta"><b>${esc(track.title)}</b><small>${esc(track.fileName||track.label||'Локальный файл')} · ${(track.size/1048576).toFixed(1)} МБ</small></div>${btn(track.id===music.trackId&&music.playing?'Ⅱ':'▶','player-play-track','button tiny '+(track.id===music.trackId?'primary':'ghost'),`data-id="${track.id}"`)}</article>`).join('');
  const folderPicker='<label class="button primary" for="local-music-files">＋ Добавить музыку с устройства</label><input id="local-music-files" type="file" accept="audio/*,.mp3,.m4a,.ogg,.wav,.flac,.aac" multiple webkitdirectory directory hidden>';
  return `<div class="tab-page player-page"><div class="tab-heading"><div><div class="eyebrow">КПК · ЛОКАЛЬНЫЙ ПЛЕЕР</div><h2>Музыка</h2><p>Выбери папку Music на своём устройстве или отдельные аудиофайлы. Музыка воспроизводится прямо в браузере, без сетевых музыкальных потоков.</p></div><span class="player-status ${active&&music.playing?'live':''}"><i></i>${active&&music.playing?'ВОСПРОИЗВЕДЕНИЕ':active?'ПАУЗА':'ОЖИДАНИЕ'}</span></div>
    <section class="player-now panel"><div class="eyebrow">СЕЙЧАС ИГРАЕТ</div><h3>${esc(current?.title||'Ничего не выбрано')}</h3><p>${esc(current?.fileName||'Добавь локальные композиции из папки Music')}</p><div class="player-controls">${btn('◂ Предыдущая','player-prev','button ghost',active?'':'disabled')}${btn(active?(music.playing?'Ⅱ Пауза':'▶ Продолжить'):'▶ Выбери композицию','player-toggle','button primary',active?'':'disabled')}${btn('Следующая ▸','player-next','button ghost',active?'':'disabled')}${btn('■ Стоп','player-stop','button ghost',active?'':'disabled')}</div><small>${tracks.length?`Файлов в библиотеке: ${tracks.length}`:'Локальная библиотека пока пуста.'}</small></section>
    <section class="player-library panel"><div class="panel-title"><h3>Локальная библиотека</h3><span>${tracks.length} файлов</span></div><div class="local-music-actions">${folderPicker}<small>Поддерживаются MP3, M4A, OGG, WAV, FLAC и AAC. В Chromium можно выбрать сразу целую папку Music.</small></div><div class="player-track-list">${trackRows||'<div class="empty-state">Пока нет загруженных композиций. Выбери папку Music на своём устройстве.</div>'}</div></section>
    <p class="player-disclaimer">Файлы остаются на твоём устройстве. После перезагрузки страницы выбери папку снова — браузер не сохраняет доступ к локальным файлам автоматически.</p>
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
  return `<div class="tab-page trade-page"><div class="tab-heading"><div><div class="eyebrow">ОБМЕН · СДЕЛКА</div><h2>${esc(trader.name)}</h2><p>${esc(trader.role||'Торговец')} · ${esc(getLocation(trader.location)?.name||'Кордон')}</p></div><div class="money-readout">▣ ${money(game.money)}</div></div>
    <div class="trade-topline">${avatarMarkup(trader.icon,trader.name,'♟')}<div><b>${esc(trader.name)}</b><small>${trader.trader?'Торговец':'Сталкер · личные припасы'}</small></div><span>Рюкзак: ${getWeight(inv).toFixed(1)} / ${MAX_CARRY_KG} кг</span>${btn('← К торговцам','trade-back','button ghost small')}</div>
    <div class="trade-columns"><section class="panel trade-stock"><div class="panel-title"><h3>Что предлагает</h3><span>${stock.length} позиций</span></div>${stock.length?stock.map(entry=>{const item=getItem(entry.id);if(!item)return '';return `<article class="trade-row"><div class="trade-image">${itemImage(item)}</div><div class="trade-info"><b>${esc(item.name)}</b><small>${item.weight} кг · в наличии: ${entry.qty}</small><strong>${money(entry.price)}</strong></div>${btn('Купить','trade-buy','button small primary',`data-trader-id="${trader.id}" data-item-id="${item.id}"`)}</article>`}).join(''):'<div class="empty-state">Товар закончился. Запасы пополняются не сразу.</div>'}</section>
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
    const body=isImageSource(n.appearance)?`<div class="contact-clean-body"><img src="${esc(n.appearance)}" alt="Внешность ${esc(n.name)}" loading="lazy" onerror="this.hidden=true"></div>`:'<div class="contact-clean-body contact-clean-body-empty" aria-hidden="true">—</div>';
    return `<article class="contact-card-clean">
      <div class="contact-clean-art"><div class="contact-clean-portrait">${avatarMarkup(n.icon,n.name,n.faction==='military'?'🪖':n.faction==='bandit'?'♟':'☢')}</div>${body}</div>
      <div class="contact-clean-info"><b>${esc(n.name)}</b><span>${esc(role)}</span><small>${esc(activity)}</small><div class="contact-clean-faction">${factionInsignia(n.faction)}<span>${esc(factionName)}</span></div></div>
      <div class="contact-clean-actions"><button class="icon-action talk-action" data-action="talk" data-id="${n.id}" title="Поговорить с ${esc(n.name)}" aria-label="Поговорить с ${esc(n.name)}">${iconSvg('talk')}</button>${trader?`<button class="icon-action trade-action" data-action="trade-open" data-id="${n.id}" title="Торговать с ${esc(n.name)}" aria-label="Торговать с ${esc(n.name)}">${iconSvg('trade')}</button>`:''}</div>
    </article>`;
  }).join('');
  return `<div class="tab-page contacts-page"><div class="tab-heading"><div><div class="eyebrow">КПК · КОНТАКТЫ</div><h2>Люди поблизости</h2><p>${esc(current?.name||'Кордон')} · показаны только те, кто находится в этой локации.</p></div><span class="quest-count">${people.length} рядом</span></div><div class="contacts-list-clean">${cards||'<div class="empty-state">Рядом никого нет. Перейди в другую часть Кордона или загляни в лагерь.</div>'}</div></div>`;
}

function renderEncyclopedia(game,state={}) {
  const book=game.encyclopedia||{};
  const sections=[['locations','Локации',iconSvg('map')],['people','Люди Кордона',iconSvg('contacts')],['anomalies','Аномалии',iconSvg('anomaly')],['mutants','Мутанты',iconSvg('mutant')],['artifacts','Артефакты',iconSvg('artifact')],['equipment','Снаряжение',iconSvg('gear')]];
  const active=sections.some(([key])=>key===state.ui?.encyclopediaCategory)?state.ui.encyclopediaCategory:'locations';
  const total=sections.reduce((n,[key])=>n+(book[key]?.length||0),0);
  const entries=book[active]||[];
  const rows=entries.map(entry=>{
    let image=entry.image||'';
    if(!image&&active==='locations') image=ASSETS.locationBackgrounds?.[entry.id]||'';
    if(!image&&active==='people') image=getStalkerById(game,entry.id)?.appearance||getStalkerById(game,entry.id)?.icon||'';
    if(!image&&active==='equipment') image=ASSETS.armor?.[entry.id]||'';
    const imageMarkup=image&&isImageSource(image)?`<img src="${esc(image)}" alt="${esc(entry.title)}" loading="lazy">`:`<span class="encyclopedia-art-fallback">${active==='anomalies'?iconSvg('anomaly'):active==='artifacts'?iconSvg('artifact'):active==='mutants'?iconSvg('mutant'):iconSvg('gear')}</span>`;
    return `<article class="encyclopedia-entry-card"><div class="encyclopedia-entry-art">${imageMarkup}</div><div class="encyclopedia-entry-copy"><b>${esc(entry.title)}</b><p>${esc(entry.description||'Запись добавлена в КПК. По мере исследования здесь появятся подробности.')}</p><small>Открыто: ${Math.floor((entry.discoveredAt||0)/60)} ч игрового времени</small></div></article>`;
  }).join('');
  return `<div class="tab-page split-guide-page encyclopedia-page"><div class="tab-heading"><div><div class="eyebrow">КПК · СПРАВОЧНИК</div><h2>Энциклопедия Зоны</h2><p>Записи открываются постепенно — по мере исследования и разговоров.</p></div><span class="quest-count">${total} записей</span></div><div class="split-guide-layout"><nav class="guide-side-tabs" aria-label="Разделы энциклопедии">${sections.map(([key,title,icon])=>`<button class="guide-tab ${active===key?'active':''}" data-action="encyclopedia-category" data-id="${key}">${icon}<span>${title}</span><small>${book[key]?.length||0}</small></button>`).join('')}</nav><section class="guide-detail"><div class="guide-detail-heading"><div><div class="eyebrow">РАЗДЕЛ КПК</div><h3>${sections.find(([key])=>key===active)?.[1]||'Энциклопедия'}</h3></div><span>${entries.length} открыто</span></div>${rows?`<div class="encyclopedia-entry-list">${rows}</div>`:`<div class="guide-empty"><span>${active==='anomalies'?iconSvg('anomaly'):active==='artifacts'?iconSvg('artifact'):active==='mutants'?iconSvg('mutant'):iconSvg('gear')}</span><b>Записей пока нет</b><p>${active==='locations'?'Посещай новые участки Кордона — их описание появится здесь.':active==='people'?'Знакомься со сталкерами и разговаривай с ними.':active==='anomalies'?'Исследуй аномальные поля и наблюдай за их поведением.':active==='mutants'?'Встречай и изучай мутантов.':active==='artifacts'?'Ищи артефакты с помощью детектора.':'Находи и используй новое снаряжение.'}</p></div>`}</section></div></div>`;
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

function renderCombat(game) { return ''; }

function renderArtifact(game) {
  const hunt=game.artifactHunt;
  if (!hunt) return '';
  return `<div class="modal-shade"><div class="modal-card artifact-modal"><button class="modal-close" data-action="close-artifact">×</button><div class="eyebrow">МИНИ-ИГРА · ПОИСК АРТЕФАКТА</div><h2>Сигнал детектора</h2><p>Выбери сектор, в котором сигнал кажется сильнее. На поиск есть три попытки.</p><div class="detector-face"><span>ОТКЛИК</span><b>${['▂','▅','▃'][hunt.attempts%3]}</b><small>АНОМАЛЬНАЯ АКТИВНОСТЬ</small></div><div class="sector-buttons">${[0,1,2].map(i=>btn(`Сектор ${i+1}`,'artifact-sector','button sector-button',`data-sector="${i}"`)).join('')}</div><small>Попыток использовано: ${hunt.attempts}/3</small></div></div>`;
}

function renderDialogue(game,character={}) {
  if (!game.dialogueNpcId) return '';
  const npc=getStalkerById(game,game.dialogueNpcId);
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
  const pudelQuest=game.quests?.find(q=>q.id==='pudel-sausage');
  const pudelTurnIn=npc.id==='kostya-pudel'&&pudelQuest?.status==='active'&&countItem(game.inventory,'sausage')?`<div class="dialogue-quest-actions"><div class="quest-mini"><b>Диетическая колбаса найдена</b><small>Передать её Косте у костра.</small>${btn('Отдать колбасу','pudel-quest-turnin','button primary')}</div></div>`:'';
  const anomalyQuest=game.quests?.find(q=>q.id==='signal-dump');
  const anomalyTurnIn=npc.id==='sidorovich'&&anomalyQuest?.status==='ready'?`<div class="dialogue-quest-actions"><div class="quest-mini"><b>Аномалия названа: ${esc(game.secretAnomaly?.name||'неизвестно')}</b><small>Доложи Сидоровичу о наблюдениях.</small>${btn('Сдать сведения','anomaly-quest-turnin','button primary')}</div></div>`:'';
  const atpReward=npc.id==='sidorovich'&&game.atpRescue?.cleared&&!game.atpRescue?.rewardClaimed?`<div class="dialogue-quest-actions"><div class="quest-mini"><b>Пленные на АТП освобождены</b><small>Сидорович обещал отметить твою помощь.</small>${btn('Получить АКСУ и «Дебют»','atp-rescue-reward','button primary')}</div></div>`:'';
  const history=(game.dialogueHistory||[]).map(entry=>`<div class="dialogue-line ${entry.role==='player'?'player-line':'npc-line'}"><small>${entry.role==='player'?esc(character.name||'ТЫ'):esc(npc.name.toUpperCase())}</small><p>${esc(entry.text)}</p></div>`).join('');
  return `<div class="modal-shade dialogue-shade"><section class="dialogue-layout">
    <aside class="dialogue-person player-person"><div class="dialogue-portrait">${avatarMarkup(character.avatar,character.name||'Сталкер','☢')}</div>${isImageSource(character.appearance)?`<div class="dialogue-fullbody"><img class="npc-dialogue-body" src="${esc(character.appearance)}" alt="Полная внешность игрока" loading="lazy"></div>`:''}<div class="dialogue-badges">${factionInsignia(game.player.faction)}</div><b>${esc(character.name||'Сталкер')}</b><span>${esc(playerFaction?.name||'Без фракции')}</span><small>${esc(game.player.rank||'Новичок')} · рейтинг ${game.player.rating||0}</small></aside>
    <main class="dialogue-modal dialogue-center"><header class="dialogue-center-head"><div><div class="eyebrow">РАЗГОВОР · ${esc(getLocation(game.locationId)?.name||'КОРДОН')}</div><h2>${esc(npc.name)}</h2><small>${esc(npc.role||'Сталкер')} · ${esc(npc.group||npcFaction?.name||'Путники')}</small></div><div class="dialogue-head-actions">${btn(`${iconSvg('trade')} Обмен`,'trade-open','button small ghost',`data-id="${npc.id}"`)}<button class="modal-close" data-action="close-dialogue">×</button></div></header>
      <div class="dialogue-history" id="dialogue-history">${history||`<div class="dialogue-line npc-line"><small>${esc(npc.name.toUpperCase())}</small><p>${esc(npc.greeting||'Чего хотел, сталкер?')}</p></div>`}</div>
      ${sidorovichActions}${wolfActions}${offerMarkup}${pudelTurnIn}${anomalyTurnIn}${atpReward}
      <form class="dialogue-text-form" id="npc-dialogue-form"><label for="npc-message">Твоё сообщение</label><textarea id="npc-message" name="message" maxlength="700" rows="3" placeholder="Напиши NPC своими словами…" required></textarea><div class="dialogue-send-row"><small>Свободный текст · контекст разговора сохраняется</small><button class="button primary" type="submit">${iconSvg('talk')} Отправить</button></div></form>
    </main>
    <aside class="dialogue-person npc-person"><div class="dialogue-portrait">${avatarMarkup(npc.icon,npc.name,'♟')}</div>${npc.appearance?`<div class="dialogue-fullbody"><img class="npc-dialogue-body" src="${esc(npc.appearance)}" alt="Полная внешность: ${esc(npc.name)}" loading="lazy"></div>`:''}<div class="dialogue-badges">${factionInsignia(npc.faction)}</div><b>${esc(npc.name)}</b><span>${esc(npcFaction?.name||npc.group||'Путники')}</span><small>${esc(npc.role||'Сталкер')} · рейтинг ${npc.rating??0}</small></aside>
  </section></div>`;
}


function renderSleep(game) {
  return `<div class="modal-shade"><div class="modal-card sleep-modal"><button class="modal-close" data-action="close-sleep">×</button><div class="eyebrow">ОТДЫХ</div><h2>Переждать время</h2><p>Во время сна восстанавливаются силы, но растут голод и жажда. Во время боя спать нельзя.</p><div class="sleep-options">${[1,3,6,8,12].map(h=>btn(`${h} ч`,'sleep','button',`data-hours="${h}"`)).join('')}</div><small>Время в игре начинается 15 апреля и постепенно идёт вперёд.</small></div></div>`;
}

export function renderGameSettings(state) {
  return `<section class="screen-wrap settings-screen"><header class="screen-heading"><div><div class="eyebrow">СИСТЕМНЫЕ ПАРАМЕТРЫ</div><h2>Настройки</h2><p>Параметры интерфейса и локального сохранения.</p></div>${btn('← Назад','settings-back','button ghost')}</header>
    <div class="settings-layout"><div class="panel"><h3>Музыка с устройства</h3><p class="muted">Добавь папку с композициями или отдельные аудиофайлы. Плеер работает локально и не подключается к музыкальным сайтам.</p>${btn('♫ Открыть плеер','settings-open-player','button primary')}</div>
    <div class="panel"><h3>Звуки</h3><label class="setting-row"><span><b>Звуковые эффекты</b><small>Синтезированные звуки интерфейса, аномалий и событий</small></span><input type="checkbox" data-setting="soundEnabled" ${state.settings.soundEnabled!==false?'checked':''}></label><label class="setting-row"><span><b>Громкость эффектов</b><small>Общая громкость звуковых событий</small></span><input type="range" min="0" max="1" step="0.05" data-setting="soundVolume" value="${Number(state.settings.soundVolume??0.35)}"></label></div>
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
    const factionOptions=AVATAR_OPTIONS.filter(option=>option.group===currentFaction);
    const keyOptions=AVATAR_OPTIONS.filter(option=>option.group==='npc'&&option.faction===currentFaction);
    const groups=[{id:currentFaction,title:factionTitle,note:`${factionOptions.length} комплектов` ,options:factionOptions},{id:'npc',title:'Персонажи этой группировки',note:`${keyOptions.length} образа`,options:keyOptions}].filter(group=>group.options.length);
    return `<div class="modal-shade"><div class="modal-card avatar-modal"><button class="modal-close" data-action="close-modal">×</button><div class="eyebrow">ВНЕШНОСТЬ · ЛИЧНОЕ ДЕЛО</div><h2>Выбрать внешность</h2><p>Показываются портрет и полнофигурная модель для группировки «${esc(factionTitle)}». Они отображаются отдельно; знак группировки не накладывается на изображения.</p>${groups.map(group=>`<section class="avatar-group"><div class="avatar-group-heading"><b>${group.title}</b><small>${group.note}</small></div><div class="avatar-choice-grid">${group.options.map(option=>`<button data-action="choose-avatar" data-src="${esc(option.src)}" data-appearance="${esc(option.appearance||'')}" title="${esc(option.name)}">${avatarOptionMarkup(option)}<span class="avatar-choice-label">${esc(option.name)}</span></button>`).join('')}</div></section>`).join('')}</div></div>`;
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
  const allowedTabs=['location','map','stats','player','messages','quests','contacts','encyclopedia','help'];
  if (!allowedTabs.includes(state.ui.tab)) state.ui.tab='location';
  const tabs={
    location:renderLocation(game,character,state), map:renderMap(game,state),
    stats:renderStats(game,character), player:renderPlayer(state), messages:renderMessages(game), quests:renderQuests(game), contacts:renderContacts(game,state), encyclopedia:renderEncyclopedia(game,state), help:renderHelp(game,state)
  };
  const pdaOpen=!!state.ui.pdaOpen;
  if (pdaOpen) {
    return `<section class="pda-fullscreen-page" aria-label="КПК персонажа" style="--pda-texture:url('${ASSETS.pda}')">
      <header class="pda-fullscreen-header"><div class="pda-device-mark">${iconSvg('book')} <span>ZONE LINK</span></div><div class="pda-device-player">${avatarMarkup(character.avatar,character.name,'☢')}<div><b>${esc(character.name)}</b><small>${esc(FACTIONS.find(f=>f.id===game.player.faction)?.name||'')} · ${clock.date} · ${clock.time}</small></div></div><div class="pda-device-status"><span>${money(game.money)}</span><span>♥ ${game.player.hp}/${game.player.maxHp}</span></div>${btn(`${iconSvg('book')} Закрыть КПК`,'pda-toggle','button pda-close-button','aria-label="Закрыть КПК и вернуться в игру"')}</header>
      <div class="pda-fullscreen-tabs"><nav class="game-nav" aria-label="Разделы КПК">${gameNav(state.ui.tab||'location')}</nav></div>
      <main class="pda-fullscreen-content">${tabs[state.ui.tab]||tabs.location}</main>
      ${renderCombat(game)}${renderArtifact(game)}${renderDialogue(game,character)}${state.ui.modal==='sleep'?renderSleep(game):''}
    </section>`;
  }
  return `<section class="game-shell"><div class="game-main">
    <header class="game-topbar"><div class="topbar-player">${avatarMarkup(character.avatar,character.name,'☢')}<div><b>${esc(character.name)}</b><small>${esc(FACTIONS.find(f=>f.id===game.player.faction)?.name||'')}</small></div></div><div class="topbar-status"><span class="money-readout">${iconSvg('coins')} ${money(game.money)}</span><span>${iconSvg('heart')} ${game.player.hp}/${game.player.maxHp}</span><span class="clock-readout" data-game-clock>${iconSvg('clock')} ${clock.date} · ${clock.time}</span></div><div class="topbar-buttons">${btn(`${iconSvg('bag')} Рюкзак`,'inventory-open','button ghost')}${btn(`${iconSvg('book')} КПК`,'pda-toggle','button pda-toggle-button','aria-expanded="false"')}${btn(iconSvg('settings'),'settings','icon-button',`title="Настройки" aria-label="Настройки"`)}${btn(iconSvg('download'),'export-save','icon-button',`title="Экспорт сохранения" aria-label="Экспорт сохранения"`)}</div></header>
    <div class="game-content pda-closed-content">${tabs.location}</div>
    <form class="action-composer" id="action-form"><span class="composer-symbol">${iconSvg('talk')}</span><input id="player-action" type="text" maxlength="220" placeholder="Опиши действие… например: осмотреться, поговорить с Волком, обыскать местность" autocomplete="off"><button class="send-action" type="submit">${iconSvg('talk')} Отправить</button></form>
  </div>${renderCombat(game)}${renderArtifact(game)}${renderDialogue(game,character)}${state.ui.modal==='sleep'?renderSleep(game):''}</section>`;
}
