import { loadState, saveState, createInitialState, exportSave, importSave } from './core/storage.js';
import { ASSETS, FACTIONS, START_BUDGET, MAX_CARRY_KG, NPCS, ITEMS, LOCATIONS, RADIO_TRACKS, RADIO_STATIONS, PLAYER_TRACKS } from './data/catalog.js';
import { renderMenu, renderAccount, renderCharacters, renderCreate, renderLoadout, renderGame, renderGameSettings, renderModal, esc } from './ui/views.js';
import { canFitLoadout, getInventoryCost, getLoadoutWeight, addItem, getItem, getWeight, removeItem, useItem } from './systems/inventory.js';
import { createGame, addLog, describeLocation, searchLocation, travelTo, talkToNpc, replyNpc, sleep, deactivateAnomaly, startArtifactHunt, chooseArtifactSector, progressQuest, updateWeather, advanceGame, getLocation, scoutLocation, simulateWorld, acceptSidorovichJob, turnInSidorovichJob } from './systems/world.js';
import { playerAttack, defend, flee } from './systems/combat.js';
import { createMusicEngine } from './systems/music.js';
import { buyFromTrader, sellToTrader } from './systems/world.js';
import { processPlayerAction } from './systems/action-engine.js';
import { getGameDateTime, syncRealElapsed } from './systems/game-clock.js';

const root = document.getElementById('app');
let state = loadState();
state.screen = 'menu';
const savedMusic=state.ui?.music||{};
const savedStation=RADIO_STATIONS.find(station=>station.id===savedMusic.stationId);
const allowedSavedIds=savedMusic.mode==='radio' ? (savedStation?.trackIds||[]) : PLAYER_TRACKS.map(track=>track.id);
const restoredQueue=(savedMusic.queue||[]).filter(id=>allowedSavedIds.includes(id));
const restoredIndex=Math.max(0,restoredQueue.indexOf(savedMusic.trackId));
const restoredMusic=restoredQueue.length ? {...savedMusic,queue:restoredQueue,index:restoredIndex,trackId:restoredQueue[restoredIndex],playing:false} : {mode:null,stationId:null,trackId:null,queue:[],index:0,playing:false};
state.ui = { ...(state.ui||{}), tab:'location', modal:null, notification:'', music:restoredMusic, tradeNpcId:null, mapLocationId:null };
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

function setScreen(screen) {
  state.screen = screen;
  state.ui.modal = null;
  render();
  persist();
}

