import { loadState, saveState, createInitialState, exportSave, importSave } from './core/storage.js';
import { ASSETS, FACTIONS, START_BUDGET, MAX_CARRY_KG, NPCS, ITEMS, LOCATIONS, RADIO_TRACKS, RADIO_STATIONS, PLAYER_TRACKS } from './data/catalog.js';
import { renderMenu, renderAccount, renderCharacters, renderCreate, renderLoadout, renderGame, renderGameSettings, renderModal, esc } from './ui/views.js';
import { canFitLoadout, getInventoryCost, getLoadoutWeight, addItem, getItem, getWeight, countItem, removeItem, useItem, transferItem } from './systems/inventory.js';
import { createGame, addLog, describeLocation, searchLocation, travelTo, talkToNpc, replyNpc, sleep, deactivateAnomaly, startArtifactHunt, chooseArtifactSector, progressQuest, updateWeather, advanceGame, getLocation, scoutLocation, acceptSidorovichJob, turnInSidorovichJob, acceptWolfDogQuest, turnInWolfDogQuest, acceptWorldQuest, startAreaSearch, claimAreaFind, breakContainer, replyNpcFreeText, takeShelter, leaveShelter, sitAtCampfire, getExploreSpots, getActiveLootItems, openStorage } from './systems/world.js';
import { playerAttack, defend, flee, beginWolfDogPack, reloadWeapon, aimWeapon, dodge, throwGrenade, throwBoltInCombat, useItemInCombat, selectWeapon } from './systems/combat.js';
import { createMusicEngine } from './systems/music.js';
import { buyFromTrader, sellToTrader } from './systems/world.js';
import { processPlayerAction } from './systems/action-engine.js';
import { getGameDateTime } from './systems/game-clock.js';

const root = document.getElementById('app');
let state = loadState();
state.screen = 'menu';
const savedMusic=state.ui?.music||{};
const savedStation=RADIO_STATIONS.find(station=>station.id===savedMusic.stationId);
const allowedSavedIds=savedMusic.mode==='radio' ? (savedStation?.trackIds||[]) : PLAYER_TRACKS.map(track=>track.id);
const restoredQueue=(savedMusic.queue||[]).filter(id=>allowedSavedIds.includes(id));
const restoredIndex=Math.max(0,restoredQueue.indexOf(savedMusic.trackId));
const restoredMusic=restoredQueue.length ? {...savedMusic,queue:restoredQueue,index:restoredIndex,trackId:restoredQueue[restoredIndex],playing:false} : {mode:null,stationId:null,trackId:null,queue:[],index:0,playing:false};
state.settings.weaponHudSide ||= 'right';
state.ui = { ...(state.ui||{}), tab:'location', pdaOpen:false, modal:null, notification:'', music:restoredMusic, tradeNpcId:null, mapLocationId:null };
let previousScreen = 'menu';
let toastTimer = null;
const musicEngine = createMusicEngine(() => advanceMusic(true));
musicEngine.prepare();

function persist() {
  if (state.game && state.activeCharacterId) {
    const char = state.characters.find(entry => entry.id === state.activeCharacterId);
    if (char) {
      char.game = state.game;
      char.rank = state.game.player.rank;
      char.stats = {
        kills:state.game.player.kills,
        artifacts:state.game.player.artifacts,
        questsDone:state.game.player.questsDone,
        distance:state.game.distanceTravelled
      };
      char.money = state.game.money;
      char.spawnName = getLocation(char.game.locationId)?.name || char.spawnName;
    }
  }
  saveState(state);
}

function toast(message, kind='info') {
  state.ui.notification = message;
  let el = document.querySelector('.toast-notice');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast-notice';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.dataset.kind = kind;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove('show'), 2800);
}

function ensureEquipmentSlots(game) {
  const previous=game.equipmentSlots||{};
  const hasQuick=Array.isArray(previous.quick);
  game.equipmentSlots={
    primary1:previous.primary1??null,
    primary2:previous.primary2??null,
    pistol:previous.pistol??null,
    knife:previous.knife??null,
    armor:previous.armor??game.player?.armorId??null,
    mask:previous.mask??game.player?.maskId??null,
    quick:hasQuick?[...previous.quick.slice(0,4),...Array(Math.max(0,4-previous.quick.length)).fill(null)]:[null,null,null,null]
  };
  // Migrate older saves that contain weapons but do not yet have equipment slots.
  for (const stack of game.inventory||[]) {
    const item=getItem(stack.id);
    if (!item) continue;
    if (previous.pistol===undefined && item.weapon==='pistol' && !game.equipmentSlots.pistol) game.equipmentSlots.pistol=item.id;
    if (previous.knife===undefined && item.weapon==='melee' && !game.equipmentSlots.knife) game.equipmentSlots.knife=item.id;
    if (['rifle','shotgun','smg'].includes(item.weapon)) {
      if (previous.primary1===undefined && !game.equipmentSlots.primary1) game.equipmentSlots.primary1=item.id;
      else if (previous.primary2===undefined && !game.equipmentSlots.primary2 && game.equipmentSlots.primary1!==item.id) game.equipmentSlots.primary2=item.id;
    }
    if (!hasQuick && item.use) {
      const empty=game.equipmentSlots.quick.findIndex(value=>!value);
      if (empty>=0) game.equipmentSlots.quick[empty]=item.id;
    }
  }
  return game.equipmentSlots;
}

function setScreen(screen) {
  state.screen = screen;
  state.ui.modal = null;
  render();
  persist();
}

function render() {
  document.documentElement.style.setProperty('--ui-scale', state.settings.uiScale || 1);
  document.body.classList.toggle('reduced-motion', !!state.settings.reducedMotion);
  let html = '';
  switch (state.screen) {
    case 'menu': html = renderMenu(state); break;
    case 'account': html = renderAccount(state); break;
    case 'characters': html = renderCharacters(state); break;
    case 'create': html = renderCreate(state); break;
    case 'loadout': html = renderLoadout(state); break;
    case 'settings': html = renderGameSettings(state); break;
    case 'game': html = renderGame(state); break;
    default: html = renderMenu(state);
  }
  root.innerHTML = html + renderModal(state);
  updateOrientationHint();
  updateClockDisplays();
}

