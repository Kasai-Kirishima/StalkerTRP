import { getItem, countItem, removeItem, addItem, useItem } from './inventory.js';
import { LOCATIONS, NPC_APPEARANCES, ASSETS } from '../data/catalog.js';
import { addLog, advanceGame, registerCorpseLoot, advanceAtpRescue } from './world.js';
import { rememberEntity } from './russian-language.js';

const weapons = ['aksu','gaduka','pm','vm17','sawedoff','knife'];
const magazineSize = ammo => ammo==='shells'?2:ammo==='ammo545'?30:ammo==='ammo9x19'?30:ammo==='ammo9x18'?8:0;
const ammoCapacity = ammo => ammo==='shells'?8:ammo==='ammo545'?30:12;

function ensureMagazine(game, weapon) {
  if (!weapon?.ammo) return 0;
  game.weaponMagazines ||= {}; game.ammoRounds ||= {};
  if (!Number.isFinite(game.weaponMagazines[weapon.id])) {
    const total=Math.max(0,Number(game.ammoRounds[weapon.ammo] ?? countItem(game.inventory,weapon.ammo)*ammoCapacity(weapon.ammo))||0);
    const loaded=Math.min(magazineSize(weapon.ammo),total);
    game.weaponMagazines[weapon.id]=loaded; game.ammoRounds[weapon.ammo]=Math.max(0,total-loaded);
  }
  return game.weaponMagazines[weapon.id];
}
function syncAmmoStack(game, ammo) {
  const loaded=weapons.map(id=>getItem(id)).filter(item=>item?.ammo===ammo).reduce((sum,item)=>sum+(game.weaponMagazines?.[item.id]||0),0);
  const total=Math.max(0,(game.ammoRounds?.[ammo]||0)+loaded);
  const boxes=Math.ceil(total/ammoCapacity(ammo)); const current=countItem(game.inventory,ammo);
  if (boxes>current) addItem(game.inventory,ammo,boxes-current); else if (current>boxes) removeItem(game.inventory,ammo,current-boxes);
}

export function getBestWeapon(inventory, game=null) {
  const available = id => {
    const item=getItem(id);
    if (!item || countItem(inventory,id)<=0) return false;
    if (!item.ammo) return true;
    if (!game) return countItem(inventory,item.ammo)>0;
    return ensureMagazine(game,item)>0 || (game.ammoRounds?.[item.ammo]||0)>0;
  };
  if (game?.equippedWeaponId && available(game.equippedWeaponId)) return getItem(game.equippedWeaponId);
  const found=weapons.filter(available).map(id=>getItem(id));
  found.sort((a,b)=>(b.damage||0)-(a.damage||0));
  return found[0]||null;
}

export function selectWeapon(game, weaponId) {
  const item=getItem(weaponId);
  if (!item || !item.weapon || item.weapon==='grenade' || !countItem(game.inventory,weaponId)) return {ok:false,message:'Этого оружия нет в рюкзаке.'};
  game.equippedWeaponId=weaponId;
  if (item.ammo) ensureMagazine(game,item);
  addLog(game,`В руках теперь ${item.name}.`,'player');
  return {ok:true,message:`Выбрано оружие: ${item.name}.`};
}

function enemyReply(game, enemy, multiplier=1, lead='') {
  if (!enemy || !game.activeEncounter) return {ok:true,message:lead||'Противник больше не представляет угрозы.'};
  const armor=Math.min(20,game.player.armor||0);
  const received=Math.max(1,Math.round((enemy.damage-Math.floor(armor/5))*multiplier));
  game.player.hp=Math.max(1,game.player.hp-received);
  game.player.stamina=Math.max(0,game.player.stamina-3);
  const message=`${lead?lead+' ':''}${enemy.name} отвечает атакой. Ты получаешь ${received} урона.`;
  advanceGame(game,1); addLog(game,message,'danger');
  return {ok:true,message};
}

export function reloadWeapon(game) {
  const weapon=getBestWeapon(game.inventory,game);
  if (!weapon?.ammo) return {ok:false,message:'Выбранное оружие не требует перезарядки.'};
  const loaded=ensureMagazine(game,weapon); const size=magazineSize(weapon.ammo); const reserve=game.ammoRounds?.[weapon.ammo]||0;
  if (loaded>=size) return {ok:false,message:'Магазин уже полон.'};
  if (reserve<=0) return {ok:false,message:'Запасных патронов нет. Нужно найти или купить боеприпасы.'};
  const amount=Math.min(size-loaded,reserve);
  game.weaponMagazines[weapon.id]=loaded+amount; game.ammoRounds[weapon.ammo]=reserve-amount; syncAmmoStack(game,weapon.ammo);
  game.combatEffect={type:'reload',until:(game.clock.worldMinutes||0)+3};
  advanceGame(game,2);
  const msg=`Ты перезарядил ${weapon.name}: ${game.weaponMagazines[weapon.id]}/${size} в магазине. Перезарядка заняла около двух минут.`;
  addLog(game,msg,'player');
  if (game.activeEncounter) return enemyReply(game,game.activeEncounter,.6,msg);
  return {ok:true,message:msg};
}

