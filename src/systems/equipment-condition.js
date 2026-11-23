import { getItem, countItem } from './inventory.js';

export function ensureConditionState(game) {
  if (!game) return {};
  game.itemCondition ||= {};
  game.artifactBelt ||= [null, null, null, null, null];
  for (const stack of game.inventory || []) {
    const item = getItem(stack.id);
    if (item && (item.weapon || item.armor || item.cat === 'Защита')) {
      if (!Number.isFinite(game.itemCondition[item.id])) game.itemCondition[item.id] = 100;
    }
  }
  return game.itemCondition;
}

export function getItemCondition(game, itemId) {
  if (!game) return 100;
  ensureConditionState(game);
  return Math.max(0, Math.min(100, Number(game.itemCondition?.[itemId] ?? 100)));
}

export function damageItemCondition(game, itemId, amount=1) {
  if (!itemId) return 100;
  ensureConditionState(game);
  const before = getItemCondition(game, itemId);
  const after = Math.max(0, before - Math.max(0, Number(amount) || 0));
  game.itemCondition[itemId] = Math.round(after * 10) / 10;
  return game.itemCondition[itemId];
}

export function getRepairCost(game, itemId) {
  const item = getItem(itemId);
  if (!item) return 0;
  const condition = getItemCondition(game, itemId);
  if (condition >= 99.9) return 0;
  const base = Math.max(25, Math.ceil((item.price || 100) * (100 - condition) / 100 * .42));
  const reputation = Math.max(0, Number(game.player?.reputation) || 0);
  const discount = Math.min(.2, Math.floor(reputation / 10) * .02);
  return Math.max(1, Math.ceil(base * (1 - discount)));
}

export function repairItemCondition(game, itemId) {
  const item = getItem(itemId);
  if (!item || !(item.weapon || item.armor || item.cat === 'Защита')) return { ok:false, message:'Маслов чинит только оружие, броню и противогазы.' };
  if (!(game.inventory || []).some(stack => stack.id === itemId && stack.qty > 0)) return { ok:false, message:'Этого предмета нет в рюкзаке.' };
  const condition = getItemCondition(game, itemId);
  if (condition >= 99.9) return { ok:false, message:'Предмет и так в отличном состоянии.' };
  const price = getRepairCost(game, itemId);
  if ((game.money || 0) < price) return { ok:false, message:`На ремонт нужно ${price} Купонов.` };
  game.money -= price;
  game.itemCondition[itemId] = 100;
  return { ok:true, message:`Маслов восстановил ${item.name} до 100%. Оплачено ${price} Купонов.`, price };
}

export function toggleArtifactBelt(game, itemId) {
  const item = getItem(itemId);
  if (!item || item.cat !== 'Артефакты') return { ok:false, message:'На пояс можно закрепить только артефакты.' };
  game.artifactBelt ||= [null, null, null, null, null];
  const equippedCount = game.artifactBelt.filter(id => id === itemId).length;
  const carriedCount = countItem(game.inventory, itemId);
  if (carriedCount <= 0) return { ok:false, message:'Артефакт отсутствует в рюкзаке.' };
  if (equippedCount >= carriedCount) {
    const existing = game.artifactBelt.lastIndexOf(itemId);
    if (existing >= 0) game.artifactBelt[existing] = null;
    return { ok:true, message:`${item.name} снят с пояса.` };
  }
  const empty = game.artifactBelt.findIndex(slot => !slot);
  if (empty < 0) return { ok:false, message:'На поясе уже закреплено пять артефактов.' };
  game.artifactBelt[empty] = itemId;
  return { ok:true, message:`${item.name} закреплён на поясе (${equippedCount + 1}/${carriedCount}).` };
}

export function removeArtifactFromBelt(game, index) {
  game.artifactBelt ||= [null,null,null,null,null];
  const slot = Math.max(0, Math.min(4, Math.floor(Number(index) || 0)));
  const itemId = game.artifactBelt[slot];
  if (!itemId) return {ok:false,message:'Это место на поясе пустое.'};
  game.artifactBelt[slot] = null;
  return {ok:true,message:`${getItem(itemId)?.name || 'Артефакт'} снят с пояса.`};
}
