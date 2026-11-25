import { loadState, saveState, createInitialState, exportSave, importSave } from './core/storage.js';
import { ASSETS, FACTIONS, START_BUDGET, MAX_CARRY_KG, NPCS, ITEMS, LOCATIONS, AVATAR_OPTIONS, STARTER_LOADOUT_BY_FACTION } from './data/catalog.js';
import { renderMenu, renderAccount, renderCharacters, renderCreate, renderLoadout, renderGame, renderGameSettings, renderModal, esc } from './ui/views.js';
import { canFitLoadout, getInventoryCost, getLoadoutWeight, addItem, getItem, getWeight, countItem, removeItem, useItem, transferItem } from './systems/inventory.js';
import { createGame, addLog, describeLocation, searchLocation, travelTo, talkToNpc, replyNpc, sleep, deactivateAnomaly, startArtifactHunt, chooseArtifactSector, progressQuest, updateWeather, advanceGame, getLocation, scoutLocation, acceptSidorovichJob, turnInSidorovichJob, acceptWolfDogQuest, turnInWolfDogQuest, acceptWorldQuest, startAreaSearch, claimAreaFind, breakContainer, replyNpcFreeText, takeShelter, leaveShelter, sitAtCampfire, getExploreSpots, getActiveLootItems, openStorage, turnInPudelQuest, turnInSecretAnomalyQuest, claimAtpRescueReward, beginAtpRescue, generateStalkerName, acceptPersonalQuest, turnInPersonalQuest, getAvailableStalkers } from './systems/world.js';
import { playerAttack, playerPunch, defend, flee, beginEncounter, beginWolfDogPack, reloadWeapon, aimWeapon, dodge, throwGrenade, throwBoltInCombat, useItemInCombat, selectWeapon } from './systems/combat.js';
import { buyFromTrader, sellToTrader } from './systems/world.js';
import { processPlayerAction } from './systems/action-engine.js';
import { getGameDateTime } from './systems/game-clock.js';
import { createSoundEngine } from './systems/sound.js';
import { requestNpcAiReply, isValidNpcAiEndpoint } from './systems/npc-ai.js';
import { isRouteQuestion } from './systems/dialogue-engine.js';
import { mainStoryAction } from './systems/main-story.js';
import { toggleArtifactBelt, removeArtifactFromBelt, repairItemCondition, ensureConditionState } from './systems/equipment-condition.js';
import { mountStalker3D, disposeStalker3D } from './3d/renderer.js';