export function aimWeapon(game) {
  if (!game.activeEncounter) return {ok:false,message:'Сейчас не по кому целиться.'};
  game.player.aimed=true; game.player.aimedUntil=(game.clock.worldMinutes||0)+3;
  game.combatEffect={type:'aim',until:(game.clock.worldMinutes||0)+2};
  const msg='Ты выбираешь момент, выравниваешь прицел и ждёшь, пока противник откроется.';
  addLog(game,msg,'player');
  return enemyReply(game,game.activeEncounter,.35,msg);
}

export function dodge(game) {
  const enemy=game.activeEncounter;
  if (!enemy) return {ok:false,message:'Уклоняться сейчас не от кого.'};
  if ((game.player.stamina||0)<8) return {ok:false,message:'Не хватает выносливости для резкого рывка.'};
  game.player.stamina-=8; game.combatEffect={type:'dodge',until:(game.clock.worldMinutes||0)+2}; const msg='Ты резко уходишь в сторону и используешь ближайшее укрытие.';
  advanceGame(game,1); const received=Math.max(1,Math.floor(enemy.damage*.25)); game.player.hp=Math.max(1,game.player.hp-received);
  addLog(game,`${msg} Противник задел тебя вскользь: -${received} здоровья.`,'danger');
  return {ok:true,message:`${msg} Получено всего ${received} урона.`};
}

export function throwGrenade(game) {
  const enemy=game.activeEncounter;
  if (!enemy) return {ok:false,message:'Гранату сейчас некуда бросать.'};
  if (!countItem(game.inventory,'rgd5')) return {ok:false,message:'В рюкзаке нет РГД-5.'};
  removeItem(game.inventory,'rgd5',1); game.combatEffect={type:'grenade',until:(game.clock.worldMinutes||0)+3}; const damage=42+Math.floor(Math.random()*17); enemy.hp=Math.max(0,enemy.hp-damage); advanceGame(game,2);
  let message=`Ты бросаешь РГД-5. Взрыв наносит ${damage} урона.`;
  if (enemy.hp<=0) { const reward=40+Math.floor(Math.random()*80); game.money+=reward; game.player.kills+=1; game.player.rating+=2; game.player.reputation+=2; if(enemy.type==='blind-dog'&&Math.random()<.72)addItem(game.inventory,'tail',1); if(enemy.type==='flesh'&&Math.random()<.48)addItem(game.inventory,'flesh-eye',1); if(enemy.atpAssault){game.activeEncounter=null;advanceAtpRescue(game);} else if(enemy.wolfDogPack&&game.wolfDogQuest?.status==='active'){game.wolfDogQuest.killed=Math.min(game.wolfDogQuest.total||5,(game.wolfDogQuest.killed||0)+1);const quest=game.quests?.find(entry=>entry.id==='wolf-dog-pack');if(quest)quest.progress=game.wolfDogQuest.killed;const remain=(game.wolfDogQuest.total||5)-game.wolfDogQuest.killed;if(remain>0){game.activeEncounter={type:'blind-dog',name:'Слепой пёс',hp:55,maxHp:55,damage:8+Math.floor(Math.random()*5),count:1,imageIndex:0,image:'',wolfDogPack:true,packIndex:game.wolfDogQuest.killed+1};message+=` Уничтожено ${game.wolfDogQuest.killed}/5. Выбегает следующая собака.`;}else{game.wolfDogQuest.status='ready';if(quest)quest.status='ready';}} else game.activeEncounter=null; message+=` Противник повержен. Найдено ${reward} Купонов.`; }
  else { const reply=enemyReply(game,enemy,.5); message+=` ${reply.message}`; }
  if (enemy.hp<=0 && !game.activeEncounter) registerCorpseLoot(game,enemy);
  addLog(game,message,enemy.hp>0?'danger':'system'); return {ok:true,message};
}

