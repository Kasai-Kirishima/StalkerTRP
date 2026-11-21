import { getItem, countItem, removeItem, addItem } from './inventory.js';
import { LOCATIONS } from '../data/catalog.js';
import { addLog } from './world.js';
import { advanceGame } from './world.js';

const weapons = ['gaduka','pm','vm17','sawedoff','knife','rgd5'];

export function getBestWeapon(inventory, game=null) {
  const capacity = (ammo) => ammo === 'shells' ? 8 : 12;
  const found = weapons.map(id => ({ item:getItem(id), count:countItem(inventory,id) })).filter(entry => entry.count > 0 && entry.item && (!entry.item.ammo || (game?.ammoRounds?.[entry.item.ammo] ?? countItem(inventory,entry.item.ammo)*capacity(entry.item.ammo)) > 0));
  found.sort((a,b) => (b.item.damage || 0) - (a.item.damage || 0));
  return found[0]?.item || null;
}

export function beginEncounter(game, type='blind-dog') {
  if (game.activeEncounter) return false;
  const name = type === 'military' ? 'Военнослужащий' : type === 'bandit' ? 'Бандит' : type === 'flesh' ? 'Плоть' : 'Слепой пёс';
  const hp = type === 'military' ? 82 : type === 'bandit' ? 70 : type === 'flesh' ? 76 : 55;
  const damage = type === 'military' ? 12 : type === 'bandit' ? 10 : type === 'flesh' ? 13 : 9;
  const image = type === 'flesh' ? 'https://media.moddb.com/images/downloads/1/244/243669/flesh.jpg' : '';
  game.activeEncounter = { type, name, hp, maxHp:hp, damage, count:1, imageIndex:0, image };
  return true;
}

export function playerAttack(game) {
  const enemy = game.activeEncounter;
  if (!enemy) return { ok:false, message:'Сейчас никто не угрожает.' };
  const weapon = getBestWeapon(game.inventory,game);
  if (!weapon) return { ok:false, message:'У тебя нет подходящего оружия. Можно попытаться отступить.' };
  if (weapon.ammo) {
    const capacity = weapon.ammo === 'shells' ? 8 : 12;
    game.ammoRounds ??= {};
    game.ammoRounds[weapon.ammo] ??= countItem(game.inventory,weapon.ammo) * capacity;
    if (game.ammoRounds[weapon.ammo] <= 0 || !countItem(game.inventory,weapon.ammo)) return { ok:false, message:`Нет боеприпасов для ${weapon.name}.` };
    game.ammoRounds[weapon.ammo] -= 1;
    const boxesLeft = Math.ceil(game.ammoRounds[weapon.ammo] / capacity);
    const boxesNow = countItem(game.inventory,weapon.ammo);
    if (boxesNow > boxesLeft) removeItem(game.inventory,weapon.ammo,boxesNow-boxesLeft);
  }
  if (weapon.id === 'rgd5') removeItem(game.inventory, 'rgd5', 1);
  const damage = Math.max(4, weapon.damage + Math.floor(Math.random()*9) - 4);
  enemy.hp = Math.max(0, enemy.hp - damage);
  advanceGame(game, 2);
  let message = `Ты используешь ${weapon.name}. Противник получает ${damage} урона.`;
  if (enemy.hp <= 0) {
    const reward = 40 + Math.floor(Math.random()*80);
    game.money += reward;
    game.player.kills += 1;
    game.player.rating += 2;
    game.player.reputation += 2;
    game.activeEncounter = null;
    message += ` Угроза устранена. Найдено ${reward} RU.`;
    if (enemy.type==='blind-dog' && Math.random()<.72) {
      const trophy=addItem(game.inventory,'tail',1);
      message += trophy.ok ? ' Среди останков найден хвост слепого пса.' : ' Среди останков найден хвост слепого пса, но рюкзак перегружен.';
    }
    if (enemy.type==='flesh' && Math.random()<.48) {
      const trophy=addItem(game.inventory,'flesh-eye',1);
      message += trophy.ok ? ' Среди останков найден «Глаз плоти».' : ' Среди останков найден «Глаз плоти», но рюкзак перегружен.';
    }
    addLog(game, message);
    return { ok:true, finished:true, message };
  }
  const armor = Math.min(12, game.player.armor || 0);
  const received = Math.max(1, enemy.damage - Math.floor(armor / 5));
  game.player.hp = Math.max(0, game.player.hp - received);
  game.player.stamina = Math.max(0, game.player.stamina - 8);
  message += ` В ответ противник наносит ${received} урона.`;
  if (game.player.hp <= 0) {
    game.player.hp = 1;
    game.money = Math.max(0, game.money - 100);
    game.locationId = 'rookie-village';
    game.activeEncounter = null;
    message += ' Ты потерял сознание. Очнулся в деревне новичков, часть денег пропала.';
  }
  addLog(game, message, 'danger');
  return { ok:true, message };
}

export function defend(game) {
  const enemy = game.activeEncounter;
  if (!enemy) return { ok:false, message:'Сейчас никто не угрожает.' };
  advanceGame(game, 1);
  const received = Math.max(1, Math.floor(enemy.damage * .35));
  game.player.hp = Math.max(1, game.player.hp - received);
  game.player.stamina = Math.max(0, game.player.stamina - 4);
  const message = `Ты укрылся за ближайшим препятствием и принял удар на защиту. Получено ${received} урона.`;
  addLog(game, message, 'danger');
  return { ok:true, message };
}

export function flee(game) {
  if (!game.activeEncounter) return { ok:false, message:'Убегать не от кого.' };
  const enemy = game.activeEncounter;
  const success = Math.random() < .62;
  advanceGame(game, 8);
  if (success) {
    game.activeEncounter = null;
    const location = game.locationId;
    const options = (awaitlessNeighbors(location));
    if (options.length) game.locationId = options[Math.floor(Math.random()*options.length)];
    const message = 'Тебе удалось оторваться от противника и скрыться за ближайшими укрытиями.';
    addLog(game, message);
    return { ok:true, message };
  }
  const received = Math.max(2, Math.floor(enemy.damage * .7));
  game.player.hp = Math.max(1, game.player.hp - received);
  const message = `Противник не даёт уйти и задевает тебя. Получено ${received} урона.`;
  addLog(game, message, 'danger');
  return { ok:false, message };
}

function awaitlessNeighbors(locationId) {
  return LOCATIONS.find(location=>location.id===locationId)?.neighbors || [];
}