function updateOrientationHint() {
  let hint = document.getElementById('orientation-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'orientation-hint';
    hint.innerHTML = '<span>↻</span><b>Для удобства поверни устройство горизонтально</b><small>Интерфейс остаётся доступен и в вертикальном режиме.</small>';
    document.body.appendChild(hint);
  }
}

function updateClockDisplays() {
  if (state.screen === 'create') {
    const node = document.querySelector('[data-live-clock]');
    if (node) node.textContent = `15 апреля · ${new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}`;
  }
  if (state.screen === 'game' && state.game?.clock) {
    const node = document.querySelector('[data-game-clock]');
    if (node) {
      const t = getGameDateTime(state.game.clock);
      node.textContent = `◷ ${t.date} · ${t.time}`;
    }
  }
}


function shuffled(values) {
  const items=[...values];
  for (let i=items.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [items[i],items[j]]=[items[j],items[i]];
  }
  return items;
}

function trackById(id) { return RADIO_TRACKS.find(track=>track.id===id); }
function availablePlayerTracks() {
  const removed=new Set(state.settings.removedPlayerTrackIds||[]);
  return PLAYER_TRACKS.filter(track=>!removed.has(track.id));
}

function startRadio(stationId) {
  const localStation=RADIO_STATIONS.find(entry=>entry.locationId===state.game?.locationId);
  const station=RADIO_STATIONS.find(entry=>entry.id===stationId);
  if (!localStation || !station || station.id!==localStation.id) { toast('Здесь нет передатчика этой группировки. Радио доступно только на своей базе.','warning'); return; }
  const queue=shuffled(station.trackIds);
  if (!queue.length) return;
  state.ui.music={mode:'radio',stationId:station.id,queue,index:0,trackId:queue[0],playing:true};
  state.settings.radioStationId=station.id;
  state.ui.tab='location';
  state.ui.pdaOpen=false;
  musicEngine.play(trackById(queue[0]));
  persist(); render();
}

function startPlayerTrack(trackId) {
  const fullQueue=availablePlayerTracks().map(track=>track.id);
  const start=fullQueue.indexOf(trackId);
  if (start<0) return;
  const queue=[...fullQueue.slice(start),...fullQueue.slice(0,start)];
  state.ui.music={mode:'player',stationId:null,queue,index:0,trackId:queue[0],playing:true};
  musicEngine.play(trackById(queue[0]));
  persist(); render();
}

function advanceMusic(automatic=false,direction=1) {
  const music=state.ui.music||{};
  if (!music.queue?.length) return;
  let queue=[...music.queue];
  let index=(Number(music.index)||0)+direction;
  if (music.mode==='radio' && index>=queue.length) {
    const station=RADIO_STATIONS.find(entry=>entry.id===music.stationId);
    queue=shuffled(station?.trackIds||queue);
    index=0;
  } else {
    index=(index+queue.length)%queue.length;
  }
  const id=queue[index];
  state.ui.music={...music,queue,index,trackId:id,playing:true};
  musicEngine.play(trackById(id));
  persist();
  if (state.screen==='game') render();
}

function toggleMusic() {
  const music=state.ui.music||{};
  if (!music.trackId) {
    if (state.game) startRadio(RADIO_STATIONS.find(s=>s.locationId===state.game.locationId)?.id||RADIO_STATIONS[0].id);
    return;
  }
  if (music.playing) {
    musicEngine.pause();
    state.ui.music={...music,playing:false};
  } else {
    state.ui.music={...music,playing:true};
    musicEngine.resume(trackById(music.trackId));
  }
  persist(); render();
}

function stopMusic() {
  musicEngine.stop();
  state.ui.music={...(state.ui.music||{}),playing:false};
  persist(); render();
}

function addGameLog(message, type='system') {
  if (!state.game) return;
  addLog(state.game, message, type);
  persist();
}

function adjustTransferredAmmo(itemId, qty, toPlayer) {
  const capacity=itemId==='shells'?8:itemId==='ammo545'?30:12;
  if (['ammo9x18','ammo9x19','ammo545','shells'].includes(itemId)) {
    state.game.ammoRounds ||= {};
    const delta=capacity*qty*(toPlayer?1:-1);
    state.game.ammoRounds[itemId]=Math.max(0,(state.game.ammoRounds[itemId]||0)+delta);
  }
  if (itemId==='boltpack') state.game.boltsRemaining=Math.max(0,(state.game.boltsRemaining||0)+10*qty*(toPlayer?1:-1));
}

function transferLootItem(itemId, direction='take', qty=1) {
  const game=state.game, active=game?.activeLoot;
  if (!active) return {ok:false,reason:'Окно обыска уже закрыто.'};
  const sourceItems=getActiveLootItems(game);
  const taking=direction==='take';
  const from=taking?sourceItems:game.inventory;
  const to=taking?game.inventory:sourceItems;
  const result=transferItem(from,to,itemId,qty,taking);
  if (result.ok) adjustTransferredAmmo(itemId,result.qty,taking);
  return result;
}

function transferAllLoot(direction='take') {
  const game=state.game, active=game?.activeLoot;
  if (!active) return {ok:false,moved:0,message:'Окно обыска уже закрыто.'};
  const source=getActiveLootItems(game);
  const from=direction==='take'?source:game.inventory;
  const snapshot=from.map(entry=>({id:entry.id,qty:entry.qty}));
  let moved=0, skipped=0;
  for (const entry of snapshot) {
    const result=transferLootItem(entry.id,direction,entry.qty);
    if (result.ok) moved+=result.qty; else skipped++;
  }
  return {ok:true,moved,skipped,message:moved?`Перемещено предметов: ${moved}${skipped?`. Не поместилось: ${skipped} видов.`:'.'}`:'Нечего перемещать.'};
}

function beginNewCharacter() {
  state.draft = { name:'', birthDate:'', height:'', weight:'', personality:'', biography:'', notes:'', faction:'loner', avatar:'' };
  state.pendingCharacter = null;
  state.loadout = { selected:{} };
  setScreen('create');
}