export function throwBoltInCombat(game) {
  const enemy=game.activeEncounter;
  if (!enemy) return {ok:false,message:'Бросать болт имеет смысл возле аномалии, а не в бою.'};
  game.boltsRemaining ??= countItem(game.inventory,'boltpack')*10;
  if (game.boltsRemaining<=0) return {ok:false,message:'Болтов больше не осталось.'};
  game.boltsRemaining-=1; if (game.boltsRemaining%10===0) removeItem(game.inventory,'boltpack',1);
  game.combatEffect={type:'bolt',until:(game.clock.worldMinutes||0)+2};
  const message='Ты бросаешь болт в сторону. Противник на секунду отвлекается на металлический звон.';
  advanceGame(game,1); const reply=enemyReply(game,enemy,.35,message); return {ok:true,message:reply.message};
}

export function useItemInCombat(game,itemId) {
  const enemy=game.activeEncounter;
  if (!enemy) return {ok:false,message:'Во время боя предметы не нужны.'};
  const result=useItem(game,itemId); if (!result.ok) return result;
  game.combatEffect={type:'med',until:(game.clock.worldMinutes||0)+2};
  advanceGame(game,1); const reply=enemyReply(game,enemy,.75,result.message); return {ok:true,message:reply.message};
}

export function combatTextAction(game,text) {
  const t=String(text||'').toLowerCase().replaceAll('ё','е');
  if (!game.activeEncounter) return {ok:false,message:'Сейчас бой не начат.'};
  if (/перезар|сменить магазин|зарядить/.test(t)) return reloadWeapon(game);
  if (/жду|выжидаю|пережидаю|затаился|жду момент/.test(t)) { const wait=Math.max(1,Math.min(3,Math.ceil((game.combatCooldownUntil||game.clock.worldMinutes)-game.clock.worldMinutes))); advanceGame(game,wait); const reply=enemyReply(game,game.activeEncounter,.7,'Ты выжидаешь короткий момент, не теряя противника из виду.'); return {ok:true,message:reply.message}; }
  if (/прицел|целюсь|прицелива|выцел/.test(t)) return aimWeapon(game);
  if (/уклон|перекат|уворач|прыгаю в сторону|резко в сторону/.test(t)) return dodge(game);
  if (/гранат|ргд/.test(t)) return throwGrenade(game);
  if (/болт/.test(t)) return throwBoltInCombat(game);
  if (/бинт|аптеч|леч|перевяз|антирад/.test(t)) {
    const id=/антирад/.test(t)?'antirad':/военн/.test(t)?'milmed':/аи.?2/.test(t)?'ai2':'bandage'; return useItemInCombat(game,id);
  }
  if (/вода|попить|жажд/.test(t)) return useItemInCombat(game,'water');
  if (/хлеб|поесть|еда|тушен|колбас/.test(t)) { const id=countItem(game.inventory,'canned')?'canned':countItem(game.inventory,'sausage')?'sausage':'bread'; return useItemInCombat(game,id); }
  if (/нож|удар|атак|стрел|огонь|выстрел|бью|рублю|приклад/.test(t)) return playerAttack(game);
  if (/защит|укрыт|прикрыва/.test(t)) return defend(game);
  if (/отступ|убег|бегу|отхожу|скрываюсь/.test(t)) return flee(game);
  return {ok:false,message:'Опиши боевое действие: стреляю, прицеливаюсь, перезаряжаю, уклоняюсь, бросаю гранату, использую бинт или отступаю.'};
}


export function beginEncounter(game, type='blind-dog') {
  if (game.activeEncounter) return false;
  const name = type === 'military' ? 'Военнослужащий' : type === 'bandit' ? 'Бандит' : type === 'stalker' ? 'Сталкер' : type === 'flesh' ? 'Плоть' : 'Слепой пёс';
  const hp = type === 'military' ? 82 : type === 'bandit' ? 70 : type === 'stalker' ? 65 : type === 'flesh' ? 76 : 55;
  const damage = type === 'military' ? 12 : type === 'bandit' ? 10 : type === 'stalker' ? 8 : type === 'flesh' ? 13 : 9;
  const faction = ['military','bandit','stalker'].includes(type) ? (type==='stalker'?'loner':type) : null;
  const appearances = faction ? (NPC_APPEARANCES[faction]||[]) : [];
  const look = appearances.length ? appearances[Math.floor(Math.random()*appearances.length)] : null;
  game.activeEncounter = { type, name, hp, maxHp:hp, damage, count:1, imageIndex:0, image:'', ...(faction?{faction,icon:look?.icon||'',appearance:look?.appearance||'',insignia:ASSETS.factionInsignias?.[faction]||''}:{}) };
  rememberEntity(game, game.activeEncounter, 'creature');
  return true;
}