const root = document.getElementById('app');
let state = loadState();
state.screen = 'menu';
state.settings.weaponHudSide ||= 'right';
state.settings.controlScheme ||= 'auto';
state.ui = { ...(state.ui||{}), tab:'location', pdaOpen:false, modal:null, notification:'', tradeNpcId:null, mapLocationId:null, encyclopediaCategory:state.ui?.encyclopediaCategory||'locations', helpTopic:state.ui?.helpTopic||'basics' };
let previousScreen = 'menu';
let toastTimer = null;
const soundEngine = createSoundEngine(() => state.settings || {});

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
    binoculars:previous.binoculars??null,
    bolt:previous.bolt??null,
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
    if (previous.binoculars===undefined && item.id==='binoculars') game.equipmentSlots.binoculars=item.id;
    if (previous.bolt===undefined && item.id==='boltpack') game.equipmentSlots.bolt=item.id;
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
  const restorePointerLock = document.pointerLockElement?.id === 'stalker-3d-world';
  disposeStalker3D();
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
  if (state.screen==='game' && !state.ui.pdaOpen) {
    const canvas=root.querySelector('#stalker-3d-world');
    if (canvas && state.game) {
      const nearby=getAvailableStalkers(state.game,state.game.locationId);
      mountStalker3D(canvas,{
        game:state.game,
        npcs:nearby,
        reducedMotion:!!state.settings.reducedMotion,
        controlsMode:state.settings.controlScheme||'auto',
        restorePointerLock,
        onInteract:(npcId)=>{
          const result=talkToNpc(state.game,npcId);
          if(result.ok){state.ui.modal=null;persist();render();}
          else toast(result.message,'warning');
        },
        onTravel:(destinationId,transition={})=>{
          const fromId=state.game.locationId;
          const result=travelTo(state.game,destinationId);
          if(!result.ok){toast(result.message,'warning');return result;}
          if(result.ok){
            state.game.player.worldPositions ||= {};
            let arrival;
            if(destinationId==='sidorovich-bunker')arrival={x:0,z:18.5,yaw:0};
            else if(fromId==='sidorovich-bunker'&&destinationId==='rookie-village')arrival={x:0,z:27.5,yaw:Math.PI};
            else {
              const edge=transition.edge||{x:0,z:-34};
              if(Math.abs(edge.x)>Math.abs(edge.z))arrival=edge.x>0?{x:-29.2,z:0,yaw:Math.PI/2}:{x:29.2,z:0,yaw:-Math.PI/2};
              else arrival=edge.z<0?{x:0,z:29.2,yaw:0}:{x:0,z:-29.2,yaw:Math.PI};
            }
            state.game.player.worldPositions[destinationId]=arrival;
          }
          persist();render();toast(result.message,result.encounter?'warning':result.ok?'info':'warning');return result;
        },
        onFire:(targetNpc,actionInfo={})=>{
          if(state.game.activeEncounter){const result=playerAttack(state.game,{weaponId:actionInfo.weaponId,distance:actionInfo.distance});persist();render();toast(result.message,result.ok?'success':'warning');return;}
          if(!targetNpc){toast(actionInfo.mode==='knife'?'Подойди вплотную, чтобы достать противника ножом.':'Пока нет противника в секторе прицела.','info');return;}
          const faction=targetNpc.faction||'loner';
          if(faction===state.game.player.faction || (state.game.player.faction==='loner' && faction==='loner')){toast(`${targetNpc.name} не противник. Не стоит начинать перестрелку без причины.`,'warning');return;}
          const type=faction==='military'?'military':faction==='bandit'?'bandit':'stalker';
          if(beginEncounter(state.game,type)){
            Object.assign(state.game.activeEncounter,{name:targetNpc.name,icon:targetNpc.icon||state.game.activeEncounter.icon,appearance:targetNpc.appearance||state.game.activeEncounter.appearance,faction,weaponId:targetNpc.weaponId||state.game.activeEncounter.weaponId,npcId:targetNpc.id,worldPos:actionInfo.targetPosition?{x:actionInfo.targetPosition.x,z:actionInfo.targetPosition.z}:targetNpc?{x:actionInfo.position?.x??0,z:actionInfo.position?.z??0}:{x:actionInfo.position?.x??0,z:actionInfo.position?.z??0}});
            state.game.combatTargetNpcId=targetNpc.id;
            if(actionInfo.mode==='knife'&&Number.isFinite(actionInfo.distance)&&actionInfo.distance<=2.15){const result=playerAttack(state.game,{weaponId:'knife',distance:actionInfo.distance});persist();render();toast(result.message,result.ok?'success':'warning');return;}
            persist();render();toast(`${targetNpc.name} замечает тебя. Началась стычка.`,'danger');
          }
        },
        onReload:(weaponId)=>{const result=reloadWeapon(state.game,weaponId);if(result.ok)persist();return result;},
        onPunch:(targetNpc,distance,actionInfo={})=>{
          if(state.game.activeEncounter){const result=playerPunch(state.game,{distance});persist();render();toast(result.message,result.ok?'success':'warning');return result;}
          if(!targetNpc){toast('Для удара нужно подойти вплотную к противнику.','info');return {ok:false};}
          const faction=targetNpc.faction||'loner';
          if(faction===state.game.player.faction){toast(`${targetNpc.name} не противник.`,'warning');return {ok:false};}
          const type=faction==='military'?'military':faction==='bandit'?'bandit':'stalker';
          if(beginEncounter(state.game,type)){
            Object.assign(state.game.activeEncounter,{name:targetNpc.name,icon:targetNpc.icon||state.game.activeEncounter.icon,appearance:targetNpc.appearance||state.game.activeEncounter.appearance,faction,weaponId:targetNpc.weaponId||state.game.activeEncounter.weaponId,npcId:targetNpc.id,worldPos:actionInfo.targetPosition?{x:actionInfo.targetPosition.x,z:actionInfo.targetPosition.z}:targetNpc?{x:actionInfo.position?.x??0,z:actionInfo.position?.z??0}:{x:actionInfo.position?.x??0,z:actionInfo.position?.z??0}});
            state.game.combatTargetNpcId=targetNpc.id;
            const result=playerPunch(state.game,{distance});persist();render();toast(result.message,result.ok?'success':'warning');return result;
          }
          return {ok:false};
        },
        onBinoculars:(active)=>{
          const hasBinoculars=countItem(state.game.inventory,'binoculars')>0||state.game.equipmentSlots?.binoculars==='binoculars';
          if(active&&!hasBinoculars){toast('Нужен бинокль в инвентаре или слоте экипировки.','warning');return false;}
          state.game.player.binocularsActive=active;persist();return true;
        },
        onAimChange:(active)=>{state.game.player.isAiming=active;},
        onFlashlightToggle:(active)=>{state.game.player.flashlightActive=active;state.ui.flashlight=active;persist();},
        onPickup:(itemId)=>{
          const item=getItem(itemId);
          const result=addItem(state.game.inventory,itemId,1);
          if(!result.ok){toast(result.reason||'Не удалось подобрать предмет.','warning');return false;}
          persist();toast(`Подобрано: ${item?.name||itemId}.`,'success');return true;
        },
        onNotify:(message)=>toast(message,'info'),
        onCheckpoint:()=>persist()
      });
    }
  }
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
  for (let i=items.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [items[i],items[j]]=[items[j],items[i]]; }
  return items;
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
  const starterLooks=AVATAR_OPTIONS.filter(look=>look.faction==='loner'&&look.group!=='npc');
  const defaultLook=starterLooks[Math.floor(Math.random()*starterLooks.length)];
  state.draft = { name:'', birthDate:'', height:'', weight:'', personality:'', biography:'', notes:'', faction:'loner', avatar:defaultLook?.src||'', appearance:defaultLook?.appearance||'' };
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
    faction:faction.id, avatar:d.avatar || AVATAR_OPTIONS.find(look=>look.faction===faction.id&&look.group!=='npc')?.src || '', appearance:d.appearance || AVATAR_OPTIONS.find(look=>look.faction===faction.id&&look.group!=='npc')?.appearance || '', rank:faction.rank,
    spawnName:getLocation(faction.spawn)?.name || 'Кордон',
    stats:{ kills:0, artifacts:0, questsDone:0, distance:0 }, createdAt:Date.now(), game:null
  };
}