function characterFromDraft() {
  const d=state.draft;
  const faction=FACTIONS.find(f=>f.id===d.faction) || FACTIONS[0];
  return {
    id:globalThis.crypto?.randomUUID?.() || `char-${Date.now()}`,
    name:d.name.trim(), birthDate:d.birthDate, height:d.height, weight:d.weight,
    personality:d.personality, biography:d.biography, notes:d.notes,
    faction:faction.id, avatar:d.avatar || '', rank:faction.rank,
    spawnName:getLocation(faction.spawn)?.name || 'Кордон',
    stats:{ kills:0, artifacts:0, questsDone:0, distance:0 }, createdAt:Date.now(), game:null
  };
}

function finishLoadout() {
  const selected=state.loadout.selected || {};
  const cost=getInventoryCost(selected);
  const weight=getLoadoutWeight(selected);
  if (cost>START_BUDGET || weight>MAX_CARRY_KG) {
    toast('Проверь бюджет и вес снаряжения.','warning');
    return;
  }
  const inventory=[];
  for (const [id,qty] of Object.entries(selected)) {
    const result=addItem(inventory,id,qty);
    if (!result.ok) { toast(result.reason,'warning'); return; }
  }
  const character=state.pendingCharacter;
  if (!character) { toast('Сначала создай персонажа.','warning'); return; }
  const moneyLeft=START_BUDGET-cost;
  const game=createGame(character,inventory,moneyLeft);
  const starterArmor=inventory.find(stack=>(getItem(stack.id)?.armor||0)>0);
  const starterMask=inventory.find(stack=>getItem(stack.id)?.cat==='Защита');
  const equipmentSlots={primary1:null,primary2:null,pistol:null,knife:null,armor:starterArmor?.id||null,mask:starterMask?.id||null,quick:[null,null,null,null]};
  for (const stack of inventory) {
    const item=getItem(stack.id);
    if (!item) continue;
    if (item.weapon==='pistol' && !equipmentSlots.pistol) equipmentSlots.pistol=item.id;
    else if (item.weapon==='melee' && !equipmentSlots.knife) equipmentSlots.knife=item.id;
    else if (['rifle','shotgun','smg'].includes(item.weapon)) {
      if (!equipmentSlots.primary1) equipmentSlots.primary1=item.id;
      else if (!equipmentSlots.primary2) equipmentSlots.primary2=item.id;
    }
    if (item.use) {
      const empty=equipmentSlots.quick.findIndex(value=>!value);
      if (empty>=0) equipmentSlots.quick[empty]=item.id;
    }
  }
  game.equipmentSlots=equipmentSlots;
  game.player.armorId=starterArmor?.id||null;
  game.player.armor=Math.min(30,getItem(starterArmor?.id)?.armor||0);
  game.player.maskId=starterMask?.id||null;
  character.game=game;
  character.money=moneyLeft;
  const existingIndex=state.characters.findIndex(entry=>entry.id===character.id);
  if (existingIndex>=0) state.characters[existingIndex]=character;
  else state.characters.push(character);
  state.activeCharacterId=character.id;
  state.game=game;
  state.pendingCharacter=null;
  state.account.sessions=(state.account.sessions||0)+1;
  state.ui.tab='location';
  state.ui.pdaOpen=false;
  state.screen='game';
  describeLocation(state.game);
  persist();
  render();
  toast(`Добро пожаловать на Кордон, ${character.name}.`);
}

function selectCharacter(id) {
  const char=state.characters.find(entry=>entry.id===id);
  if (!char) return;
  if (!char.game) {
    state.pendingCharacter=char;
    state.activeCharacterId=null;
    state.loadout={selected:{}};
    setScreen('loadout');
    return;
  }
  state.activeCharacterId=id;
  state.game=char.game;
  advanceGame(state.game,0);
  state.ui.tab='location';
  state.ui.pdaOpen=false;
  state.account.sessions=(state.account.sessions||0)+1;
  state.screen='game';
  persist();
  render();
}

function applyActionResult(result) {
  if (!result) return;
  if (result.action==='map' || result.action==='tab-map') { state.ui.tab='map'; state.ui.pdaOpen=true; }
  else if (result.action==='inventory') { state.ui.modal='inventory-panel'; state.ui.pdaOpen=false; }
  else if (result.action==='quests') { state.ui.tab='quests'; state.ui.pdaOpen=true; }
  else if (result.action==='stats') { state.ui.tab='stats'; state.ui.pdaOpen=true; }
  else if (result.action==='sleep') state.ui.modal='sleep';
  else if (result.action==='artifact') state.ui.modal=null;
  else if (result.action==='dialogue') state.game.dialogueNpcId=result.npcId;
  else if (result.action==='explore-find') state.ui.modal='explore-find';
  else if (result.action==='combat') state.ui.tab='location';
  else if (result.action==='radio-on') { const station=RADIO_STATIONS.find(entry=>entry.locationId===state.game?.locationId); if(station) { startRadio(station.id); return; } else toast('Здесь нет местной радиостанции.','warning'); }
  else if (result.action==='radio-off') { if(state.ui.music?.mode==='radio') stopMusic(); else toast('Радиоприёмник уже выключен.','info'); return; }
  if (state.ui.music?.mode==='radio') {
    const station=RADIO_STATIONS.find(entry=>entry.id===state.ui.music.stationId);
    if (station && station.locationId!==state.game?.locationId) { musicEngine.stop(); state.ui.music={...state.ui.music,playing:false}; }
  }
  if (result.message) toast(result.message, result.encounter?'warning':'info');
  persist();
  render();
}

