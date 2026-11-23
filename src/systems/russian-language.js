// Lightweight Russian language helpers for natural player commands.
// This is intentionally dependency-free so it works in static GitHub Pages builds.
const normalize = (value) => String(value || '')
  .toLowerCase()
  .replaceAll('ё', 'е')
  .replace(/[«»„“”"'`]/g, ' ')
  .replace(/[^а-яa-z0-9-]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const PERFECTIVE_GERUND = ['ившись','ывшись','ившись','ившись','вшись','ившись','ывшись','ивши','ывши','вши','ив','ыв','в'];
const REFLEXIVE = ['ся','сь'];
const ADJECTIVE = ['ими','ыми','его','ого','ему','ому','ее','ие','ые','ое','ей','ий','ый','ой','ая','яя','ою','ею','ую','юю','ым','им','ых','их','ую','юю'];
const PARTICIPLE = ['ивш','ывш','ующ','ем','нн','вш','ющ','щ'];
const VERB = ['ешь','ете','ишь','ите','ишься','ится','ится','атся','яться','ется','ется','ены','ить','ыть','ать','ять','уть','ют','ут','ат','ят','ил','ыла','ыла','ала','яли','али','ило','ено','ено','ей','уй','и','й'];
const NOUN = ['иями','ями','ами','ией','иям','иях','ием','иях','ией','ев','ов','ие','ье','е','иями','ями','ами','ией','ия','ья','а','ев','ов','ие','ье','ей','ой','ий','ям','ем','ам','ом','ах','ях','ы','ь','ю','у','я'];

// Russian suffix stemmer based on the common Snowball sequence (reduced for command matching).
export function stemRussianWord(word) {
  let w = normalize(word);
  if (!w || !/[а-я]/.test(w)) return w;
  w = w.replace(/(ив|ивши|ившись|ыв|ывши|ывшись|в|вши|вшись)$/u, '');
  w = w.replace(/(ся|сь)$/u, '');
  let changed = false;
  for (const suffix of [...ADJECTIVE].sort((a,b)=>b.length-a.length)) {
    if (w.endsWith(suffix) && w.length - suffix.length >= 3) {
      w = w.slice(0, -suffix.length);
      for (const part of [...PARTICIPLE].sort((a,b)=>b.length-a.length)) {
        if (w.endsWith(part)) { w=w.slice(0,-part.length); break; }
      }
      changed = true; break;
    }
  }
  if (!changed) {
    for (const suffix of [...VERB].sort((a,b)=>b.length-a.length)) {
      if (w.endsWith(suffix) && w.length - suffix.length >= 3) { w=w.slice(0,-suffix.length); changed=true; break; }
    }
  }
  if (!changed) {
    for (const suffix of [...NOUN].sort((a,b)=>b.length-a.length)) {
      if (w.endsWith(suffix) && w.length - suffix.length >= 3) { w=w.slice(0,-suffix.length); break; }
    }
  }
  return w.replace(/ь$/u,'');
}

export function tokenizeRussian(text) {
  return normalize(text).split(' ').filter(Boolean);
}

export function hasWordFamily(text, roots) {
  const tokens = tokenizeRussian(text);
  const stems = tokens.map(stemRussianWord);
  return roots.some(root => {
    const normalizedRoot = stemRussianWord(root);
    return tokens.some(token => token === root || token.startsWith(root)) || stems.some(stem => normalizedRoot.length >= 4 && (stem === normalizedRoot || stem.startsWith(normalizedRoot)));
  });
}

const PRONOUNS = new Set([
  'он','она','оно','они','его','ее','ему','ей','им','ими','них','него','нее','нею','нему','ним','ней',
  'этот','эта','это','эти','этого','этой','этому','этим','этом','эту','тех','теми','того','той','тому','такой','такая','такое','такие','данный','данная','данное','тот','та','то','там','тут','туда','здесь','оттуда'
]);
export function containsReferencePronoun(text) {
  return tokenizeRussian(text).some(token => PRONOUNS.has(token));
}

export function grammaticalGender(entity) {
  if (!entity) return 'n';
  if (entity.gender === 'm' || entity.gender === 'f' || entity.gender === 'n') return entity.gender;
  const id = String(entity.id || entity.type || '').toLowerCase();
  const name = normalize(entity.name || '');
  if (id === 'rookie-village' || id === 'stop' || id === 'pig-farm' || id === 'farmstead') return 'f';
  if (id === 'atp') return 'n';
  if (/flesh|плот|собак|медуз|аномал|женщ|каптерк|деревн|остановк|ферм|развалин/.test(id+' '+name)) return 'f';
  if (/dog|blind-dog|bandit|military|sidorovich|wolf|kefir|shnurok|dzerzhinsky|пес|пёс|бандит|военнослуж|сидорович|волк|кефир|шнурок|дзержин/.test(id+' '+name)) return 'm';
  if (/место|существ|оруж|тело|животн|оно/.test(name)) return 'n';
  if (/[ая]$/.test(name)) return 'f';
  return 'm';
}

export function rememberEntity(game, entity, type = 'object') {
  if (!game || !entity) return;
  game.lastMentionedEntity = {
    type,
    id: entity.id || null,
    name: entity.name || entity.title || 'Объект',
    gender: grammaticalGender(entity),
    location: entity.location || entity.locationId || null,
    faction: entity.faction || null
  };
}

export function getRememberedEntity(game, text) {
  if (!containsReferencePronoun(text)) return null;
  return game?.lastMentionedEntity || null;
}

export function genderedSubject(entity) {
  const gender = grammaticalGender(entity);
  return gender === 'f' ? 'Она' : gender === 'n' ? 'Оно' : 'Он';
}

export function pronounInDative(entity) {
  return grammaticalGender(entity) === 'f' ? 'к ней' : grammaticalGender(entity) === 'n' ? 'к нему' : 'к нему';
}