function finishLoadout() {
  const selected=state.loadout.selected || {};
  const factionId=state.pendingCharacter?.faction||state.draft?.faction||'loner';
  const factionGear=STARTER_LOADOUT_BY_FACTION[factionId]||STARTER_LOADOUT_BY_FACTION.loner;
  const selectedArmor=Object.entries(selected).filter(([id,qty])=>qty>0&&getItem(id)?.cat==='Броня');
  const selectedMasks=Object.entries(selected).filter(([id,qty])=>qty>0&&getItem(id)?.cat==='Защита');
  if (selectedArmor.length>1 || selectedMasks.length>1 || selectedArmor.some(([id])=>!factionGear.armor.includes(id)) || selectedMasks.some(([id])=>!factionGear.mask.includes(id))) {
    toast('Выбери не больше одной брони и одного противогаза, подходящих твоей группировке.','warning');
    return;
  }
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
  const equipmentSlots={primary1:null,primary2:null,pistol:null,knife:null,binoculars:null,bolt:null,armor:starterArmor?.id||null,mask:starterMask?.id||null,quick:[null,null,null,null]};
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
  ensureConditionState(game);
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
  if (game.mainStory?.stage==='meet-wolf' && !game.mainStory.noteShown) { game.mainStory.noteShown=true; state.ui.modal='story-note'; }
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
  const savedLook=AVATAR_OPTIONS.find(look=>look.faction===char.faction&&look.group!=='npc')||AVATAR_OPTIONS.find(look=>look.group!=='npc');
  char.avatar ||= savedLook?.src || '';
  char.appearance ||= savedLook?.appearance || '';
  state.activeCharacterId=id;
  state.game=char.game;
  ensureEquipmentSlots(state.game); // migrate older saves to the full weapon + utility + quick-use hotbar
  advanceGame(state.game,0);
  state.ui.tab='location';
  state.ui.pdaOpen=false;
  if (state.game.mainStory?.stage==='meet-wolf' && !state.game.mainStory.noteShown) { state.game.mainStory.noteShown=true; state.ui.modal='story-note'; }
  state.account.sessions=(state.account.sessions||0)+1;
  state.screen='game';
  persist();
  render();
}