function render() {
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

function startRadio(stationId) {
  const station=RADIO_STATIONS.find(entry=>entry.id===stationId) || RADIO_STATIONS.find(entry=>entry.locationId===state.game?.locationId) || RADIO_STATIONS[0];
  const queue=shuffled(station.trackIds);
  if (!queue.length) return;
  state.ui.music={mode:'radio',stationId:station.id,queue,index:0,trackId:queue[0],playing:true};
  state.settings.radioStationId=station.id;
  state.ui.tab='radio';
  musicEngine.play(trackById(queue[0]));
  persist(); render();
}

function startPlayerTrack(trackId) {
  const fullQueue=PLAYER_TRACKS.map(track=>track.id);
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
  game.player.armor=Math.min(30,inventory.reduce((sum,stack)=>sum+(getItem(stack.id)?.armor||0)*stack.qty,0));
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
  syncRealElapsed(state.game);
  state.ui.tab='location';
  state.account.sessions=(state.account.sessions||0)+1;
  state.screen='game';
  persist();
  render();
}

function applyActionResult(result) {
  if (!result) return;
  if (result.action==='map' || result.action==='tab-map') state.ui.tab='map';
  else if (result.action==='inventory') state.ui.tab='inventory';
  else if (result.action==='quests') state.ui.tab='quests';
  else if (result.action==='stats') state.ui.tab='stats';
  else if (result.action==='sleep') state.ui.modal='sleep';
  else if (result.action==='artifact') state.ui.modal=null;
  else if (result.action==='dialogue') state.game.dialogueNpcId=result.npcId;
  else if (result.action==='combat') state.ui.tab='location';
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
  if (action==='close-modal') { state.ui.modal=null; return render(); }
  if (action==='close-dialogue') { state.game.dialogueNpcId=null; persist(); return render(); }
  if (action==='close-sleep') { state.ui.modal=null; return render(); }
  if (action==='close-artifact') { state.game.artifactHunt=null; persist(); return render(); }
  if (action==='select-character') return selectCharacter(id);
  if (action==='delete-character') {
    if (!window.confirm('Удалить этого персонажа и его сохранение?')) return;
    state.characters=state.characters.filter(c=>c.id!==id);
    persist(); render(); toast('Персонаж удалён.'); return;
  }
  if (action==='open-avatars') { state.ui.modal='avatars'; return render(); }
  if (action==='choose-avatar') { state.draft.avatar=button.dataset.src; state.ui.modal=null; persist(); return render(); }
  if (action==='reset-avatar') { state.draft.avatar=''; persist(); return render(); }
  if (action==='loadout-add' || action==='loadout-remove') {
    const delta=action==='loadout-add'?1:-1;
    const result=canFitLoadout(state.loadout.selected,id,delta,START_BUDGET);
    if (!result.ok) toast(result.reason,'warning');
    else state.loadout.selected=result.selected;
    persist(); render(); return;
  }
  if (action==='finish-loadout') return finishLoadout();
  if (action==='tab') { state.ui.tab=tab; if(tab==='radio'){ const localStation=RADIO_STATIONS.find(item=>item.locationId===state.game?.locationId); if(localStation) state.settings.radioStationId=localStation.id; } state.game.dialogueNpcId=null; state.ui.modal=null; persist(); return render(); }
  if (action==='tab-map') { state.ui.tab='map'; persist(); return render(); }
  if (action==='inspect') { const text=describeLocation(state.game); addGameLog(text); render(); return; }
  if (action==='search') { advanceGame(state.game,10); const result=searchLocation(state.game); updateWeather(state.game); persist(); render(); toast(result.message,result.ok?'info':'warning'); return; }
  if (action==='scout') { const result=scoutLocation(state.game,id); toast(result.message,result.ok?'info':'warning'); return; }
  if (action==='travel') {
    const result=travelTo(state.game,id);
    state.ui.tab='location';
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
  if (action==='sleep-open') { if (state.game.activeEncounter) { toast('Во время боя спать нельзя.','warning'); return; } state.ui.modal='sleep'; return render(); }
  if (action==='sleep') {
    const result=sleep(state.game,Number(button.dataset.hours));
    state.ui.modal=null; persist(); render(); toast(result.message,result.ok?'success':'warning'); return;
  }
  if (action==='use-item') {
    const result=useItem(state.game,id);
    if (result.ok) advanceGame(state.game,1);
    persist(); render(); toast(result.message,result.ok?'success':'warning'); return;
  }
  if (action==='drop-item') {
    if (removeItem(state.game.inventory,id,1)) {
      if (id==='boltpack') state.game.boltsRemaining=Math.max(0,(state.game.boltsRemaining ?? 0)-10);
      if (['ammo9x18','ammo9x19','shells'].includes(id)) {
        const capacity=id==='shells'?8:12;
        state.game.ammoRounds[id]=Math.max(0,(state.game.ammoRounds?.[id] ?? 0)-capacity);
      }
      persist(); render(); toast(`Предмет «${getItem(id)?.name||id}» выброшен.`);
    }
    return;
  }
  if (action==='combat-attack' || action==='combat-defend' || action==='combat-flee') {
    const result=action==='combat-attack'?playerAttack(state.game):action==='combat-defend'?defend(state.game):flee(state.game);
    persist(); render(); toast(result.message,result.ok?'info':'warning'); return;
  }
  if (action==='talk') {
    const result=talkToNpc(state.game,id);
    if (result.ok) state.game.dialogueNpcId=id;
    persist(); render(); if (!result.ok) toast(result.message,'warning'); return;
  }
  if (action==='dialogue-topic') {
    const answer=replyNpc(state.game,id,button.dataset.topic);
    addGameLog(`${NPCS.find(n=>n.id===id)?.name||'Собеседник'}: ${answer}`);
    persist(); render(); return;
  }
  if (action==='quest-accept') {
    const result=acceptSidorovichJob(state.game);
    persist(); render(); toast(result.message,result.ok?'success':'warning'); return;
  }
  if (action==='quest-turnin') {
    const result=turnInSidorovichJob(state.game);
    persist(); render(); toast(result.message,result.ok?'success':'warning'); return;
  }
  if (action==='export-save') { persist(); exportSave(state); return; }
  if (action==='location-open') { state.ui.mapLocationId=id; state.ui.modal='map-location'; return render(); }
  if (action==='map-modal-travel') {
    const result=travelTo(state.game,id);
    state.ui.modal=null; state.ui.tab='location'; persist(); render();
    toast(result.message,result.encounter?'warning':result.ok?'info':'warning'); return;
  }
  if (action==='trade-open') { state.ui.tradeNpcId=id; state.ui.tab='trade'; state.ui.modal=null; persist(); return render(); }
  if (action==='trade-back') { state.ui.tradeNpcId=null; persist(); return render(); }
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
  if (action==='player-next' || action==='music-dock-next') {
    if (state.ui.music?.mode==='player') advanceMusic(false,1);
    else toast('В радиорежиме очередь идёт автоматически без переключения песен.','info');
    return;
  }
  if (action==='player-prev') { if (state.ui.music?.mode==='player') advanceMusic(false,-1); else toast('Сначала выбери песню для личного плеера.','info'); return; }
  if (action==='player-toggle') { if(state.ui.music?.mode==='player') toggleMusic(); else toast('Сначала выбери песню для личного плеера.','info'); return; }
  if (action==='music-dock-toggle') { toggleMusic(); return; }
  if (action==='settings-open-radio') {
    if (!state.game) { toast('Сначала выбери или создай персонажа.','warning'); return; }
    state.screen='game'; state.ui.tab='radio';
    const station=RADIO_STATIONS.find(entry=>entry.locationId===state.game.locationId);
    if (station) state.settings.radioStationId=station.id;
    persist(); render(); return;
  }
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
  if (event.target.id==='save-upload' && event.target.files?.[0]) {
    try {
      const imported=await importSave(event.target.files[0]);
      state={...createInitialState(),...imported,screen:'menu',ui:{tab:'location',modal:null,notification:''}};
      persist(); render(); toast('Сохранение импортировано.');
    } catch (error) { toast(error.message || 'Не удалось импортировать сохранение.','warning'); }
  }
});

root.addEventListener('submit', (event) => {
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
    const elapsed=syncRealElapsed(state.game);
    if (elapsed>0) {
      // Let patrols advance as real time passes, even while the player is reading the PDA.
      simulateWorld(state.game);
      persist();
    }
  }
  updateClockDisplays();
},15000);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
render();