root.addEventListener('click', (event) => {
  const button=event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action=button.dataset.action;
  const id=button.dataset.id;
  const tab=button.dataset.tab;

  if (action==='play') return setScreen('characters');
  if (action==='account') return setScreen('account');
  if (action==='settings') { previousScreen=state.screen; return setScreen('settings'); }
  if (action==='settings-back') return setScreen(previousScreen || 'menu');
  if (action==='back-menu') { persist(); return setScreen('menu'); }
  if (action==='back-characters') return setScreen('characters');
  if (action==='create-character') return beginNewCharacter();
  if (action==='back-create') return setScreen('create');
  if (action==='back-characters') return setScreen('characters');
  if (action==='exit') { state.ui.modal='exit'; return render(); }
  if (action==='close-modal') { state.ui.modal=null; state.ui.exploreSpotId=null; return render(); }
  if (action==='close-dialogue') { state.game.dialogueNpcId=null; persist(); return render(); }
  if (action==='flashlight-toggle') { state.ui.flashlight=!state.ui.flashlight; persist(); return render(); }
  if (action==='generate-stalker-name') {
    const first=['Макс','Саня','Клим','Боря','Борис','Феликс','Антон','Олег','Андрей','Александр','Макар','Алекс','Артём','Павел','Пётр','Никита','Марк','Константин','Костя','Колян','Егор','Нестор','Гриша','Григорий','Захар','Хома','Фома','Валентин','Ваня','Иван','Вася','Василий','Роман','Ростик','Ростислав','Роберт','Леон','Лев','Лёва','Леонтий','Олесь','Леша','Дмитрий','Дима','Денис','Жора','Ян','Степан','Славик','Слава','Игнат','Тимур','Трофим','Юра','Юрик'];
    const nick=['Йодированный','Йог','Циммерман','Центнер','Упырь','Урод','Уваров','Клименко','Костлявый','Косатка','Косой','Кислый','Китель','Енот','Наркоман','Новичок','Нудный','Нужный','Нежный','Негодяй','Гидра','Гравий','Гром','Гримлин','Гитарист','Горбун','Горбачёв','Шестёрка','Шестун','Шумахер','Щель','Щука','Запойный','Запор','Затвор','Землянин','Земляника','Зомби','Хомяк','Храбрый','Хитрый','Хрупкий','Хрен','Фитиль','Фаланга','Факел','Вентиль','Велик','Велосипедист','Ветер','Высокий','Волосатый','Вареник','Волков','Веник','Анаконда','Автомат','Арбат','Астана','Алкаш','Плохиш','Печь','Печень','Пастух','Пудель','Пистон','Петля','Петельман','Пубертат','Паровозов','Пушкин','Проволока','Переулок','Простой','Римский','Румун','Работящий','Робот','Рифмач','Рихтер','Рыболов','Рык','Онегин','Осечка','Ослов','Одессит','Люфт','Лифт','Ловкач','Лимонка','Лимон','Любитель','Лентяй','Ломка','Джа','Дагер','Диггер','Дагестан','Давидов','Демьянов','Дикарь','Дисциплина','Жопа','Жирный','Жук','Эвтаназия','Якут','Якорь','Ямантау','Чехов','Черкасов','Черчилль','Чемберлен','Читатель','Чтец','Чума','Чумной','Чаплин','Чарка','Сиплый','Старик','Семисотка','Смуглый','Струна','Макаревич','Марка','Моряк','Морпех','Масло','Мент','Метла','Мунтян','Мутный','Миксер','Мир','Иркутск','Икра','Туфель','Тупой','Тик','Беляев','Белка','Балбес','Болтун','Булка','Бык','Башмак','Ботинок','Бедный','Бухой','Бахмут','Баклажан','Бояр','Барин','Брест','Будапешт','Белый','Бледный','Буча','Юрта'];
    state.ui.generatedName=first[Math.floor(Math.random()*first.length)]+' «'+nick[Math.floor(Math.random()*nick.length)]+'»';
    persist(); render(); toast(state.ui.generatedName); return;
  }
  if (action==='close-sleep') { state.ui.modal=null; return render(); }
  if (action==='close-artifact') { state.game.artifactHunt=null; persist(); return render(); }
  if (action==='select-character') return selectCharacter(id);
  if (action==='delete-character') {
    if (!window.confirm('Удалить этого персонажа и его сохранение?')) return;
    state.characters=state.characters.filter(c=>c.id!==id);
    persist(); render(); toast('Персонаж удалён.'); return;
  }
  if (action==='open-avatars') { state.ui.editAvatar=false; state.ui.modal='avatars'; return render(); }
  if (action==='profile-choose-avatar') { state.ui.editAvatar=true; state.ui.modal='avatars'; return render(); }
  if (action==='choose-avatar') { if(state.ui.editAvatar){ const character=state.characters.find(entry=>entry.id===state.activeCharacterId); if(character) character.avatar=button.dataset.src; state.ui.editAvatar=false; } else state.draft.avatar=button.dataset.src; state.ui.modal=null; persist(); return render(); }
  if (action==='reset-avatar') { state.draft.avatar=''; persist(); return render(); }
  if (action==='loadout-add' || action==='loadout-remove') {
    const delta=action==='loadout-add'?1:-1;
    const result=canFitLoadout(state.loadout.selected,id,delta,START_BUDGET);
    if (!result.ok) toast(result.reason,'warning');
    else state.loadout.selected=result.selected;
    persist(); render(); return;
  }
  if (action==='finish-loadout') return finishLoadout();
  if (action==='pda-toggle') { if(!state.ui.pdaOpen && state.game.activeEncounter){toast('Во время боя КПК недоступен. Сначала выберись из схватки.','warning');return;} state.ui.pdaOpen=!state.ui.pdaOpen; if(state.ui.pdaOpen && !['location','map','stats','player','messages','quests','contacts'].includes(state.ui.tab)) state.ui.tab='location'; persist(); return render(); }
  if (action==='inventory-open') { ensureEquipmentSlots(state.game); state.ui.modal='inventory-panel'; state.ui.pdaOpen=false; persist(); return render(); }
  if (action==='explore-open') { state.ui.modal='explore-spots'; persist(); return render(); }
  if (action==='explore-spot') {
    const spot=getExploreSpots(state.game.locationId).find(entry=>entry.id===id);
    if(spot?.kind==='storage') { state.game.currentAreaId=id; state.game.currentDescription=spot.description; const result=openStorage(state.game,spot.storageId,spot.name); state.ui.modal='loot-panel'; persist(); render(); toast(result.message,'success'); return; }
    if(spot?.kind==='breakable') { state.game.currentAreaId=id; state.game.currentDescription=spot.description; const result=breakContainer(state.game,id); if(result.ok) state.ui.modal='loot-panel'; persist(); render(); toast(result.message,result.ok?'success':'warning'); return; }
    if(spot?.kind==='campfire') { const result=sitAtCampfire(state.game,id); persist(); render(); toast(result.message,result.ok?'success':'warning'); return; }
    if(state.game.player.sheltered && state.game.player.shelterSpotId!==id) leaveShelter(state.game);
    state.game.currentAreaId=id; state.game.currentDescription=spot?.description||'';
    persist(); render(); toast(`Ты переместился к месту: ${spot?.name||'осмотр'}.`,'info'); return;
  }
  if (action==='loot-transfer') {
    const result=transferLootItem(button.dataset.itemId,button.dataset.direction||'take',Number(button.dataset.qty)||1);
    persist(); render(); toast(result.ok?'Предмет перемещён.':result.reason,result.ok?'success':'warning'); return;
  }
  if (action==='loot-take-all' || action==='loot-store-all') {
    const result=transferAllLoot(action==='loot-take-all'?'take':'store');
    persist(); render(); toast(result.message,result.moved?'success':'info'); return;
  }
  if (action==='loot-close') { state.game.activeLoot=null; state.ui.modal=null; persist(); render(); return; }
  if (action==='slot-assign') {
    const item=getItem(id); if(!item||!countItem(state.game.inventory,id)){toast('Предмет отсутствует в рюкзаке.','warning');return;}
    const slots=ensureEquipmentSlots(state.game);
    let slot=button.dataset.slot;
    if(!slot) {
      if(item.weapon==='pistol') slot='pistol';
      else if(item.weapon==='melee') slot='knife';
      else if(['rifle','shotgun','smg'].includes(item.weapon)) slot=!slots.primary1||slots.primary1===id?'primary1':!slots.primary2||slots.primary2===id?'primary2':'primary1';
      else if(item.armor) slot='armor';
      else if(item.cat==='Защита') slot='mask';
      else if(item.use) { const index=slots.quick.findIndex(value=>!value); slot=`quick${index>=0?index:0}`; }
    }
    const quickSlot=slot?.startsWith('quick');
    const compatible=quickSlot ? !!item.use
      : slot==='armor' ? !!item.armor
      : slot==='mask' ? item.cat==='Защита'
      : slot==='pistol' ? item.weapon==='pistol'
      : slot==='knife' ? item.weapon==='melee'
      : ['primary1','primary2'].includes(slot) ? ['rifle','shotgun','smg'].includes(item.weapon)
      : false;
    if(!compatible){toast('Этот предмет не подходит для выбранного слота.','warning');return;}
    if(quickSlot) { const index=Number(slot.replace('quick','')); if(index<0||index>3){toast('Неизвестный быстрый слот.','warning');return;} slots.quick[index]=id; }
    else slots[slot]=id;
    if(item.weapon&&item.weapon!=='grenade') selectWeapon(state.game,id);
    if(slot==='armor') { state.game.player.armorId=id; state.game.player.armor=item.armor||0; }
    if(slot==='mask') state.game.player.maskId=id;
    persist(); render(); toast(`${item.name} помещён в слот «${slot==='armor'?'Броня':slot==='mask'?'Противогаз':slot.startsWith('quick')?'Быстрый доступ':slot}».`,'success'); return;
  }
  if (action==='slot-select') {
    const slot=button.dataset.slot; const slots=ensureEquipmentSlots(state.game); const selected=slot?.startsWith('quick')?slots.quick?.[Number(slot.replace('quick',''))]:slots[slot];
    const item=getItem(selected); if(!item||!countItem(state.game.inventory,selected)){toast('Этот слот пуст или предмет отсутствует в рюкзаке.','warning');return;}
    if(slot==='armor') { state.game.player.armorId=selected; state.game.player.armor=item.armor||0; persist();render();toast(`Надета броня: ${item.name}.`,'success');return; }
    if(slot==='mask') { state.game.player.maskId=selected; persist();render();toast(`Надет противогаз: ${item.name}.`,'success');return; }
    if(item.weapon&&item.weapon!=='grenade') { const result=selectWeapon(state.game,selected); persist(); render(); toast(result.message,result.ok?'success':'warning'); return; }
    if(item.use) { const result=useItem(state.game,selected); persist(); render(); toast(result.message,result.ok?'success':'warning'); return; }
    toast('В этом слоте пока нет действия.','info'); return;
  }
  if (action==='equip-armor') {
    if(!getItem(id)?.armor||!countItem(state.game.inventory,id)){toast('Такой брони нет в рюкзаке.','warning');return;}
    const next=state.game.player.armorId===id?null:id;
    state.game.player.armorId=next;
    state.game.player.armor=next?(getItem(next)?.armor||0):0;
    ensureEquipmentSlots(state.game).armor=next;
    persist();render();toast(next?`Надета броня: ${getItem(id).name}.`:'Броня снята.','success');return;
  }
  if (action==='explore-pick') { const result=claimAreaFind(state.game,id); if(result.ok) state.ui.modal=null; persist(); render(); toast(result.message,result.ok?'success':'warning'); return; }
  if (action==='tab') { const allowed=['location','map','stats','player','messages','quests','contacts']; if(!allowed.includes(tab)) return; state.ui.pdaOpen=true; state.ui.tab=tab; state.game.dialogueNpcId=null; state.ui.modal=null; persist(); return render(); }
  if (action==='tab-map') { state.ui.pdaOpen=true; state.ui.tab='map'; state.ui.mapView=state.ui.mapView||'map'; persist(); return render(); }
  if (action==='map-view') { const view=button.dataset.view; if(['map','places','tasks'].includes(view)){state.ui.mapView=view;persist();render();} return; }
  if (action==='inspect') { const text=describeLocation(state.game); addGameLog(text); render(); return; }
  if (action==='search') { advanceGame(state.game,10); const result=searchLocation(state.game); updateWeather(state.game); persist(); render(); toast(result.message,result.ok?'info':'warning'); return; }
  if (action==='scout') { const result=scoutLocation(state.game,id); toast(result.message,result.ok?'info':'warning'); return; }
  if (action==='travel') {
    const result=travelTo(state.game,id);
    if(state.ui.music?.mode==='radio' && RADIO_STATIONS.find(s=>s.id===state.ui.music.stationId)?.locationId!==state.game.locationId){musicEngine.stop();state.ui.music={...state.ui.music,playing:false};}
    state.ui.tab='location';
    state.ui.pdaOpen=false;
    persist(); render(); toast(result.message,result.encounter?'warning':result.ok?'info':'warning'); return;
  }
  if (action==='artifact-start') {
    const result=startArtifactHunt(state.game);
    state.ui.modal=result.ok?'artifact':null;
    persist(); render(); toast(result.message,result.ok?'info':'warning'); return;
  }
  if (action==='artifact-sector') {
    const result=chooseArtifactSector(state.game,Number(button.dataset.sector));
    if (result.found || result.finished) state.game.artifactHunt=null;
    persist(); render(); toast(result.message,result.found?'success':'info'); return;
  }
  if (action==='anomaly') {
    const result=deactivateAnomaly(state.game);
    if (result.ok) advanceGame(state.game,5);
    persist(); render(); toast(result.message,result.ok?'success':'warning'); return;
  }
  if (action==='shelter' || action==='scene-shelter') { const result=takeShelter(state.game,action==='scene-shelter'?id:null); persist(); render(); toast(result.message,result.ok?'success':'warning'); return; }
  if (action==='scene-spot') {
    const spot=getExploreSpots(state.game.locationId).find(entry=>entry.id===id);
    if(!spot){toast('Это место больше не отмечено.','warning');return;}
    if(spot.kind==='campfire'){const result=sitAtCampfire(state.game,id);persist();render();toast(result.message,result.ok?'success':'warning');return;}
    if(state.game.player.sheltered && state.game.player.shelterSpotId!==id) leaveShelter(state.game);
    state.game.currentAreaId=id;
    state.game.currentDescription=spot.description;
    persist(); render(); toast(`Ты переместился к месту: ${spot.name}.`, 'info'); return;
  }
  if (action==='break-crate') {
    const result=breakContainer(state.game,id||state.game.currentAreaId);
    if(result.ok) state.ui.modal='loot-panel';
    persist();render();toast(result.message,result.ok?'success':'warning');return;
  }
  if (action==='scene-search') {
    const spotId=id||state.game.currentAreaId;
    const result=startAreaSearch(state.game,spotId);
    if(result.ok) state.ui.modal='loot-panel';
    persist();render();toast(result.message,result.ok?'info':'warning');return;
  }
  if (action==='scene-back') { state.game.currentAreaId=null; leaveShelter(state.game); state.game.currentDescription=getLocation(state.game.locationId)?.desc||''; persist();render();return; }
  if (action==='leave-shelter') { leaveShelter(state.game); state.game.currentAreaId=null; persist();render();toast('Ты покинул укрытие.','info');return; }
  if (action==='toggle-weapon-side') { state.settings.weaponHudSide=state.settings.weaponHudSide==='left'?'right':'left'; persist(); render(); return; }
  if (action==='combat-reload' || action==='combat-aim' || action==='combat-dodge' || action==='combat-grenade' || action==='combat-bolt') {
    const result=action==='combat-reload'?reloadWeapon(state.game):action==='combat-aim'?aimWeapon(state.game):action==='combat-dodge'?dodge(state.game):action==='combat-grenade'?throwGrenade(state.game):throwBoltInCombat(state.game);
    if (!state.game.activeEncounter && state.game.activeLoot) state.ui.modal='loot-panel';
    persist(); render(); toast(result.message,result.ok?'info':'warning'); return;
  }
  if (action==='combat-use-item') { const result=useItemInCombat(state.game,id); persist(); render(); toast(result.message,result.ok?'success':'warning'); return; }
  if (action==='equip-weapon') { const result=selectWeapon(state.game,id); persist(); render(); toast(result.message,result.ok?'success':'warning'); return; }
  if (action==='equip-mask') {
    if(getItem(id)?.cat!=='Защита'||!countItem(state.game.inventory,id)){toast('Такого противогаза нет в рюкзаке.','warning');return;}
    state.game.player.maskId=state.game.player.maskId===id?null:id;
    ensureEquipmentSlots(state.game).mask=state.game.player.maskId;
    persist();render();toast(state.game.player.maskId?`Надет противогаз «${getItem(id)?.name||id}».`:'Противогаз снят.','success');return;
  }
  if (action==='sleep-open') { if (state.game.activeEncounter) { toast('Во время боя спать нельзя.','warning'); return; } state.ui.modal='sleep'; return render(); }
  if (action==='sleep') {
    const result=sleep(state.game,Number(button.dataset.hours));
    state.ui.modal=null; persist(); render(); toast(result.message,result.ok?'success':'warning'); return;
  }
  if (action==='use-item') {
    const result=state.game.activeEncounter?useItemInCombat(state.game,id):useItem(state.game,id);
    if (result.ok && !state.game.activeEncounter) advanceGame(state.game,1);
    persist(); render(); toast(result.message,result.ok?'success':'warning'); return;
  }
  if (action==='drop-item') {
    if (removeItem(state.game.inventory,id,1)) {
      if (id==='boltpack') state.game.boltsRemaining=Math.max(0,(state.game.boltsRemaining ?? 0)-10);
      if (['ammo9x18','ammo9x19','ammo545','shells'].includes(id)) {
        const capacity=id==='shells'?8:id==='ammo545'?30:12;
        state.game.ammoRounds[id]=Math.max(0,(state.game.ammoRounds?.[id] ?? 0)-capacity);
      }
      persist(); render(); toast(`Предмет «${getItem(id)?.name||id}» выброшен.`);
    }
    return;
  }
  if (action==='combat-attack' || action==='combat-defend' || action==='combat-flee') {
    const result=action==='combat-attack'?playerAttack(state.game):action==='combat-defend'?defend(state.game):flee(state.game);
    if (!state.game.activeEncounter && state.game.activeLoot) state.ui.modal='loot-panel';
    persist(); render(); toast(result.message,result.ok?'info':'warning'); return;
  }
  if (action==='talk') {
    const result=talkToNpc(state.game,id);
    if (result.ok) state.game.dialogueNpcId=id;
    persist(); render(); if (!result.ok) toast(result.message,'warning'); return;
  }
  if (action==='dialogue-topic') {
    const answer=replyNpc(state.game,id,button.dataset.topic);
    state.game.dialogueHistory ||= []; state.game.dialogueHistory.push({role:'npc',text:answer}); state.game.dialogueHistory=state.game.dialogueHistory.slice(-16);
    addGameLog(`${NPCS.find(n=>n.id===id)?.name||'Собеседник'}: ${answer}`);
    persist(); render(); return;
  }
  if (action==='quest-accept-generic') { const result=acceptWorldQuest(state.game,id); persist(); render(); toast(result.message,result.ok?'success':'warning'); return; }
  if (action==='quest-accept') {
    const result=acceptSidorovichJob(state.game);
    persist(); render(); toast(result.message,result.ok?'success':'warning'); return;
  }
  if (action==='quest-turnin') {
    const result=turnInSidorovichJob(state.game);
    persist(); render(); toast(result.message,result.ok?'success':'warning'); return;
  }
  if (action==='wolf-quest-accept') {
    const result=acceptWolfDogQuest(state.game);
    state.game.dialogueReply=result.message;
    persist(); render(); toast(result.message,result.ok?'success':'warning'); return;
  }
  if (action==='wolf-quest-turnin') {
    const result=turnInWolfDogQuest(state.game);
    state.game.dialogueReply=result.message;
    persist(); render(); toast(result.message,result.ok?'success':'warning'); return;
  }
  if (action==='wolf-dogs-start') {
    const result=beginWolfDogPack(state.game);
    persist(); render(); toast(result.message,result.ok?'warning':'info'); return;
  }
  if (action==='export-save') { persist(); exportSave(state); return; }
  if (action==='location-open') { state.ui.mapLocationId=id; state.ui.modal='map-location'; return render(); }
  if (action==='map-modal-travel') {
    const result=travelTo(state.game,id);
    if(state.ui.music?.mode==='radio' && RADIO_STATIONS.find(s=>s.id===state.ui.music.stationId)?.locationId!==state.game.locationId){musicEngine.stop();state.ui.music={...state.ui.music,playing:false};}
    state.ui.modal=null; state.ui.tab='location'; state.ui.pdaOpen=false; persist(); render();
    toast(result.message,result.encounter?'warning':result.ok?'info':'warning'); return;
  }
  if (action==='trade-open') { state.ui.tradeNpcId=id; state.ui.pdaOpen=false; state.ui.modal='trade-panel'; persist(); return render(); }
  if (action==='trade-back') { state.ui.tradeNpcId=null; state.ui.modal='trade-panel'; persist(); return render(); }
  if (action==='trade-buy') {
    const result=buyFromTrader(state.game,button.dataset.traderId,button.dataset.itemId);
    persist(); render(); toast(result.message,result.ok?'success':'warning'); return;
  }
  if (action==='trade-sell') {
    const result=sellToTrader(state.game,button.dataset.traderId,button.dataset.itemId,1);
    persist(); render(); toast(result.message,result.ok?'success':'warning'); return;
  }
  if (action==='radio-base-open' || action==='radio-start' || action==='radio-select-station') { startRadio(id); return; }
  if (action==='radio-stop') { stopMusic(); return; }
  if (action==='player-stop') { if(state.ui.music?.mode==='player') stopMusic(); else toast('Личный плеер ещё не запущен.','info'); return; }
  if (action==='player-play-track') {
    if(state.ui.music?.mode==='player' && state.ui.music.trackId===id) toggleMusic();
    else startPlayerTrack(id);
    return;
  }
  if (action==='player-remove-track') {
    const removed=new Set(state.settings.removedPlayerTrackIds||[]); removed.add(id);
    state.settings.removedPlayerTrackIds=[...removed];
    const music=state.ui.music||{};
    if (music.mode==='player' && (music.queue||[]).includes(id)) {
      const wasCurrent=music.trackId===id;
      const queue=(music.queue||[]).filter(trackId=>trackId!==id);
      if (wasCurrent) { musicEngine.stop(); state.ui.music={...music,queue,trackId:null,index:0,playing:false}; }
      else { const nextIndex=Math.max(0,queue.indexOf(music.trackId)); state.ui.music={...music,queue,index:nextIndex}; }
    }
    persist(); render(); toast('Композиция убрана из личной подборки. Её можно вернуть ниже.','info'); return;
  }
  if (action==='player-restore-track') {
    state.settings.removedPlayerTrackIds=(state.settings.removedPlayerTrackIds||[]).filter(trackId=>trackId!==id);
    persist(); render(); toast('Композиция возвращена в личную подборку.','success'); return;
  }
  if (action==='player-next') {
    if (state.ui.music?.mode==='player') advanceMusic(false,1);
    else toast('В радиорежиме очередь идёт автоматически без переключения песен.','info');
    return;
  }
  if (action==='player-prev') { if (state.ui.music?.mode==='player') advanceMusic(false,-1); else toast('Сначала выбери песню для личного плеера.','info'); return; }
  if (action==='player-toggle') { if(state.ui.music?.mode==='player') toggleMusic(); else toast('Сначала выбери песню для личного плеера.','info'); return; }
  if (action==='settings-open-radio') { state.screen='game'; state.ui.tab='location'; state.ui.pdaOpen=false; persist(); render(); toast('Радио включается из карточки местной станции на базах.'); return; }
  if (action==='reset-all') { state.ui.modal='reset'; return render(); }
  if (action==='confirm-reset') { localStorage.removeItem('cordon-pda-save-v1'); state=createInitialState(); previousScreen='menu'; render(); toast('Прогресс сброшен.'); return; }
});