function applyActionResult(result) {
  if (!result) return;
  if (result.action==='combat') soundEngine.play('danger');
  else if (result.action==='trade') soundEngine.play('trade');
  else if (result.action==='anomaly') soundEngine.play('anomaly');
  else if (result.action==='success') soundEngine.play('success');
  if (result.action==='map' || result.action==='tab-map') { state.ui.tab='map'; state.ui.pdaOpen=true; }
  else if (result.action==='inventory') { state.ui.modal='inventory-panel'; state.ui.pdaOpen=false; }
  else if (result.action==='quests') { state.ui.tab='quests'; state.ui.pdaOpen=true; }
  else if (result.action==='stats') { state.ui.tab='stats'; state.ui.pdaOpen=true; }
  else if (result.action==='sleep') state.ui.modal='sleep';
  else if (result.action==='artifact') state.ui.modal=null;
  else if (result.action==='dialogue') { state.ui.modal=null; state.game.dialogueNpcId=result.npcId; }
  else if (result.action==='nearby-people') { state.game.dialogueNpcId=null; state.ui.modal='nearby-people'; state.ui.pdaOpen=false; }
  else if (result.action==='trade') { state.ui.tradeNpcId=result.npcId; state.ui.modal='trade-panel'; state.ui.pdaOpen=false; }
  else if (result.action==='explore-find') state.ui.modal='explore-find';
  else if (result.action==='combat') state.ui.tab='location';
  if (result.message) toast(result.message, result.encounter?'warning':'info');
  persist();
  render();
}

