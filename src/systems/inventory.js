import { ITEMS, MAX_CARRY_KG, STARTER_ITEM_IDS } from '../data/catalog.js';

export const getItem = (id) => ITEMS.find(item => item.id === id);

export function getWeight(inventory = []) {
  return inventory.reduce((sum, stack) => sum + (getItem(stack.id)?.weight || 0) * stack.qty, 0);
}

export function getInventoryCost(selected = {}) {
  return Object.entries(selected).reduce((sum, [id, qty]) => sum + (getItem(id)?.price || 0) * qty, 0);
}

export function getLoadoutWeight(selected = {}) {
  return Object.entries(selected).reduce((sum, [id, qty]) => sum + (getItem(id)?.weight || 0) * qty, 0);
}

export function addItem(inventory, id, qty = 1) {
  const item = getItem(id);
  if (!item || qty <= 0) return { ok:false, reason:'Предмет не найден.' };
  const current = getWeight(inventory);
  if (current + item.weight * qty > MAX_CARRY_KG) return { ok:false, reason:`Лимит переносимого веса — ${MAX_CARRY_KG} кг.` };
  const stack = inventory.find(entry => entry.id === id);
  if (stack) stack.qty += qty;
  else inventory.push({ id, qty, uid:`${id}-${Date.now()}-${Math.random().toString(16).slice(2,6)}` });
  return { ok:true };
}

export function removeItem(inventory, id, qty = 1) {
  const stack = inventory.find(entry => entry.id === id);
  if (!stack || qty <= 0) return false;
  stack.qty -= qty;
  if (stack.qty <= 0) inventory.splice(inventory.indexOf(stack), 1);
  return true;
}


// Move items between the player's backpack and a loot container. The backpack
// keeps its normal weight limit; stashes and corpses have no artificial cap.
export function transferItem(source, destination, id, qty = 1, destinationIsPlayer = false) {
  const sourceStack = source.find(entry => entry.id === id);
  const item = getItem(id);
  if (!sourceStack || !item || qty <= 0) return { ok:false, reason:'Предмет больше недоступен.' };
  const amount = Math.min(sourceStack.qty, Math.floor(qty));
  if (destinationIsPlayer && getWeight(destination) + item.weight * amount > MAX_CARRY_KG) {
    return { ok:false, reason:`Не хватает места: лимит рюкзака — ${MAX_CARRY_KG} кг.` };
  }
  const targetStack = destination.find(entry => entry.id === id);
  if (targetStack) targetStack.qty += amount;
  else destination.push({ id, qty:amount, uid:`${id}-${Date.now()}-${Math.random().toString(16).slice(2,6)}` });
  sourceStack.qty -= amount;
  if (sourceStack.qty <= 0) source.splice(source.indexOf(sourceStack), 1);
  return { ok:true, qty:amount };
}


const AMMO_CAPACITY = { shells:8, ammo545:30, ammo9x18:12, ammo9x19:12 };
let dropSequence = 0;

/** Drop one inventory unit at the player's current continuous-world position. */
export function dropItemToWorld(game, id) {
  const item = getItem(id);
  const stack = game?.inventory?.find(entry => entry.id === id);
  if (!item || !stack || stack.qty <= 0) return { ok:false, reason:'Предмет отсутствует в рюкзаке.' };
  if (!game.player) return { ok:false, reason:'Не удалось определить персонажа.' };
  const position = game.player.cordonPosition || { x:0, z:0, yaw:0 };
  const yaw = Number.isFinite(position.yaw) ? position.yaw : 0;
  const ammoRounds = AMMO_CAPACITY[id] ? Math.min(AMMO_CAPACITY[id], Math.max(0, Number(game.ammoRounds?.[id] ?? countItem(game.inventory,id)*AMMO_CAPACITY[id]))) : 0;
  const bolts = id === 'boltpack' ? Math.min(10, Math.max(0, Number(game.boltsRemaining ?? 10))) : 0;
  const dropped = {
    uid:`drop-${Date.now()}-${(++dropSequence).toString(36)}`, id, qty:1,
    x:Number(position.x) + Math.sin(yaw) * .9,
    z:Number(position.z) - Math.cos(yaw) * .9,
    locationId:game.locationId || 'rookie-village',
    droppedAt:game.clock?.worldMinutes || 0,
    ...(ammoRounds ? { ammoRounds } : {}),
    ...(bolts ? { bolts } : {})
  };
  if (!removeItem(game.inventory, id, 1)) return { ok:false, reason:'Не удалось выбросить предмет.' };
  game.player.droppedItems ||= [];
  game.player.droppedItems.push(dropped);
  if (AMMO_CAPACITY[id]) { game.ammoRounds ||= {}; game.ammoRounds[id] = Math.max(0, Number(game.ammoRounds[id] ?? ammoRounds) - ammoRounds); }
  if (id === 'boltpack') game.boltsRemaining = Math.max(0, Number(game.boltsRemaining ?? bolts) - bolts);
  const stillHasItem = countItem(game.inventory, id) > 0;
  if (!stillHasItem) {
    const slots = game.equipmentSlots;
    if (slots) {
      for (const key of ['primary1','primary2','pistol','knife','binoculars','bolt','armor','mask']) if (slots[key] === id) slots[key] = null;
      if (Array.isArray(slots.quick)) slots.quick = slots.quick.map(value => value === id ? null : value);
    }
    if (game.player.armorId === id) { game.player.armorId = null; game.player.armor = 0; }
    if (game.player.maskId === id) game.player.maskId = null;
    if (game.equippedWeaponId === id) game.equippedWeaponId = null;
    if (Array.isArray(game.artifactBelt)) game.artifactBelt = game.artifactBelt.map(value => value === id ? null : value);
  } else if (Array.isArray(game.artifactBelt)) {
    let available = countItem(game.inventory, id);
    game.artifactBelt = game.artifactBelt.map(value => { if (value !== id) return value; if (available > 0) { available--; return value; } return null; });
  }
  return { ok:true, dropped, item };
}