export function beginWolfDogPack(game) {
  if (game.locationId!=='trailer') return {ok:false,message:'Собаки обосновались у вагончика. Доберись туда, чтобы начать зачистку.'};
  if (game.wolfDogQuest?.status!=='active') return {ok:false,message:'Сейчас у вагончика нет поручения Волка.'};
  if (game.activeEncounter) return {ok:false,message:'Сначала закончи текущий бой.'};
  const dogIndex=(game.wolfDogQuest.killed||0)+1;
  game.activeEncounter={type:'blind-dog',name:'Слепой пёс',hp:55,maxHp:55,damage:8+Math.floor(Math.random()*5),count:1,imageIndex:0,image:'',wolfDogPack:true,packIndex:dogIndex};
  addLog(game,`У вагончика показался слепой пёс (${dogIndex}/5).`, 'danger');
  return {ok:true,message:`У вагончика тебя заметила стая. Первый пёс бросается на тебя. Всего здесь пять собак.`};
}

export function playerAttack(game) {
  const enemy = game.activeEncounter;
  if (!enemy) return { ok:false, message:'Сейчас никто не угрожает.' };
  const weapon = getBestWeapon(game.inventory,game);
  if (!weapon) return { ok:false, message:'У тебя нет подходящего оружия. Можно попытаться отступить.' };
  if (game.combatCooldownUntil && game.clock.worldMinutes < game.combatCooldownUntil) return {ok:false,message:`Нужно выждать ${Math.ceil(game.combatCooldownUntil-game.clock.worldMinutes)} мин. перед следующим действием.`};
  if (weapon.ammo) {
    const loaded=ensureMagazine(game,weapon);
    if (loaded<=0) return {ok:false,message:`Магазин ${weapon.name} пуст. Напиши «перезаряжаю» или нажми кнопку перезарядки.`};
    game.weaponMagazines[weapon.id]=loaded-1; syncAmmoStack(game,weapon.ammo);
  }
  const hadAim=!!game.player.aimed && (game.clock.worldMinutes||0)<=Number(game.player.aimedUntil||0);
  game.player.aimed=false; game.player.aimedUntil=0;
  game.combatEffect={type:'fire',until:(game.clock.worldMinutes||0)+2};
  const damage = Math.max(4, weapon.damage + Math.floor(Math.random()*9) - 4 + (hadAim?8:0));
  enemy.hp = Math.max(0, enemy.hp - damage);
  advanceGame(game, 2);
  game.combatCooldownUntil=(game.clock.worldMinutes||0)+1;
  let message = `Ты используешь ${weapon.name}. Противник получает ${damage} урона.`;
  if (enemy.hp <= 0) {
    const reward = 40 + Math.floor(Math.random()*80);
    game.money += reward;
    game.player.kills += 1;
    game.player.rating += 2;
    game.player.reputation += 2;
    if (game.lastMentionedEntity?.type==='creature') game.lastMentionedEntity.alive=false;
    game.activeEncounter = null;
    const atpWave=!!enemy.atpAssault;
    if (atpWave) advanceAtpRescue(game);
    message += ` Угроза устранена. Найдено ${reward} Купонов.`;
    if (enemy.type==='blind-dog' && Math.random()<.72) {
      const trophy=addItem(game.inventory,'tail',1);
      message += trophy.ok ? ' Среди останков найден хвост слепого пса.' : ' Среди останков найден хвост слепого пса, но рюкзак перегружен.';
    }
    if (enemy.type==='flesh' && Math.random()<.48) {
      const trophy=addItem(game.inventory,'flesh-eye',1);
      message += trophy.ok ? ' Среди останков найден «Глаз плоти».' : ' Среди останков найден «Глаз плоти», но рюкзак перегружен.';
    }
    if (enemy.wolfDogPack && game.wolfDogQuest?.status==='active') {
      game.wolfDogQuest.killed=Math.min(game.wolfDogQuest.total||5,(game.wolfDogQuest.killed||0)+1);
      const quest=game.quests?.find(entry=>entry.id==='wolf-dog-pack');
      if (quest) quest.progress=game.wolfDogQuest.killed;
      const remaining=(game.wolfDogQuest.total||5)-game.wolfDogQuest.killed;
      if (remaining>0) {
        const nextIndex=game.wolfDogQuest.killed+1;
        game.activeEncounter={type:'blind-dog',name:'Слепой пёс',hp:55,maxHp:55,damage:8+Math.floor(Math.random()*5),count:1,imageIndex:0,image:'',wolfDogPack:true,packIndex:nextIndex};
        message += ` Уничтожено ${game.wolfDogQuest.killed} из пяти. Из-за вагончика выбегает следующая собака — осталось ${remaining}.`;
      } else {
        game.wolfDogQuest.status='ready';
        if (quest) quest.status='ready';
        message += ' Все пять собак у вагончика уничтожены. Вернись к Волку в деревню новичков.';
      }
    }
    if (!game.activeEncounter) registerCorpseLoot(game,enemy);
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