root.addEventListener('input', (event) => {
  if (event.target.name==='faction') { state.draft.faction=event.target.value; state.draft.avatar=''; persist(); render(); return; }
  const field=event.target.dataset.field;
  if (field) {
    state.draft[field]=event.target.value;
    if (field==='faction') { state.draft.avatar=''; render(); }
    persist();
  }
  const setting=event.target.dataset.setting;
  if (setting==='reducedMotion') { state.settings.reducedMotion=event.target.checked; persist(); document.body.classList.toggle('reduced-motion', !!state.settings.reducedMotion); }
  if (setting==='uiScale') { state.settings.uiScale=Number(event.target.value)||1; document.documentElement.style.setProperty('--ui-scale',state.settings.uiScale); persist(); }
});

root.addEventListener('change', async (event) => {
  if (event.target.name==='faction') { state.draft.faction=event.target.value; state.draft.avatar=''; persist(); render(); return; }
  const field=event.target.dataset.field;
  if (field) {
    state.draft[field]=event.target.value;
    if (field==='faction') { state.draft.avatar=''; render(); }
    persist();
  }
  const setting=event.target.dataset.setting;
  if (setting==='reducedMotion') {
    state.settings.reducedMotion=event.target.checked;
    document.body.classList.toggle('reduced-motion', !!state.settings.reducedMotion);
    persist();
  }
  if (event.target.id==='avatar-upload' && event.target.files?.[0]) {
    try {
      const dataUrl=await resizeImage(event.target.files[0]);
      state.draft.avatar=dataUrl; persist(); render(); toast('Портрет добавлен.');
    } catch { toast('Не удалось загрузить изображение.','warning'); }
  }
  if (event.target.id==='profile-avatar-upload' && event.target.files?.[0]) {
    try {
      const dataUrl=await resizeImage(event.target.files[0]);
      const character=state.characters.find(entry=>entry.id===state.activeCharacterId);
      if (character) { character.avatar=dataUrl; persist(); render(); toast('Иконка персонажа обновлена.'); }
    } catch { toast('Не удалось загрузить изображение.','warning'); }
  }
  if (event.target.id==='save-upload' && event.target.files?.[0]) {
    try {
      const imported=await importSave(event.target.files[0]);
      state={...createInitialState(),...imported,screen:'menu',ui:{tab:'location',modal:null,notification:''}};
      persist(); render(); toast('Сохранение импортировано.');
    } catch (error) { toast(error.message || 'Не удалось импортировать сохранение.','warning'); }
  }
});