/** Restore a previously dropped world item to the player's backpack. */
export function pickupDroppedItem(game, uid) {
  const drops = game?.player?.droppedItems;
  const index = Array.isArray(drops) ? drops.findIndex(entry => entry.uid === uid) : -1;
  if (index < 0) return { ok:false, reason:'Предмет уже подобрали или он больше не найден.' };
  const dropped = drops[index];
  const result = addItem(game.inventory, dropped.id, dropped.qty || 1);
  if (!result.ok) return result;
  if (dropped.ammoRounds) { game.ammoRounds ||= {}; game.ammoRounds[dropped.id] = Math.max(0, Number(game.ammoRounds[dropped.id] || 0)) + dropped.ammoRounds; }
  if (dropped.bolts) game.boltsRemaining = Math.max(0, Number(game.boltsRemaining || 0)) + dropped.bolts;
  drops.splice(index, 1);
  return { ok:true, item:getItem(dropped.id), qty:dropped.qty || 1 };
}

export function countItem(inventory, id) {
  return inventory.find(entry => entry.id === id)?.qty || 0;
}

export function canFitLoadout(selected, id, delta, budget) {
  const item = getItem(id);
  if (!item) return { ok:false, reason:'Неизвестный предмет.' };
  if (delta > 0 && !STARTER_ITEM_IDS.includes(id)) return { ok:false, reason:'Этот предмет нельзя взять в стартовую подборку. Его можно найти в Зоне или приобрести у подходящего торговца.' };
  const nextQty = (selected[id] || 0) + delta;
  const firearmTypes=['pistol','rifle','shotgun','smg'];
  const isFirearm=firearmTypes.includes(item.weapon);
  const maxQty = item.cat === 'Броня' || item.cat === 'Защита' || item.weapon ? 1 : ['Боеприпасы','Медицина'].includes(item.cat) ? 2 : item.cat === 'Еда' ? 3 : 2;
  if (delta > 0 && nextQty > maxQty) return { ok:false, reason:`Для старта можно взять не больше ${maxQty} шт. этого предмета.` };
  if (delta > 0 && ['Броня','Защита'].includes(item.cat) && Object.entries(selected).some(([other,qty])=>qty>0&&other!==id&&getItem(other)?.cat===item.cat)) {
    return { ok:false, reason:item.cat==='Броня'?'Можно выбрать только один комплект брони.':'Можно выбрать только один противогаз.' };
  }
  if (delta > 0 && isFirearm && Object.entries(selected).some(([other,qty])=>qty>0&&other!==id&&firearmTypes.includes(getItem(other)?.weapon))) {
    return { ok:false, reason:'На старте можно выбрать только один огнестрельный ствол. Остальное снаряжение можно докупить позже.' };
  }
  if (nextQty < 0) return { ok:false, reason:'Количество не может быть отрицательным.' };
  const next = { ...selected };
  if (nextQty === 0) delete next[id]; else next[id] = nextQty;
  const cost = getInventoryCost(next);
  const weight = getLoadoutWeight(next);
  if (cost > budget) return { ok:false, reason:'Не хватает денег.' };
  if (weight > MAX_CARRY_KG) return { ok:false, reason:`Превышен лимит ${MAX_CARRY_KG} кг.` };
  return { ok:true, selected:next, cost, weight };
}

export function useItem(game, id) {
  const item = getItem(id);
  if (id==='vodka') return { ok:false, message:'Этот предмет не используется персонажем. Его можно оставить в рюкзаке или обменять у торговца.' };
  if (!item?.use || !countItem(game.inventory, id)) return { ok:false, message:'Этот предмет нельзя использовать сейчас.' };
  const result = { ok:true, message:`Использовано: ${item.name}.` };
  if (item.use === 'heal') {
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + item.restore);
    result.message = `Ты обработал раны. Здоровье: ${game.player.hp}/${game.player.maxHp}.`;
  } else if (item.use === 'antirad') {
    game.player.radiation = Math.max(0, game.player.radiation - item.restore);
    result.message = `Радиационный фон снизился. Текущий уровень: ${game.player.radiation}%.`;
  } else if (item.use === 'food') {
    game.player.hunger = Math.max(0, game.player.hunger - item.restore);
    result.message = `Ты перекусил. Голод: ${game.player.hunger}%.`;
  } else if (item.use === 'water') {
    game.player.thirst = Math.max(0, game.player.thirst - item.restore);
    result.message = `Ты сделал несколько глотков. Жажда: ${game.player.thirst}%.`;
  } else if (item.use === 'energy') {
    game.player.stamina = Math.min(100, game.player.stamina + item.restore);
    game.player.thirst = Math.min(100, game.player.thirst + 4);
    result.message = `Энергетик немного взбодрил тебя.`;
  }
  removeItem(game.inventory, id, 1);
  return result;
}