root.addEventListener('click', (event) => {
  const button=event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  soundEngine.play('ui');
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
  if (action==='close-modal') { const previous=state.ui.modalReturn||null; state.ui.modal=state.ui.modal==='item-details'?'inventory-panel':previous; state.ui.modalReturn=null; state.ui.exploreSpotId=null; return render(); }
  if (action==='story-note-close') { state.ui.modal=null; persist(); return render(); }
  if (action==='close-dialogue') { state.game.dialogueNpcId=null; persist(); return render(); }
  if (action==='flashlight-toggle') { state.ui.flashlight=!state.ui.flashlight; if(state.game?.player)state.game.player.flashlightActive=state.ui.flashlight; persist(); return render(); }
  if (action==='generate-stalker-name') {
    state.draft ||= {name:'',faction:'loner'};
    state.draft.name=generateStalkerName();
    persist(); render(); toast(`Позывной: ${state.draft.name}`); return;
  }
  if (action==='close-sleep') { state.ui.modal=null; return render(); }
  if (action==='close-artifact') { state.game.artifactHunt=null; persist(); return render(); }
  if (action==='select-character') return selectCharacter(id);
  if (action==='delete-character') {
    if (!window.confirm('Удалить этого персонажа и его сохранение?')) return;
    state.characters=state.characters.filter(c=>c.id!==id);
    persist(); render(); toast('Персонаж удалён.'); return;
  }
  if (action==='open-avatars') { state.ui.editAvatar=false; state.ui.avatarPickMode='portrait'; state.ui.modal='avatars'; return render(); }
  if (action==='open-appearances') { state.ui.editAvatar=false; state.ui.avatarPickMode='appearance'; state.ui.modal='avatars'; return render(); }
  if (action==='profile-choose-avatar') { state.ui.editAvatar=true; state.ui.avatarPickMode='portrait'; state.ui.modal='avatars'; return render(); }
  if (action==='profile-choose-appearance') { state.ui.editAvatar=true; state.ui.avatarPickMode='appearance'; state.ui.modal='avatars'; return render(); }
  if (action==='choose-avatar') {
    if(state.ui.editAvatar){ const character=state.characters.find(entry=>entry.id===state.activeCharacterId); if(character) character.avatar=button.dataset.src; }
    else state.draft.avatar=button.dataset.src;
    state.ui.editAvatar=false; state.ui.modal=null; persist(); return render();
  }
  if (action==='choose-appearance') {
    if(state.ui.editAvatar){ const character=state.characters.find(entry=>entry.id===state.activeCharacterId); if(character) character.appearance=button.dataset.src; }
    else state.draft.appearance=button.dataset.src;
    state.ui.editAvatar=false; state.ui.modal=null; persist(); return render();
  }
  if (action==='reset-avatar') { state.draft.avatar=''; persist(); return render(); }
  if (action==='reset-appearance') { state.draft.appearance=''; persist(); return render(); }
  if (action==='loadout-add' || action==='loadout-remove') {
    const delta=action==='loadout-add'?1:-1;
    const selected=state.loadout.selected||{};
    const item=getItem(id);
    const factionId=state.pendingCharacter?.faction||state.draft?.faction||'loner';
    const factionGear=STARTER_LOADOUT_BY_FACTION[factionId]||STARTER_LOADOUT_BY_FACTION.loner;
    if (delta>0 && item?.cat==='Броня' && !factionGear.armor.includes(id)) { toast('Эта броня не подходит для стартового комплекта твоей группировки.','warning'); return; }
    if (delta>0 && item?.cat==='Защита' && !factionGear.mask.includes(id)) { toast('Этот противогаз не входит в стартовый комплект твоей группировки.','warning'); return; }
    if (delta>0 && item?.cat==='Броня' && (selected[id]||0)>=1) { toast('Можно взять только один комплект брони.','warning'); return; }
    if (delta>0 && item?.cat==='Защита' && (selected[id]||0)>=1) { toast('Можно взять только один противогаз.','warning'); return; }
    if (delta>0 && item?.cat==='Броня' && Object.entries(selected).some(([other,qty])=>qty>0&&getItem(other)?.cat==='Броня')) { toast('Сначала убери выбранную броню. В стартовый набор входит один комплект.','warning'); return; }
    if (delta>0 && item?.cat==='Защита' && Object.entries(selected).some(([other,qty])=>qty>0&&getItem(other)?.cat==='Защита')) { toast('Сначала убери выбранный противогаз. В стартовый набор входит один.','warning'); return; }
    const result=canFitLoadout(selected,id,delta,START_BUDGET);
    if (!result.ok) toast(result.reason,'warning');
    else state.loadout.selected=result.selected;
    persist(); render(); return;
  }
  if (action==='finish-loadout') return finishLoadout();
  if (action==='pda-toggle') { if(!state.ui.pdaOpen && state.game.activeEncounter){toast('Во время боя КПК недоступен. Сначала выберись из схватки.','warning');return;} state.ui.pdaOpen=!state.ui.pdaOpen; if(state.ui.pdaOpen && !['map','stats','player','messages','quests','contacts','encyclopedia','help'].includes(state.ui.tab)) state.ui.tab='map'; persist(); return render(); }
  if (action==='inventory-open') { ensureEquipmentSlots(state.game); state.ui.modal='inventory-panel'; state.ui.pdaOpen=false; persist(); return render(); }
  if (action==='item-details') { state.ui.itemDetailsId=id; state.ui.modal='item-details'; state.ui.modalReturn='inventory-panel'; return render(); }
  if (action==='artifact-belt-toggle') { const result=toggleArtifactBelt(state.game,id); persist(); render(); toast(result.message,result.ok?'success':'warning'); return; }
  if (action==='artifact-belt-remove') { const result=removeArtifactFromBelt(state.game,button.dataset.index); persist(); render(); toast(result.message,result.ok?'success':'warning'); return; }
  if (action==='belt-info') { toast('На поясе помещается до пяти разных артефактов. Нажми на артефакт в рюкзаке, чтобы закрепить или снять его.','info'); return; }
  if (action==='repair-open') {
    if (state.game.locationId!=='rookie-village' || state.game.currentAreaId!=='village-basement') { toast('Маслов принимает снаряжение только в подвале старого дома в Деревне новичков.','warning'); return; }
    state.ui.modalReturn=state.ui.modal==='item-details'?'item-details':null; state.ui.modal='repair-panel'; persist(); return render();
  }
  if (action==='repair-item') {
    if (state.game.locationId!=='rookie-village' || state.game.currentAreaId!=='village-basement') { toast('Для ремонта нужно вернуться к Маслову в подвал.','warning'); return; }
    const result=repairItemCondition(state.game,id); persist(); render(); toast(result.message,result.ok?'success':'warning'); return;
  }
  if (action==='story-action') {
    const result=mainStoryAction(state.game,id);
    if (result.ok && state.game.activeEncounter) { state.ui.tab='location'; state.ui.pdaOpen=false; state.ui.modal=null; }
    persist(); render(); toast(result.message,result.ok?'success':'warning'); return;
  }
  if (action==='personal-job-accept') { const result=acceptPersonalQuest(state.game,id); persist(); render(); toast(result.message,result.ok?'success':'warning'); return; }
  if (action==='personal-job-turnin') { const result=turnInPersonalQuest(state.game,id); persist(); render(); toast(result.message,result.ok?'success':'warning'); return; }

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
      else if(item.id==='binoculars') slot='binoculars';
      else if(item.id==='boltpack') slot='bolt';
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
      : slot==='binoculars' ? item.id==='binoculars'
      : slot==='bolt' ? item.id==='boltpack'
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
    if(slot==='binoculars') { toast('Бинокль поднят. Опиши, какую соседнюю локацию осмотреть.','info'); return; }
    if(slot==='bolt') { const result=state.game.activeEncounter?throwBoltInCombat(state.game):deactivateAnomaly(state.game); persist();render();toast(result.message||'Болт проверил направление.','info');return; }
    if(item.weapon&&item.weapon!=='grenade') { const result=selectWeapon(state.game,selected); persist(); render(); toast(result.message,result.ok?'success':'warning'); return; }
    if(item.use) { const result=state.game.activeEncounter?useItemInCombat(state.game,selected):useItem(state.game,selected); if(result.ok&&!state.game.activeEncounter) advanceGame(state.game,1); if(result.ok){state.game.consumptionAnimation={itemId:selected,until:Date.now()+1500};setTimeout(()=>{if(state.game?.consumptionAnimation?.itemId===selected){state.game.consumptionAnimation=null;persist();if(state.screen==='game')render();}},1550);} persist();render();toast(result.message,result.ok?'success':'warning');return; }
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
  if (action==='tab') { const allowed=['map','stats','player','messages','quests','contacts','encyclopedia','help']; if(!allowed.includes(tab)) return; state.ui.pdaOpen=true; state.ui.tab=tab; state.game.dialogueNpcId=null; state.ui.modal=null; persist(); return render(); }
  if (action==='contacts-open') { state.ui.pdaOpen=true; state.ui.tab='contacts'; state.game.dialogueNpcId=null; state.ui.modal=null; persist(); return render(); }
  if (action==='encyclopedia-category') { const allowed=['locations','people','anomalies','mutants','artifacts','equipment']; if(!allowed.includes(id)) return; state.ui.encyclopediaCategory=id; persist(); return render(); }
  if (action==='help-topic') { const allowed=['basics','commands','dialogue','trade','loot','combat','survival','pda']; if(!allowed.includes(id)) return; state.ui.helpTopic=id; persist(); return render(); }
  if (action==='tab-map') { state.ui.pdaOpen=true; state.ui.tab='map'; state.ui.mapView=state.ui.mapView||'map'; persist(); return render(); }
  if (action==='map-view') { const view=button.dataset.view; if(['map','places','tasks'].includes(view)){state.ui.mapView=view;persist();render();} return; }
  if (action==='inspect') { const text=describeLocation(state.game); addGameLog(text); render(); return; }
  if (action==='search') { advanceGame(state.game,10); const result=searchLocation(state.game); updateWeather(state.game); persist(); render(); toast(result.message,result.ok?'info':'warning'); return; }
  if (action==='scout') { const result=scoutLocation(state.game,id); toast(result.message,result.ok?'info':'warning'); return; }
  if (action==='travel') {
    const result=travelTo(state.game,id);
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
    if(result.ok && spotId!=='atp-first-floor-prisoners') state.ui.modal='loot-panel';
    else if(spotId==='atp-first-floor-prisoners') state.ui.modal=null;
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
    if (result.ok) { state.game.consumptionAnimation={itemId:id,until:Date.now()+1500}; setTimeout(()=>{ if(state.game?.consumptionAnimation?.itemId===id){state.game.consumptionAnimation=null;persist();if(state.screen==='game')render();}},1550); }
    persist(); render(); toast(result.message,result.ok?'success':'warning'); return;
  }
  if (action==='drop-item') {
    if (removeItem(state.game.inventory,id,1)) {
      if (state.game.artifactBelt) { let keep= countItem(state.game.inventory,id); state.game.artifactBelt=state.game.artifactBelt.map(value=>{ if(value!==id)return value; if(keep>0){keep--;return value;} return null; }); }
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
    if (result.ok) { state.ui.modal=null; state.game.dialogueNpcId=id; }
    persist(); render(); if (!result.ok) toast(result.message,'warning'); return;
  }
  if (action==='dialogue-topic') {
    const answer=replyNpc(state.game,id,button.dataset.topic);
    state.game.dialogueHistory ||= []; state.game.dialogueHistory.push({role:'npc',text:answer}); state.game.dialogueHistory=state.game.dialogueHistory.slice(-16);
    addGameLog(`${NPCS.find(n=>n.id===id)?.name||'Собеседник'}: ${answer}`);
    persist(); render(); return;
  }
  if (action==='quest-accept-generic') { const result=acceptWorldQuest(state.game,id); persist(); render(); toast(result.message,result.ok?'success':'warning'); return; }
  if (action==='pudel-quest-turnin') { const result=turnInPudelQuest(state.game); persist();render();toast(result.message,result.ok?'success':'warning');soundEngine.play(result.ok?'success':'ui');return; }
  if (action==='anomaly-quest-turnin') { const result=turnInSecretAnomalyQuest(state.game); persist();render();toast(result.message,result.ok?'success':'warning');soundEngine.play(result.ok?'success':'ui');return; }
  if (action==='atp-rescue-reward') { const result=claimAtpRescueReward(state.game); persist();render();toast(result.message,result.ok?'success':'warning');soundEngine.play(result.ok?'success':'ui');return; }
  if (action==='atp-rescue-start') { const result=beginAtpRescue(state.game); persist();render();toast(result.message,result.ok?'warning':'info');if(result.ok)soundEngine.play('danger');return; }
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
  if (action==='reset-all') { state.ui.modal='reset'; return render(); }
  if (action==='confirm-reset') { localStorage.removeItem('cordon-pda-save-v1'); state=createInitialState(); previousScreen='menu'; render(); toast('Прогресс сброшен.'); return; }
});

root.addEventListener('input', (event) => {
  if (event.target.name==='faction') { state.draft.faction=event.target.value; persist(); render(); return; }
  const field=event.target.dataset.field;
  if (field) {
    state.draft[field]=event.target.value;
    if (field==='faction') render();
    persist();
  }
  const setting=event.target.dataset.setting;
  if (setting==='reducedMotion') { state.settings.reducedMotion=event.target.checked; persist(); document.body.classList.toggle('reduced-motion', !!state.settings.reducedMotion); }
  if (setting==='uiScale') { state.settings.uiScale=Number(event.target.value)||1; document.documentElement.style.setProperty('--ui-scale',state.settings.uiScale); persist(); }
  if (setting==='soundVolume') { state.settings.soundVolume=Math.max(0,Math.min(1,Number(event.target.value)||0)); persist(); }
  if (setting==='npcAiEndpoint') { state.settings.npcAiEndpoint=String(event.target.value||'').trim(); persist(); }
});

root.addEventListener('change', async (event) => {
  if (event.target.name==='faction') { state.draft.faction=event.target.value; persist(); render(); return; }
  const field=event.target.dataset.field;
  if (field) {
    state.draft[field]=event.target.value;
    if (field==='faction') render();
    persist();
  }
  const setting=event.target.dataset.setting;
  if (setting==='reducedMotion') {
    state.settings.reducedMotion=event.target.checked;
    document.body.classList.toggle('reduced-motion', !!state.settings.reducedMotion);
    persist();
  }
  if (setting==='soundEnabled') { state.settings.soundEnabled=event.target.checked; persist(); if(event.target.checked)soundEngine.play('success'); }
  if (setting==='soundVolume') { state.settings.soundVolume=Math.max(0,Math.min(1,Number(event.target.value)||0)); persist(); }
  if (setting==='npcAiEndpoint') { state.settings.npcAiEndpoint=String(event.target.value||'').trim(); persist(); }
  if (setting==='controlScheme') { state.settings.controlScheme=['auto','pc','mobile'].includes(event.target.value)?event.target.value:'auto'; persist(); render(); toast('Схема управления обновлена.'); return; }
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
  if (event.target.id==='appearance-upload' && event.target.files?.[0]) {
    try { const dataUrl=await resizeImage(event.target.files[0]); state.draft.appearance=dataUrl; persist(); render(); toast('Внешность добавлена.'); }
    catch { toast('Не удалось загрузить изображение внешности.','warning'); }
  }
  if (event.target.id==='profile-appearance-upload' && event.target.files?.[0]) {
    try { const dataUrl=await resizeImage(event.target.files[0]); const character=state.characters.find(entry=>entry.id===state.activeCharacterId); if(character){character.appearance=dataUrl;persist();render();toast('Внешность персонажа обновлена.');} }
    catch { toast('Не удалось загрузить изображение внешности.','warning'); }
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

let npcAiTurnSerial=0;
root.addEventListener('submit', async (event) => {
  if (event.target.id==='npc-dialogue-form') {
    event.preventDefault();
    const npcId=state.game?.dialogueNpcId;
    const text=String(new FormData(event.target).get('message')||'').trim();
    if (!npcId || !text) return;
    const gameAtSubmit=state.game;
    const result=replyNpcFreeText(gameAtSubmit,npcId,text);
    if (result.action==='trade') {
      state.ui.tradeNpcId=npcId;
      state.ui.modal='trade-panel';
      state.ui.pdaOpen=false;
      persist(); render(); toast(result.message,'info');
      return;
    }
    persist(); render(); toast(result.message,result.ok?'info':'warning');

    // External generation is optional. Keep local gameplay actions and route facts authoritative.
    const endpoint=String(state.settings.npcAiEndpoint||'').trim();
    const isTransactional=/(торгов|купить|продать|обмен|бартер|работ|задан|квест|поруч|принять|сдать|перемест|открой|включи|обыщи|забери|перезаряд)/i.test(text);
    if (result.ok && endpoint && isValidNpcAiEndpoint(endpoint) && !isTransactional && !isRouteQuestion(text)) {
      const npc=NPCS.find(entry=>entry.id===npcId)
        || (gameAtSubmit.ambientNpcs||[]).find(entry=>entry.id===npcId)
        || (gameAtSubmit.randomTraders||[]).find(entry=>entry.id===npcId)
        || (gameAtSubmit.squads||[]).find(entry=>entry.id===npcId);
      if (npc) {
        const turn=++npcAiTurnSerial;
        gameAtSubmit.dialogueAiPending=true;
        render();
        const aiGame={...gameAtSubmit,dialogueHistory:(gameAtSubmit.dialogueHistory||[]).slice(0,-2)};
        const aiResult=await requestNpcAiReply({endpoint,game:aiGame,npc,playerMessage:text});
        if (turn===npcAiTurnSerial && state.game===gameAtSubmit) {
          gameAtSubmit.dialogueAiPending=false;
          if (aiResult.ok && gameAtSubmit.dialogueNpcId===npcId) {
            const history=gameAtSubmit.dialogueHistory||[];
            for (let index=history.length-1;index>=0;index--) {
              if (history[index].role==='npc') { history[index].text=aiResult.reply; break; }
            }
            gameAtSubmit.dialogueReply=aiResult.reply;
            if (gameAtSubmit.dialogueContexts?.[npcId]) gameAtSubmit.dialogueContexts[npcId].lastNpcText=aiResult.reply;
            if (Array.isArray(gameAtSubmit.log) && gameAtSubmit.log.length) {
              const last=gameAtSubmit.log.at(-1);
              if (last?.text?.startsWith(`${npc.name}:`)) last.text=`${npc.name}: ${aiResult.reply}`;
            }
            persist(); render();
          } else {
            persist(); render();
            if (aiResult.reason!=='endpoint-invalid') toast('Внешний ИИ не ответил — оставлен локальный ответ NPC.','warning');
          }
        }
      }
    }
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
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=3600').catch(()=>{}));
}
render();