let draggedLootItem=null;
root.addEventListener('dragstart',(event)=>{
  const item=event.target.closest('[data-drag-id]');
  if(!item) return;
  draggedLootItem={id:item.dataset.dragId,side:item.dataset.dragSide};
  event.dataTransfer?.setData('text/plain',item.dataset.dragId);
  if(event.dataTransfer) event.dataTransfer.effectAllowed='move';
});
root.addEventListener('dragover',(event)=>{
  const zone=event.target.closest('[data-drop-zone]');
  if(!zone||!draggedLootItem||!state.game?.activeLoot) return;
  event.preventDefault();
  zone.classList.add('drop-ready');
});
root.addEventListener('dragleave',(event)=>{
  const zone=event.target.closest('[data-drop-zone]');
  if(zone&&!zone.contains(event.relatedTarget)) zone.classList.remove('drop-ready');
});
root.addEventListener('drop',(event)=>{
  const zone=event.target.closest('[data-drop-zone]');
  if(!zone||!draggedLootItem||!state.game?.activeLoot) return;
  event.preventDefault();
  const destination=zone.dataset.dropZone;
  const direction=(draggedLootItem.side==='source'&&destination==='player')?'take':(draggedLootItem.side==='player'&&destination==='source')?'store':null;
  zone.classList.remove('drop-ready');
  if(!direction) return;
  const result=transferLootItem(draggedLootItem.id,direction,1);
  draggedLootItem=null;
  persist(); render(); toast(result.ok?'Предмет перемещён.':result.reason,result.ok?'success':'warning');
});
root.addEventListener('dragend',()=>{draggedLootItem=null;root.querySelectorAll('.drop-ready').forEach(node=>node.classList.remove('drop-ready'));});

root.addEventListener('submit', (event) => {
  if (event.target.id==='npc-dialogue-form') {
    event.preventDefault();
    const npcId=state.game?.dialogueNpcId;
    const text=String(new FormData(event.target).get('message')||'').trim();
    if (!npcId || !text) return;
    const result=replyNpcFreeText(state.game,npcId,text);
    persist(); render(); toast(result.message,result.ok?'info':'warning');
    return;
  }
  if (event.target.id==='character-form') {
    event.preventDefault();
    const form=new FormData(event.target);
    state.draft.name=String(form.get('name')||state.draft.name).trim();
    state.draft.faction=String(form.get('faction')||state.draft.faction);
    if (!state.draft.name) { toast('Укажи имя персонажа.','warning'); return; }
    state.draft.birthDate=form.get('birthDate')||'';
    state.draft.height=form.get('height')||'';
    state.draft.weight=form.get('weight')||'';
    state.draft.personality=form.get('personality')||'';
    state.draft.biography=form.get('biography')||'';
    state.draft.notes=form.get('notes')||'';
    state.pendingCharacter=characterFromDraft();
    state.loadout={selected:{}};
    setScreen('loadout');
  }
  if (event.target.id==='profile-edit-form') {
    event.preventDefault();
    const form=new FormData(event.target);
    const character=state.characters.find(entry=>entry.id===state.activeCharacterId);
    if (!character) { toast('Активный персонаж не найден.','warning'); return; }
    const name=String(form.get('name')||'').trim();
    if (!name) { toast('Имя не может быть пустым.','warning'); return; }
    character.name=name;
    character.height=String(form.get('height')||'');
    character.weight=String(form.get('weight')||'');
    character.personality=String(form.get('personality')||'');
    character.biography=String(form.get('biography')||'');
    character.notes=String(form.get('notes')||'');
    persist(); render(); toast('Личное дело обновлено.');
  }
  if (event.target.id==='action-form') {
    event.preventDefault();
    const input=event.target.querySelector('#player-action');
    const text=input.value.trim();
    if (!text) return;
    addGameLog(`Ты: ${text}`,'player');
    const result=processPlayerAction(state.game,text);
    input.value='';
    applyActionResult(result);
  }
});

async function resizeImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('Это не изображение.');
  const image=await createImageBitmap(file);
  const scale=Math.min(1,420/Math.max(image.width,image.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.round(image.width*scale); canvas.height=Math.round(image.height*scale);
  const context=canvas.getContext('2d');
  context.drawImage(image,0,0,canvas.width,canvas.height);
  image.close?.();
  return canvas.toDataURL('image/jpeg',0.78);
}

window.addEventListener('beforeunload', persist);
setInterval(()=>{
  if (state.game) {
    const before=state.game.clock?.worldMinutes||0;
    // advanceGame(0) still synchronizes wall-clock time and processes vitals,
    // squads and emission events; this prevents an emission being skipped while the tab is open.
    advanceGame(state.game,0);
    if ((state.game.clock?.worldMinutes||0)>before) persist();
  }
  updateClockDisplays();
},15000);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
render();
